import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiKeyAuth } from '@/utils/auth';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Dynamic Risk Pricing - Fee rates by trust tier
const FEE_RATES: Record<string, number> = {
    'initiate': 0.05,  // 5% - High risk = High premium
    'adept': 0.01,     // 1% - Medium risk
    'master': 0.005    // 0.5% - Low risk = Low fee
};

// Hold periods by trust tier (in hours)
const HOLD_PERIODS: Record<string, number> = {
    'initiate': 168,   // 7 days
    'adept': 72,       // 3 days
    'master': 0        // Instant
};

const DEFAULT_EXPIRATION_HOURS = 24;
const VAULT_SYSTEM_KEY = process.env.VAULT_SYSTEM_KEY || 'nexus-system-key-change-in-production';

/**
 * Decrypt vault data using system key
 */
function decryptVault(encryptedData: Buffer, iv: string): Record<string, any> | null {
    try {
        const key = crypto.pbkdf2Sync(VAULT_SYSTEM_KEY, 'nexus-vault-salt', 100000, 32, 'sha256');
        const ivBuffer = Buffer.from(iv, 'base64');
        const authTag = encryptedData.subarray(-16);
        const ciphertext = encryptedData.subarray(0, -16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
        console.error('Vault decryption error:', err);
        return null;
    }
}

/**
 * ANS Orchestrator - Book Endpoint
 * 
 * Creates an escrow transaction for a booking request.
 * Fetches buyer's vault data and sends required fields to seller.
 * 
 * 🔐 REQUIRES API KEY AUTHENTICATION
 * 🔒 VAULT DATA NEVER RETURNED TO AI - ONLY SENT TO SELLER
 */
export async function POST(req: NextRequest) {
    // 🔐 AUTHENTICATION REQUIRED
    const auth = await withApiKeyAuth(req, { required: true });
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const { agent, buyer_wallet, amount, params } = body;

        // Validation - check for undefined/null, not falsy (amount=0 is valid for booking-based)
        if (!agent || !buyer_wallet || amount === undefined || amount === null) {
            return NextResponse.json(
                { error: 'Missing required fields: agent, buyer_wallet, amount' },
                { status: 400 }
            );
        }

        // Extract agent name (remove agent:// prefix if present)
        const agentName = agent.replace('agent://', '');

        console.log(`📝 [ORCHESTRATOR] Book request: ${agentName} for ${amount} SOL`);

        // 1. Resolve agent to get seller wallet AND trust tier
        const { data: agentData, error: agentError } = await supabase
            .from('domains')
            .select('name, owner_wallet, api_config, trust_score, trust_tier')
            .eq('name', agentName)
            .single();

        if (agentError || !agentData) {
            return NextResponse.json(
                { error: `Agent not found: ${agentName}` },
                { status: 404 }
            );
        }

        if (!agentData.owner_wallet) {
            return NextResponse.json(
                { error: `Agent ${agentName} has no wallet configured` },
                { status: 400 }
            );
        }

        // 2. 🔒 VAULT INTEGRATION - Get seller requirements and buyer data
        let vaultDataForSeller: Record<string, any> = {};
        let vaultAccessLog: any = null;

        // Get seller's required fields
        const { data: sellerReqs } = await supabase
            .from('seller_requirements')
            .select('required_fields, optional_fields')
            .eq('seller_agent', agentName)
            .single();

        if (sellerReqs && sellerReqs.required_fields.length > 0) {
            console.log(`   🔐 Seller requires: ${sellerReqs.required_fields.join(', ')}`);

            // Get buyer's vault
            const { data: vault } = await supabase
                .from('account_vaults')
                .select('encrypted_data, encryption_iv')
                .eq('owner_wallet', buyer_wallet)
                .single();

            if (vault) {
                // Decrypt vault
                // Handle Postgres Hex Format (\x...)
                let encryptedBuf: Buffer;
                if (typeof vault.encrypted_data === 'string') {
                    const hexString = vault.encrypted_data.startsWith('\\x')
                        ? vault.encrypted_data.substring(2)
                        : vault.encrypted_data;
                    encryptedBuf = Buffer.from(hexString, 'hex');
                } else {
                    encryptedBuf = Buffer.from(vault.encrypted_data);
                }

                const decrypted = decryptVault(
                    encryptedBuf,
                    vault.encryption_iv
                );

                if (decrypted) {
                    // Extract ONLY required fields
                    for (const field of sellerReqs.required_fields) {
                        if (decrypted[field]) {
                            vaultDataForSeller[field] = decrypted[field];
                        }
                    }

                    // Log the access
                    const { data: logEntry } = await supabase
                        .from('vault_access_log')
                        .insert({
                            vault_wallet: buyer_wallet,
                            accessor_agent: agentName,
                            fields_accessed: Object.keys(vaultDataForSeller),
                            purpose: 'booking'
                        })
                        .select()
                        .single();

                    vaultAccessLog = logEntry;
                    console.log(`   ✅ Vault accessed: ${Object.keys(vaultDataForSeller).length} fields extracted`);
                }
            } else {
                console.log(`   ⚠️ No vault found for buyer - proceeding without personal data`);
            }
        } else {
            console.log(`   ℹ️ Seller has no field requirements`);
        }

        // 3. Calculate DYNAMIC fees based on trust tier
        const tier = agentData.trust_tier || 'initiate';
        const feeRate = FEE_RATES[tier] || FEE_RATES['initiate'];
        const fee = amount * feeRate;
        const totalAmount = amount + fee;
        const holdPeriod = HOLD_PERIODS[tier] || HOLD_PERIODS['initiate'];

        console.log(`   💰 Tier: ${tier.toUpperCase()} | Fee: ${(feeRate * 100).toFixed(1)}% | Hold: ${holdPeriod}h`);

        // 4. Set expiration and hold
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

        const holdUntil = new Date();
        holdUntil.setHours(holdUntil.getHours() + holdPeriod);

        // 5. Create escrow with vault access info
        const { data: escrow, error: escrowError } = await supabase
            .from('escrow_transactions')
            .insert({
                buyer_wallet,
                seller_agent: agentName,
                seller_wallet: agentData.owner_wallet,
                amount,
                fee,
                status: 'pending',
                service_details: {
                    ...params,
                    agent_trust_score: agentData.trust_score,
                    agent_trust_tier: tier,
                    fee_rate: feeRate,
                    hold_period_hours: holdPeriod,
                    vault_access_log_id: vaultAccessLog?.id || null,
                    fields_sent_to_seller: Object.keys(vaultDataForSeller),
                    booked_at: new Date().toISOString()
                },
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (escrowError) {
            console.error('Escrow creation error:', escrowError);
            return NextResponse.json(
                { error: 'Failed to create escrow: ' + escrowError.message },
                { status: 500 }
            );
        }

        console.log(`   ✅ Escrow created: ${escrow.id}`);

        // 6. 🚀 SEND BUYER DATA TO SELLER (if they have a book_url)
        let sellerBookingResponse = null;
        if (agentData.api_config?.book_url && Object.keys(vaultDataForSeller).length > 0) {
            try {
                console.log(`   📤 Sending buyer data to seller: ${agentData.api_config.book_url}`);

                const sellerResponse = await fetch(agentData.api_config.book_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-ANS-Escrow-ID': escrow.id,
                        ...(agentData.api_config.api_key && {
                            'Authorization': `Bearer ${agentData.api_config.api_key}`
                        })
                    },
                    body: JSON.stringify({
                        escrow_id: escrow.id,
                        buyer_data: vaultDataForSeller,  // 🔐 ONLY sent to seller, never to AI
                        booking_params: params,
                        amount: amount
                    })
                });

                if (sellerResponse.ok) {
                    sellerBookingResponse = await sellerResponse.json();
                    console.log(`   ✅ Seller confirmed booking`);
                }
            } catch (sellerErr) {
                console.log(`   ⚠️ Could not reach seller API (booking will proceed)`);
            }
        }

        // 7. Return booking instructions (🔐 NO PERSONAL DATA IN RESPONSE)
        return NextResponse.json({
            success: true,
            escrow_id: escrow.id,
            agent: `agent://${agentName}`,
            seller_wallet: agentData.owner_wallet,
            vault_address: process.env.NEXT_PUBLIC_VAULT_WALLET,

            trust_tier: tier,
            tier_badge: tier === 'master' ? '🟡' : tier === 'adept' ? '🔵' : '⚪',

            payment: {
                amount: amount,
                fee: fee,
                fee_percentage: `${(feeRate * 100).toFixed(1)}%`,
                total: totalAmount,
                currency: 'SOL'
            },

            hold_period: {
                hours: holdPeriod,
                release_after: holdUntil.toISOString()
            },

            // 🔐 Privacy: Only tell AI that data was sent, NOT what data
            vault_status: {
                data_sent_to_seller: Object.keys(vaultDataForSeller).length > 0,
                fields_count: Object.keys(vaultDataForSeller).length,
                access_logged: vaultAccessLog !== null
            },

            seller_booking: sellerBookingResponse,

            expires_at: expiresAt.toISOString(),
            status: 'awaiting_payment',

            next_step: {
                action: 'Send SOL to vault address',
                endpoint: '/api/orchestrate/confirm-payment',
                payload: {
                    escrow_id: escrow.id,
                    tx_signature: '<your_transaction_signature>'
                }
            },

            message: `Send ${totalAmount.toFixed(6)} SOL to the vault address, then call confirm-payment.`
        });

    } catch (err) {
        console.error('Orchestrator book error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

