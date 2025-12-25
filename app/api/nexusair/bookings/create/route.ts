import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * NexusAir Booking Creation API
 * 
 * Creates a flight booking with:
 * - Seat reservation (temporary hold)
 * - Passenger validation
 * - Price calculation
 * - Escrow integration for ANS payments
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PassengerInput {
    title: string;      // Mr, Mrs, Ms, Dr
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender: 'M' | 'F' | 'O';
    type: 'ADULT' | 'CHILD' | 'INFANT';
    idType?: string;    // PASSPORT, AADHAAR, PAN
    idNumber?: string;
    mealPreference?: string;
    seatPreference?: 'WINDOW' | 'AISLE' | 'MIDDLE' | 'ANY';
    email?: string;
    phone?: string;
}

interface BookingRequest {
    inventoryId: number;       // From flight search
    passengers: PassengerInput[];
    class: 'ECONOMY' | 'BUSINESS';
    contactEmail: string;
    contactPhone: string;
    escrowId?: string;         // ANS escrow if using ANS
    specialRequests?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: BookingRequest = await req.json();

        const {
            inventoryId,
            passengers,
            class: bookingClass = 'ECONOMY',
            contactEmail,
            contactPhone,
            escrowId,
            specialRequests
        } = body;

        // Validation
        if (!inventoryId || !passengers || passengers.length === 0) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['inventoryId', 'passengers'],
                example: {
                    inventoryId: 123,
                    passengers: [{
                        title: 'Mr',
                        firstName: 'Rahul',
                        lastName: 'Kumar',
                        gender: 'M',
                        type: 'ADULT'
                    }],
                    contactEmail: 'test@example.com',
                    contactPhone: '+919876543210'
                }
            }, { status: 400 });
        }

        // Validate each passenger
        for (let i = 0; i < passengers.length; i++) {
            const p = passengers[i];
            if (!p.firstName || !p.lastName || !p.gender || !p.type) {
                return NextResponse.json({
                    error: `Passenger ${i + 1} missing required fields`,
                    required: ['firstName', 'lastName', 'gender', 'type']
                }, { status: 400 });
            }
        }

        // Count passenger types
        const adultCount = passengers.filter(p => p.type === 'ADULT').length;
        const childCount = passengers.filter(p => p.type === 'CHILD').length;
        const infantCount = passengers.filter(p => p.type === 'INFANT').length;

        // Validate: at least one adult required
        if (adultCount === 0) {
            return NextResponse.json({
                error: 'At least one adult passenger is required'
            }, { status: 400 });
        }

        // Validate: infants cannot exceed adults
        if (infantCount > adultCount) {
            return NextResponse.json({
                error: 'Number of infants cannot exceed number of adults'
            }, { status: 400 });
        }

        // Get flight inventory
        const { data: inventory, error: invError } = await supabase
            .from('flight_inventory')
            .select(`
                *,
                flights (
                    id,
                    flight_number,
                    departure_time,
                    arrival_time,
                    route_id,
                    routes (
                        from_airport,
                        to_airport,
                        base_price_economy,
                        base_price_business,
                        typical_duration_minutes
                    )
                )
            `)
            .eq('id', inventoryId)
            .single();

        if (invError || !inventory) {
            return NextResponse.json({
                error: 'Flight not found or no longer available'
            }, { status: 404 });
        }

        // Check availability
        const requiredSeats = adultCount + childCount; // Infants on lap
        const availableSeats = bookingClass === 'BUSINESS'
            ? inventory.business_available
            : inventory.economy_available;

        if (availableSeats < requiredSeats) {
            return NextResponse.json({
                error: 'Not enough seats available',
                requested: requiredSeats,
                available: availableSeats
            }, { status: 409 });
        }

        // Calculate pricing
        const flight = inventory.flights as any;
        const route = flight.routes as any;

        const basePrice = bookingClass === 'BUSINESS'
            ? inventory.business_price
            : inventory.economy_price;

        // Adult: full price, Child: 75%, Infant: 10%
        const adultFare = basePrice * adultCount;
        const childFare = basePrice * 0.75 * childCount;
        const infantFare = basePrice * 0.10 * infantCount;
        const baseFare = adultFare + childFare + infantFare;

        const taxes = Math.round(baseFare * 0.12);
        const fees = 250 * (adultCount + childCount); // Per seat
        const totalAmount = baseFare + taxes + fees;

        // Generate booking reference
        const bookingRef = `NXB${Date.now().toString(36).toUpperCase()}`;

        // Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('airline_bookings')
            .insert({
                booking_ref: bookingRef,
                inventory_id: inventoryId,
                flight_number: flight.flight_number,
                flight_date: inventory.flight_date,
                passenger_count: passengers.length,
                adult_count: adultCount,
                child_count: childCount,
                infant_count: infantCount,
                booking_class: bookingClass,
                base_fare: baseFare,
                taxes: taxes,
                fees: fees,
                total_amount: totalAmount,
                payment_status: 'PENDING',
                escrow_id: escrowId || null,
                status: 'PENDING',
                contact_email: contactEmail,
                contact_phone: contactPhone,
                special_requests: specialRequests,
                booking_source: escrowId ? 'ANS' : 'DIRECT'
            })
            .select()
            .single();

        if (bookingError) {
            console.error('Booking creation error:', bookingError);
            return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
        }

        // Add passengers
        const passengerRecords = passengers.map((p, index) => ({
            booking_id: booking.id,
            title: p.title || 'Mr',
            first_name: p.firstName,
            last_name: p.lastName,
            date_of_birth: p.dateOfBirth || null,
            gender: p.gender,
            passenger_type: p.type,
            id_type: p.idType || null,
            id_number: p.idNumber || null,
            meal_preference: p.mealPreference || 'NONE',
            email: index === 0 ? contactEmail : p.email,
            phone: index === 0 ? contactPhone : p.phone
        }));

        const { error: passError } = await supabase
            .from('passengers')
            .insert(passengerRecords);

        if (passError) {
            console.error('Passenger insertion error:', passError);
            // Rollback booking
            await supabase.from('airline_bookings').delete().eq('id', booking.id);
            return NextResponse.json({ error: 'Failed to add passengers' }, { status: 500 });
        }

        // Update inventory (decrement available seats)
        const seatDecrement = adultCount + childCount;
        if (bookingClass === 'ECONOMY') {
            await supabase
                .from('flight_inventory')
                .update({
                    economy_available: inventory.economy_available - seatDecrement,
                    updated_at: new Date().toISOString()
                })
                .eq('id', inventoryId);
        } else {
            await supabase
                .from('flight_inventory')
                .update({
                    business_available: inventory.business_available - seatDecrement,
                    updated_at: new Date().toISOString()
                })
                .eq('id', inventoryId);
        }

        console.log(`✈️ [NEXUSAIR] Booking created: ${bookingRef} for ${passengers.length} passengers`);

        // Format response
        return NextResponse.json({
            success: true,
            booking: {
                id: booking.id,
                bookingRef: bookingRef,
                status: 'PENDING',
                paymentStatus: 'PENDING'
            },
            flight: {
                number: flight.flight_number,
                date: inventory.flight_date,
                route: {
                    from: route.from_airport,
                    to: route.to_airport
                },
                departure: flight.departure_time,
                arrival: flight.arrival_time,
                class: bookingClass
            },
            passengers: passengers.map(p => ({
                name: `${p.title} ${p.firstName} ${p.lastName}`,
                type: p.type
            })),
            pricing: {
                baseFare: baseFare,
                taxes: taxes,
                fees: fees,
                total: totalAmount,
                currency: 'INR',
                breakdown: {
                    adults: `${adultCount} × ₹${basePrice}`,
                    children: childCount > 0 ? `${childCount} × ₹${Math.round(basePrice * 0.75)}` : null,
                    infants: infantCount > 0 ? `${infantCount} × ₹${Math.round(basePrice * 0.10)}` : null
                }
            },
            payment: {
                required: true,
                deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min to pay
                methods: ['SOL', 'UPI', 'CARD'],
                solAmount: (totalAmount / 18000).toFixed(4), // Approximate INR to SOL
                escrowIntegration: escrowId ? {
                    escrowId: escrowId,
                    status: 'awaiting_confirmation'
                } : {
                    hint: 'Use ANS escrow for secure payment',
                    endpoint: '/api/escrow'
                }
            },
            nextSteps: {
                1: 'Complete payment within 30 minutes',
                2: 'Booking will be confirmed and PNR generated',
                3: 'E-ticket sent to ' + contactEmail
            }
        });

    } catch (err: any) {
        console.error('Booking error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
