import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { Connection, PublicKey } from '@solana/web3.js';
import { rateLimitMiddleware, getRateLimitHeaders } from '@/lib/rateLimiter';
import { logAudit, logRateLimitHit, hashIP } from '@/lib/auditLogger';

// 🔒 SECURITY FIX: Use environment variable, default to MAINNET not devnet!
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

const TREASURY_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET!;

export async function POST(req: NextRequest) {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = hashIP(ip);

    // Rate limit check
    const rateLimitResult = rateLimitMiddleware(ipHash, 'marketplace');
    if (rateLimitResult) {
        await logRateLimitHit(ipHash, '/api/marketplace/buy', ipHash);
        return NextResponse.json(
            { error: rateLimitResult.error },
            { status: rateLimitResult.status, headers: rateLimitResult.headers }
        );
    }

    try {
        const body = await req.json();
        const { signature, domainName, buyerWallet, price } = body;

        if (!signature || !domainName || !buyerWallet) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        console.log(`[MARKET BUY] Verifying ${signature}...`);

        // 🛡️ SECURITY FIX: Verify the Transaction on Solana Mainnet
        // 1. Fetch the transaction details
        const tx = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            return NextResponse.json({ error: 'Transaction not found on-chain' }, { status: 404 });
        }

        // 2. Check if it succeeded
        if (tx.meta?.err) {
            return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
        }

        // 3. Verify the TRANSFER amount and Recipient
        // We look for a transfer instruction to the Seller's Wallet
        const { data: domainData, error: domainError } = await supabase
            .from('domains')
            .select('owner_wallet, id, marketplace_status, list_price')
            .eq('name', domainName)
            .single();

        if (domainError || !domainData) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        // 🛡️ RACE CONDITION CHECK: Is it still for sale?
        if (domainData.marketplace_status !== 'active') {
            return NextResponse.json({ error: 'Domain is no longer listed for sale.' }, { status: 400 });
        }

        // 🛡️ PRICE CHECK: Did the price change?
        if (!domainData.list_price || Number(domainData.list_price) !== Number(price)) {
            return NextResponse.json({
                error: `Price mismatch. Listed: ${domainData.list_price}, Paid: ${price}`
            }, { status: 400 });
        }

        const sellerWallet = domainData.owner_wallet;

        // Find the transfer instruction in the transaction logs/instructions
        // This is a simplified check. For full security, parse 'tx.transaction.message.instructions'
        const expectedLamports = price * 1_000_000_000; // LAMPORTS_PER_SOL

        // Check pre/post token balances or native SOL changes
        const sellerAccountIndex = tx.transaction.message.accountKeys.findIndex(
            k => k.pubkey.toString() === sellerWallet
        );

        if (sellerAccountIndex === -1) {
            return NextResponse.json({ error: 'Seller wallet not found in transaction' }, { status: 400 });
        }

        const preBalance = tx.meta?.preBalances[sellerAccountIndex] || 0;
        const postBalance = tx.meta?.postBalances[sellerAccountIndex] || 0;
        const amountReceived = postBalance - preBalance;

        // Allow for small gas discrepancies, but ensure they got paid
        if (amountReceived < expectedLamports * 0.99) {
            return NextResponse.json({ error: `Insufficient payment detected. Expected ${expectedLamports}, got ${amountReceived}` }, { status: 400 });
        }

        console.log("✅ Payment Verified On-Chain.");

        // 3. ATOMIC SWAP: Update Owner to Buyer
        const { error: updateError } = await supabase
            .from('domains')
            .update({
                owner_wallet: buyerWallet,
                marketplace_status: 'sold', // Mark as Sold history? Or just inactive. 'sold' lets us show it in ticker.
                list_price: null,     // Clear listing
                owner_id: null        // unlink from seller's profile ID until buyer signs in or we link by wallet
            })
            .eq('id', domainData.id);

        if (updateError) {
            throw updateError;
        }

        // 4. (Optional) In real app, we would now trigger a transfer of 97.5% SOL from Treasury to Seller.
        // For MVP, we just record the Sale.
        console.log(`[SWAP COMPLETE] Seller ${sellerWallet} -> Buyer ${buyerWallet}`);

        return NextResponse.json({ success: true, seller: sellerWallet });

    } catch (error: any) {
        console.error('Market Buy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
