import { NextRequest, NextResponse } from 'next/server';

// ============================================
// INDIGO FLIGHTS - Mock Airline API
// ============================================
// Dynamic flight data that changes every 5 minutes
// Routes: Delhi ↔ Mumbai, Bangalore ↔ Chennai

interface Flight {
    id: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price_sol: number;
    available_seats: number;
    airline_name: string;
}

// Generate dynamic flights based on current time
function generateFlights(): Flight[] {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000)); // Changes every 5 min
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 9999) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    const routes = [
        { from: 'DEL', to: 'BOM', fromCity: 'Delhi', toCity: 'Mumbai' },
        { from: 'BOM', to: 'DEL', fromCity: 'Mumbai', toCity: 'Delhi' },
        { from: 'BLR', to: 'MAA', fromCity: 'Bangalore', toCity: 'Chennai' },
        { from: 'MAA', to: 'BLR', fromCity: 'Chennai', toCity: 'Bangalore' },
    ];

    const now = new Date();
    const flights: Flight[] = [];

    routes.forEach((route, idx) => {
        // Generate 2-3 flights per route
        const numFlights = 2 + (seed % 2);
        for (let i = 0; i < numFlights; i++) {
            const departureHour = 6 + (idx * 3) + (i * 4); // Staggered times
            const departure = new Date(now);
            departure.setHours(departureHour, (seed + i * 15) % 60, 0);

            const arrival = new Date(departure);
            arrival.setHours(arrival.getHours() + 2); // 2 hour flight

            flights.push({
                id: `6E${1000 + idx * 100 + i + (seed % 10)}`,
                from: route.from,
                to: route.to,
                departure: departure.toISOString(),
                arrival: arrival.toISOString(),
                price_sol: Number((0.1 + random(0, 20) / 100).toFixed(3)),
                available_seats: Math.floor(random(5, 45)),
                airline_name: 'Indigo Flights'
            });
        }
    });

    return flights;
}

// GET: List flights (optionally filter by route)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();

    console.log(`✈️ [Indigo Flights] Quote request: ${from || 'ALL'} → ${to || 'ALL'}`);

    let flights = generateFlights();

    // Filter by route if specified
    if (from) flights = flights.filter(f => f.from === from);
    if (to) flights = flights.filter(f => f.to === to);

    return NextResponse.json({
        success: true,
        airline: 'Indigo Flights',
        flights: flights,
        generated_at: new Date().toISOString(),
        next_refresh: '5 minutes'
    });
}

// POST: Book a specific flight
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { flight_id, passenger_name } = body;

        if (!flight_id) {
            return NextResponse.json({ error: 'flight_id required' }, { status: 400 });
        }

        const flights = generateFlights();
        const flight = flights.find(f => f.id === flight_id);

        if (!flight) {
            return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
        }

        console.log(`✈️ [Indigo Flights] Booking ${flight_id} for ${passenger_name || 'Guest'}`);

        return NextResponse.json({
            success: true,
            confirmation: {
                pnr: `IND${Date.now().toString(36).toUpperCase()}`,
                flight: flight,
                passenger: passenger_name || 'Guest Passenger',
                status: 'CONFIRMED',
                message: 'E-ticket will be sent to your registered email'
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
