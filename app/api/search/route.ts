import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { withCombinedRateLimit } from '@/utils/auth';

export async function GET(req: NextRequest) {
    // 🛡️ THE SHIELD: API Key or IP-based Rate Limiting
    const rateCheck = await withCombinedRateLimit(req);
    if (!rateCheck.allowed) {
        return rateCheck.error;
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const skill = searchParams.get('skill');
    const verifiedOnly = searchParams.get('verified_only') === 'true';

    try {
        let query = supabase
            .from('domains')
            .select(`
                name,
                category,
                tags,
                tags,
                skills,
                trust_score,
                is_verified,
                verification_tier,
                endpoints (url)
            `)
            .eq('status', 'active')
            .order('trust_score', { ascending: false });

        // Filter by verified only if requested
        if (verifiedOnly) {
            query = query.eq('is_verified', true);
        }

        if (category) {
            query = query.eq('category', category);
        }

        if (tag) {
            // Using Supabase array 'contains' overlap filter
            query = query.contains('tags', [tag]);
        }

        if (skill) {
            // For JSONB array of objects, we use the @> operator to check containment
            // This checks if the 'skills' array contains an object with {"name": "skill_name"}
            query = query.contains('skills', JSON.stringify([{ name: skill }]));
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Format for Agent Consumption
        const results = data?.map((d: any) => ({
            name: `agent://${d.name}`,
            category: d.category,
            tags: d.tags,
            trust_score: d.trust_score || 0,
            // Return the full skills array so the agent can see prices & quote_urls
            skills: d.skills,
            endpoint: d.endpoints?.url || null
        }));

        return NextResponse.json({
            count: results?.length || 0,
            query: { category, tag },
            agents: results
        }, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
