import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Security thresholds
const MIN_SELLER_TRUST = 0.5;  // 50% trust score
const MIN_SELLER_STAKE = 5;    // 5 SOL minimum

/**
 * Vault Consent Request API
 * 
 * Requests access to another agent's vault data for booking.
 * The target agent must approve before data is shared.
 * 
 * POST /api/vault/consent/request
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            requester_wallet,   // Who is requesting (buyer)
            target_agent,       // agent://friend or wallet address
            seller_agent,       // agent://nexusair
            fields_requested,   // ["full_name", "dob", "passport"]
            purpose,            // "flight_booking"
            booking_context     // { route: "DEL-GOA", date: "2025-12-26" }
        } = body;

        // Validation
        if (!requester_wallet || !target_agent || !seller_agent) {
            return NextResponse.json({
                error: 'Missing required fields: requester_wallet, target_agent, seller_agent'
            }, { status: 400 });
        }

        if (!fields_requested || fields_requested.length === 0) {
            return NextResponse.json({
                error: 'fields_requested array required'
            }, { status: 400 });
        }

        // Clean agent names
        const cleanSeller = seller_agent.replace('agent://', '').toLowerCase();
        const cleanTarget = target_agent.replace('agent://', '').toLowerCase();

        console.log(`🔐 [VAULT-CONSENT] Request from ${requester_wallet.slice(0, 8)}... for ${cleanTarget}'s data`);

        // 1. Verify seller exists and has sufficient trust
        const { data: sellerData, error: sellerError } = await supabase
            .from('domains')
            .select('name, trust_score, stake_amount, is_flagged, seller_config')
            .eq('name', cleanSeller)
            .single();

        if (sellerError || !sellerData) {
            return NextResponse.json({
                error: `Seller agent://${cleanSeller} not found`
            }, { status: 404 });
        }

        // 2. Security checks - seller must meet requirements
        if (sellerData.is_flagged) {
            return NextResponse.json({
                error: 'Cannot share vault data with flagged sellers',
                reason: 'SELLER_BLOCKED'
            }, { status: 403 });
        }

        if ((sellerData.trust_score || 0) < MIN_SELLER_TRUST) {
            return NextResponse.json({
                error: `Seller trust score too low (${(sellerData.trust_score * 100).toFixed(0)}%). Minimum ${MIN_SELLER_TRUST * 100}% required.`,
                reason: 'INSUFFICIENT_TRUST',
                seller_trust: sellerData.trust_score
            }, { status: 403 });
        }

        if ((sellerData.stake_amount || 0) < MIN_SELLER_STAKE) {
            return NextResponse.json({
                error: `Seller stake too low (${sellerData.stake_amount} SOL). Minimum ${MIN_SELLER_STAKE} SOL required.`,
                reason: 'INSUFFICIENT_STAKE',
                seller_stake: sellerData.stake_amount
            }, { status: 403 });
        }

        console.log(`   ✅ Seller ${cleanSeller} passed security checks`);

        // 3. Check if target is 'self' or 'me' (auto-approve)
        if (cleanTarget === 'self' || cleanTarget === 'me') {
            // Auto-approved for self
            return NextResponse.json({
                success: true,
                consent_id: 'self',
                status: 'auto_approved',
                target: 'self',
                message: 'Self vault access auto-approved',
                fields_approved: fields_requested
            });
        }

        // 4. Resolve target agent to get their wallet
        const { data: targetData } = await supabase
            .from('domains')
            .select('name, owner_wallet')
            .eq('name', cleanTarget)
            .single();

        const targetWallet = targetData?.owner_wallet || cleanTarget;

        // 5. Check for existing pending request
        const { data: existingRequest } = await supabase
            .from('vault_consent_requests')
            .select('*')
            .eq('requester_wallet', requester_wallet)
            .eq('target_agent', cleanTarget)
            .eq('seller_agent', cleanSeller)
            .eq('status', 'pending')
            .gte('expires_at', new Date().toISOString())
            .single();

        if (existingRequest) {
            return NextResponse.json({
                success: true,
                consent_id: existingRequest.id,
                status: 'pending',
                message: 'Consent request already pending',
                expires_at: existingRequest.expires_at
            });
        }

        // 6. Create new consent request
        const { data: consentRequest, error: createError } = await supabase
            .from('vault_consent_requests')
            .insert({
                requester_wallet,
                target_agent: cleanTarget,
                seller_agent: cleanSeller,
                fields_requested,
                purpose: purpose || 'booking',
                booking_context: booking_context || {},
                status: 'pending',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry
            })
            .select()
            .single();

        if (createError) {
            console.error('Consent request creation error:', createError);
            return NextResponse.json({
                error: 'Failed to create consent request'
            }, { status: 500 });
        }

        console.log(`   📨 Consent request created: ${consentRequest.id}`);

        return NextResponse.json({
            success: true,
            consent_id: consentRequest.id,
            status: 'pending',
            target_agent: `agent://${cleanTarget}`,
            seller_agent: `agent://${cleanSeller}`,
            fields_requested,
            message: `Consent request sent to agent://${cleanTarget}. They must approve before booking can proceed.`,
            expires_at: consentRequest.expires_at,
            next_step: {
                action: 'Wait for target agent to approve',
                check_endpoint: `/api/vault/consent/status?id=${consentRequest.id}`
            }
        });

    } catch (err: any) {
        console.error('Vault consent request error:', err);
        return NextResponse.json({
            error: 'Consent request failed: ' + err.message
        }, { status: 500 });
    }
}

/**
 * GET /api/vault/consent/request?wallet=xxx
 * 
 * Get pending consent requests for a wallet (to display in UI)
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const agentName = searchParams.get('agent');

    if (!wallet && !agentName) {
        return NextResponse.json({
            error: 'wallet or agent parameter required'
        }, { status: 400 });
    }

    // Query by agent name or wallet
    let query = supabase
        .from('vault_consent_requests')
        .select('*')
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

    if (agentName) {
        query = query.eq('target_agent', agentName.replace('agent://', '').toLowerCase());
    }

    const { data: requests, error } = await query;

    if (error) {
        return NextResponse.json({
            error: 'Failed to fetch consent requests'
        }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        pending_requests: requests?.map(r => ({
            id: r.id,
            from: r.requester_wallet,
            for_seller: `agent://${r.seller_agent}`,
            fields: r.fields_requested,
            purpose: r.purpose,
            context: r.booking_context,
            expires_at: r.expires_at,
            created_at: r.created_at
        })) || []
    });
}
