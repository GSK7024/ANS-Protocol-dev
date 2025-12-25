/**
 * Sybil-Resistant Trust (SRT) Reputation System
 * 
 * Multi-weighted algorithm for agent reputation:
 * - Stake (40%): On-chain collateral
 * - Performance (30%): Completion rate + latency
 * - Peer Feedback (20%): Weighted reviews from other agents
 * - Volume (10%): Total value transacted
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// SRT Weight Configuration
const WEIGHTS = {
    stake: 0.40,
    performance: 0.30,
    feedback: 0.20,
    volume: 0.10
};

// Tier Thresholds
const TIER_THRESHOLDS = {
    sovereign: 90,
    master: 70,
    adept: 40,
    initiate: 0
};

export type TrustTier = 'initiate' | 'adept' | 'master' | 'sovereign';

export interface SRTScore {
    srt_score: number;
    trust_tier: TrustTier;
    breakdown: {
        stake_component: number;
        performance_component: number;
        feedback_component: number;
        volume_component: number;
    };
}

/**
 * Calculate SRT score for an agent
 */
export async function calculateSRT(agentName: string): Promise<SRTScore> {
    // Fetch agent metrics
    const { data: metrics } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_name', agentName)
        .single();

    // Default values for new agents
    const stakeAmount = metrics?.stake_amount_sol || 0;
    const totalTx = metrics?.total_transactions || 0;
    const successfulTx = metrics?.successful_transactions || 0;
    const peerFeedback = metrics?.peer_feedback_score || 0.5;
    const totalVolume = metrics?.total_volume_sol || 0;

    // Normalize each factor to 0-100 scale
    // Stake: 10 SOL = 100 points (capped)
    const stakeNormalized = Math.min(stakeAmount * 10, 100);

    // Performance: completion rate (0-1 -> 0-100)
    const completionRate = totalTx > 0 ? successfulTx / totalTx : 0.5;
    const performanceNormalized = completionRate * 100;

    // Feedback: already 0-1, scale to 0-100
    const feedbackNormalized = peerFeedback * 100;

    // Volume: 100 SOL = 100 points (capped)
    const volumeNormalized = Math.min(totalVolume, 100);

    // Calculate weighted SRT
    const srt_score =
        (WEIGHTS.stake * stakeNormalized) +
        (WEIGHTS.performance * performanceNormalized) +
        (WEIGHTS.feedback * feedbackNormalized) +
        (WEIGHTS.volume * volumeNormalized);

    // Determine tier
    let trust_tier: TrustTier = 'initiate';
    if (srt_score >= TIER_THRESHOLDS.sovereign) trust_tier = 'sovereign';
    else if (srt_score >= TIER_THRESHOLDS.master) trust_tier = 'master';
    else if (srt_score >= TIER_THRESHOLDS.adept) trust_tier = 'adept';

    return {
        srt_score: Math.round(srt_score * 100) / 100,
        trust_tier,
        breakdown: {
            stake_component: Math.round(WEIGHTS.stake * stakeNormalized * 100) / 100,
            performance_component: Math.round(WEIGHTS.performance * performanceNormalized * 100) / 100,
            feedback_component: Math.round(WEIGHTS.feedback * feedbackNormalized * 100) / 100,
            volume_component: Math.round(WEIGHTS.volume * volumeNormalized * 100) / 100
        }
    };
}

/**
 * Update agent metrics after a transaction completes
 */
export async function updateMetricsAfterTransaction(
    agentName: string,
    wasSuccessful: boolean,
    transactionVolumeSol: number
): Promise<void> {
    // Fetch current metrics
    const { data: current } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_name', agentName)
        .single();

    const totalTx = (current?.total_transactions || 0) + 1;
    const successfulTx = (current?.successful_transactions || 0) + (wasSuccessful ? 1 : 0);
    const failedTx = (current?.failed_transactions || 0) + (wasSuccessful ? 0 : 1);
    const totalVolume = (current?.total_volume_sol || 0) + transactionVolumeSol;

    // Upsert metrics (trigger will recalculate SRT)
    await supabase
        .from('agent_metrics')
        .upsert({
            agent_name: agentName,
            total_transactions: totalTx,
            successful_transactions: successfulTx,
            failed_transactions: failedTx,
            total_volume_sol: totalVolume,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'agent_name' });

    console.log(`📊 [SRT] Updated metrics for ${agentName}: Tx=${totalTx}, Success=${successfulTx}, Vol=${totalVolume} SOL`);
}

