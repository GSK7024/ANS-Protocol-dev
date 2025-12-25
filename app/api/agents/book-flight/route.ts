import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

/**
 * ANS Demo Agent: agent://book-flight
 * 
 * Searches for flights and returns booking options.
 * Uses mock data for demo, but structure is ready for real API (Amadeus, etc.)
 * 
 * Price: 0.02 SOL per search
 * ANS Fee: 0.5% of booking amount
 */

// Mock flight data for demo
const MOCK_FLIGHTS = [
    {
        id: 'FL001',
        airline: 'IndiGo',
        flight_number: '6E-2341',
        from: 'DEL',
        to: 'BOM',
        departure: '20:30',
        arrival: '22:45',
        duration: '2h 15m',
        price: 89,
        currency: 'USD',
        class: 'Economy'
    },
    {
        id: 'FL002',
        airline: 'Air India',
        flight_number: 'AI-855',
        from: 'DEL',
        to: 'BOM',
        departure: '21:00',
        arrival: '23:20',
        duration: '2h 20m',
        price: 125,
        currency: 'USD',
        class: 'Economy'
    },
    {
        id: 'FL003',
        airline: 'Vistara',
        flight_number: 'UK-955',
        from: 'DEL',
        to: 'BOM',
        departure: '19:45',
        arrival: '22:00',
        duration: '2h 15m',
        price: 145,
        currency: 'USD',
        class: 'Premium Economy'
    }
];

export async function POST(req: NextRequest) {
    try {
        const { from, to, date, passengers, preferences, auth } = await req.json();

        if (!to) {
            return NextResponse.json(
                { error: 'Missing required field: destination (to)' },
                { status: 400 }
            );
        }

        // For demo, use mock data
        // In production, call Amadeus/Skyscanner API here
        let flights = [...MOCK_FLIGHTS];

        // Apply simple filtering
        if (to) {
            // Map common city names to airport codes
            const cityToCode: Record<string, string> = {
                'mumbai': 'BOM', 'delhi': 'DEL', 'bangalore': 'BLR',
                'hyderabad': 'HYD', 'chennai': 'MAA', 'kolkata': 'CCU',
                'goa': 'GOI', 'jaipur': 'JAI', 'new york': 'JFK',
                'london': 'LHR', 'dubai': 'DXB', 'singapore': 'SIN'
            };
            const destCode = cityToCode[to.toLowerCase()] || to.toUpperCase();
            flights = flights.filter(f => f.to === destCode || f.to.toLowerCase() === to.toLowerCase());
        }

        // If no flights found for destination, generate some
        if (flights.length === 0) {
            flights = [
                {
                    id: 'FL100',
                    airline: 'IndiGo',
                    flight_number: '6E-' + Math.floor(Math.random() * 9000 + 1000),
                    from: from || 'DEL',
                    to: to.toUpperCase().slice(0, 3),
                    departure: '20:30',
                    arrival: '22:45',
                    duration: '2h 15m',
                    price: Math.floor(Math.random() * 100 + 80),
                    currency: 'USD',
                    class: 'Economy'
                },
                {
                    id: 'FL101',
                    airline: 'Air India',
                    flight_number: 'AI-' + Math.floor(Math.random() * 900 + 100),
                    from: from || 'DEL',
                    to: to.toUpperCase().slice(0, 3),
                    departure: '21:15',
                    arrival: '23:30',
                    duration: '2h 15m',
                    price: Math.floor(Math.random() * 100 + 100),
                    currency: 'USD',
                    class: 'Economy'
                }
            ];
        }

        // Calculate ANS fees
        const selectedFlight = flights[0];
        const bookingAmount = selectedFlight.price;
        const ansFee = bookingAmount * 0.005;

        return NextResponse.json({
            success: true,
            agent: 'agent://book-flight',
            action: 'search',
            search_params: { from, to, date, passengers },
            results: flights,
            pricing: {
                search_fee: 0.02,
                booking_fee_percent: 0.5,
                currency: 'SOL'
            },
            metadata: {
                total_results: flights.length,
                data_source: 'demo', // 'amadeus' in production
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Flight Agent Error:', error);
        return NextResponse.json(
            { error: 'Failed to search flights', details: error.message },
            { status: 500 }
        );
    }
}

// Booking confirmation endpoint
export async function PUT(req: NextRequest) {
    try {
        const { flight_id, passenger_data, auth } = await req.json();

        if (!flight_id) {
            return NextResponse.json(
                { error: 'Missing flight_id for booking' },
                { status: 400 }
            );
        }

        // Simulate booking confirmation
        const confirmationNumber = 'ANS' + Math.random().toString(36).substring(2, 8).toUpperCase();

        return NextResponse.json({
            success: true,
            agent: 'agent://book-flight',
            action: 'book',
            booking: {
                confirmation_number: confirmationNumber,
                flight_id: flight_id,
                status: 'CONFIRMED',
                passenger: passenger_data?.full_name || 'Guest',
                booked_at: new Date().toISOString()
            },
            message: `Flight booked! Confirmation: ${confirmationNumber}`
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
        agent: 'agent://book-flight',
        name: 'Flight Booking Agent',
        description: 'Search and book flights to any destination. Integrated with major airlines.',
        version: '1.0.0',
        pricing: {
            search_fee: 0.02,
            booking_fee: '0.5%',
            currency: 'SOL'
        },
        required_vault_fields: ['full_name', 'passport_number', 'passport_expiry', 'date_of_birth'],
        endpoints: {
            search: {
                method: 'POST',
                body: {
                    from: 'string (optional) - Departure city/airport',
                    to: 'string (required) - Destination city/airport',
                    date: 'string (optional) - YYYY-MM-DD',
                    passengers: 'number (optional) - default 1'
                }
            },
            book: {
                method: 'PUT',
                body: {
                    flight_id: 'string (required)',
                    passenger_data: 'object (from vault)'
                }
            }
        },
        capabilities: [
            'Search flights worldwide',
            'Real-time pricing',
            'Instant booking confirmation',
            'E-ticket delivery'
        ],
        trust_score: 95,
        verified: true
    });
}
