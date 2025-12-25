import { NextRequest, NextResponse } from 'next/server';

// Mock flight data for testing
// In production, this would come from real GDS/airline APIs

interface Flight {
    id: string;
    agent: string;
    airline_name: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price_sol: number;
    available_seats: number;
    trust_score: number;
}

// Test flight routes
const TEST_ROUTES: { [key: string]: Flight[] } = {
    'MUM-PUN': [
        {
            id: 'AI101',
            agent: 'airindia-test',
            airline_name: 'Air India Express',
            from: 'Mumbai (BOM)',
            to: 'Pune (PNQ)',
            departure: '18:30',
            arrival: '19:15',
            price_sol: 0.45 + Math.random() * 0.05, // Slight variation
            available_seats: 12,
            trust_score: 0.95
        },
        {
            id: 'SJ202',
            agent: 'skyjet-test',
            airline_name: 'SkyJet Airways',
            from: 'Mumbai (BOM)',
            to: 'Pune (PNQ)',
            departure: '19:00',
            arrival: '19:50',
            price_sol: 0.52 + Math.random() * 0.08,
            available_seats: 8,
            trust_score: 0.88
        },
        {
            id: 'SC666',
            agent: 'scamair-test',
            airline_name: 'ScamAir Deals',
            from: 'Mumbai (BOM)',
            to: 'Pune (PNQ)',
            departure: '18:45',
            arrival: '19:30',
            price_sol: 0.15, // Suspiciously cheap!
            available_seats: 50,
            trust_score: 0.12 // Very low
        }
    ],
    'DEL-BLR': [
        {
            id: 'AI303',
            agent: 'airindia-test',
            airline_name: 'Air India Express',
            from: 'Delhi (DEL)',
            to: 'Bangalore (BLR)',
            departure: '06:00',
            arrival: '08:45',
            price_sol: 0.85 + Math.random() * 0.1,
            available_seats: 25,
            trust_score: 0.95
        },
        {
            id: 'SJ404',
            agent: 'skyjet-test',
            airline_name: 'SkyJet Airways',
            from: 'Delhi (DEL)',
            to: 'Bangalore (BLR)',
            departure: '07:30',
            arrival: '10:00',
            price_sol: 0.78 + Math.random() * 0.12,
            available_seats: 15,
            trust_score: 0.88
        }
    ]
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from')?.toUpperCase() || 'MUM';
    const to = searchParams.get('to')?.toUpperCase() || 'PUN';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const routeKey = `${from}-${to}`;
    let flights = TEST_ROUTES[routeKey] || TEST_ROUTES['MUM-PUN'];

    // Add slight price variation on each call (live data simulation)
    flights = flights.map(f => ({
        ...f,
        price_sol: Math.round((f.price_sol + (Math.random() * 0.02 - 0.01)) * 1000) / 1000,
        id: `${f.id}-${Date.now().toString(36).slice(-4)}`
    }));

    // Sort by price
    flights.sort((a, b) => a.price_sol - b.price_sol);

    return NextResponse.json({
        success: true,
        route: `${from} → ${to}`,
        date,
        flights,
        warning: flights.some(f => f.trust_score < 0.5)
            ? '⚠️ Some options have low trust scores. Proceed with caution.'
            : null
    });
}
