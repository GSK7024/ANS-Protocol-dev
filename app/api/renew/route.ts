import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logAudit } from '@/lib/auditLogger';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC);

const TREASURY_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET!;
const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET!;

// Renewal price in SOL (can be made dynamic based on tier)
const RENEWAL_PRICE_SOL = 0.1; // ~$20 at current rates

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { signature, domain, wallet, years = 1 } = body;

        if (!signature || !domain || !wallet) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
        }

        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Verify domain exists and is owned by wallet
        const { data: domainData, error: domainError } = await adminSupabase
            .from('domains')
            .select('*')
            .eq('name', domain)
            .single();

        if (domainError || !domainData) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        if (domainData.owner_wallet !== wallet) {
            return NextResponse.json({ error: 'You do not own this domain' }, { status: 403 });
        }

        // 2. Verify payment on-chain
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx || !tx.meta || tx.meta.err) {
            return NextResponse.json({ error: 'Transaction not found or failed' }, { status: 400 });
        }

        // Check payment amount
        const expectedAmount = RENEWAL_PRICE_SOL * years * LAMPORTS_PER_SOL;
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        let treasuryReceived = 0;
        for (let i = 0; i < accountKeys.length; i++) {
            const key = accountKeys[i].pubkey.toString();
            if (key === TREASURY_WALLET) {
                treasuryReceived = postBalances[i] - preBalances[i];
            }
        }

        if (treasuryReceived < expectedAmount * 0.95) { // 5% tolerance
            return NextResponse.json({
                error: `Insufficient payment. Expected ${RENEWAL_PRICE_SOL * years} SOL, received ${treasuryReceived / LAMPORTS_PER_SOL} SOL`
            }, { status: 400 });
        }

        // 3. Extend expiry date
        const currentExpiry = new Date(domainData.expires_at || new Date());
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setFullYear(newExpiry.getFullYear() + years);

        const { error: updateError } = await adminSupabase
            .from('domains')
            .update({
                expires_at: newExpiry.toISOString(),
                renewal_count: (domainData.renewal_count || 0) + 1,
                last_renewed_at: new Date().toISOString()
            })
            .eq('name', domain);

        if (updateError) {
            console.error('Renewal update error:', updateError);
            return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
        }

        // 4. Log the renewal
        await logAudit({
            event_type: 'domain_update',
            actor_wallet: wallet,
            target_type: 'domain',
            target_id: domain,
            action: `Renewed domain for ${years} year(s)`,
            metadata: {
                previous_expiry: domainData.expires_at,
                new_expiry: newExpiry.toISOString(),
                payment_signature: signature,
                amount_sol: RENEWAL_PRICE_SOL * years
            }
        });

        console.log(`✅ Domain renewed: ${domain} until ${newExpiry.toISOString()}`);

        return NextResponse.json({
            success: true,
            domain: domain,
            new_expiry: newExpiry.toISOString(),
            years_added: years,
            message: `Domain renewed for ${years} year(s). New expiry: ${newExpiry.toLocaleDateString()}`
        });

    } catch (err: any) {
        console.error('[RENEW] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET: Check renewal status and price
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) {
        return NextResponse.json({ error: 'Domain required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await adminSupabase
        .from('domains')
        .select('name, expires_at, renewal_count, status')
        .eq('name', domain)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining < 0;
    const isGracePeriod = daysRemaining < 0 && daysRemaining >= -30;
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

    return NextResponse.json({
        domain: data.name,
        expires_at: data.expires_at,
        days_remaining: daysRemaining,
        is_expired: isExpired,
        is_grace_period: isGracePeriod,
        is_expiring_soon: isExpiringSoon,
        renewal_count: data.renewal_count || 0,
        renewal_price_sol: RENEWAL_PRICE_SOL,
        status: data.status
    });
}
