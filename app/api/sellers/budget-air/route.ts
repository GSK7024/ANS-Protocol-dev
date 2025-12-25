import { NextRequest, NextResponse } from 'next/server';

// ============================================
// BUDGET AIR - Mock Budget Airline
// ============================================
// Dynamic flight data that changes every 5 minutes
// Routes: Cheap domestic routes
// Lowest prices in the market!

interface Flight {
    id: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price_sol: number;
    available_seats: number;
    airline_name: string;
    baggage: string;
}

function generateFlights(): Flight[] {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 5555) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    const routes = [
        { from: 'DEL', to: 'JAI', fromCity: 'Delhi', toCity: 'Jaipur', hours: 1 },
        { from: 'BOM', to: 'GOI', fromCity: 'Mumbai', toCity: 'Goa', hours: 1 },
        { from: 'BLR', to: 'HYD', fromCity: 'Bangalore', toCity: 'Hyderabad', hours: 1 },
        { from: 'DEL', to: 'LKO', fromCity: 'Delhi', toCity: 'Lucknow', hours: 1 },
        { from: 'MAA', to: 'COK', fromCity: 'Chennai', toCity: 'Kochi', hours: 1 },
    ];

    const now = new Date();
    const flights: Flight[] = [];

    routes.forEach((route, idx) => {
        // Budget airlines have more frequent, cheaper flights
        for (let i = 0; i < 3; i++) {
            const departureHour = 5 + (i * 5) + (idx % 3);
            const departure = new Date(now);
            departure.setHours(departureHour, (seed * 3 + i * 20) % 60, 0);

            const arrival = new Date(departure);
            arrival.setHours(arrival.getHours() + route.hours);

            flights.push({
                id: `BA${300 + idx * 10 + i + (seed % 3)}`,
                from: route.from,
                to: route.to,
                departure: departure.toISOString(),
                arrival: arrival.toISOString(),
                price_sol: Number((0.05 + random(0, 10) / 100).toFixed(3)), // Super cheap!
                available_seats: Math.floor(random(10, 60)),
                airline_name: 'BudgetAir',
                baggage: '7kg cabin only'
            });
        }
    });

    return flights;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();

    console.log(`💸 [BudgetAir] Quote request: ${from || 'ALL'} → ${to || 'ALL'}`);

    let flights = generateFlights();
    if (from) flights = flights.filter(f => f.from === from);
    if (to) flights = flights.filter(f => f.to === to);

    return NextResponse.json({
        success: true,
        airline: 'BudgetAir',
        flights: flights,
        generated_at: new Date().toISOString(),
        next_refresh: '5 minutes',
        promo: '🔥 FLASH SALE - Extra 10% off with code BUDGET10!'
    });
}

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

        console.log(`💸 [BudgetAir] Booking ${flight_id} for ${passenger_name || 'Guest'}`);

        return NextResponse.json({
            success: true,
            confirmation: {
                pnr: `BUD${Date.now().toString(36).toUpperCase()}`,
                flight: flight,
                passenger: passenger_name || 'Guest Passenger',
                status: 'CONFIRMED',
                message: 'Web check-in opens 48h before departure',
                addon_offers: [
                    'Add 15kg baggage: +0.02 SOL',
                    'Priority boarding: +0.01 SOL',
                    'Meal: +0.005 SOL'
                ]
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
