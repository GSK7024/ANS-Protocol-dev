import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Agent Configuration Update API
 * 
 * Saves agent's API endpoints, wallet, and service details
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { domain_name, wallet, config } = body;

        if (!domain_name || !wallet) {
            return NextResponse.json(
                { error: 'Missing domain_name or wallet' },
                { status: 400 }
            );
        }

        // Verify ownership
        const { data: domain, error: domainError } = await supabase
            .from('domains')
            .select('name, owner_wallet')
            .eq('name', domain_name)
            .single();

        if (domainError || !domain) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        if (domain.owner_wallet !== wallet) {
            return NextResponse.json({ error: 'Not authorized to modify this domain' }, { status: 403 });
        }

        // Build update object
        const updateData: any = {
            category: config.category,
            service_type: config.service_type,
            api_config: {
                quote_url: config.quote_url,
                book_url: config.book_url,
                verify_url: config.verify_url,
                webhook_url: config.webhook_url,
                api_key: config.api_key,
                configured_at: new Date().toISOString()
            },
            payment_config: {
                solana_address: config.solana_wallet
            }
        };

        // Update domain
        const { error: updateError } = await supabase
            .from('domains')
            .update(updateData)
            .eq('name', domain_name);

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
        }

        console.log(`✅ [AGENT CONFIG] ${domain_name} configuration updated`);

        return NextResponse.json({
            success: true,
            message: 'Configuration saved successfully',
            domain: domain_name
        });

    } catch (err) {
        console.error('Agent config error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
