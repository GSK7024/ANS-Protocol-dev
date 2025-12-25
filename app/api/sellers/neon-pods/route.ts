import { NextRequest, NextResponse } from 'next/server';

// ============================================
// NEON PODS - Budget Capsule Hotel
// ============================================
// Super cheap, high availability

function generatePods() {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 6666) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    return [
        {
            id: 'np-basic',
            name: 'Basic Pod',
            price_sol: Number((0.05 + random(0, 5) / 100).toFixed(3)),
            available: Math.floor(random(20, 50)),
            features: 'Bed, Air-con, USB charging'
        },
        {
            id: 'np-plus',
            name: 'Pod Plus',
            price_sol: Number((0.08 + random(0, 8) / 100).toFixed(3)),
            available: Math.floor(random(10, 25)),
            features: 'Larger bed, TV, Locker'
        },
        {
            id: 'np-vip',
            name: 'VIP Pod',
            price_sol: Number((0.15 + random(0, 10) / 100).toFixed(3)),
            available: Math.floor(random(5, 15)),
            features: 'Private pod, Shower access, Breakfast'
        }
    ];
}

export async function GET(req: NextRequest) {
    console.log(`💤 [Neon Pods] Quote request`);

    const pods = generatePods();

    return NextResponse.json({
        success: true,
        hotel: 'Neon Pods',
        location: 'Tokyo, Akihabara',
        rating: 4.2,
        flights: pods.map(p => ({
            id: p.id,
            airline_name: p.name,
            price_sol: p.price_sol,
            available_seats: p.available,
            details: p.features
        })),
        promo: '🎮 Free arcade tokens for all guests!',
        generated_at: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    return NextResponse.json({
        success: true,
        confirmation: {
            booking_id: `POD${Date.now().toString(36).toUpperCase()}`,
            status: 'CONFIRMED',
            message: 'Pod assigned. Entry code sent to your device.'
        }
    });
}
