import { NextRequest, NextResponse } from 'next/server';

// ============================================
// MARS BASE ALPHA - Futuristic Premium Hotel
// ============================================
// High-end space themed experience

function generateHabitats() {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 4444) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    return [
        {
            id: 'mars-crew',
            name: 'Crew Quarters',
            price_sol: Number((1.5 + random(0, 30) / 100).toFixed(3)),
            available: Math.floor(random(5, 12)),
            features: 'Zero-G sleeping pod, Mars view, Hydroponic garden'
        },
        {
            id: 'mars-officer',
            name: 'Officer Suite',
            price_sol: Number((3.0 + random(0, 50) / 100).toFixed(3)),
            available: Math.floor(random(2, 6)),
            features: 'Private dome, AI companion, Rover access'
        },
        {
            id: 'mars-commander',
            name: 'Commander Dome',
            price_sol: Number((5.0 + random(0, 100) / 100).toFixed(3)),
            available: Math.floor(random(1, 3)),
            features: 'Full Mars panorama, Private lab, Spacesuit included'
        }
    ];
}

export async function GET(req: NextRequest) {
    console.log(`🚀 [Mars Base Alpha] Quote request`);

    const habitats = generateHabitats();

    return NextResponse.json({
        success: true,
        hotel: 'Mars Base Alpha',
        location: 'Olympus Mons, Mars',
        rating: 5.0,
        flights: habitats.map(h => ({
            id: h.id,
            airline_name: h.name,
            price_sol: h.price_sol,
            available_seats: h.available,
            details: h.features
        })),
        notice: '⚠️ 6-month Mars transit required. Cryosleep included.',
        generated_at: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    return NextResponse.json({
        success: true,
        confirmation: {
            booking_id: `MARS${Date.now().toString(36).toUpperCase()}`,
            status: 'CONFIRMED',
            message: 'Habitat reserved. Launch window: Next week. Pack light.'
        }
    });
}
