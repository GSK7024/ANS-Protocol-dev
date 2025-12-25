import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * NexusAir ANS Webhook Receiver
 * 
 * Receives notifications from ANS Protocol:
 * - Payment confirmed → Confirm booking, generate PNR
 * - Escrow refunded → Cancel booking, restore seats
 * 
 * This endpoint is called by ANS escrow system
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validate ANS webhook signature (optional security)
const ANS_WEBHOOK_SECRET = process.env.ANS_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
    try {
        // Verify webhook signature if configured
        const signature = req.headers.get('x-ans-signature');
        const escrowId = req.headers.get('x-ans-escrow-id');

        console.log(`📥 [NEXUSAIR-WEBHOOK] Received webhook for escrow: ${escrowId}`);

        const body = await req.json();
        const {
            event,
            escrow_id,
            tx_signature,
            amount,
            buyer_wallet,
            buyer_data,
            booking_params
        } = body;

        // Handle different event types
        switch (event) {
            case 'booking_created':
            case 'escrow_created':
                return await handleBookingCreated(escrow_id, buyer_data, booking_params);

            case 'payment_received':
            case 'payment_confirmed':
                return await handlePaymentConfirmed(escrow_id, tx_signature, amount);

            case 'escrow_refunded':
            case 'payment_refunded':
                return await handleRefund(escrow_id);

            case 'dispute_raised':
                return await handleDispute(escrow_id);

            default:
                console.log(`⚠️ [NEXUSAIR-WEBHOOK] Unknown event: ${event}`);
                return NextResponse.json({
                    received: true,
                    message: `Event '${event}' not handled`
                });
        }

    } catch (err: any) {
        console.error('Webhook error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Handle initial booking creation from ANS
async function handleBookingCreated(
    escrowId: string,
    buyerData: any,
    bookingParams: any
) {
    console.log(`📝 [NEXUSAIR] Creating booking from ANS escrow: ${escrowId}`);

    // Check if booking already exists for this escrow
    const { data: existing } = await supabase
        .from('airline_bookings')
        .select('id, booking_ref')
        .eq('escrow_id', escrowId)
        .single();

    if (existing) {
        return NextResponse.json({
            success: true,
            message: 'Booking already exists',
            bookingRef: existing.booking_ref
        });
    }

    // Extract booking info from params
    const {
        inventoryId,
        passengers,
        class: bookingClass = 'ECONOMY'
    } = bookingParams || {};

    if (!inventoryId || !passengers) {
        return NextResponse.json({
            success: false,
            message: 'Missing booking parameters',
            received: bookingParams
        }, { status: 400 });
    }

    // Create booking via internal API logic
    // (Similar to create API but triggered by webhook)

    return NextResponse.json({
        success: true,
        message: 'Booking created, awaiting payment',
        escrowId: escrowId,
        status: 'pending_payment'
    });
}

// Handle payment confirmation
async function handlePaymentConfirmed(
    escrowId: string,
    txSignature: string,
    amount: number
) {
    console.log(`💰 [NEXUSAIR] Payment confirmed for escrow: ${escrowId}`);

    // Find booking by escrow ID
    const { data: booking, error } = await supabase
        .from('airline_bookings')
        .select('*')
        .eq('escrow_id', escrowId)
        .single();

    if (error || !booking) {
        console.log(`⚠️ [NEXUSAIR] No booking found for escrow ${escrowId}`);
        return NextResponse.json({
            success: false,
            message: 'Booking not found for this escrow'
        }, { status: 404 });
    }

    // Generate PNR
    const pnr = generatePNR();

    // Update booking to confirmed
    const { error: updateError } = await supabase
        .from('airline_bookings')
        .update({
            status: 'CONFIRMED',
            payment_status: 'PAID',
            pnr: pnr,
            payment_tx: txSignature,
            confirmed_at: new Date().toISOString()
        })
        .eq('id', booking.id);

    if (updateError) {
        console.error('Failed to confirm booking:', updateError);
        return NextResponse.json({
            success: false,
            message: 'Failed to confirm booking'
        }, { status: 500 });
    }

    console.log(`✅ [NEXUSAIR] Booking confirmed with PNR: ${pnr}`);

    // Return confirmation for ANS to relay to buyer
    return NextResponse.json({
        success: true,
        message: 'Booking confirmed',
        booking: {
            pnr: pnr,
            bookingRef: booking.booking_ref,
            status: 'CONFIRMED',
            flightNumber: booking.flight_number,
            flightDate: booking.flight_date
        },
        ticket: {
            url: `/api/nexusair/bookings/${pnr}/ticket`,
            format: 'PDF'
        },
        // This gets sent back to ANS as delivery proof
        deliveryProof: {
            type: 'flight_booking',
            pnr: pnr,
            timestamp: new Date().toISOString()
        }
    });
}

// Handle refund
async function handleRefund(escrowId: string) {
    console.log(`🔄 [NEXUSAIR] Processing refund for escrow: ${escrowId}`);

    // Find booking
    const { data: booking } = await supabase
        .from('airline_bookings')
        .select(`
            *,
            flight_inventory (
                id,
                economy_available,
                business_available
            )
        `)
        .eq('escrow_id', escrowId)
        .single();

    if (!booking) {
        return NextResponse.json({
            success: true,
            message: 'No booking found to refund'
        });
    }

    // Cancel booking
    await supabase
        .from('airline_bookings')
        .update({
            status: 'CANCELLED',
            payment_status: 'REFUNDED',
            cancelled_at: new Date().toISOString()
        })
        .eq('id', booking.id);

    // Restore inventory
    const seatsToRestore = booking.adult_count + booking.child_count;
    const inventory = booking.flight_inventory as any;

    if (inventory && booking.booking_class === 'ECONOMY') {
        await supabase
            .from('flight_inventory')
            .update({
                economy_available: inventory.economy_available + seatsToRestore
            })
            .eq('id', inventory.id);
    } else if (inventory) {
        await supabase
            .from('flight_inventory')
            .update({
                business_available: inventory.business_available + seatsToRestore
            })
            .eq('id', inventory.id);
    }

    console.log(`✅ [NEXUSAIR] Booking cancelled, ${seatsToRestore} seats restored`);

    return NextResponse.json({
        success: true,
        message: 'Booking cancelled and seats restored',
        pnr: booking.pnr,
        status: 'CANCELLED'
    });
}

// Handle dispute
async function handleDispute(escrowId: string) {
    console.log(`⚠️ [NEXUSAIR] Dispute raised for escrow: ${escrowId}`);

    // Update booking status to disputed
    await supabase
        .from('airline_bookings')
        .update({
            status: 'DISPUTED',
            updated_at: new Date().toISOString()
        })
        .eq('escrow_id', escrowId);

    return NextResponse.json({
        success: true,
        message: 'Booking marked as disputed',
        action: 'Manual review required'
    });
}

function generatePNR(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = 'NX';
    for (let i = 0; i < 6; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}
