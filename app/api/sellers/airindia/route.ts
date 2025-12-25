import { NextRequest, NextResponse } from 'next/server';

/**
 * SELLER: agent://airindia
 * 
 * This is a REAL seller agent registered in ANS.
 * Air India's flight booking API - provides live flight data and booking.
 * 
 * In production, this would be hosted by Air India themselves.
 * For demo, we host it but it represents a real seller in the ecosystem.
 */

// Simulated "live" flight database (in production, this would be Air India's real API)
const FLIGHT_DATABASE = {
    'DEL-BOM': [
        { flight_no: 'AI-855', dep: '06:00', arr: '08:15', price: 4500, seats: 45 },
        { flight_no: 'AI-857', dep: '09:30', arr: '11:45', price: 5200, seats: 32 },
        { flight_no: 'AI-863', dep: '14:00', arr: '16:15', price: 4800, seats: 18 },
        { flight_no: 'AI-871', dep: '18:30', arr: '20:45', price: 5500, seats: 52 },
        { flight_no: 'AI-879', dep: '21:00', arr: '23:15', price: 4200, seats: 8 },
    ],
    'DEL-BLR': [
        { flight_no: 'AI-501', dep: '07:00', arr: '09:45', price: 5800, seats: 28 },
        { flight_no: 'AI-505', dep: '12:30', arr: '15:15', price: 6200, seats: 41 },
        { flight_no: 'AI-509', dep: '19:00', arr: '21:45', price: 5500, seats: 15 },
    ],
    'BOM-DEL': [
        { flight_no: 'AI-856', dep: '07:00', arr: '09:15', price: 4600, seats: 38 },
        { flight_no: 'AI-864', dep: '15:00', arr: '17:15', price: 4900, seats: 22 },
        { flight_no: 'AI-880', dep: '22:00', arr: '00:15', price: 4100, seats: 55 },
    ]
};

const CITY_CODES: Record<string, string> = {
    'delhi': 'DEL', 'new delhi': 'DEL',
    'mumbai': 'BOM', 'bombay': 'BOM',
    'bangalore': 'BLR', 'bengaluru': 'BLR',
    'hyderabad': 'HYD', 'chennai': 'MAA',
    'kolkata': 'CCU', 'goa': 'GOI'
};

export async function POST(req: NextRequest) {
    try {
        const { action, from, to, date, flight_no, passenger } = await req.json();

        if (action === 'search' || !action) {
            // SEARCH FLIGHTS
            const fromCode = CITY_CODES[from?.toLowerCase()] || from?.toUpperCase() || 'DEL';
            const toCode = CITY_CODES[to?.toLowerCase()] || to?.toUpperCase() || 'BOM';
            const route = `${fromCode}-${toCode}`;

            const flights = FLIGHT_DATABASE[route as keyof typeof FLIGHT_DATABASE] || [];

            // Add dynamic pricing based on "demand" (time of day simulation)
            const hour = new Date().getHours();
            const demandMultiplier = hour >= 6 && hour <= 10 ? 1.15 : hour >= 17 && hour <= 21 ? 1.2 : 1.0;

            const results = flights.map(f => ({
                airline: 'Air India',
                flight_number: f.flight_no,
                from: fromCode,
                to: toCode,
                departure: f.dep,
                arrival: f.arr,
                duration: '2h 15m',
                price_inr: Math.round(f.price * demandMultiplier),
                price_usd: Math.round((f.price * demandMultiplier) / 83), // INR to USD
                available_seats: f.seats,
                class: 'Economy',
                aircraft: 'Airbus A320',
                meal_included: true,
                baggage: '25kg'
            }));

            return NextResponse.json({
                success: true,
                seller: 'agent://airindia',
                action: 'search',
                route: { from: fromCode, to: toCode },
                date: date || new Date().toISOString().split('T')[0],
                flights: results,
                total_results: results.length,
                currency: 'INR',
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'book') {
            // BOOK FLIGHT
            if (!flight_no || !passenger) {
                return NextResponse.json({ error: 'Missing flight_no or passenger data' }, { status: 400 });
            }

            const pnr = 'AI' + Math.random().toString(36).substring(2, 8).toUpperCase();

            return NextResponse.json({
                success: true,
                seller: 'agent://airindia',
                action: 'book',
                booking: {
                    pnr: pnr,
                    flight_number: flight_no,
                    passenger_name: passenger.full_name || 'Guest',
                    status: 'CONFIRMED',
                    e_ticket: `ETKT-${pnr}-001`,
                    booked_at: new Date().toISOString()
                },
                message: `Booking confirmed! PNR: ${pnr}`
            });
        }

        return NextResponse.json({ error: 'Invalid action. Use: search, book' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Agent Discovery (ANS Standard)
export async function GET() {
    return NextResponse.json({
        agent: 'agent://airindia',
        name: 'Air India',
        type: 'seller',
        category: 'airlines',
        description: 'Official Air India booking agent. Book domestic and international flights.',
        version: '1.0.0',
        logo: '/sellers/airindia-logo.png',
        website: 'https://airindia.com',
        pricing: {
            booking_fee: 0,
            ans_fee: '0.5%',
            payment_methods: ['SOL', 'USDC', 'INR']
        },
        required_fields: ['full_name', 'date_of_birth', 'passport_number', 'email', 'phone'],
        endpoints: {
            search: { method: 'POST', params: ['from', 'to', 'date'] },
            book: { method: 'POST', params: ['flight_no', 'passenger'] }
        },
        routes: ['DEL-BOM', 'DEL-BLR', 'BOM-DEL', 'DEL-HYD', 'BOM-BLR'],
        trust_score: 98,
        verified: true,
        transactions: 15420,
        rating: 4.5
    });
}
