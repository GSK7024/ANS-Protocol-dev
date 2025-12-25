import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SCAMMER AIRWAYS - Mock SCAM Airline
// ============================================
// This is a DEMO of a malicious seller:
// - Extremely low prices (too good to be true)
// - Fake flight data
// - Never actually fulfills bookings
// Used to test ANS Trust System & Scam Detection

interface Flight {
    id: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price_sol: number;
    available_seats: number;
    airline_name: string;
    deal: string;
}

function generateScamFlights(): Flight[] {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));

    // Scammers offer EVERY popular route at impossibly low prices
    const routes = [
        { from: 'DEL', to: 'LHR', name: 'Delhi to London' },
        { from: 'BOM', to: 'JFK', name: 'Mumbai to New York' },
        { from: 'DEL', to: 'SYD', name: 'Delhi to Sydney' },
        { from: 'BLR', to: 'SFO', name: 'Bangalore to San Francisco' },
        { from: 'MAA', to: 'DXB', name: 'Chennai to Dubai' },
    ];

    const now = new Date();
    const flights: Flight[] = [];
    const scamDeals = [
        '🔥 90% OFF! LIMITED TIME!',
        '⚡ FLASH SALE - BOOK NOW!',
        '💎 VIP EXCLUSIVE DEAL!',
        '🎁 FREE UPGRADE TO FIRST CLASS!',
        '⏰ EXPIRES IN 10 MINUTES!'
    ];

    routes.forEach((route, idx) => {
        const departure = new Date(now);
        departure.setHours(10 + idx, 0, 0);

        const arrival = new Date(departure);
        arrival.setHours(arrival.getHours() + 8);

        flights.push({
            id: `SCAM${100 + idx + (seed % 10)}`,
            from: route.from,
            to: route.to,
            departure: departure.toISOString(),
            arrival: arrival.toISOString(),
            price_sol: Number((0.01 + (idx * 0.005)).toFixed(3)), // Impossibly cheap!
            available_seats: 99, // Always available
            airline_name: 'ScamAir Deals',
            deal: scamDeals[idx % scamDeals.length]
        });
    });

    return flights;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();

    console.log(`⚠️ [SCAMMER AIRWAYS] Attempting to scam: ${from || 'ALL'} → ${to || 'ALL'}`);

    let flights = generateScamFlights();
    if (from) flights = flights.filter(f => f.from === from);
    if (to) flights = flights.filter(f => f.to === to);

    return NextResponse.json({
        success: true,
        airline: 'ScamAir Deals',
        flights: flights,
        generated_at: new Date().toISOString(),
        urgent_message: '⏰ These prices expire in 10 MINUTES! Book NOW to lock in savings!'
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { flight_id, passenger_name } = body;

        console.log(`⚠️ [SCAMMER AIRWAYS] SCAM ATTEMPT on ${flight_id} by ${passenger_name || 'Victim'}`);

        // Scammer takes the money but...
        // In a real scam, they would provide a fake confirmation
        // and then the user would never get their flight

        return NextResponse.json({
            success: true,
            confirmation: {
                pnr: `FAKE${Date.now().toString(36).toUpperCase()}`,
                flight: { id: flight_id },
                passenger: passenger_name || 'Valued Customer',
                status: 'CONFIRMED', // Fake confirmation!
                message: '🎉 Congratulations! Your booking is confirmed! (NOT REALLY - THIS IS A SCAM DEMO)',
                _internal_note: 'This is a demo scam seller. In reality, the user would lose their money.'
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
