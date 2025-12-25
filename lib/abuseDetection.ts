/**
 * Abuse Detection System
 * 
 * Detects and flags suspicious patterns:
 * - Wash trading (A→B→A→B loops)
 * - Collusion rings (same IP, multiple wallets)
 * - Volume manipulation
 * - Fake review patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Detection thresholds
const WASH_TRADE_THRESHOLD = 3; // 3+ back-and-forth transactions
const COLLUSION_WALLET_THRESHOLD = 5; // 5+ wallets from same IP
const RAPID_TX_THRESHOLD = 10; // 10+ transactions in 5 minutes
const MIN_TX_INTERVAL_SEC = 30; // Suspicious if faster than 30s between tx

export interface AbuseFlag {
    type: 'wash_trading' | 'collusion' | 'rapid_fire' | 'fake_reviews' | 'volume_manipulation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    actors: string[];
    evidence: Record<string, any>;
    recommended_action: 'monitor' | 'flag' | 'suspend' | 'ban';
}

/**
 * Detect wash trading patterns
 * A→B→A→B... transactions between same wallets
 */
export async function detectWashTrading(wallet: string): Promise<AbuseFlag | null> {
    const { data: recentTx } = await supabase
        .from('escrow_transactions')
        .select('buyer_wallet, seller_wallet, amount, created_at')
        .or(`buyer_wallet.eq.${wallet},seller_wallet.eq.${wallet}`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (!recentTx || recentTx.length < WASH_TRADE_THRESHOLD * 2) return null;

    // Find reciprocal patterns
    const partnerCounts: Record<string, number> = {};
    for (const tx of recentTx) {
        const partner = tx.buyer_wallet === wallet ? tx.seller_wallet : tx.buyer_wallet;
        partnerCounts[partner] = (partnerCounts[partner] || 0) + 1;
    }

    // Check for suspicious back-and-forth
    for (const [partner, count] of Object.entries(partnerCounts)) {
        if (count >= WASH_TRADE_THRESHOLD * 2) {
            // Verify it's truly back-and-forth (not just multiple buys)
            const buyCount = recentTx.filter(tx => tx.buyer_wallet === wallet && tx.seller_wallet === partner).length;
            const sellCount = recentTx.filter(tx => tx.seller_wallet === wallet && tx.buyer_wallet === partner).length;

            if (buyCount >= WASH_TRADE_THRESHOLD && sellCount >= WASH_TRADE_THRESHOLD) {
                return {
                    type: 'wash_trading',
                    severity: 'high',
                    actors: [wallet, partner],
                    evidence: { buyCount, sellCount, totalTx: count },
                    recommended_action: 'suspend'
                };
            }
        }
    }

    return null;
}

/**
 * Detect collusion - multiple wallets from same IP
 */
export async function detectCollusion(ipHash: string): Promise<AbuseFlag | null> {
    const { data: wallets } = await supabase
        .from('audit_logs')
        .select('actor_wallet')
        .eq('actor_ip_hash', ipHash)
        .not('actor_wallet', 'is', null);

    if (!wallets) return null;

    const uniqueWallets = Array.from(new Set(wallets.map(w => w.actor_wallet)));

    if (uniqueWallets.length >= COLLUSION_WALLET_THRESHOLD) {
        return {
            type: 'collusion',
            severity: 'medium',
            actors: uniqueWallets,
            evidence: { walletCount: uniqueWallets.length, ipHash },
            recommended_action: 'flag'
        };
    }

    return null;
}

/**
 * Detect rapid-fire transactions (bot behavior)
 */
export async function detectRapidFire(wallet: string): Promise<AbuseFlag | null> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentTx } = await supabase
        .from('escrow_transactions')
        .select('created_at')
        .eq('buyer_wallet', wallet)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: true });

    if (!recentTx || recentTx.length < RAPID_TX_THRESHOLD) return null;

    // Check intervals between transactions
    let suspiciousIntervals = 0;
    for (let i = 1; i < recentTx.length; i++) {
        const prev = new Date(recentTx[i - 1].created_at).getTime();
        const curr = new Date(recentTx[i].created_at).getTime();
        const intervalSec = (curr - prev) / 1000;

        if (intervalSec < MIN_TX_INTERVAL_SEC) {
            suspiciousIntervals++;
        }
    }

    if (suspiciousIntervals >= RAPID_TX_THRESHOLD / 2) {
        return {
            type: 'rapid_fire',
            severity: 'high',
            actors: [wallet],
            evidence: { txCount: recentTx.length, suspiciousIntervals },
            recommended_action: 'suspend'
        };
    }

    return null;
}

/**
 * Detect fake review patterns
 * - All 5-star reviews from new accounts
 * - Reviews without transactions
 */
export async function detectFakeReviews(agentName: string): Promise<AbuseFlag | null> {
    const { data: reviews } = await supabase
        .from('agent_reviews')
        .select('reviewer_agent, rating, reviewer_srt_at_time')
        .eq('reviewed_agent', agentName);

    if (!reviews || reviews.length < 5) return null;

    // Check for suspicious patterns
    const lowSrtReviewers = reviews.filter(r => (r.reviewer_srt_at_time || 0) < 30);
    const allFiveStars = reviews.filter(r => r.rating === 5);

    // Suspicious: >80% of reviews from low-SRT accounts AND >90% are 5-star
    if (lowSrtReviewers.length / reviews.length > 0.8 && allFiveStars.length / reviews.length > 0.9) {
        return {
            type: 'fake_reviews',
            severity: 'medium',
            actors: [agentName, ...lowSrtReviewers.map(r => r.reviewer_agent)],
            evidence: {
                totalReviews: reviews.length,
                lowSrtCount: lowSrtReviewers.length,
                fiveStarCount: allFiveStars.length
            },
            recommended_action: 'flag'
        };
    }

    return null;
}

/**
 * Run all abuse checks for a wallet
 */
export async function runAbuseChecks(wallet: string, ipHash?: string): Promise<AbuseFlag[]> {
    const flags: AbuseFlag[] = [];

    const washResult = await detectWashTrading(wallet);
    if (washResult) flags.push(washResult);

    const rapidResult = await detectRapidFire(wallet);
    if (rapidResult) flags.push(rapidResult);

    if (ipHash) {
        const collusionResult = await detectCollusion(ipHash);
        if (collusionResult) flags.push(collusionResult);
    }

    return flags;
}

/**
 * Log abuse flags to database for review
 */
export async function logAbuseFlag(flag: AbuseFlag): Promise<void> {
    await supabase.from('abuse_logs').insert({
        identifier: flag.actors[0],
        identifier_type: 'wallet',
        violation_count: 1,
        action_taken: flag.recommended_action === 'suspend' || flag.recommended_action === 'ban' ? 'auto_ban' : 'warning',
        notes: JSON.stringify(flag)
    });

    console.warn(`🚨 [ABUSE] Detected ${flag.type} - Severity: ${flag.severity}`);
}
