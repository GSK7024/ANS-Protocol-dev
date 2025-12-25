import { NextRequest, NextResponse } from 'next/server';

/**
 * ANS Demo Agent: agent://book-hotel
 * 
 * Searches for hotels and returns booking options.
 * Uses mock data for demo, ready for real API (Booking.com, etc.)
 * 
 * Price: 0.015 SOL per search
 * ANS Fee: 0.5% of booking amount
 */

// Mock hotel data for demo
const MOCK_HOTELS = [
    {
        id: 'HT001',
        name: 'Taj Mahal Palace',
        location: 'Mumbai, India',
        rating: 5,
        stars: 5,
        price_per_night: 275,
        currency: 'USD',
        amenities: ['Pool', 'Spa', 'Restaurant', 'Bar', 'Gym', 'WiFi'],
        image: '/hotel-taj.jpg',
        available_rooms: 12
    },
    {
        id: 'HT002',
        name: 'The Oberoi',
        location: 'Mumbai, India',
        rating: 4.8,
        stars: 5,
        price_per_night: 320,
        currency: 'USD',
        amenities: ['Pool', 'Spa', 'Restaurant', 'Bar', 'Gym', 'WiFi', 'Airport Shuttle'],
        image: '/hotel-oberoi.jpg',
        available_rooms: 8
    },
    {
        id: 'HT003',
        name: 'ITC Grand Central',
        location: 'Mumbai, India',
        rating: 4.5,
        stars: 5,
        price_per_night: 195,
        currency: 'USD',
        amenities: ['Pool', 'Restaurant', 'Bar', 'Gym', 'WiFi'],
        image: '/hotel-itc.jpg',
        available_rooms: 25
    },
    {
        id: 'HT004',
        name: 'Trident Nariman Point',
        location: 'Mumbai, India',
        rating: 4.6,
        stars: 4,
        price_per_night: 165,
        currency: 'USD',
        amenities: ['Pool', 'Restaurant', 'Gym', 'WiFi'],
        image: '/hotel-trident.jpg',
        available_rooms: 18
    }
];

export async function POST(req: NextRequest) {
    try {
        const { city, checkin, checkout, guests, min_price, max_price, auth } = await req.json();

        if (!city) {
            return NextResponse.json(
                { error: 'Missing required field: city' },
                { status: 400 }
            );
        }

        // Filter hotels by price range
        let hotels = [...MOCK_HOTELS];

        if (min_price) {
            hotels = hotels.filter(h => h.price_per_night >= min_price);
        }
        if (max_price) {
            hotels = hotels.filter(h => h.price_per_night <= max_price);
        }

        // Sort by price
        hotels.sort((a, b) => a.price_per_night - b.price_per_night);

        // Calculate nights and total
        const nights = 1; // Default 1 night
        const hotelsWithTotal = hotels.map(h => ({
            ...h,
            nights,
            total_price: h.price_per_night * nights,
            ans_fee: h.price_per_night * nights * 0.005
        }));

        return NextResponse.json({
            success: true,
            agent: 'agent://book-hotel',
            action: 'search',
            search_params: { city, checkin, checkout, guests, min_price, max_price },
            results: hotelsWithTotal,
            pricing: {
                search_fee: 0.015,
                booking_fee_percent: 0.5,
                currency: 'SOL'
            },
            metadata: {
                total_results: hotelsWithTotal.length,
                data_source: 'demo',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Hotel Agent Error:', error);
        return NextResponse.json(
            { error: 'Failed to search hotels', details: error.message },
            { status: 500 }
        );
    }
}

// Booking confirmation endpoint
export async function PUT(req: NextRequest) {
    try {
        const { hotel_id, guest_data, checkin, checkout, auth } = await req.json();

        if (!hotel_id) {
            return NextResponse.json(
                { error: 'Missing hotel_id for booking' },
                { status: 400 }
            );
        }

        // Simulate booking confirmation
        const confirmationNumber = 'ANSH' + Math.random().toString(36).substring(2, 8).toUpperCase();

        return NextResponse.json({
            success: true,
            agent: 'agent://book-hotel',
            action: 'book',
            booking: {
                confirmation_number: confirmationNumber,
                hotel_id: hotel_id,
                status: 'CONFIRMED',
                guest_name: guest_data?.full_name || 'Guest',
                checkin: checkin || 'Today',
                checkout: checkout || 'Tomorrow',
                booked_at: new Date().toISOString()
            },
            message: `Hotel booked! Confirmation: ${confirmationNumber}`
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: 'Booking failed', details: error.message },
            { status: 500 }
        );
    }
}

// GET endpoint for agent discovery
export async function GET() {
    return NextResponse.json({
        agent: 'agent://book-hotel',
        name: 'Hotel Booking Agent',
        description: 'Search and book hotels worldwide. Best price guarantee.',
        version: '1.0.0',
        pricing: {
            search_fee: 0.015,
            booking_fee: '0.5%',
            currency: 'SOL'
        },
        required_vault_fields: ['full_name', 'email', 'phone'],
        endpoints: {
            search: {
                method: 'POST',
                body: {
                    city: 'string (required) - City name',
                    checkin: 'string (optional) - YYYY-MM-DD',
                    checkout: 'string (optional) - YYYY-MM-DD',
                    guests: 'number (optional) - default 1',
                    min_price: 'number (optional) - Min price per night',
                    max_price: 'number (optional) - Max price per night'
                }
            },
            book: {
                method: 'PUT',
                body: {
                    hotel_id: 'string (required)',
                    guest_data: 'object (from vault)'
                }
            }
        },
        capabilities: [
            'Search hotels worldwide',
            'Filter by price range',
            'Instant confirmation',
            'Free cancellation (select properties)'
        ],
        trust_score: 92,
        verified: true
    });
}
