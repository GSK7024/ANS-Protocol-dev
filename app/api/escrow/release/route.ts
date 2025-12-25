import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Use Service Role for database writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

import { oracle } from '@/utils/oracle';
import { updateMetricsAfterTransaction } from '@/lib/reputation';
import { runSecurityChecks, rateLimitHeaders } from '@/lib/securityMiddleware';
import { validateWallet } from '@/lib/validation';
import { logAudit } from '@/lib/auditLog';
import { runAbuseChecks, logAbuseFlag } from '@/lib/abuseDetection';

export async function POST(req: NextRequest) {
    // 🔒 Security: Rate limit + abuse detection (write operation)
    const secResult = await runSecurityChecks(req, 'write');
    if (!secResult.ok) return secResult.response;
    const { context } = secResult;

    try {
        const body = await req.json();
        const { escrow_id, buyer_wallet, proof } = body;

        // 🔒 Validate buyer wallet
        if (buyer_wallet) {
            const walletValidation = validateWallet(buyer_wallet);
            if (!walletValidation.valid) {
                return NextResponse.json(
                    { error: walletValidation.error },
                    { status: 400, headers: rateLimitHeaders(context) }
                );
            }
        }

        // Validation
        if (!escrow_id) {
            return NextResponse.json(
                { error: 'Missing escrow_id' },
                { status: 400, headers: rateLimitHeaders(context) }
            );
        }

        // Get escrow record
        const { data: escrow, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchError || !escrow) {
            return NextResponse.json(
                { error: 'Escrow not found' },
                { status: 404 }
            );
        }

        // Only confirmed escrows can be released
        if (escrow.status !== 'confirmed' && escrow.status !== 'locked') {
            return NextResponse.json(
                { error: `Escrow cannot be released. Current status: ${escrow.status}` },
                { status: 400 }
            );
        }

        // existing logic ...

        // 🛡️ AUTOMATED TRUST: Oracle Verification
        // If 'proof' is provided, we try to verify via Oracle to authorize release
        let oracleVerified = false;

        if (proof) {
            const verification = await oracle.verifyService(
                escrow.service_details?.type || 'generic',
                proof
            );

            if (verification.verified) {
                console.log(`✅ Oracle Verified: ${JSON.stringify(verification.metadata)}`);
                oracleVerified = true;

                // Log proof to DB (Simulated here, ideally update escrow record)
            } else {
                console.warn(`❌ Oracle Rejected: ${verification.error}`);
            }
        }

        // Authorization check: 
        // 1. Buyer manually releases
        // 2. Oracle verified the proof (Automated)
        const isBuyer = buyer_wallet && buyer_wallet === escrow.buyer_wallet;

        if (!isBuyer && !oracleVerified) {
            return NextResponse.json(
                { error: 'Unauthorized: Only Buyer or Oracle Verification can release funds' },
                { status: 403 }
            );
        }

        // Get vault private key (MUST be secured in production!)
        const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY;
        if (!vaultPrivateKey) {
            console.error('VAULT_PRIVATE_KEY not configured!');
            return NextResponse.json(
                { error: 'Server configuration error: Vault key missing' },
                { status: 500 }
            );
        }

        // Create release transaction
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        const vaultKeypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
        const sellerPubkey = new PublicKey(escrow.seller_wallet);
        const amountLamports = Math.floor(escrow.amount * LAMPORTS_PER_SOL);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: sellerPubkey,
                lamports: amountLamports,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = vaultKeypair.publicKey;

        // Sign and send
        transaction.sign(vaultKeypair);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(signature);

        // Update escrow to released
        const { error: updateError } = await supabase
            .from('escrow_transactions')
            .update({
                status: 'released',
                release_tx_signature: signature,
                released_at: new Date().toISOString()
            })
            .eq('id', escrow_id);

        if (updateError) {
            console.error('Failed to update escrow after release:', updateError);
        }

        // 📊 SRT: Update seller's reputation metrics
        const sellerAgent = escrow.seller_agent || escrow.seller_wallet;
        await updateMetricsAfterTransaction(sellerAgent, true, escrow.amount);

        // 🔒 Audit log + abuse check
        await logAudit({
            action_type: 'escrow_release',
            actor_ip: context.ip,
            actor_wallet: buyer_wallet,
            target_entity: 'escrow',
            target_id: escrow_id,
            metadata: { amount: escrow.amount, seller: escrow.seller_wallet },
            request_id: context.requestId
        });

        // Run abuse detection asynchronously (don't block response)
        runAbuseChecks(buyer_wallet, context.ipHash).then(flags => {
            flags.forEach(flag => logAbuseFlag(flag));
        }).catch(console.error);

        console.log(`✅ Escrow ${escrow_id} released. Amount: ${escrow.amount} SOL → ${escrow.seller_wallet}`);

        return NextResponse.json({
            success: true,
            status: 'released',
            escrow_id,
            amount_released: escrow.amount,
            recipient: escrow.seller_wallet,
            tx_signature: signature,
            proof_of_delivery: escrow.proof_of_delivery,
            message: 'Funds released to seller. Transaction complete!'
        }, { headers: rateLimitHeaders(context) });

    } catch (err) {
        console.error('Escrow release error:', err);
        return NextResponse.json(
            { error: 'Internal server error: ' + (err as Error).message },
            { status: 500 }
        );
    }
}
