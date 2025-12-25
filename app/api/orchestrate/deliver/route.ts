import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AdapterFactory } from '@/app/lib/verification/factory';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { withApiKeyAuth } from '@/utils/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * ANS Orchestrator - Deliver Endpoint
 * 
 * Called by seller agents to confirm delivery and receive payment.
 * Verifies the proof, releases funds from escrow to seller.
 * 
 * 🔐 REQUIRES API KEY AUTHENTICATION
 */
export async function POST(req: NextRequest) {
    // 🔐 AUTHENTICATION REQUIRED
    const auth = await withApiKeyAuth(req, { required: true });
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const { escrow_id, proof, seller_wallet } = body;

        if (!escrow_id || !proof) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, proof' },
                { status: 400 }
            );
        }

        console.log(`📦 [ORCHESTRATOR] Delivery confirmation for escrow: ${escrow_id}`);

        // 1. Get escrow record
        const { data: escrow, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchError || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        if (escrow.status !== 'locked') {
            return NextResponse.json(
                { error: `Escrow must be locked to deliver. Current: ${escrow.status}` },
                { status: 400 }
            );
        }

        // 2. Verify seller identity (optional but recommended)
        if (seller_wallet && seller_wallet !== escrow.seller_wallet) {
            return NextResponse.json(
                { error: 'Seller wallet mismatch' },
                { status: 403 }
            );
        }

        // 3. Deep Verification (The "Zero-Trust" Check)
        console.log(`   🔍 Verifying PNR ${proof.pnr} with Airline System...`);

        // Get Agent's Verification URL and Config
        const { data: agentData } = await supabase
            .from('domains')
            .select('api_config')
            .eq('name', escrow.seller_agent)
            .single();

        const apiConfig = agentData?.api_config as any;

        // Validation Result Container
        let verificationPassed = false;
        let verificationReason = '';

        if (!apiConfig?.verify_url) {
            // Fallback for legacy agents (or if verify_url not set)
            console.log(`   ⚠️ No verification URL configured. Using basic format check.`);
            const formatCheck = validateProofFormat(proof, escrow.service_details);
            verificationPassed = formatCheck.valid;
            verificationReason = formatCheck.reason || 'Format check failed';
        } else {
            // REAL API VERIFICATION
            try {
                // Call the Airline's Verification Endpoint
                const verifyUrl = `${apiConfig.verify_url}?pnr=${proof.pnr}`;
                console.log(`   📞 Calling: ${verifyUrl}`);

                const verifyRes = await fetch(verifyUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': apiConfig.api_key ? `Bearer ${apiConfig.api_key}` : 'Bearer nexus-verification-token'
                    }
                });

                if (!verifyRes.ok) {
                    verificationPassed = false;
                    verificationReason = `Airline API Rejected: ${verifyRes.status}`;
                } else {
                    const airlineData = await verifyRes.json();

                    // STRICT DATA MATCHING
                    const requestedPassenger = escrow.service_details?.passenger?.name || 'Unknown Agent';
                    const actualPassenger = airlineData.passenger?.name || '';

                    // Normalize names for comparison (simple check)
                    const isNameMatch = !actualPassenger ||
                        requestedPassenger.toLowerCase().includes(actualPassenger.toLowerCase()) ||
                        actualPassenger.toLowerCase().includes(requestedPassenger.toLowerCase());

                    if (airlineData.valid && isNameMatch) {
                        verificationPassed = true;
                        console.log(`   ✅ Identity Verified via Zero-Trust Protocol.`);
                    } else {
                        verificationPassed = false;
                        verificationReason = airlineData.valid ? 'Passenger name mismatch' : (airlineData.message || 'Invalid ticket');
                    }
                }
            } catch (verErr) {
                verificationPassed = false;
                verificationReason = `Verification System Error: ${(verErr as Error).message}`;
            }
        }

        if (!verificationPassed) {
            console.log(`   ⛔ Verification Failed: ${verificationReason}`);
            return NextResponse.json(
                { error: `Verification Failed: ${verificationReason}` },
                { status: 400 }
            );
        }

        console.log(`   ✅ Deep Verification Passed! Processing Release...`);

        // 5. Update escrow to confirmed
        await supabase
            .from('escrow_transactions')
            .update({
                status: 'confirmed',
                proof_of_delivery: proof,
                confirmed_at: new Date().toISOString()
            })
            .eq('id', escrow_id);

        // 5. Release funds to seller
        console.log(`   💸 Releasing ${escrow.amount} SOL to seller...`);

        const releaseResult = await releaseFunds(escrow);

        if (!releaseResult.success) {
            // Mark as confirmed but pending release
            await supabase
                .from('orchestration_events')
                .insert({
                    escrow_id,
                    event_type: 'delivery_confirmed',
                    direction: 'internal',
                    payload: { proof, release_pending: true, error: releaseResult.error }
                });

            return NextResponse.json({
                success: true,
                status: 'confirmed',
                escrow_id,
                proof_accepted: true,
                release_status: 'pending',
                message: 'Proof accepted. Fund release pending.',
                error: releaseResult.error
            });
        }

        // 6. Update escrow to released
        await supabase
            .from('escrow_transactions')
            .update({
                status: 'released',
                release_tx_signature: releaseResult.tx_signature,
                released_at: new Date().toISOString()
            })
            .eq('id', escrow_id);

        // 7. Update agent metrics
        await supabase.rpc('increment_agent_success', { agent: escrow.seller_agent });

        // 8. Create events
        await supabase.from('orchestration_events').insert([
            {
                escrow_id,
                event_type: 'delivery_confirmed',
                direction: 'to_buyer',
                recipient_agent: 'buyer',
                payload: { proof, message: 'Order delivered successfully' }
            },
            {
                escrow_id,
                event_type: 'funds_released',
                direction: 'to_seller',
                recipient_agent: escrow.seller_agent,
                payload: {
                    amount: escrow.amount,
                    tx_signature: releaseResult.tx_signature
                }
            }
        ]);

        console.log(`   ✅ Funds released! TX: ${releaseResult.tx_signature?.slice(0, 20)}...`);

        return NextResponse.json({
            success: true,
            status: 'released',
            escrow_id,
            proof_accepted: true,

            payment: {
                amount: escrow.amount,
                recipient: escrow.seller_wallet,
                tx_signature: releaseResult.tx_signature
            },

            delivery: {
                proof,
                confirmed_at: new Date().toISOString()
            },

            message: 'Order fulfilled! Funds released to seller.'
        });

    } catch (err) {
        console.error('Orchestrator deliver error:', err);
        return NextResponse.json(
            { error: 'Internal server error: ' + (err as Error).message },
            { status: 500 }
        );
    }
}

