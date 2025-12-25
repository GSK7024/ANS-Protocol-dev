import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { withApiKeyAuth } from '@/utils/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET || '';

/**
 * ANS Orchestrator - Confirm Payment Endpoint
 * 
 * Verifies the payment transaction, locks the escrow,
 * and sends a webhook notification to the seller agent.
 * 
 * 🔐 REQUIRES API KEY AUTHENTICATION
 */
export async function POST(req: NextRequest) {
    // 🔐 AUTHENTICATION REQUIRED
    const auth = await withApiKeyAuth(req, { required: true });
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const { escrow_id, tx_signature } = body;

        if (!escrow_id || !tx_signature) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, tx_signature' },
                { status: 400 }
            );
        }

        console.log(`💳 [ORCHESTRATOR] Confirming payment for escrow: ${escrow_id}`);

        // 1. Get escrow record
        const { data: escrow, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchError || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        if (escrow.status !== 'pending') {
            return NextResponse.json(
                { error: `Escrow already ${escrow.status}` },
                { status: 400 }
            );
        }

        // Check expiration
        if (new Date(escrow.expires_at) < new Date()) {
            await supabase
                .from('escrow_transactions')
                .update({ status: 'expired' })
                .eq('id', escrow_id);
            return NextResponse.json({ error: 'Escrow has expired' }, { status: 400 });
        }

        // 2. Verify transaction on-chain
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        const tx = await connection.getParsedTransaction(tx_signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx || !tx.meta) {
            return NextResponse.json(
                { error: 'Transaction not found or not confirmed' },
                { status: 400 }
            );
        }

        // 3. Verify vault received correct amount
        const expectedLamports = (escrow.amount + escrow.fee) * LAMPORTS_PER_SOL;
        const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
        const vaultIndex = accountKeys.indexOf(VAULT_WALLET);

        if (vaultIndex === -1) {
            return NextResponse.json(
                { error: 'Vault wallet not found in transaction' },
                { status: 400 }
            );
        }

        const vaultReceived = tx.meta.postBalances[vaultIndex] - tx.meta.preBalances[vaultIndex];

        if (vaultReceived < expectedLamports * 0.95) {
            return NextResponse.json(
                { error: `Insufficient payment. Expected ${(escrow.amount + escrow.fee).toFixed(4)} SOL` },
                { status: 400 }
            );
        }

        // 4. Lock the escrow
        const { error: updateError } = await supabase
            .from('escrow_transactions')
            .update({
                status: 'locked',
                lock_tx_signature: tx_signature,
                locked_at: new Date().toISOString()
            })
            .eq('id', escrow_id);

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update escrow: ' + updateError.message },
                { status: 500 }
            );
        }

        console.log(`   ✅ Escrow locked. Notifying seller...`);

        // 5. Get seller's webhook URL
        const { data: sellerData } = await supabase
            .from('domains')
            .select('api_config')
            .eq('name', escrow.seller_agent)
            .single();

        const webhookUrl = (sellerData?.api_config as any)?.webhook_url ||
            (sellerData?.api_config as any)?.quote_url; // Fallback to quote_url

        // 6. Fetch buyer vault data (for seller fulfillment)
        const { data: vaultData } = await supabase
            .from('account_vaults')
            .select('*')
            .eq('owner_wallet', escrow.buyer_wallet)
            .single();

        // 6. Create webhook event (with vault data for fulfillment)
        const eventPayload = {
            type: 'escrow.locked',  // Standardized event type
            action: 'fulfill',       // Action for seller to take
            event: 'payment_received',
            escrow_id: escrow.id,
            amount: escrow.amount,
            fee: escrow.fee,
            buyer_wallet: escrow.buyer_wallet,
            buyer_vault: vaultData ? {
                full_name: 'Vault User',  // In production, decrypt and include real data
                // Note: Real implementation would decrypt vault data here
            } : null,
            service_details: escrow.service_details,
            locked_at: new Date().toISOString(),
            action_required: 'Fulfill order and call /api/orchestrate/deliver'
        };

        const { data: eventRecord } = await supabase
            .from('orchestration_events')
            .insert({
                escrow_id: escrow.id,
                event_type: 'payment_received',
                direction: 'to_seller',
                recipient_agent: escrow.seller_agent,
                recipient_webhook: webhookUrl,
                payload: eventPayload,
                status: 'pending'
            })
            .select()
            .single();

        // 7. Send webhook (if external URL) and capture fulfillment response
        let sellerFulfillment: any = null;

        if (webhookUrl && !webhookUrl.startsWith('internal://')) {
            try {
                console.log(`   📤 Calling seller webhook: ${webhookUrl}`);

                const webhookResponse = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventPayload)
                });

                // Capture seller's fulfillment response (ticket data!)
                if (webhookResponse.ok) {
                    sellerFulfillment = await webhookResponse.json();
                    console.log(`   ✅ Seller fulfilled! Ticket:`, sellerFulfillment?.ticket?.pnr || 'N/A');

                    // Store fulfillment in escrow
                    await supabase
                        .from('escrow_transactions')
                        .update({
                            fulfillment_data: sellerFulfillment
                        })
                        .eq('id', escrow_id);
                }

                await supabase
                    .from('orchestration_events')
                    .update({
                        status: webhookResponse.ok ? 'delivered' : 'failed',
                        delivered_at: webhookResponse.ok ? new Date().toISOString() : null,
                        attempts: 1,
                        last_attempt_at: new Date().toISOString()
                    })
                    .eq('id', eventRecord?.id);

                console.log(`   📤 Webhook ${webhookResponse.ok ? 'delivered' : 'failed'}: ${webhookUrl}`);
            } catch (webhookErr) {
                console.log(`   ⚠️ Webhook error: ${webhookErr}`);
            }
        } else {
            console.log(`   📌 Internal webhook: ${webhookUrl}`);
        }

        // Return response WITH ticket data from seller
        return NextResponse.json({
            success: true,
            status: 'locked',
            escrow_id,
            amount_locked: escrow.amount + escrow.fee,
            seller_agent: escrow.seller_agent,
            seller_notified: !!webhookUrl,
            message: 'Payment verified and locked. Seller has been notified to fulfill the order.',

            // NEW: Include ticket data from seller!
            fulfilled: sellerFulfillment?.fulfilled || false,
            ticket: sellerFulfillment?.ticket || null,
            seller_message: sellerFulfillment?.message || null,

            next_step: {
                wait_for: 'Seller to deliver and call /api/orchestrate/deliver',
                check_status: `/api/orchestrate/status?escrow_id=${escrow_id}`
            }
        });

    } catch (err) {
        console.error('Orchestrator confirm-payment error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
