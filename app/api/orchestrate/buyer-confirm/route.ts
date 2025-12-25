import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * ANS Orchestrator - Buyer Confirmation Endpoint
 * 
 * Allows buyers to confirm delivery before fund release.
 * Phase 21: Buyer Confirmation Window
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id, action, reason } = body;

        if (!escrow_id || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, action (confirm/dispute)' },
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

        // Check if escrow is in correct state
        if (escrow.status !== 'confirmed' && escrow.status !== 'pending_buyer_confirmation') {
            return NextResponse.json(
                { error: `Cannot ${action} escrow in status: ${escrow.status}` },
                { status: 400 }
            );
        }

        if (action === 'confirm') {
            // Buyer confirms - trigger immediate release
            console.log(`✅ [ORCHESTRATOR] Buyer confirmed delivery for escrow: ${escrow_id}`);

            // Update status to released (or trigger release logic)
            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'released',
                    proof_of_delivery: {
                        ...escrow.proof_of_delivery,
                        buyer_confirmed: true,
                        confirmed_at: new Date().toISOString()
                    }
                })
                .eq('id', escrow_id);

            return NextResponse.json({
                success: true,
                message: 'Delivery confirmed. Funds will be released.',
                status: 'released'
            });

        } else if (action === 'dispute') {
            // Buyer disputes - freeze funds
            console.log(`⚠️ [ORCHESTRATOR] Buyer disputed delivery for escrow: ${escrow_id}`);
            console.log(`   Reason: ${reason || 'Not provided'}`);

            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'disputed',
                    proof_of_delivery: {
                        ...escrow.proof_of_delivery,
                        disputed: true,
                        dispute_reason: reason,
                        disputed_at: new Date().toISOString()
                    }
                })
                .eq('id', escrow_id);

            return NextResponse.json({
                success: true,
                message: 'Dispute registered. Funds are frozen pending review.',
                status: 'disputed',
                next_steps: [
                    'Support team will review within 24-48 hours',
                    'Submit evidence to support@nexus.io'
                ]
            });

        } else {
            return NextResponse.json({ error: 'Invalid action. Use "confirm" or "dispute"' }, { status: 400 });
        }

    } catch (err) {
        console.error('Confirm delivery error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
