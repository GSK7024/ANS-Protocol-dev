import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Initialize Supabase Client (Admin context if needed, but here we use anon/public for MVP speed)
// Secure logic would verify the wallet signature here to prevent spoofing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { domain, wallet, amount, signature, contact } = await request.json();

        if (!domain || !wallet || !amount || !contact || !signature) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 🔒 SECURITY FIX: Validate bid amount bounds
        const bidAmount = parseFloat(amount);
        if (isNaN(bidAmount) || bidAmount < 0.1 || bidAmount > 10000) {
            return NextResponse.json({
                error: 'Bid must be between 0.1 and 10,000 SOL',
                min: 0.1,
                max: 10000
            }, { status: 400 });
        }

        // 1. Verify Signature
        // preventing spoofing by ensuring the user actually owns the wallet.
        try {
            // Reconstruct the message that was signed.
            // PROTOCOL: The client must sign the string: "Bid for <domain> amount <amount>"
            // Example: "Bid for agent-luxspace amount 100"
            const message = `Bid for ${domain} amount ${amount}`;
            const messageBytes = new TextEncoder().encode(message);

            // Decode signature (Expect Base58 from Solana wallets)
            const signatureBytes = bs58.decode(signature);
            const publicKey = new PublicKey(wallet);

            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKey.toBytes()
            );

            if (!verified) {
                console.warn(`Invalid signature from wallet ${wallet} for domain ${domain}`);
                return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
            }
        } catch (e: any) {
            console.error('Signature verification error:', e);
            return NextResponse.json({ error: 'Signature verification failed: ' + e.message }, { status: 400 });
        }

        // 2. (Optional) Verify Wallet Balance here using Solana connection
        // TODO: Check if wallet has enough SOL using @solana/web3.js Connection

        // 3. Insert Bid
        const { data, error } = await supabase
            .from('bids')
            .insert({
                domain_name: domain,
                bidder_wallet: wallet,
                amount: parseFloat(amount),
                signature: signature,
                contact_info: contact
            })
            .select()
            .single();

        if (error) {
            console.error('Bid Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, bid: data });
    } catch (err) {
        console.error("Endpoint Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
