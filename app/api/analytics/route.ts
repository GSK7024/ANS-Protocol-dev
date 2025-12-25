/**
 * ANS Analytics Query API
 * 
 * GET - Retrieve analytics for a domain or wallet
 * 
 * Query params:
 * - domain: specific domain name
 * - wallet: get all domains for a wallet
 * - period: 7d, 30d, 90d (default: 30d)
 * - network: mainnet, devnet (default: mainnet)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Period to days mapping
const PERIOD_DAYS: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': 365
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const wallet = searchParams.get('wallet');
    const period = searchParams.get('period') || '30d';
    const network = searchParams.get('network') || 'mainnet';

    // Validation
    if (!domain && !wallet) {
        return NextResponse.json({
            error: 'Provide either domain or wallet parameter'
        }, { status: 400 });
    }

    const days = PERIOD_DAYS[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    try {
        if (domain) {
            // Single domain analytics
            return await getDomainAnalytics(domain, network, startDateStr, days);
        } else if (wallet) {
            // Dashboard - all domains for wallet
            return await getDashboardAnalytics(wallet, network, startDateStr, days);
        }
    } catch (err: any) {
        console.error('[ANALYTICS] Query error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * Get analytics for a single domain
 */
async function getDomainAnalytics(
    domain: string,
    network: string,
    startDate: string,
    days: number
) {
    // Get daily breakdown
    const { data: dailyData, error: dailyError } = await supabase
        .from('domain_analytics')
        .select('*')
        .eq('domain_name', domain)
        .eq('network', network)
        .gte('date', startDate)
        .order('date', { ascending: true });

    if (dailyError) throw dailyError;

    // Calculate summary
    const summary = {
        total_lookups: 0,
        unique_lookups: 0,
        total_escrows: 0,
        completed_escrows: 0,
        disputed_escrows: 0,
        revenue_sol: 0,
        avg_srt: 0,
        total_reviews: 0,
        avg_rating: 0,
        marketplace_views: 0
    };

    let srtSum = 0;
    let srtCount = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const day of (dailyData || [])) {
        summary.total_lookups += day.lookup_count || 0;
        summary.unique_lookups += day.unique_lookups || 0;
        summary.total_escrows += day.escrow_created || 0;
        summary.completed_escrows += day.escrow_completed || 0;
        summary.disputed_escrows += day.escrow_disputed || 0;
        summary.revenue_sol += parseFloat(day.revenue_sol) || 0;
        summary.total_reviews += day.reviews_received || 0;
        summary.marketplace_views += day.marketplace_views || 0;

        if (day.srt_score) {
            srtSum += parseFloat(day.srt_score);
            srtCount++;
        }
        if (day.avg_rating) {
            ratingSum += parseFloat(day.avg_rating);
            ratingCount++;
        }
    }

    summary.avg_srt = srtCount > 0 ? Math.round(srtSum / srtCount) : 0;
    summary.avg_rating = ratingCount > 0 ? Math.round(ratingSum / ratingCount * 10) / 10 : 0;

    // Calculate success rate
    const successRate = summary.total_escrows > 0
        ? Math.round((summary.completed_escrows / summary.total_escrows) * 100)
        : 100;

    // Get recent events
    const { data: recentEvents } = await supabase
        .from('analytics_events')
        .select('event_type, created_at, resolver_agent, amount_sol')
        .eq('domain_name', domain)
        .eq('network', network)
        .order('created_at', { ascending: false })
        .limit(10);

    return NextResponse.json({
        domain,
        network,
        period: `${days}d`,
        summary: {
            ...summary,
            success_rate: successRate
        },
        daily: (dailyData || []).map(d => ({
            date: d.date,
            lookups: d.lookup_count || 0,
            escrows: d.escrow_created || 0,
            revenue: parseFloat(d.revenue_sol) || 0,
            views: d.marketplace_views || 0
        })),
        recent_events: (recentEvents || []).map(e => ({
            type: e.event_type,
            time: e.created_at,
            resolver: e.resolver_agent,
            amount: e.amount_sol
        }))
    });
}

/**
 * Get dashboard analytics for all domains owned by wallet
 */
async function getDashboardAnalytics(
    wallet: string,
    network: string,
    startDate: string,
    days: number
) {
    // First get all domains owned by this wallet
    const { data: domains, error: domainError } = await supabase
        .from('domains')
        .select('name, status, created_at')
        .eq('owner_wallet', wallet)
        .eq('network', network);

    if (domainError) throw domainError;

    if (!domains || domains.length === 0) {
        return NextResponse.json({
            wallet,
            network,
            period: `${days}d`,
            total_domains: 0,
            summary: {
                total_lookups: 0,
                total_revenue: 0,
                total_escrows: 0,
                avg_srt: 0
            },
            domains: []
        });
    }

    const domainNames = domains.map(d => d.name);

    // Get aggregated analytics for all domains
    const { data: analytics, error: analyticsError } = await supabase
        .from('domain_analytics')
        .select('*')
        .in('domain_name', domainNames)
        .eq('network', network)
        .gte('date', startDate);

    if (analyticsError) throw analyticsError;

    // Aggregate per domain
    const domainStats: Record<string, {
        lookups: number;
        revenue: number;
        escrows: number;
        srt: number;
    }> = {};

    for (const name of domainNames) {
        domainStats[name] = { lookups: 0, revenue: 0, escrows: 0, srt: 0 };
    }

    let totalLookups = 0;
    let totalRevenue = 0;
    let totalEscrows = 0;
    let srtSum = 0;
    let srtCount = 0;

    for (const row of (analytics || [])) {
        const stats = domainStats[row.domain_name];
        if (stats) {
            stats.lookups += row.lookup_count || 0;
            stats.revenue += parseFloat(row.revenue_sol) || 0;
            stats.escrows += row.escrow_created || 0;
            if (row.srt_score) {
                stats.srt = parseFloat(row.srt_score);
                srtSum += stats.srt;
                srtCount++;
            }
        }

        totalLookups += row.lookup_count || 0;
        totalRevenue += parseFloat(row.revenue_sol) || 0;
        totalEscrows += row.escrow_created || 0;
    }

    // Format domain list sorted by lookups
    const domainList = Object.entries(domainStats)
        .map(([name, stats]) => ({
            name: name.replace('agent://', '').replace('dev.agent://', ''),
            full_name: name,
            lookups: stats.lookups,
            revenue: Math.round(stats.revenue * 100) / 100,
            escrows: stats.escrows,
            srt: stats.srt || 0
        }))
        .sort((a, b) => b.lookups - a.lookups);

    return NextResponse.json({
        wallet,
        network,
        period: `${days}d`,
        total_domains: domains.length,
        summary: {
            total_lookups: totalLookups,
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_escrows: totalEscrows,
            avg_srt: srtCount > 0 ? Math.round(srtSum / srtCount) : 0
        },
        domains: domainList
    });
}
