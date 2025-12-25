
import { NextRequest, NextResponse } from 'next/server';

// MOCK DATABASE FOR HOTEL AGENT
const HOTELS = [
    { id: 'h1', name: 'Grand Cyberpunk Hotel', location: 'Tokyo', price_sol: 1.5, rating: 4.8 },
    { id: 'h2', name: 'Neon Pods', location: 'Tokyo', price_sol: 0.5, rating: 4.2 },
    { id: 'h3', name: 'Orbital Suite', location: 'Orbit', price_sol: 5.0, rating: 5.0 },
    { id: 'h4', name: 'Mars Base Alpha', location: 'Mars', price_sol: 2.0, rating: 4.5 }
];

// Helper for search logic
function searchHotels(query: any) {
    const searchTerm = (query?.location || query?.q || (typeof query === 'string' ? query : '') || 'Tokyo').toLowerCase();
    return HOTELS.filter(h =>
        h.location.toLowerCase().includes(searchTerm) ||
        h.name.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(h.location.toLowerCase())
    ).map(h => ({
        name: h.name,
        description: `${h.rating}⭐ hotel in ${h.location}`,
        price: `${h.price_sol} SOL`,
        booking_id: h.id
    }));
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('q') || 'Tokyo';
    console.log(`🏨 Hotel Agent API (GET) searching for: "${query}"`);

    const results = searchHotels(query);
    return NextResponse.json({ success: true, results });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, query, booking } = body;
        // ...

        console.log(`🏨 Hotel Agent API received action: ${action}`);

        // 1. SEARCH DOCTOR
        if (action === 'search') {
            // Flexible query handling
            const searchTerm = (query?.location || query?.q || (typeof query === 'string' ? query : '') || 'Tokyo').toLowerCase();

            console.log(`🏨 Searching for: "${searchTerm}"`);

            const results = HOTELS.filter(h =>
                h.location.toLowerCase().includes(searchTerm) ||
                h.name.toLowerCase().includes(searchTerm) ||
                searchTerm.includes(h.location.toLowerCase()) // partial match both ways
            );
            return NextResponse.json({
                success: true,
                results: results.map(h => ({
                    name: h.name,
                    description: `${h.rating}⭐ hotel in ${h.location}`,
                    price: `${h.price_sol} SOL`,
                    booking_id: h.id
                }))
            });
        }

        // 2. BOOKING/QUOTE DOCTOR
        if (action === 'quote' && booking?.id) {
            const hotel = HOTELS.find(h => h.id === booking.id);
            if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

            return NextResponse.json({
                success: true,
                invoice: {
                    item: hotel.name,
                    amount_sol: hotel.price_sol,
                    seller_wallet: "HotelWalletAddressMOCK123456789", // Mock Wallet
                    valid_for_seconds: 300
                }
            });
        }

        // 3. FULFILLMENT (After Payment)
        if (action === 'fulfill' && booking?.payment_signature) {
            // Verify payment on chain? (Mocking success here)
            // Receive User Vault Data?
            const userData = booking.user_vault_data;
            console.log(`🏨 Booking Confirmed for ${userData?.name || 'Anonymous Guest'}`);

            return NextResponse.json({
                success: true,
                confirmation_code: `RES-${Math.random().toString(36).substring(7).toUpperCase()}`,
                message: "Room Key sent to your Neural Link."
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
