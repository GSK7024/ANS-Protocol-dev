
import { NextRequest, NextResponse } from 'next/server';

// MOCK TRANSPORT QUOTE
// GET /api/testing/transport/quote?from=X&to=Y
export async function GET(req: NextRequest) {
    // Generate random realistic price
    const price = (0.01 + Math.random() * 0.05).toFixed(4); // 0.01 - 0.06 SOL

    return NextResponse.json({
        options: [{
            id: 'ride-' + Math.random().toString(36).substr(2, 5),
            agent: 'uber-test',
            airline_name: 'Uber Premier', // reuse field name for compatibility
            price: parseFloat(price),
            departure: new Date().toISOString(),
            arrival: new Date(Date.now() + 3600000).toISOString(),
            available_seats: 4
        }]
    });
}
