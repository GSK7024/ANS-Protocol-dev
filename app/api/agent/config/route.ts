import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Get Agent Configuration
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Missing domain name' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('domains')
        .select('name, category, service_type, api_config, payment_config, trust_tier, trust_score')
        .eq('name', name)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({ config: data });
}
