import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * NexusAir Flight Search API
 * 
 * Search for available flights with:
 * - Dynamic pricing based on demand, time, advance booking
 * - Real-time seat availability
 * - Filtering by time preferences
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FlightSearchParams {
    from: string;           // Airport code: DEL
    to: string;             // Airport code: BOM
    date: string;           // YYYY-MM-DD
    passengers?: number;    // Default 1
    class?: 'ECONOMY' | 'BUSINESS';
    timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY';
    sortBy?: 'price' | 'departure' | 'duration';
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const from = searchParams.get('from')?.toUpperCase();
        const to = searchParams.get('to')?.toUpperCase();
        const date = searchParams.get('date');
        const passengers = parseInt(searchParams.get('passengers') || '1');
        const travelClass = (searchParams.get('class') || 'ECONOMY').toUpperCase();
        const timePreference = searchParams.get('time') || 'ANY';
        const sortBy = searchParams.get('sort') || 'price';

        // Validation
        if (!from || !to || !date) {
            return NextResponse.json({
                error: 'Missing required parameters',
                required: { from: 'DEL', to: 'BOM', date: 'YYYY-MM-DD' },
                example: '/api/nexusair/flights/search?from=DEL&to=BOM&date=2024-12-25&passengers=2'
            }, { status: 400 });
        }

        // Validate date format and range
        const flightDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(flightDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
        }

        if (flightDate < today) {
            return NextResponse.json({ error: 'Cannot search for past dates' }, { status: 400 });
        }

        // Get route
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .select('id, distance_km, typical_duration_minutes, base_price_economy, base_price_business')
            .eq('from_airport', from)
            .eq('to_airport', to)
            .eq('is_active', true)
            .single();

        if (routeError || !route) {
            return NextResponse.json({
                error: `No route found from ${from} to ${to}`,
                suggestion: 'Check available airports at /api/nexusair/airports/search'
            }, { status: 404 });
        }

        // Get flights with inventory for this date
        const { data: flights, error: flightsError } = await supabase
            .from('flight_inventory')
            .select(`
                id,
                flight_id,
                flight_date,
                economy_available,
                economy_price,
                business_available,
                business_price,
                status,
                delay_minutes,
                flights!inner (
                    id,
                    flight_number,
                    departure_time,
                    arrival_time,
                    airline_code,
                    aircraft_types (
                        type_code,
                        model,
                        has_wifi,
                        has_entertainment
                    )
                )
            `)
            .eq('flights.route_id', route.id)
            .eq('flight_date', date)
            .eq('status', 'SCHEDULED');

        if (flightsError) {
            console.error('Flight search error:', flightsError);
            return NextResponse.json({ error: 'Search failed' }, { status: 500 });
        }

        if (!flights || flights.length === 0) {
            return NextResponse.json({
                success: true,
                message: `No flights available from ${from} to ${to} on ${date}`,
                flights: [],
                alternatives: {
                    suggestion: 'Try nearby dates or different airports',
                    nearbyDates: [
                        new Date(flightDate.getTime() - 86400000).toISOString().split('T')[0],
                        new Date(flightDate.getTime() + 86400000).toISOString().split('T')[0]
                    ]
                }
            });
        }

        // Apply time preference filter
        let filteredFlights = flights;
        if (timePreference !== 'ANY') {
            filteredFlights = flights.filter(f => {
                const hour = parseInt((f.flights as any).departure_time?.split(':')[0] || '0');
                switch (timePreference.toUpperCase()) {
                    case 'MORNING': return hour >= 5 && hour < 12;
                    case 'AFTERNOON': return hour >= 12 && hour < 17;
                    case 'EVENING': return hour >= 17 && hour < 21;
                    case 'NIGHT': return hour >= 21 || hour < 5;
                    default: return true;
                }
            });
        }

        // Calculate dynamic pricing and format response
        const daysInAdvance = Math.ceil((flightDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const dayOfWeek = flightDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const formattedFlights = filteredFlights.map(inventory => {
            const flight = inventory.flights as any;
            const aircraft = flight.aircraft_types;

            // Get base price
            let basePrice = travelClass === 'BUSINESS'
                ? inventory.business_price
                : inventory.economy_price;

            // Get availability
            const available = travelClass === 'BUSINESS'
                ? inventory.business_available
                : inventory.economy_available;

            // Apply dynamic pricing
            let finalPrice = basePrice;
            const pricingFactors: string[] = [];

            // Demand multiplier
            if (available < 20) {
                finalPrice *= 1.5;
                pricingFactors.push('high_demand');
            } else if (available < 50) {
                finalPrice *= 1.2;
                pricingFactors.push('moderate_demand');
            }

            // Advance booking
            if (daysInAdvance < 3) {
                finalPrice *= 1.3;
                pricingFactors.push('last_minute');
            } else if (daysInAdvance > 30) {
                finalPrice *= 0.9;
                pricingFactors.push('early_bird');
            }

            // Weekend
            if (isWeekend) {
                finalPrice *= 1.15;
                pricingFactors.push('weekend');
            }

            // Time-based
            const hour = parseInt(flight.departure_time?.split(':')[0] || '0');
            if (hour >= 7 && hour < 10) {
                finalPrice *= 1.2;
                pricingFactors.push('morning_rush');
            } else if (hour >= 17 && hour < 20) {
                finalPrice *= 1.15;
                pricingFactors.push('evening_rush');
            }

            const perPassengerPrice = Math.round(finalPrice);
            const totalForPassengers = perPassengerPrice * passengers;
            const taxes = Math.round(totalForPassengers * 0.12);
            const fees = 250 * passengers;

            return {
                inventoryId: inventory.id,
                flightId: flight.id,
                flightNumber: flight.flight_number,
                airline: {
                    code: flight.airline_code,
                    name: 'NexusAir',
                    logo: '/nexusair-logo.png'
                },
                route: {
                    from: from,
                    to: to,
                    distance: route.distance_km,
                    duration: route.typical_duration_minutes
                },
                schedule: {
                    date: date,
                    departure: flight.departure_time,
                    arrival: flight.arrival_time,
                    durationFormatted: formatDuration(route.typical_duration_minutes)
                },
                aircraft: {
                    type: aircraft?.type_code || 'A320',
                    model: aircraft?.model || 'Airbus A320',
                    amenities: {
                        wifi: aircraft?.has_wifi || false,
                        entertainment: aircraft?.has_entertainment || true,
                        power: true
                    }
                },
                availability: {
                    class: travelClass,
                    seatsAvailable: available,
                    status: available > 20 ? 'AVAILABLE' : available > 5 ? 'LIMITED' : 'FILLING_FAST'
                },
                pricing: {
                    basePrice: basePrice,
                    finalPrice: perPassengerPrice,
                    forPassengers: passengers,
                    breakdown: {
                        baseFare: perPassengerPrice * passengers,
                        taxes: taxes,
                        fees: fees,
                        total: (perPassengerPrice * passengers) + taxes + fees
                    },
                    currency: 'INR',
                    pricingFactors: pricingFactors
                },
                status: inventory.status,
                delay: inventory.delay_minutes > 0 ? {
                    minutes: inventory.delay_minutes,
                    newDeparture: addMinutesToTime(flight.departure_time, inventory.delay_minutes)
                } : null
            };
        });

        // Sort flights
        formattedFlights.sort((a, b) => {
            switch (sortBy) {
                case 'departure':
                    return a.schedule.departure.localeCompare(b.schedule.departure);
                case 'duration':
                    return a.route.duration - b.route.duration;
                case 'price':
                default:
                    return a.pricing.finalPrice - b.pricing.finalPrice;
            }
        });

        return NextResponse.json({
            success: true,
            search: {
                from,
                to,
                date,
                passengers,
                class: travelClass,
                timePreference
            },
            meta: {
                totalFlights: formattedFlights.length,
                lowestPrice: formattedFlights.length > 0
                    ? Math.min(...formattedFlights.map(f => f.pricing.breakdown.total))
                    : null,
                highestPrice: formattedFlights.length > 0
                    ? Math.max(...formattedFlights.map(f => f.pricing.breakdown.total))
                    : null
            },
            flights: formattedFlights
        });

    } catch (err: any) {
        console.error('Flight search error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Helper functions
function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}
