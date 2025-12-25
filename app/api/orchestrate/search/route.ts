import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCombinedRateLimit } from '@/utils/auth';

// Use Service Role for database access
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface AgentOption {
    agent: string;
    agent_name: string;
    price: number;
    currency: string;
    trust_score: number;
    is_verified: boolean;
    verification_tier: string;
    response_time_ms: number;
    details: any;
}

/**
 * ANS Orchestrator - Search Endpoint
 * 
 * Discovers agents by category, fetches live quotes from their APIs,
 * and returns ranked options to the caller.
 */
export async function POST(req: NextRequest) {
    // 🛡️ THE SHIELD: API Key or IP-based Rate Limiting
    const rateCheck = await withCombinedRateLimit(req);
    if (!rateCheck.allowed) {
        return rateCheck.error;
    }

    const startTime = Date.now();

    try {
        const body = await req.json();
        const { category, intent, params, include_unverified, sort_by } = body;
        // sort_by options: 'price' (cheapest), 'trust' (safest), 'balanced' (default)

        // Validation
        if (!category) {
            return NextResponse.json(
                { error: 'Missing required field: category' },
                { status: 400 }
            );
        }

        console.log(`🔍 [ORCHESTRATOR] Search request: ${category}/${intent}`);

        // VERIFIED FILTER LOGIC:
        // - For transactional intents (book, buy, purchase), default to verified sellers
        // - User can override with include_unverified: true
        const transactionalIntents = ['book', 'buy', 'purchase', 'order', 'reserve'];
        const isTransactional = intent && transactionalIntents.includes(intent.toLowerCase());
        const verifiedOnly = isTransactional && !include_unverified;

        // 1. Find agents by category with API config
        let agentQuery = supabase
            .from('domains')
            .select('name, owner_wallet, category, trust_score, api_config, is_verified, verification_tier')
            .ilike('category', category)
            .eq('status', 'active')
            .not('api_config', 'is', null)
            .order('trust_score', { ascending: false })
            .limit(10);

        // Apply verified filter for transactional intents
        if (verifiedOnly) {
            agentQuery = agentQuery.eq('is_verified', true);
            console.log(`   🛡️ Verified-only filter applied (transactional intent: ${intent})`);
        }

        const { data: agents, error: dbError } = await agentQuery;

        if (dbError) {
            console.error('DB error:', dbError);
            return NextResponse.json(
                { error: 'Database error: ' + dbError.message },
                { status: 500 }
            );
        }

        if (!agents || agents.length === 0) {
            return NextResponse.json({
                success: true,
                options: [],
                message: 'No agents found for this category'
            });
        }

        console.log(`   Found ${agents.length} agents with API config`);

        // 2. Fetch live quotes from each agent's API
        const options: AgentOption[] = [];
        const warnings: string[] = [];

        for (const agent of agents) {
            const apiConfig = agent.api_config as any;

            if (!apiConfig?.quote_url) {
                console.log(`   ⚠️ ${agent.name}: No quote_url configured`);
                continue;
            }

            try {
                // Build query URL
                let quoteUrl = apiConfig.quote_url;
                if (params) {
                    const queryParams = new URLSearchParams(params).toString();
                    quoteUrl += (quoteUrl.includes('?') ? '&' : '?') + queryParams;
                }

                console.log(`   📡 Calling ${agent.name}: ${quoteUrl}`);

                // Call agent's API with timeout
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const quoteStart = Date.now();
                const response = await fetch(quoteUrl, {
                    signal: controller.signal,
                    headers: apiConfig.api_key ? {
                        'Authorization': `Bearer ${apiConfig.api_key}`
                    } : {}
                });
                clearTimeout(timeout);

                const responseTime = Date.now() - quoteStart;

                if (!response.ok) {
                    console.log(`   ❌ ${agent.name}: HTTP ${response.status}`);
                    continue;
                }

                const quoteData = await response.json();

                // Extract flights/options from agent response
                const agentFlights = quoteData.flights || quoteData.options || [quoteData];

                for (const flight of agentFlights) {
                    // Only include this agent's flights
                    if (flight.agent && flight.agent !== agent.name) continue;

                    options.push({
                        agent: `agent://${agent.name}`,
                        agent_name: flight.airline_name || agent.name,
                        price: flight.price_sol || flight.price || 0,
                        currency: 'SOL',
                        trust_score: agent.trust_score || 0.5,
                        is_verified: agent.is_verified || false,
                        verification_tier: agent.verification_tier || 'none',
                        response_time_ms: responseTime,
                        details: {
                            flight_id: flight.id,
                            from: flight.from || params?.from,
                            to: flight.to || params?.to,
                            departure: flight.departure,
                            arrival: flight.arrival,
                            available_seats: flight.available_seats
                        }
                    });
                }

                console.log(`   ✅ ${agent.name}: ${responseTime}ms`);

            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log(`   ⏱️ ${agent.name}: Timeout`);
                    warnings.push(`${agent.name} timed out`);
                } else {
                    console.log(`   ❌ ${agent.name}: ${err.message}`);
                }
            }
        }

        // 3. Rank options based on user preference
        // SORT OPTIONS: 'price' (cheapest), 'trust' (safest), 'balanced' (default)
        const sortMode = sort_by || 'balanced';

        options.sort((a, b) => {
            // Verified sellers get a SMALL boost (1.2x, not 2x - be fair to legit unverified)
            const verifiedBoostA = (a as any).is_verified ? 1.2 : 1.0;
            const verifiedBoostB = (b as any).is_verified ? 1.2 : 1.0;

            if (sortMode === 'price') {
                // CHEAPEST FIRST - but still filter out scammers (trust < 0.5)
                // Scammers can't win by being cheap
                if (a.trust_score < 0.5 && b.trust_score >= 0.5) return 1;
                if (b.trust_score < 0.5 && a.trust_score >= 0.5) return -1;
                return a.price - b.price; // Lower price = better
            }

            if (sortMode === 'trust') {
                // SAFEST FIRST - pure trust ranking with verified boost
                return (b.trust_score * verifiedBoostB) - (a.trust_score * verifiedBoostA);
            }

            // BALANCED (default) - trust matters but price is considered
            const trustMultiplierA = a.trust_score;
            const trustMultiplierB = b.trust_score;
            const valueScoreA = 1 - Math.min(a.price || 0.5, 1);
            const valueScoreB = 1 - Math.min(b.price || 0.5, 1);
            const speedScoreA = Math.max(0, 1 - ((a.response_time_ms || 1000) / 5000));
            const speedScoreB = Math.max(0, 1 - ((b.response_time_ms || 1000) / 5000));
            const baseScoreA = (valueScoreA * 0.6) + (speedScoreA * 0.4);
            const baseScoreB = (valueScoreB * 0.6) + (speedScoreB * 0.4);
            const finalScoreA = baseScoreA * trustMultiplierA * verifiedBoostA;
            const finalScoreB = baseScoreB * trustMultiplierB * verifiedBoostB;
            return finalScoreB - finalScoreA;
        });

        // 4. Add warnings for low trust agents
        const lowTrustAgents = options.filter(o => o.trust_score < 0.5);
        if (lowTrustAgents.length > 0) {
            warnings.push(`⚠️ ${lowTrustAgents.length} option(s) have low trust scores - proceed with caution`);
        }

        const totalTime = Date.now() - startTime;
        console.log(`🔍 [ORCHESTRATOR] Search complete: ${options.length} options in ${totalTime}ms`);

        return NextResponse.json({
            success: true,
            category,
            intent,
            params,
            options,
            total_options: options.length,
            search_time_ms: totalTime,
            warnings: warnings.length > 0 ? warnings : undefined
        });

    } catch (err) {
        console.error('Orchestrator search error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
