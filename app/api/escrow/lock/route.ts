import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Use Service Role for database writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id, tx_signature } = body;

        // Validation
        if (!escrow_id || !tx_signature) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, tx_signature' },
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

        if (escrow.status !== 'pending') {
            return NextResponse.json(
                { error: `Escrow is already ${escrow.status}` },
                { status: 400 }
            );
        }

        // Check if expired
        if (new Date(escrow.expires_at) < new Date()) {
            await supabase
                .from('escrow_transactions')
                .update({ status: 'expired' })
                .eq('id', escrow_id);

            return NextResponse.json(
                { error: 'Escrow has expired' },
                { status: 400 }
            );
        }

        // Verify transaction on-chain
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
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

        // Verify payment went to vault
        const expectedAmount = escrow.amount + escrow.fee;
        const expectedLamports = expectedAmount * LAMPORTS_PER_SOL;

        // Check vault balance change
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());

        const vaultIndex = accountKeys.indexOf(VAULT_WALLET);
        if (vaultIndex === -1) {
            return NextResponse.json(
                { error: 'Vault wallet not found in transaction' },
                { status: 400 }
            );
        }

        const vaultReceived = postBalances[vaultIndex] - preBalances[vaultIndex];

        // Allow 5% tolerance for fees
        if (vaultReceived < expectedLamports * 0.95) {
            return NextResponse.json(
                { error: `Insufficient payment. Expected ${expectedAmount} SOL, received ${vaultReceived / LAMPORTS_PER_SOL} SOL` },
                { status: 400 }
            );
        }

        // Update escrow to locked
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

        console.log(`✅ Escrow ${escrow_id} locked. Amount: ${expectedAmount} SOL`);

        return NextResponse.json({
            success: true,
            status: 'locked',
            escrow_id,
            amount_locked: expectedAmount,
            seller_agent: escrow.seller_agent,
            message: 'Funds locked in escrow. The seller has been notified to deliver the service.'
        });

    } catch (err) {
        console.error('Escrow lock error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
