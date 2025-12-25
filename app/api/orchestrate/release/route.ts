import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * RELEASE FUNDS TO SELLER
 * 
 * Transfers locked funds from escrow vault to seller's wallet.
 * Only works for verified escrows.
 * 
 * POST /api/orchestrate/release
 * Body: { escrow_id: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id } = body;

        if (!escrow_id) {
            return NextResponse.json({ error: 'escrow_id required' }, { status: 400 });
        }

        console.log(`💸 [Release] Processing escrow: ${escrow_id}`);

        // 1. Get escrow details
        const { data: escrow, error: escrowErr } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (escrowErr || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        // 2. Check status - must be verified or locked (for auto-release)
        if (!['verified', 'locked'].includes(escrow.status)) {
            return NextResponse.json({
                error: `Cannot release escrow in status: ${escrow.status}. Must be 'verified' or 'locked'.`
            }, { status: 400 });
        }

        // 3. Get seller's payout wallet
        const { data: sellerDomain } = await supabase
            .from('domains')
            .select('payment_config')
            .eq('name', escrow.seller_agent)
            .single();

        const sellerWallet = (sellerDomain?.payment_config as any)?.solana_address;

        if (!sellerWallet) {
            return NextResponse.json({
                error: 'Seller has no payout wallet configured'
            }, { status: 400 });
        }

        console.log(`   📤 Releasing to seller: ${sellerWallet.slice(0, 8)}...`);

        // 4. Load vault keypair (this is the escrow vault that holds the funds)
        const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY;
        if (!vaultPrivateKey) {
            return NextResponse.json({
                error: 'Vault private key not configured'
            }, { status: 500 });
        }

        const vaultKeypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
        const sellerPubkey = new PublicKey(sellerWallet);

        // 5. Calculate amounts
        const sellerAmount = escrow.amount; // Seller gets the original amount
        const feeAmount = escrow.fee;       // Platform keeps the fee

        const lamportsToSeller = Math.round(sellerAmount * 1_000_000_000);

        console.log(`   💰 Amount: ${sellerAmount} SOL to seller, ${feeAmount} SOL fee retained`);

        // 6. Create and send transaction
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        );

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: sellerPubkey,
                lamports: lamportsToSeller
            })
        );

        try {
            const signature = await connection.sendTransaction(transaction, [vaultKeypair]);
            await connection.confirmTransaction(signature, 'confirmed');

            console.log(`   ✅ Funds released! Tx: ${signature.slice(0, 16)}...`);

            // 7. Update escrow status
            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'released',
                    released_at: new Date().toISOString(),
                    release_tx_signature: signature,
                    seller_received: sellerAmount,
                    platform_fee_collected: feeAmount
                })
                .eq('id', escrow_id);

            return NextResponse.json({
                success: true,
                status: 'released',
                escrow_id,
                seller_wallet: sellerWallet,
                amount_released: sellerAmount,
                platform_fee: feeAmount,
                tx_signature: signature,
                message: `${sellerAmount} SOL released to seller!`
            });

        } catch (txError: any) {
            console.error(`   ❌ Transaction failed:`, txError.message);

            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'release_failed',
                    error_message: txError.message
                })
                .eq('id', escrow_id);

            return NextResponse.json({
                success: false,
                error: `Transaction failed: ${txError.message}`
            }, { status: 500 });
        }

    } catch (err) {
        console.error('Release error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
