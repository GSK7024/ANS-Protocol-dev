import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Use Service Role for database writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id, reason, requester_wallet } = body;

        // Validation
        if (!escrow_id) {
            return NextResponse.json(
                { error: 'Missing required field: escrow_id' },
                { status: 400 }
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

        // Only pending, locked, or disputed escrows can be refunded
        if (!['pending', 'locked', 'disputed', 'expired'].includes(escrow.status)) {
            return NextResponse.json(
                { error: `Escrow cannot be refunded. Current status: ${escrow.status}` },
                { status: 400 }
            );
        }

        // 🛡️ SECURITY: Authorization check - only buyer can request refund
        if (!requester_wallet) {
            return NextResponse.json(
                { error: 'Missing required field: requester_wallet' },
                { status: 400 }
            );
        }

        if (requester_wallet !== escrow.buyer_wallet) {
            console.warn(`⚠️ Unauthorized refund attempt by ${requester_wallet} for escrow ${escrow_id}`);
            return NextResponse.json(
                { error: 'Only the buyer can request a refund' },
                { status: 403 }
            );
        }

        // If status is just pending (no funds transferred), just mark as refunded
        if (escrow.status === 'pending') {
            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'refunded',
                    notes: reason || 'Cancelled before payment'
                })
                .eq('id', escrow_id);

            return NextResponse.json({
                success: true,
                status: 'refunded',
                escrow_id,
                message: 'Escrow cancelled. No funds were locked.'
            });
        }

        // For locked escrows, we need to transfer funds back
        const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY;
        if (!vaultPrivateKey) {
            console.error('VAULT_PRIVATE_KEY not configured!');
            return NextResponse.json(
                { error: 'Server configuration error: Vault key missing' },
                { status: 500 }
            );
        }

        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        const vaultKeypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
        const buyerPubkey = new PublicKey(escrow.buyer_wallet);

        // Refund amount + fee back to buyer
        const refundAmount = escrow.amount + escrow.fee;
        const refundLamports = Math.floor(refundAmount * LAMPORTS_PER_SOL);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: buyerPubkey,
                lamports: refundLamports,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = vaultKeypair.publicKey;

        transaction.sign(vaultKeypair);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(signature);

        // Update escrow to refunded
        await supabase
            .from('escrow_transactions')
            .update({
                status: 'refunded',
                refund_tx_signature: signature,
                notes: reason || 'Refunded'
            })
            .eq('id', escrow_id);

        console.log(`💸 Escrow ${escrow_id} refunded. Amount: ${refundAmount} SOL → ${escrow.buyer_wallet}`);

        return NextResponse.json({
            success: true,
            status: 'refunded',
            escrow_id,
            amount_refunded: refundAmount,
            recipient: escrow.buyer_wallet,
            tx_signature: signature,
            message: 'Funds refunded to buyer.'
        });

    } catch (err) {
        console.error('Escrow refund error:', err);
        return NextResponse.json(
            { error: 'Internal server error: ' + (err as Error).message },
            { status: 500 }
        );
    }
}
