import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role for database writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id, proof_of_delivery, seller_wallet } = body;

        // Validation
        if (!escrow_id || !proof_of_delivery) {
            return NextResponse.json(
                { error: 'Missing required fields: escrow_id, proof_of_delivery' },
                { status: 400 }
            );
        }

        // Get escrow record
        const { data: escrow, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchError || !escrow) {
            return NextResponse.json(
                { error: 'Escrow not found' },
                { status: 404 }
            );
        }

        if (escrow.status !== 'locked') {
            return NextResponse.json(
                { error: `Escrow must be locked to confirm. Current status: ${escrow.status}` },
                { status: 400 }
            );
        }

        // Optional: Verify seller wallet matches
        if (seller_wallet && escrow.seller_wallet && seller_wallet !== escrow.seller_wallet) {
            return NextResponse.json(
                { error: 'Seller wallet mismatch' },
                { status: 403 }
            );
        }

        // Update escrow with proof
        const { error: updateError } = await supabase
            .from('escrow_transactions')
            .update({
                status: 'confirmed',
                proof_of_delivery,
                confirmed_at: new Date().toISOString()
            })
            .eq('id', escrow_id);

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update escrow: ' + updateError.message },
                { status: 500 }
            );
        }

        console.log(`✅ Escrow ${escrow_id} confirmed by seller.`);

        return NextResponse.json({
            success: true,
            status: 'confirmed',
            escrow_id,
            message: 'Proof of delivery submitted. Waiting for buyer to release funds or auto-release after 24h.'
        });

    } catch (err) {
        console.error('Escrow confirm error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
