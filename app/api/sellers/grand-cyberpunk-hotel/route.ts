import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GRAND CYBERPUNK HOTEL - Luxury Hotel
// ============================================
// Dynamic room data that changes every 5 minutes

interface Room {
    id: string;
    name: string;
    type: string;
    price_sol: number;
    available: number;
    amenities: string[];
}

function generateRooms(): Room[] {
    const seed = Math.floor(Date.now() / (5 * 60 * 1000));
    const random = (min: number, max: number) => {
        const x = Math.sin(seed * 8888) * 10000;
        return min + (Math.abs(x) % (max - min));
    };

    return [
        {
            id: 'gc-std',
            name: 'Standard Cyber Suite',
            type: 'standard',
            price_sol: Number((0.5 + random(0, 20) / 100).toFixed(3)),
            available: Math.floor(random(3, 15)),
            amenities: ['Holographic TV', 'Neural Shower', 'Mini Bar']
        },
        {
            id: 'gc-dlx',
            name: 'Deluxe Neon Room',
            type: 'deluxe',
            price_sol: Number((1.0 + random(0, 30) / 100).toFixed(3)),
            available: Math.floor(random(2, 8)),
            amenities: ['VR Pod', 'Smart Glass Windows', 'AI Butler', 'Jacuzzi']
        },
        {
            id: 'gc-pent',
            name: 'Penthouse Matrix Suite',
            type: 'penthouse',
            price_sol: Number((2.5 + random(0, 50) / 100).toFixed(3)),
            available: Math.floor(random(1, 3)),
            amenities: ['360° City View', 'Private Pool', 'Neural Link Hub', 'Chef Bot']
        }
    ];
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    console.log(`🏨 [Grand Cyberpunk Hotel] Quote request`);

    let rooms = generateRooms();
    if (type) rooms = rooms.filter(r => r.type === type);

    return NextResponse.json({
        success: true,
        hotel: 'Grand Cyberpunk Hotel',
        location: 'Tokyo, Neo-Shibuya District',
        rating: 4.8,
        flights: rooms.map(r => ({ // Using 'flights' key for Orchestrator compatibility
            id: r.id,
            airline_name: r.name,
            price_sol: r.price_sol,
            available_seats: r.available,
            details: r.amenities.join(', ')
        })),
        generated_at: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { room_id, guest_name, nights } = body;

    console.log(`🏨 [Grand Cyberpunk Hotel] Booking ${room_id} for ${guest_name}, ${nights || 1} nights`);

    return NextResponse.json({
        success: true,
        confirmation: {
            booking_id: `GCH${Date.now().toString(36).toUpperCase()}`,
            room: room_id,
            guest: guest_name || 'Guest',
            nights: nights || 1,
            status: 'CONFIRMED',
            message: 'Room key activated. Check-in via retinal scan at lobby.'
        }
    });
}
