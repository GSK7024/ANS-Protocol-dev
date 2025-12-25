import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * ANS Discover API
 * 
 * Search for registered agents by category, capability, or query.
 * Uses SERVICE ROLE KEY for full database access.
 * 
 * Example: GET /api/discover?category=airlines
 * Example: GET /api/discover?category=hotels
 * Example: GET /api/discover?query=flight booking
 */

// Create admin client with service role for full access
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    try {
        let dbQuery = supabaseAdmin
            .from('domains')
            .select(`
                name,
                status,
                category,
                service_type,
                trust_score,
                trust_tier,
                is_verified,
                api_config,
                payment_config,
                owner_wallet
            `)
            .eq('status', 'active')
            .order('trust_score', { ascending: false, nullsFirst: false })
            .limit(limit);

        // Filter by category
        if (category) {
            dbQuery = dbQuery.eq('category', category);
        }

        // Text search (if query provided)
        if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,category.ilike.%${query}%`);
        }

        const { data: agents, error } = await dbQuery;

        if (error) {
            console.error('Discover DB error:', error);
        }

        // Format results from database
        let results: any[] = [];

        if (!error && agents && agents.length > 0) {
            results = agents.map(agent => ({
                agent: `agent://${agent.name}`,
                name: agent.name,
                category: agent.category || 'uncategorized',
                service_type: agent.service_type,
                trust_score: agent.trust_score || 0,
                trust_tier: agent.trust_tier || 'initiate',
                verified: agent.is_verified || false,
                endpoint: (agent.api_config as any)?.quote_url || `/api/sellers/${agent.name}`,
                wallet: agent.owner_wallet,
                api_config: agent.api_config,
                payment_config: agent.payment_config
            }));
        }

        // If still no results, try getting ALL active domains
        if (results.length === 0) {
            console.log('No agents found for category:', category, '- Trying all active domains');

            const { data: allAgents, error: allError } = await supabaseAdmin
                .from('domains')
                .select('*')
                .eq('status', 'active')
                .limit(20);

            if (!allError && allAgents) {
                console.log('Found', allAgents.length, 'total active domains');

                // Filter by category name matching
                const categoryKeywords: Record<string, string[]> = {
                    'airlines': ['air', 'flight', 'airline', 'travel'],
                    'hotels': ['hotel', 'marriott', 'booking', 'stay'],
                    'shopping': ['shop', 'flipkart', 'amazon', 'buy', 'ecommerce']
                };

                const keywords = category ? categoryKeywords[category] || [] : [];

                results = allAgents
                    .filter(a => {
                        if (!category) return true;
                        const name = a.name?.toLowerCase() || '';
                        const cat = a.category?.toLowerCase() || '';
                        return keywords.some(k => name.includes(k) || cat.includes(k));
                    })
                    .map(agent => ({
                        agent: `agent://${agent.name}`,
                        name: agent.name,
                        category: agent.category || category || 'uncategorized',
                        service_type: agent.service_type,
                        trust_score: agent.trust_score || 0,
                        trust_tier: agent.trust_tier || 'initiate',
                        verified: agent.is_verified || false,
                        endpoint: (agent.api_config as any)?.quote_url || `/api/sellers/${agent.name}`,
                        wallet: agent.owner_wallet,
                        api_config: agent.api_config,
                        payment_config: agent.payment_config
                    }));
            }
        }

        return NextResponse.json({
            success: true,
            query: { category, query },
            agents: results,
            total: results.length,
            source: 'database'
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (e: any) {
        console.error('Discover error:', e);
        return NextResponse.json({
            success: false,
            error: e.message,
            agents: []
        }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
    });
}