/**
 * Initialize metrics for a newly registered agent
 * Called when an agent first registers in ANS
 */
export async function initializeAgentMetrics(
    agentName: string,
    initialStake: number = 0
): Promise<{ success: boolean; srt_score: number; trust_tier: TrustTier }> {
    // Check if agent already has metrics
    const { data: existing } = await supabase
        .from('agent_metrics')
        .select('agent_name')
        .eq('agent_name', agentName)
        .single();

    if (existing) {
        // Agent already exists, just return their current score
        const srt = await calculateSRT(agentName);
        return { success: true, ...srt };
    }

    // Create initial metrics for new agent
    await supabase
        .from('agent_metrics')
        .insert({
            agent_name: agentName,
            total_transactions: 0,
            successful_transactions: 0,
            failed_transactions: 0,
            stake_amount_sol: initialStake,
            total_volume_sol: 0,
            peer_feedback_score: 0.5, // Neutral starting feedback
            srt_score: 25, // Base score for new agents (0 stake + 50% perf + 50% feedback)
            trust_tier: 'initiate',
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

    console.log(`📊 [SRT] Initialized metrics for new agent: ${agentName} (Stake: ${initialStake} SOL)`);

    return {
        success: true,
        srt_score: initialStake > 0 ? Math.min(initialStake * 10 * 0.4 + 25, 100) : 25,
        trust_tier: 'initiate'
    };
}

/**
 * Record a peer review (agent-to-agent feedback)
 */
export async function recordPeerReview(
    reviewerAgent: string,
    reviewedAgent: string,
    escrowId: string,
    rating: number,
    comment?: string
): Promise<{ success: boolean; error?: string }> {
    // Validate rating
    if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Get reviewer's SRT to weight their vote
    const reviewerSRT = await calculateSRT(reviewerAgent);

    // Insert review
    const { error } = await supabase
        .from('agent_reviews')
        .insert({
            reviewer_agent: reviewerAgent,
            reviewed_agent: reviewedAgent,
            escrow_id: escrowId,
            rating,
            comment,
            reviewer_srt_at_time: reviewerSRT.srt_score
        });

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Already reviewed this transaction' };
        }
        return { success: false, error: error.message };
    }

    // Recalculate peer feedback score for reviewed agent
    await recalculatePeerFeedback(reviewedAgent);

    return { success: true };
}

/**
 * Recalculate peer feedback score (weighted average)
 */
async function recalculatePeerFeedback(agentName: string): Promise<void> {
    const { data: reviews } = await supabase
        .from('agent_reviews')
        .select('rating, reviewer_srt_at_time')
        .eq('reviewed_agent', agentName);

    if (!reviews || reviews.length === 0) return;

    // Weighted average: higher SRT reviewers have more influence
    let weightedSum = 0;
    let totalWeight = 0;

    for (const review of reviews) {
        const weight = review.reviewer_srt_at_time || 50; // Default weight
        weightedSum += review.rating * weight;
        totalWeight += weight;
    }

    // Normalize to 0-1 scale (rating 1-5 -> 0-1)
    const avgRating = totalWeight > 0 ? weightedSum / totalWeight : 3;
    const normalizedFeedback = (avgRating - 1) / 4; // Maps 1-5 to 0-1

    // Update agent metrics
    await supabase
        .from('agent_metrics')
        .update({ peer_feedback_score: normalizedFeedback })
        .eq('agent_name', agentName);

    console.log(`📊 [SRT] Updated peer feedback for ${agentName}: ${(normalizedFeedback * 100).toFixed(1)}%`);
}

/**
 * Get leaderboard of top agents by SRT
 */
export async function getLeaderboard(limit: number = 10): Promise<any[]> {
    const { data } = await supabase
        .from('agent_metrics')
        .select('agent_name, srt_score, trust_tier, total_transactions, total_volume_sol')
        .order('srt_score', { ascending: false })
        .limit(limit);

    return data || [];
}
