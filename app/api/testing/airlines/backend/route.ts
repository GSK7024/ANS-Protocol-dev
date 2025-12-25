import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * MOCK AIRLINE BACKEND - "The GDS"
 * 
 * Uses Supabase for persistent ticket storage (not in-memory)
 * so tickets survive between API requests.
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, ...data } = body;

        // AUTH CHECK (Simulating API Key)
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer backend-key-')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. ISSUE TICKET (Called by Agent Script)
        if (action === 'issue_ticket') {
            const { pnr, passenger, flight } = data;

            // Check if PNR already exists
            const { data: existing } = await supabase
                .from('mock_tickets')
                .select('pnr')
                .eq('pnr', pnr)
                .single();

            if (existing) {
                return NextResponse.json({ error: 'PNR already exists' }, { status: 409 });
            }

            const ticket = {
                pnr,
                passenger_name: passenger?.name || 'Unknown',
                passenger_age: passenger?.age || 0,
                flight_id: flight?.id || 'UNKNOWN',
                flight_from: flight?.from || 'N/A',
                flight_to: flight?.to || 'N/A',
                status: 'CONFIRMED',
                issued_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('mock_tickets')
                .insert(ticket);

            if (insertError) {
                console.error('DB Insert Error:', insertError);
                return NextResponse.json({ error: 'Failed to store ticket' }, { status: 500 });
            }

            console.log(`✈️ [AIRLINE DB] Ticket Issued: ${pnr} for ${passenger?.name || 'Unknown'}`);

            return NextResponse.json({ success: true, ticket });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err) {
        console.error('Airline Backend POST Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// 2. VERIFY TICKET (Called by ANS Orchestrator)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const pnr = searchParams.get('pnr');

    // AUTH CHECK
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer nexus-verification-')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!pnr) {
        return NextResponse.json({ error: 'Missing PNR' }, { status: 400 });
    }

    const { data: ticket, error } = await supabase
        .from('mock_tickets')
        .select('*')
        .eq('pnr', pnr)
        .single();

    if (error || !ticket) {
        console.log(`❌ [AIRLINE DB] Verify Failed: PNR ${pnr} not found`);
        return NextResponse.json({ error: 'PNR not found', valid: false }, { status: 404 });
    }

    console.log(`✅ [AIRLINE DB] Verified: ${pnr} (${ticket.passenger_name})`);

    return NextResponse.json({
        valid: true,
        status: ticket.status,
        passenger: {
            name: ticket.passenger_name,
            age: ticket.passenger_age
        },
        flight: {
            id: ticket.flight_id,
            from: ticket.flight_from,
            to: ticket.flight_to
        },
        issued_at: ticket.issued_at
    });
}
