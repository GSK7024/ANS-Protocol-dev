/**
 * Admin API - Verify Seller
 * 
 * POST - Set verification status for a domain
 * Only accessible with admin credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🔒 SECURITY FIX: NO DEFAULT FALLBACK - Admin key MUST be set in env
const ADMIN_KEY = process.env.ANS_ADMIN_KEY;

export async function POST(req: NextRequest) {
    try {
        // 🔒 SECURITY: Require admin key to be configured
        if (!ADMIN_KEY) {
            console.error('🚨 SECURITY: ANS_ADMIN_KEY not configured!');
            return NextResponse.json({ error: 'Admin system not configured' }, { status: 500 });
        }

        // Check admin authorization
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { domain_name, verified, tier, kyb_data } = body;

        // Validation
        if (!domain_name) {
            return NextResponse.json(
                { error: 'Missing required field: domain_name' },
                { status: 400 }
            );
        }

        const validTiers = ['none', 'bronze', 'silver', 'gold'];
        if (tier && !validTiers.includes(tier)) {
            return NextResponse.json(
                { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
                { status: 400 }
            );
        }

        // Update verification status
        const updateData: any = {
            is_verified: verified !== false,
            verification_tier: tier || 'bronze',
            verified_at: verified !== false ? new Date().toISOString() : null
        };

        if (kyb_data) {
            updateData.kyb_data = kyb_data;
        }

        const { data, error } = await supabase
            .from('domains')
            .update(updateData)
            .eq('name', domain_name)
            .select('name, is_verified, verification_tier, verified_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        console.log(`✅ [ADMIN] Verified ${domain_name} as ${tier || 'bronze'}`);

        return NextResponse.json({
            success: true,
            message: `${domain_name} is now ${verified !== false ? 'VERIFIED' : 'UNVERIFIED'}`,
            domain: data
        });

    } catch (err) {
        console.error('Admin verify error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
