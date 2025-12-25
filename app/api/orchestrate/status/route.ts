import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * ANS Orchestrator - Status Endpoint
 * 
 * Check the status of an escrow transaction.
 * Used by both buyers and sellers to track order progress.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const escrow_id = searchParams.get('escrow_id');

        if (!escrow_id) {
            return NextResponse.json(
                { error: 'Missing required parameter: escrow_id' },
                { status: 400 }
            );
        }

        // Get escrow with events
        const { data: escrow, error } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (error || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        // Get related events
        const { data: events } = await supabase
            .from('orchestration_events')
            .select('event_type, direction, created_at, status')
            .eq('escrow_id', escrow_id)
            .order('created_at', { ascending: true });

        // Build timeline
        const timeline = [
            { step: 'created', completed: true, at: escrow.created_at },
            { step: 'payment_locked', completed: !!escrow.locked_at, at: escrow.locked_at },
            { step: 'seller_notified', completed: events?.some(e => e.event_type === 'payment_received') },
            { step: 'delivery_confirmed', completed: !!escrow.confirmed_at, at: escrow.confirmed_at },
            { step: 'funds_released', completed: !!escrow.released_at, at: escrow.released_at }
        ];

        return NextResponse.json({
            success: true,
            escrow_id,
            status: escrow.status,

            parties: {
                buyer: escrow.buyer_wallet,
                seller_agent: escrow.seller_agent,
                seller_wallet: escrow.seller_wallet
            },

            payment: {
                amount: escrow.amount,
                fee: escrow.fee,
                total: escrow.amount + escrow.fee,
                currency: 'SOL'
            },

            timestamps: {
                created_at: escrow.created_at,
                expires_at: escrow.expires_at,
                locked_at: escrow.locked_at,
                confirmed_at: escrow.confirmed_at,
                released_at: escrow.released_at
            },

            transactions: {
                lock_tx: escrow.lock_tx_signature,
                release_tx: escrow.release_tx_signature,
                refund_tx: escrow.refund_tx_signature
            },

            service_details: escrow.service_details,
            proof_of_delivery: escrow.proof_of_delivery,

            timeline,
            events: events || []
        });

    } catch (err) {
        console.error('Orchestrator status error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
