/**
 * ANS Analytics Tracking API
 * 
 * Internal endpoint for tracking analytics events.
 * Called from other APIs (resolve, escrow, etc.)
 * 
 * POST - Track an analytics event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Valid event types
const VALID_EVENTS = [
    'lookup',
    'escrow_create',
    'escrow_lock',
    'escrow_complete',
    'escrow_dispute',
    'escrow_refund',
    'review',
    'marketplace_view',
    'api_call'
] as const;

type EventType = typeof VALID_EVENTS[number];

// Field mapping for incrementing daily analytics
const EVENT_FIELD_MAP: Record<EventType, string> = {
    'lookup': 'lookup_count',
    'escrow_create': 'escrow_created',
    'escrow_lock': 'escrow_created', // Count as created
    'escrow_complete': 'escrow_completed',
    'escrow_dispute': 'escrow_disputed',
    'escrow_refund': 'escrow_refunded',
    'review': 'reviews_received',
    'marketplace_view': 'marketplace_views',
    'api_call': 'lookup_count' // API calls count as lookups
};

/**
 * Hash IP for privacy
 */
function hashIP(ip: string): string {
    return crypto.createHash('sha256')
        .update(ip + (process.env.IP_SALT || 'ans-analytics'))
        .digest('hex')
        .substring(0, 16);
}

/**
 * Track an analytics event
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            domain_name,
            event_type,
            network = 'mainnet',
            event_data = {},
            resolver_agent,
            amount_sol
        } = body;

        // Validation
        if (!domain_name || !event_type) {
            return NextResponse.json({
                error: 'Missing required fields: domain_name, event_type'
            }, { status: 400 });
        }

        if (!VALID_EVENTS.includes(event_type)) {
            return NextResponse.json({
                error: `Invalid event_type. Must be one of: ${VALID_EVENTS.join(', ')}`
            }, { status: 400 });
        }

        // Get IP hash
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        const ipHash = hashIP(ip);

        // 1. Insert event record
        const { error: eventError } = await supabase
            .from('analytics_events')
            .insert({
                domain_name,
                event_type,
                network,
                event_data,
                ip_hash: ipHash,
                resolver_agent,
                amount_sol: amount_sol || null
            });

        if (eventError) {
            console.error('[ANALYTICS] Event insert error:', eventError);
            // Don't fail - analytics should be non-blocking
        }

        // 2. Increment daily analytics
        const field = EVENT_FIELD_MAP[event_type as EventType];

        // First ensure the row exists
        await supabase
            .from('domain_analytics')
            .upsert({
                domain_name,
                date: new Date().toISOString().split('T')[0],
                network
            }, { onConflict: 'domain_name,date,network' });

        // Then increment the field
        const { error: updateError } = await supabase.rpc('increment_analytics', {
            p_domain_name: domain_name,
            p_network: network,
            p_field: field,
            p_amount: 1
        });

        // If it's an escrow completion, also add revenue
        if (event_type === 'escrow_complete' && amount_sol) {
            await supabase.rpc('increment_analytics', {
                p_domain_name: domain_name,
                p_network: network,
                p_field: 'revenue_sol',
                p_amount: amount_sol
            });
        }

        // 3. Update unique lookups if it's a lookup event
        if (event_type === 'lookup') {
            await supabase.rpc('update_unique_lookups', {
                p_domain_name: domain_name,
                p_network: network
            });
        }

        return NextResponse.json({
            success: true,
            tracked: {
                domain: domain_name,
                event: event_type,
                network
            }
        });

    } catch (err: any) {
        console.error('[ANALYTICS] Track error:', err);
        // Return success anyway - analytics should never break the main flow
        return NextResponse.json({ success: true, warning: 'Tracking may have failed' });
    }
}

/**
 * Helper function to track events from other APIs
 * Call this without await to make it non-blocking
 */
export async function trackEvent(
    domain_name: string,
    event_type: EventType,
    options: {
        network?: string;
        resolver_agent?: string;
        amount_sol?: number;
        event_data?: Record<string, any>;
        ip?: string;
    } = {}
) {
    const { network = 'mainnet', resolver_agent, amount_sol, event_data = {}, ip = 'internal' } = options;
    const ipHash = hashIP(ip);

    try {
        // Insert event
        await supabase
            .from('analytics_events')
            .insert({
                domain_name,
                event_type,
                network,
                event_data,
                ip_hash: ipHash,
                resolver_agent,
                amount_sol
            });

        // Increment daily
        const field = EVENT_FIELD_MAP[event_type];
        await supabase.rpc('increment_analytics', {
            p_domain_name: domain_name,
            p_network: network,
            p_field: field,
            p_amount: 1
        });

        if (event_type === 'escrow_complete' && amount_sol) {
            await supabase.rpc('increment_analytics', {
                p_domain_name: domain_name,
                p_network: network,
                p_field: 'revenue_sol',
                p_amount: amount_sol
            });
        }

        if (event_type === 'lookup') {
            await supabase.rpc('update_unique_lookups', {
                p_domain_name: domain_name,
                p_network: network
            });
        }
    } catch (err) {
        console.error('[ANALYTICS] trackEvent error:', err);
    }
}
