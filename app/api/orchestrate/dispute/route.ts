import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * ANS Orchestrator - Dispute Endpoint
 * 
 * Handles dispute creation and evidence submission.
 * Phase 21: Buyer Confirmation Window
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id, reason, evidence_urls } = body;

        if (!escrow_id || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, reason' },
                { status: 400 }
            );
        }

        // Get escrow
        const { data: escrow, error } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (error || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        // Can only dispute if not already released
        if (escrow.status === 'released') {
            return NextResponse.json(
                { error: 'Cannot dispute after funds have been released' },
                { status: 400 }
            );
        }

        console.log(`🚨 [ORCHESTRATOR] Dispute opened for escrow: ${escrow_id}`);

        // Update escrow status
        await supabase
            .from('escrow_transactions')
            .update({
                status: 'disputed',
                proof_of_delivery: {
                    ...escrow.proof_of_delivery,
                    disputed: true,
                    dispute_reason: reason,
                    evidence_urls: evidence_urls || [],
                    disputed_at: new Date().toISOString()
                }
            })
            .eq('id', escrow_id);

        // TODO: Create dispute record in separate disputes table
        // TODO: Notify admin/support
        // TODO: Trigger resolution workflow

        return NextResponse.json({
            success: true,
            message: 'Dispute registered successfully',
            dispute_id: `DSP-${escrow_id.slice(0, 8)}`,
            status: 'disputed',
            resolution_timeline: '24-48 hours',
            next_steps: [
                'Your dispute has been logged',
                'Both parties will be contacted for evidence',
                'Resolution will be provided within 48 hours'
            ]
        });

    } catch (err) {
        console.error('Dispute error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Check dispute status
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const escrowId = searchParams.get('escrow_id');

    if (!escrowId) {
        return NextResponse.json({ error: 'Missing escrow_id' }, { status: 400 });
    }

    const { data: escrow } = await supabase
        .from('escrow_transactions')
        .select('id, status, proof_of_delivery')
        .eq('id', escrowId)
        .single();

    if (!escrow) {
        return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    const isDisputed = escrow.status === 'disputed';

    return NextResponse.json({
        escrow_id: escrow.id,
        status: escrow.status,
        disputed: isDisputed,
        dispute_reason: isDisputed ? escrow.proof_of_delivery?.dispute_reason : null,
        disputed_at: isDisputed ? escrow.proof_of_delivery?.disputed_at : null
    });
}
