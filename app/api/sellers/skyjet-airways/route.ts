import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SKYJET AIRWAYS - Mock International Airline
// ============================================
// Now with AUTO-FULFILLMENT:
// When payment is confirmed, automatically generates ticket

interface Flight {
    id: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price_sol: number;
    available_seats: number;
    airline_name: string;
    class: string;
}

function generateFlights(): Flight[] {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 7777) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    const routes = [
        { from: 'DEL', to: 'DXB', fromCity: 'Delhi', toCity: 'Dubai', hours: 3 },
        { from: 'BOM', to: 'SIN', fromCity: 'Mumbai', toCity: 'Singapore', hours: 5 },
        { from: 'DEL', to: 'LHR', fromCity: 'Delhi', toCity: 'London', hours: 9 },
        { from: 'BLR', to: 'DXB', fromCity: 'Bangalore', toCity: 'Dubai', hours: 4 },
    ];

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const flights: Flight[] = [];
    const classes = ['Economy', 'Business'];

    routes.forEach((route, idx) => {
        classes.forEach((cls, clsIdx) => {
            const basePrice = cls === 'Business' ? 0.6 : 0.35;
            const departureHour = 8 + (idx * 4);
            const departure = new Date(tomorrow);
            departure.setHours(departureHour, (seed * 7 + idx) % 60, 0);

            const arrival = new Date(departure);
            arrival.setHours(arrival.getHours() + route.hours);

            flights.push({
                id: `SJ${200 + idx * 10 + clsIdx + (seed % 5)}`,
                from: route.from,
                to: route.to,
                departure: departure.toISOString(),
                arrival: arrival.toISOString(),
                price_sol: Number((basePrice + random(0, 30) / 100).toFixed(3)),
                available_seats: Math.floor(random(2, 20)),
                airline_name: 'SkyJet Airways',
                class: cls
            });
        });
    });

    return flights;
}

// GET: List available flights
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();

    console.log(`🛫 [SkyJet Airways] Quote request: ${from || 'ALL'} → ${to || 'ALL'}`);

    let flights = generateFlights();
    if (from) flights = flights.filter(f => f.from === from);
    if (to) flights = flights.filter(f => f.to === to);

    return NextResponse.json({
        success: true,
        airline: 'SkyJet Airways',
        flights: flights,
        generated_at: new Date().toISOString(),
        next_refresh: '5 minutes'
    });
}

// POST: Handle booking requests AND fulfillment webhooks
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // ============================================
        // FULFILLMENT WEBHOOK (from Orchestrator)
        // ============================================
        if (body.type === 'escrow.locked' || body.action === 'fulfill') {
            console.log(`🛫 [SkyJet Airways] ⚡ FULFILLMENT WEBHOOK RECEIVED!`);
            console.log(`   Escrow ID: ${body.escrow_id}`);
            console.log(`   Buyer: ${body.buyer_wallet}`);
            console.log(`   Amount: ${body.amount} SOL`);

            // 1. Get buyer vault data (in production, call /api/vault/data)
            // For demo, we'll use mock data or the data passed in body
            const buyerName = body.buyer_vault?.full_name || 'Valued Customer';
            const passportNum = body.buyer_vault?.passport_number || 'XXXXXX';

            // 2. Select a random flight for this booking
            const flights = generateFlights();
            const selectedFlight = flights[Math.floor(Math.random() * flights.length)];

            // 3. Assign seat
            const row = Math.floor(Math.random() * 30) + 1;
            const seat = String.fromCharCode(65 + Math.floor(Math.random() * 6)); // A-F
            const seatNumber = `${row}${seat}`;

            // 4. Generate PNR
            const pnr = `SKY${Date.now().toString(36).toUpperCase().slice(-6)}`;

            // 5. Return ticket details
            const ticketDetails = {
                success: true,
                fulfilled: true,
                ticket: {
                    pnr: pnr,
                    airline: 'SkyJet Airways',
                    flight_number: selectedFlight.id,
                    route: {
                        from: selectedFlight.from,
                        to: selectedFlight.to,
                        departure: selectedFlight.departure,
                        arrival: selectedFlight.arrival
                    },
                    passenger: {
                        name: buyerName,
                        passport: passportNum.slice(-4).padStart(4, 'X'), // Masked
                        seat: seatNumber,
                        class: selectedFlight.class
                    },
                    booking: {
                        escrow_id: body.escrow_id,
                        amount_paid: body.amount,
                        booked_at: new Date().toISOString()
                    },
                    extras: [
                        'Priority boarding',
                        'Premium lounge access',
                        '23kg checked baggage'
                    ]
                },
                message: `🎫 E-Ticket confirmed! Check-in opens 48h before departure.`
            };

            console.log(`   ✅ Ticket generated: ${pnr} | Seat ${seatNumber}`);
            console.log(`   📤 Sending confirmation to buyer...`);

            return NextResponse.json(ticketDetails);
        }

        // ============================================
        // MANUAL BOOKING (direct API call)
        // ============================================
        const { flight_id, passenger_name } = body;

        if (!flight_id) {
            return NextResponse.json({ error: 'flight_id required' }, { status: 400 });
        }

        const flights = generateFlights();
        const flight = flights.find(f => f.id === flight_id);

        if (!flight) {
            return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
        }

        console.log(`🛫 [SkyJet Airways] Manual booking ${flight_id} for ${passenger_name || 'Guest'}`);

        return NextResponse.json({
            success: true,
            confirmation: {
                pnr: `SKY${Date.now().toString(36).toUpperCase()}`,
                flight: flight,
                passenger: passenger_name || 'Guest Passenger',
                status: 'CONFIRMED',
                message: 'Premium lounge access included'
            }
        });

    } catch (e: any) {
        console.error(`🛫 [SkyJet Airways] Error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
