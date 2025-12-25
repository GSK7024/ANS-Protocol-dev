import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/nexusair/bookings/[ref]
 * 
 * Get booking details by reference (PNR or booking ID)
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { ref: string } }
) {
    try {
        const ref = params.ref;

        if (!ref) {
            return NextResponse.json(
                { error: 'Booking reference required' },
                { status: 400 }
            );
        }

        console.log(`📋 [NEXUSAIR] Looking up booking: ${ref}`);

        // Try to find by booking_ref (PNR) or by id
        let booking = null;

        // First try booking_ref
        const { data: byRef } = await supabase
            .from('bookings')
            .select(`
                *,
                booking_passengers ( * )
            `)
            .eq('booking_ref', ref.toUpperCase())
            .single();

        if (byRef) {
            booking = byRef;
        } else {
            // Try by ID
            const { data: byId } = await supabase
                .from('bookings')
                .select(`
                    *,
                    booking_passengers ( * )
                `)
                .eq('id', ref)
                .single();

            booking = byId;
        }

        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found', ref },
                { status: 404 }
            );
        }

        // Get flight info if inventory_id exists
        let flightInfo = null;
        if (booking.inventory_id) {
            const { data: inventory } = await supabase
                .from('flight_inventory')
                .select(`
                    *,
                    flights (
                        flight_number,
                        departure_time,
                        arrival_time,
                        airline_code,
                        route:routes (
                            from_airport,
                            to_airport,
                            typical_duration_minutes
                        )
                    )
                `)
                .eq('id', booking.inventory_id)
                .single();

            if (inventory?.flights) {
                const f = inventory.flights as any;
                flightInfo = {
                    number: f.flight_number,
                    departure: f.departure_time,
                    arrival: f.arrival_time,
                    date: inventory.flight_date,
                    from: f.route?.from_airport,
                    to: f.route?.to_airport,
                    duration: f.route?.typical_duration_minutes
                };
            }
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: booking.id,
                bookingRef: booking.booking_ref,
                status: booking.status,
                paymentStatus: booking.payment_status,
                totalAmount: booking.total_amount,
                currency: booking.currency || 'INR',
                passengerCount: booking.booking_passengers?.length || 0,
                class: booking.class || 'ECONOMY',
                createdAt: booking.created_at
            },
            pricing: {
                total: booking.total_amount,
                currency: booking.currency || 'INR',
                solAmount: (booking.total_amount / 15000).toFixed(4) // Approximate rate
            },
            flight: flightInfo,
            passengers: booking.booking_passengers?.map((p: any) => ({
                firstName: p.first_name,
                lastName: p.last_name,
                type: p.type
            })) || []
        });

    } catch (err: any) {
        console.error('Booking lookup error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch booking', details: err.message },
            { status: 500 }
        );
    }
}
