import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { withCombinedRateLimit } from '@/utils/auth';
import { cache } from '@/utils/cache';

export async function GET(req: NextRequest) {
    // 🛡️ RATE LIMITING
    const rateCheck = await withCombinedRateLimit(req);
    if (!rateCheck.allowed) {
        return rateCheck.error;
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const network = searchParams.get('network') || 'mainnet';

    if (!name) {
        return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
    }

    // Clean the name and build full domain name with correct prefix
    const cleanName = name.toLowerCase()
        .replace('agent://', '')
        .replace('dev.agent://', '')
        .replace('dev.', '');

    // Build full domain name with correct prefix based on network
    const domainPrefix = network === 'devnet' ? 'dev.agent://' : 'agent://';
    const fullDomainName = `${domainPrefix}${cleanName}`;

    const cacheKey = `resolve:${network}:${cleanName}`;

    try {
        // ⚡ CACHE LOOKUP (Read-Through)
        const agentData = await cache.fetch(cacheKey, async () => {
            // First try with full prefix
            let { data, error } = await supabase
                .from('domains')
                .select(`
                    name,
                    status,
                    created_at,
                    owner_wallet,
                    network,
                    profiles (wallet_address),
                    endpoints (url, docs_url)
                `)
                .eq('name', fullDomainName)
                .single();

            // Fallback: try without prefix (for backward compatibility)
            if (error || !data) {
                const fallback = await supabase
                    .from('domains')
                    .select(`
                        name,
                        status,
                        created_at,
                        owner_wallet,
                        network,
                        profiles (wallet_address),
                        endpoints (url, docs_url)
                    `)
                    .eq('name', cleanName)
                    .eq('network', network)
                    .single();

                data = fallback.data;
                error = fallback.error;
            }

            if (error || !data) return null;

            // Format Response (Cache the final result)
            return {
                protocol: "agent",
                name: data.name,
                status: data.status,
                network: data.network || network,
                owner: (data.profiles as any)?.wallet_address || data.owner_wallet || "Unknown",
                resolution: {
                    endpoint: (data.endpoints as any)?.url || null,
                    docs: (data.endpoints as any)?.docs_url || null,
                },
                meta: {
                    minted_at: data.created_at
                }
            };
        }, 60); // Cache for 60 seconds

        if (!agentData) {
            return NextResponse.json({ error: "Domain not found", code: 404 }, { status: 404 });
        }

        // 📊 ANALYTICS: Track this lookup (non-blocking)
        try {
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || req.headers.get('x-real-ip')
                || 'unknown';

            fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/analytics/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain_name: fullDomainName,
                    event_type: 'lookup',
                    network,
                    event_data: { resolver_ip_hash: ip.slice(0, 8) }
                })
            }).catch(() => { }); // Fire and forget
        } catch { } // Non-blocking

        return NextResponse.json(agentData, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'X-Cache': 'HIT'
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
