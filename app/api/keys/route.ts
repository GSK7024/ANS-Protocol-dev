/**
 * ANS API Key Management Endpoint
 * 
 * POST - Generate new API key (requires wallet signature)
 * GET  - List keys for a wallet
 * DELETE - Revoke a key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { generateApiKey } from '@/utils/api_keys';
import { rateLimitMiddleware, getRateLimitHeaders } from '@/lib/rateLimiter';
import { logAudit, logRateLimitHit, hashIP } from '@/lib/auditLogger';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST - Generate a new API key
 * Requires wallet signature to prove ownership
 */
export async function POST(req: NextRequest) {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = hashIP(ip);

    // Rate limit check
    const rateLimitResult = rateLimitMiddleware(ipHash, 'api_key');
    if (rateLimitResult) {
        await logRateLimitHit(ipHash, '/api/keys/post', ipHash);
        return NextResponse.json(
            { error: rateLimitResult.error },
            { status: rateLimitResult.status, headers: rateLimitResult.headers }
        );
    }

    try {
        const body = await req.json();
        const { wallet, signature, name, message } = body;

        // Validation
        if (!wallet || !signature || !name) {
            return NextResponse.json(
                { error: 'Missing required fields: wallet, signature, name' },
                { status: 400 }
            );
        }

        // Verify signature
        const expectedMessage = message || `Generate ANS API Key for ${wallet}`;
        const messageBytes = new TextEncoder().encode(expectedMessage);

        try {
            const signatureBytes = bs58.decode(signature);
            const publicKey = new PublicKey(wallet);

            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKey.toBytes()
            );

            if (!verified) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        } catch (e: any) {
            return NextResponse.json(
                { error: 'Signature verification failed: ' + e.message },
                { status: 400 }
            );
        }

        // 🔒 LIMIT: One key per wallet
        const { data: existingKey } = await supabase
            .from('api_keys')
            .select('id, key_prefix, is_active')
            .eq('owner_wallet', wallet)
            .eq('is_active', true)
            .single();

        if (existingKey) {
            return NextResponse.json({
                error: 'You already have an active API key',
                existing_key: existingKey.key_prefix,
                hint: 'Revoke your existing key first if you need a new one'
            }, { status: 409 });
        }

        // Generate key
        const { key, hash, prefix } = generateApiKey();

        // Store in database
        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                key_hash: hash,
                key_prefix: prefix,
                name: name,
                owner_wallet: wallet
            })
            .select('id, key_prefix, name, created_at')
            .single();

        if (error) {
            console.error('API key creation error:', error);
            return NextResponse.json(
                { error: 'Failed to create API key' },
                { status: 500 }
            );
        }

        console.log(`🔑 [API KEY] Generated for ${wallet.slice(0, 8)}... - ${name}`);

        // Return the key (shown ONLY ONCE)
        return NextResponse.json({
            success: true,
            api_key: key,
            key_id: data.id,
            name: data.name,
            warning: '⚠️ Save this key now! It will not be shown again.',
            usage: {
                header: 'Authorization: Bearer ' + key,
                example: `curl -H "Authorization: Bearer ${prefix}" https://nexus.io/api/search`
            }
        });

    } catch (err) {
        console.error('API key generation error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET - List API keys for a wallet
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json(
            { error: 'Missing wallet parameter' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, total_requests, is_active, created_at, last_request_at')
        .eq('owner_wallet', wallet)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json(
            { error: 'Failed to fetch API keys' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        wallet,
        keys: data || [],
        total: data?.length || 0
    });
}

/**
 * DELETE - Revoke an API key
 */
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { key_id, wallet, signature, message } = body;

        if (!key_id || !wallet || !signature) {
            return NextResponse.json(
                { error: 'Missing required fields: key_id, wallet, signature' },
                { status: 400 }
            );
        }

        // Verify signature
        const expectedMessage = message || `Revoke ANS API Key ${key_id}`;
        const messageBytes = new TextEncoder().encode(expectedMessage);

        try {
            const signatureBytes = bs58.decode(signature);
            const publicKey = new PublicKey(wallet);

            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKey.toBytes()
            );

            if (!verified) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        } catch (e) {
            return NextResponse.json(
                { error: 'Signature verification failed' },
                { status: 400 }
            );
        }

        // Verify ownership
        const { data: keyData } = await supabase
            .from('api_keys')
            .select('owner_wallet')
            .eq('id', key_id)
            .single();

        if (!keyData || keyData.owner_wallet !== wallet) {
            return NextResponse.json(
                { error: 'Key not found or not owned by this wallet' },
                { status: 404 }
            );
        }

        // Revoke (set inactive)
        const { error } = await supabase
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', key_id);

        if (error) {
            return NextResponse.json(
                { error: 'Failed to revoke key' },
                { status: 500 }
            );
        }

        console.log(`🔑 [API KEY] Revoked ${key_id} for ${wallet.slice(0, 8)}...`);

        return NextResponse.json({
            success: true,
            message: 'API key revoked successfully'
        });

    } catch (err) {
        console.error('API key revocation error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
