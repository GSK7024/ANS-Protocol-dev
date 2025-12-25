
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// MOCK TRANSPORT VERIFY
// GET /api/testing/transport/verify?trip_id=TRIP-XYZ
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get('trip_id');

    if (!tripId) return NextResponse.json({ valid: false, reason: 'Missing trip_id' });

    // Lookup in DB
    const { data } = await supabase
        .from('mock_tickets')
        .select('*')
        .eq('pnr', tripId) // Reuse PNR column
        .single();

    if (!data) {
        return NextResponse.json({ valid: false, status: 'NOT_FOUND' });
    }

    return NextResponse.json({
        valid: true,
        status: data.status, // SCHEDULED
        trip_id: data.pnr,
        driver_name: data.flight_id, // Reused column
        vehicle: 'Toyota Innova'
    });
}
