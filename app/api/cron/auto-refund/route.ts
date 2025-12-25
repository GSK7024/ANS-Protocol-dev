import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * ANS Auto-Refund Cron Job
 * 
 * This endpoint should be called periodically (e.g., every hour) to:
 * 1. Find expired escrows that haven't been fulfilled
 * 2. Automatically refund buyers
 * 3. Update escrow status to 'refunded'
 * 
 * Trigger this with a cron service like:
 * - Vercel Cron: vercel.json { "crons": [{ "path": "/api/cron/auto-refund", "schedule": "0 * * * *" }] }
 * - External service: Uptime Robot, cron-job.org, etc.
 * 
 * SECURITY: Requires CRON_SECRET header to prevent abuse
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC);

// Secret to validate cron calls (set in environment)
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret-change-me';

export async function GET(req: NextRequest) {
    // Verify cron secret (prevents unauthorized calls)
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');

    if (cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.log('🚫 [AUTO-REFUND] Unauthorized cron call attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [AUTO-REFUND] Starting auto-refund check...');

    const results = {
        checked: 0,
        refunded: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
    };

    try {
        // 1. Find expired escrows that are still locked (payment received but not fulfilled)
        const { data: expiredEscrows, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('status', 'locked')
            .lt('expires_at', new Date().toISOString())
            .limit(50);  // Process in batches

        if (fetchError) {
            console.error('❌ [AUTO-REFUND] Fetch error:', fetchError);
            return NextResponse.json({ error: 'Database error', details: fetchError.message }, { status: 500 });
        }

        if (!expiredEscrows || expiredEscrows.length === 0) {
            console.log('✅ [AUTO-REFUND] No expired escrows found');
            return NextResponse.json({
                success: true,
                message: 'No expired escrows to refund',
                ...results
            });
        }

        console.log(`📋 [AUTO-REFUND] Found ${expiredEscrows.length} expired escrows`);
        results.checked = expiredEscrows.length;

        // 2. Process each expired escrow
        for (const escrow of expiredEscrows) {
            try {
                console.log(`   Processing escrow ${escrow.id}...`);

                // Validate buyer wallet
                if (!escrow.buyer_wallet) {
                    console.log(`   ⚠️ No buyer wallet for escrow ${escrow.id}, skipping`);
                    results.skipped++;
                    results.details.push({ id: escrow.id, status: 'skipped', reason: 'No buyer wallet' });
                    continue;
                }

                // Check if refund amount makes sense
                const refundAmount = escrow.amount;  // Full amount (fee was never charged for unfulfilled)
                if (!refundAmount || refundAmount <= 0) {
                    console.log(`   ⚠️ Invalid amount for escrow ${escrow.id}, skipping`);
                    results.skipped++;
                    results.details.push({ id: escrow.id, status: 'skipped', reason: 'Invalid amount' });
                    continue;
                }

                // 3. Execute refund on Solana
                const refundResult = await executeRefund(escrow.buyer_wallet, refundAmount, escrow.id);

                if (refundResult.success) {
                    // 4. Update escrow status
                    const { error: updateError } = await supabase
                        .from('escrow_transactions')
                        .update({
                            status: 'refunded',
                            refund_tx: refundResult.signature,
                            refunded_at: new Date().toISOString(),
                            refund_reason: 'auto_expired'
                        })
                        .eq('id', escrow.id);

                    if (updateError) {
                        console.error(`   ❌ Failed to update status for ${escrow.id}:`, updateError);
                        results.failed++;
                        results.details.push({
                            id: escrow.id,
                            status: 'partial',
                            reason: 'Refund sent but status update failed',
                            signature: refundResult.signature
                        });
                    } else {
                        console.log(`   ✅ Refunded ${refundAmount} SOL to ${escrow.buyer_wallet}`);
                        results.refunded++;
                        results.details.push({
                            id: escrow.id,
                            status: 'refunded',
                            amount: refundAmount,
                            signature: refundResult.signature
                        });
                    }
                } else {
                    console.error(`   ❌ Refund failed for ${escrow.id}:`, refundResult.error);
                    results.failed++;
                    results.details.push({
                        id: escrow.id,
                        status: 'failed',
                        reason: refundResult.error
                    });

                    // Mark as failed but don't change status (will retry next run)
                    await supabase
                        .from('escrow_transactions')
                        .update({
                            last_refund_attempt: new Date().toISOString(),
                            refund_attempts: (escrow.refund_attempts || 0) + 1
                        })
                        .eq('id', escrow.id);
                }

            } catch (err: any) {
                console.error(`   ❌ Error processing escrow ${escrow.id}:`, err);
                results.failed++;
                results.details.push({
                    id: escrow.id,
                    status: 'error',
                    reason: err.message
                });
            }
        }

        console.log(`🏁 [AUTO-REFUND] Complete. Checked: ${results.checked}, Refunded: ${results.refunded}, Failed: ${results.failed}`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results
        });

    } catch (err: any) {
        console.error('❌ [AUTO-REFUND] Critical error:', err);
        return NextResponse.json({
            error: 'Auto-refund failed',
            details: err.message
        }, { status: 500 });
    }
}

/**
 * Execute SOL refund from vault to buyer
 */
async function executeRefund(
    buyerWallet: string,
    amount: number,
    escrowId: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
        // Load vault keypair
        const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY;
        if (!vaultPrivateKey) {
            return { success: false, error: 'Vault private key not configured' };
        }

        const vaultKeypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
        const buyerPubkey = new PublicKey(buyerWallet);

        // Check vault balance
        const vaultBalance = await connection.getBalance(vaultKeypair.publicKey);
        const lamportsToRefund = Math.floor(amount * LAMPORTS_PER_SOL);

        if (vaultBalance < lamportsToRefund) {
            return {
                success: false,
                error: `Insufficient vault balance. Need: ${amount} SOL, Have: ${vaultBalance / LAMPORTS_PER_SOL} SOL`
            };
        }

        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: buyerPubkey,
                lamports: lamportsToRefund
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = vaultKeypair.publicKey;

        // Sign and send
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [vaultKeypair],
            { commitment: 'confirmed' }
        );

        console.log(`      💸 Refund TX: ${signature}`);
        return { success: true, signature };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// Also support POST for flexibility
export async function POST(req: NextRequest) {
    return GET(req);
}
