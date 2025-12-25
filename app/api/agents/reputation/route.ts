import { NextRequest, NextResponse } from 'next/server';
import { calculateSRT, getLeaderboard } from '@/lib/reputation';
import { runSecurityChecks, rateLimitHeaders } from '@/lib/securityMiddleware';
import { validateAgentName } from '@/lib/validation';
import { logAudit } from '@/lib/auditLog';

/**
 * GET /api/agents/reputation?agent=name
 * Returns SRT score and breakdown for a specific agent
 * 
 * GET /api/agents/reputation?leaderboard=true&limit=10
 * Returns top agents by SRT score
 */
export async function GET(req: NextRequest) {
    // 🔒 Security check
    const secResult = await runSecurityChecks(req, 'read');
    if (!secResult.ok) return secResult.response;
    const { context } = secResult;

    try {
        const { searchParams } = new URL(req.url);
        const agentName = searchParams.get('agent');
        const isLeaderboard = searchParams.get('leaderboard') === 'true';
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Cap at 100

        // Leaderboard mode
        if (isLeaderboard) {
            const leaderboard = await getLeaderboard(limit);

            await logAudit({
                action_type: 'reputation_query',
                actor_ip: context.ip,
                target_entity: 'leaderboard',
                request_id: context.requestId
            });

            return NextResponse.json({
                success: true,
                leaderboard,
                timestamp: new Date().toISOString()
            }, { headers: rateLimitHeaders(context) });
        }

        // Individual agent lookup
        if (!agentName) {
            return NextResponse.json(
                { error: 'Missing agent parameter. Use ?agent=name or ?leaderboard=true' },
                { status: 400, headers: rateLimitHeaders(context) }
            );
        }

        // 🔒 Validate agent name
        const validation = validateAgentName(agentName);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400, headers: rateLimitHeaders(context) }
            );
        }

        const srt = await calculateSRT(validation.sanitized || agentName);

        await logAudit({
            action_type: 'reputation_query',
            actor_ip: context.ip,
            target_entity: 'agent',
            target_id: agentName,
            request_id: context.requestId
        });

        return NextResponse.json({
            success: true,
            agent: `agent://${validation.sanitized || agentName}`,
            srt_score: srt.srt_score,
            trust_tier: srt.trust_tier,
            breakdown: srt.breakdown,
            timestamp: new Date().toISOString()
        }, { headers: rateLimitHeaders(context) });

    } catch (err) {
        console.error('Reputation API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
