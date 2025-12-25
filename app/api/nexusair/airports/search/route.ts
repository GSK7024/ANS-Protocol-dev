import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * NexusAir Airport Search API
 * 
 * Search for airports by city name, code, or aliases
 * Supports fuzzy matching for user queries like "delhi", "mumbai airport", etc.
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || searchParams.get('query') || '';
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!query || query.length < 2) {
            return NextResponse.json({
                error: 'Query must be at least 2 characters',
                hint: 'Try: /api/nexusair/airports/search?q=delhi'
            }, { status: 400 });
        }

        const searchTerm = query.toLowerCase().trim();

        // Search by code, city, name, or aliases
        const { data: airports, error } = await supabase
            .from('airports')
            .select('code, name, city, city_aliases, state, terminals, is_international')
            .or(`code.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
            .limit(limit);

        if (error) {
            console.error('Airport search error:', error);
            return NextResponse.json({ error: 'Search failed' }, { status: 500 });
        }

        // Also search in aliases (array search)
        const { data: aliasMatches } = await supabase
            .from('airports')
            .select('code, name, city, city_aliases, state, terminals, is_international')
            .contains('city_aliases', [query])
            .limit(limit);

        // Merge and dedupe results
        const allResults = [...(airports || [])];
        for (const match of (aliasMatches || [])) {
            if (!allResults.find(a => a.code === match.code)) {
                allResults.push(match);
            }
        }

        // Format response
        const formatted = allResults.map(airport => ({
            code: airport.code,
            name: airport.name,
            city: airport.city,
            displayName: `${airport.city} (${airport.code})`,
            fullDisplayName: `${airport.name} (${airport.code})`,
            state: airport.state,
            terminals: airport.terminals,
            isInternational: airport.is_international,
            aliases: airport.city_aliases
        }));

        return NextResponse.json({
            success: true,
            query: query,
            count: formatted.length,
            airports: formatted
        });

    } catch (err: any) {
        console.error('Airport search error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
