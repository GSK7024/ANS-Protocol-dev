import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * NexusAir Booking Confirmation API
 * 
 * Confirms a booking after payment is verified:
 * - Generates PNR
 * - Updates booking status to CONFIRMED
 * - Prepares e-ticket
 * 
 * Called by ANS escrow system when payment is confirmed
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            bookingId,
            bookingRef,
            escrowId,
            paymentTx,
            paymentAmount
        } = body;

        // Find booking by ID, ref, or escrow
        let booking;
        if (bookingId) {
            const { data } = await supabase
                .from('airline_bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            booking = data;
        } else if (bookingRef) {
            const { data } = await supabase
                .from('airline_bookings')
                .select('*')
                .eq('booking_ref', bookingRef)
                .single();
            booking = data;
        } else if (escrowId) {
            const { data } = await supabase
                .from('airline_bookings')
                .select('*')
                .eq('escrow_id', escrowId)
                .single();
            booking = data;
        }

        if (!booking) {
            return NextResponse.json({
                error: 'Booking not found',
                hint: 'Provide bookingId, bookingRef, or escrowId'
            }, { status: 404 });
        }

        // Check if already confirmed
        if (booking.status === 'CONFIRMED') {
            return NextResponse.json({
                success: true,
                message: 'Booking already confirmed',
                pnr: booking.pnr,
                booking: formatBookingResponse(booking)
            });
        }

        // Check if cancelled
        if (booking.status === 'CANCELLED') {
            return NextResponse.json({
                error: 'Cannot confirm a cancelled booking'
            }, { status: 400 });
        }

        // Generate PNR
        const pnr = generatePNR();

        // Update booking
        const { data: updatedBooking, error: updateError } = await supabase
            .from('airline_bookings')
            .update({
                status: 'CONFIRMED',
                payment_status: 'PAID',
                pnr: pnr,
                payment_tx: paymentTx || null,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', booking.id)
            .select()
            .single();

        if (updateError) {
            console.error('Booking confirmation error:', updateError);
            return NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 });
        }

        // Get passengers for the booking
        const { data: passengers } = await supabase
            .from('passengers')
            .select('*')
            .eq('booking_id', booking.id);

        // Get flight details
        const { data: inventory } = await supabase
            .from('flight_inventory')
            .select(`
                *,
                flights (
                    flight_number,
                    departure_time,
                    arrival_time,
                    routes (
                        from_airport,
                        to_airport
                    )
                )
            `)
            .eq('id', booking.inventory_id)
            .single();

        console.log(`✅ [NEXUSAIR] Booking confirmed: PNR ${pnr}`);

        // Generate ticket URL (would be actual PDF in production)
        const ticketUrl = `/api/nexusair/bookings/${pnr}/ticket`;

        return NextResponse.json({
            success: true,
            message: 'Booking confirmed successfully',
            booking: {
                pnr: pnr,
                bookingRef: booking.booking_ref,
                status: 'CONFIRMED',
                paymentStatus: 'PAID'
            },
            flight: inventory?.flights ? {
                number: (inventory.flights as any).flight_number,
                date: inventory.flight_date,
                from: (inventory.flights as any).routes?.from_airport,
                to: (inventory.flights as any).routes?.to_airport,
                departure: (inventory.flights as any).departure_time,
                arrival: (inventory.flights as any).arrival_time,
                class: booking.booking_class
            } : null,
            passengers: passengers?.map(p => ({
                name: `${p.title} ${p.first_name} ${p.last_name}`,
                type: p.passenger_type,
                seat: p.seat_number || 'To be assigned at check-in'
            })),
            ticket: {
                downloadUrl: ticketUrl,
                emailSentTo: booking.contact_email,
                format: 'PDF'
            },
            nextSteps: {
                1: 'E-ticket has been sent to your email',
                2: 'Web check-in opens 48 hours before departure',
                3: 'Arrive at airport 2 hours before departure'
            }
        });

    } catch (err: any) {
        console.error('Booking confirmation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Generate PNR (NX + 6 alphanumeric)
function generatePNR(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = 'NX';
    for (let i = 0; i < 6; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}

function formatBookingResponse(booking: any) {
    return {
        id: booking.id,
        pnr: booking.pnr,
        bookingRef: booking.booking_ref,
        status: booking.status,
        paymentStatus: booking.payment_status,
        flightNumber: booking.flight_number,
        flightDate: booking.flight_date,
        class: booking.booking_class,
        passengers: booking.passenger_count,
        total: booking.total_amount,
        currency: 'INR',
        confirmedAt: booking.confirmed_at
    };
}
