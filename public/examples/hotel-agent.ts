import { NextRequest, NextResponse } from 'next/server';

/**
 * SELLER: agent://marriott
 * 
 * Marriott Hotels booking agent registered in ANS.
 * Provides live room availability and booking.
 * Reference implementation for the ANS standard.
 */

// Simulated hotel inventory
const HOTEL_INVENTORY: Record<string, any[]> = {
    'mumbai': [
        {
            property: 'JW Marriott Mumbai Juhu',
            room_type: 'Deluxe Room',
            price: 18500,
            available: 12,
            amenities: ['Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'WiFi'],
            rating: 4.8
        },
        {
            property: 'Marriott Executive Apartments',
            room_type: 'Studio Suite',
            price: 12000,
            available: 8,
            amenities: ['Kitchen', 'Gym', 'WiFi', 'Laundry'],
            rating: 4.5
        }
    ],
    'delhi': [
        {
            property: 'JW Marriott New Delhi',
            room_type: 'Premier Room',
            price: 22000,
            available: 6,
            amenities: ['Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'WiFi', 'Butler'],
            rating: 4.9
        }
    ]
};

export async function POST(req: NextRequest) {
    try {
        const { action, city, checkin, checkout, rooms, property_id, guest } = await req.json();

        if (action === 'search' || !action) {
            const cityKey = city?.toLowerCase() || 'mumbai';
            const hotels = HOTEL_INVENTORY[cityKey] || HOTEL_INVENTORY['mumbai'];

            // Calculate nights
            const nights = 1; // Default

            const results = hotels.map((h, i) => ({
                id: `MH${cityKey.toUpperCase().slice(0, 3)}${i + 1}`,
                property_name: h.property,
                brand: 'Marriott',
                city: city || 'Mumbai',
                room_type: h.room_type,
                price_per_night_inr: h.price,
                price_per_night_usd: Math.round(h.price / 83),
                total_inr: h.price * nights,
                total_usd: Math.round((h.price * nights) / 83),
                nights: nights,
                available_rooms: h.available,
                amenities: h.amenities,
                rating: h.rating,
                cancellation: 'Free cancellation until 24h before check-in',
                breakfast_included: h.price > 10000
            }));

            return NextResponse.json({
                success: true,
                seller: 'agent://marriott',
                action: 'search',
                city: city || 'Mumbai',
                checkin: checkin || new Date().toISOString().split('T')[0],
                checkout: checkout,
                hotels: results,
                total_results: results.length,
                currency: 'INR',
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'book') {
            if (!property_id || !guest) {
                return NextResponse.json({ error: 'Missing property_id or guest data' }, { status: 400 });
            }

            const confirmation = 'MR' + Math.random().toString(36).substring(2, 8).toUpperCase();

            return NextResponse.json({
                success: true,
                seller: 'agent://marriott',
                action: 'book',
                reservation: {
                    confirmation_number: confirmation,
                    property_id: property_id,
                    guest_name: guest.full_name || 'Guest',
                    status: 'CONFIRMED',
                    checkin: checkin,
                    checkout: checkout,
                    booked_at: new Date().toISOString()
                },
                message: `Reservation confirmed! Confirmation: ${confirmation}`
            });
        }

        return NextResponse.json({ error: 'Invalid action. Use: search, book' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