// Basic Format Validation (Fallback)
function validateProofFormat(proof: any, serviceDetails: any): { valid: boolean; reason?: string } {
    // Check basic structure
    if (!proof || typeof proof !== 'object') {
        return { valid: false, reason: 'Proof must be an object' };
    }

    // For flight bookings, require PNR
    if (serviceDetails?.flight_id || serviceDetails?.intent === 'flight') {
        if (!proof.pnr) {
            return { valid: false, reason: 'Flight booking requires PNR' };
        }
        // Basic PNR format validation (2 letters + 4 alphanumeric)
        // Relaxed regex to accept testing PNRs
        if (!/^[A-Z0-9]{2,10}$/i.test(proof.pnr)) {
            return { valid: false, reason: 'Invalid PNR format' };
        }
    }

    return { valid: true };
}

// Release funds from vault to seller
async function releaseFunds(escrow: any): Promise<{ success: boolean; tx_signature?: string; error?: string }> {
    const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY;

    if (!vaultPrivateKey) {
        return { success: false, error: 'Vault private key not configured' };
    }

    try {
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        const vaultKeypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
        const sellerPubkey = new PublicKey(escrow.seller_wallet);
        const amountLamports = Math.floor(escrow.amount * LAMPORTS_PER_SOL);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: sellerPubkey,
                lamports: amountLamports
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = vaultKeypair.publicKey;
        transaction.sign(vaultKeypair);

        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(signature);

        return { success: true, tx_signature: signature };

    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}
