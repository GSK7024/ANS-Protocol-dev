import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Aggregated Flight Search API
 * 
 * Queries ALL registered flight sellers and ranks results by:
 * - Price (30%)
 * - Trust Score (30%)
 * - Time Match (20%)
 * - Seller Experience (20%)
 * 
 * Filters out flagged/scam sellers with warnings
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SellerFlight {
    seller: {
        name: string;
        displayName: string;
        trustScore: number;
        trustTier: string;
        transactionCount: number;
        isVerified: boolean;
        isFlagged: boolean;
        flagReason?: string;
        riskLevel: string;
        rankingScore: number;
    };
    flight: {
        flightNumber: string;
        from: string;
        to: string;
        date: string;
        departure: string;
        arrival: string;
        duration: string;
        class: string;
        price: number;
        seatsAvailable: number;
        inventoryId?: number;
    };
    compositeScore: number;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const from = searchParams.get('from')?.toUpperCase();
        const to = searchParams.get('to')?.toUpperCase();
        const date = searchParams.get('date');
        const passengers = parseInt(searchParams.get('passengers') || '1');
        const timePreference = searchParams.get('time') || 'ANY';
        const includeRisky = searchParams.get('includeRisky') === 'true';

        if (!from || !to || !date) {
            return NextResponse.json({
                error: 'Missing required parameters',
                required: { from: 'DEL', to: 'BOM', date: 'YYYY-MM-DD' }
            }, { status: 400 });
        }

        console.log(`🔍 [AGGREGATED-SEARCH] ${from} → ${to} on ${date}`);

        // 1. Get all registered flight sellers from domains table
        const { data: sellers, error: sellersError } = await supabase
            .from('domains')
            .select('id, name, owner_wallet, seller_config, trust_score, is_verified, is_flagged, flag_reason, stake_amount')
            .not('seller_config', 'is', null)
            .eq('status', 'active')
            .order('trust_score', { ascending: false });

        if (sellersError || !sellers || sellers.length === 0) {
            // Fallback: Just query NexusAir directly if no sellers registered
            console.log('   No sellers registered, using NexusAir fallback');
            const fallbackResponse = await fetch(
                `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/nexusair/flights/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}`
            );
            return fallbackResponse;
        }

        console.log(`   Found ${sellers.length} registered flight sellers`);

        // 2. Categorize sellers by trust and flags
        const trustedSellers = sellers.filter(s => !s.is_flagged && (s.trust_score || 0) >= 0.5);
        const riskySellers = sellers.filter(s => !s.is_flagged && (s.trust_score || 0) < 0.5);
        const flaggedSellers = sellers.filter(s => s.is_flagged);

        // 3. Query each trusted seller's flights (in parallel)
        const flightPromises = trustedSellers.map(async (seller) => {
            try {
                // Check if seller has a real quote_url or use NexusAir fallback
                const quoteUrl = seller.seller_config?.quote_url;

                if (quoteUrl && !quoteUrl.includes('localhost:3000')) {
                    // Real external seller - call their API
                    return await queryExternalSeller(seller, from, to, date, passengers);
                } else {
                    // NexusAir or internal seller - use our data
                    return await getSellerFlights(seller, from, to, date, passengers);
                }
            } catch (err) {
                console.log(`   ⚠️ Failed to query ${seller.name}:`, err);
                return [];
            }
        });

        const sellerResults = await Promise.all(flightPromises);
        const allFlights: SellerFlight[] = sellerResults.flat();

        // 4. Also query risky sellers if requested (with warning)
        let riskyFlights: SellerFlight[] = [];
        if (includeRisky && riskySellers.length > 0) {
            const riskyPromises = riskySellers.map(seller =>
                getSellerFlights(seller, from, to, date, passengers)
            );
            riskyFlights = (await Promise.all(riskyPromises)).flat();
        }

        // 5. Calculate composite scores
        const scoredFlights = calculateCompositeScores(allFlights, timePreference);
        const scoredRiskyFlights = calculateCompositeScores(riskyFlights, timePreference);

        // 6. Sort by composite score
        scoredFlights.sort((a, b) => b.compositeScore - a.compositeScore);
        scoredRiskyFlights.sort((a, b) => b.compositeScore - a.compositeScore);

        // 7. Prepare warnings about flagged sellers
        const warnings = flaggedSellers.map(s => ({
            seller: `agent://${s.name}`,
            displayName: s.seller_config?.display_name || s.name,
            reason: s.flag_reason || 'Suspicious activity detected',
            trustScore: s.trust_score || 0,
            status: 'BLOCKED'
        }));

        console.log(`   ✅ Found ${scoredFlights.length} trusted flights, ${scoredRiskyFlights.length} risky, ${flaggedSellers.length} blocked`);

        return NextResponse.json({
            success: true,
            search: { from, to, date, passengers, timePreference },

            meta: {
                trustedSellers: trustedSellers.length,
                riskySellers: riskySellers.length,
                blockedSellers: flaggedSellers.length,
                totalFlights: scoredFlights.length,
                lowestTrustedPrice: scoredFlights.length > 0
                    ? Math.min(...scoredFlights.map(f => f.flight.price))
                    : null
            },

            // Main results - trusted sellers only
            flights: scoredFlights.map(formatFlightResult),

            // Risky flights (if requested) with warning
            riskyFlights: scoredRiskyFlights.length > 0 ? {
                warning: '⚠️ These flights are from sellers with low trust scores. Book at your own risk.',
                flights: scoredRiskyFlights.map(formatFlightResult)
            } : null,

            // Blocked sellers (scammers)
            blockedSellers: warnings.length > 0 ? {
                message: '🚫 The following sellers have been blocked due to fraud/scam reports:',
                sellers: warnings
            } : null,

            // Ranking algorithm explanation
            rankingInfo: {
                algorithm: 'Composite Score Ranking',
                factors: {
                    price: '30% - Lower prices score higher',
                    trustScore: '30% - Seller reputation on ANS',
                    timeMatch: '20% - How close to your preferred time',
                    experience: '20% - Seller transaction history'
                }
            }
        });

    } catch (err: any) {
        console.error('Aggregated search error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Query an external seller's API for flights
async function queryExternalSeller(
    seller: any,
    from: string,
    to: string,
    date: string,
    passengers: number
): Promise<SellerFlight[]> {
    try {
        const quoteUrl = seller.seller_config?.quote_url;
        if (!quoteUrl) return [];

        console.log(`   📡 Querying external seller: ${seller.name} at ${quoteUrl}`);

        const response = await fetch(quoteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to, date, passengers }),
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
            console.log(`   ⚠️ Seller ${seller.name} returned ${response.status}`);
            return [];
        }

        const data = await response.json();
        const flights = data.flights || [];

        // Map seller response to our format
        const trustScore = seller.trust_score || 0;
        const trustTier = trustScore >= 0.8 ? 'master' : trustScore >= 0.5 ? 'adept' : 'initiate';
        const rankingScore = calculateSellerRankingScore(seller);

        return flights.map((f: any) => ({
            seller: {
                name: seller.name,
                displayName: seller.seller_config?.display_name || seller.name,
                trustScore,
                trustTier,
                transactionCount: 0, // External seller doesn't share this
                isVerified: seller.is_verified || false,
                isFlagged: false,
                riskLevel: trustScore >= 0.5 ? 'trusted' : 'risky',
                rankingScore
            },
            flight: {
                flightNumber: f.flight_number || f.flightNumber || `${seller.name.toUpperCase().slice(0, 2)}-${Math.floor(Math.random() * 900) + 100}`,
                from,
                to,
                departure: f.departure || f.departure_time || '00:00',
                arrival: f.arrival || f.arrival_time || '00:00',
                duration: f.duration || '2h',
                class: f.class || 'ECONOMY',
                price: f.price || 0,
                seatsAvailable: f.seats || f.seatsAvailable || 0
            },
            compositeScore: 0
        }));
    } catch (err: any) {
        console.log(`   ⚠️ External seller ${seller.name} error: ${err.message}`);
        return [];
    }
}

// Get flights from a specific seller (internal/NexusAir)
async function getSellerFlights(
    seller: any,
    from: string,
    to: string,
    date: string,
    passengers: number
): Promise<SellerFlight[]> {
    // For demo: Query our unified flight inventory
    // In production: Each seller would have their own API

    const { data: route } = await supabase
        .from('routes')
        .select('id, typical_duration_minutes, base_price_economy')
        .eq('from_airport', from)
        .eq('to_airport', to)
        .single();

    if (!route) return [];

    const { data: inventory } = await supabase
        .from('flight_inventory')
        .select(`
            *,
            flights (
                id,
                flight_number,
                departure_time,
                arrival_time,
                airline_code
            )
        `)
        .eq('flights.route_id', route.id)
        .eq('flight_date', date)
        .gt('economy_available', 0)
        .eq('status', 'SCHEDULED');

    if (!inventory) return [];

    // Calculate ranking score for this seller
    const rankingScore = calculateSellerRankingScore(seller);

    // Apply price variation based on seller (simulating different airlines)
    const priceMultiplier = getPriceMultiplierForSeller(seller.name || '');

    // Get trust tier from trust_score
    const trustScore = seller.trust_score || 0;
    const trustTier = trustScore >= 0.8 ? 'master' : trustScore >= 0.5 ? 'adept' : 'initiate';

    return inventory
        .filter(inv => inv.flights) // Filter nulls
        .map(inv => {
            const flight = inv.flights as any;
            const adjustedPrice = Math.round(inv.economy_price * priceMultiplier);

            // Add seller prefix to flight number for identification
            const sellerPrefix = getSellerPrefix(seller.name || '');

            return {
                seller: {
                    name: seller.name,
                    displayName: seller.seller_config?.display_name || seller.name,
                    trustScore,
                    trustTier,
                    transactionCount: 0,
                    isVerified: seller.is_verified || false,
                    isFlagged: seller.is_flagged || false,
                    flagReason: seller.flag_reason,
                    riskLevel: getRiskLevel(seller),
                    rankingScore
                },
                flight: {
                    flightNumber: `${sellerPrefix}-${flight.flight_number.split('-')[1] || Math.floor(Math.random() * 900) + 100}`,
                    from,
                    to,
                    date,
                    departure: flight.departure_time,
                    arrival: flight.arrival_time,
                    duration: formatDuration(route.typical_duration_minutes),
                    class: 'ECONOMY',
                    price: adjustedPrice,
                    seatsAvailable: inv.economy_available,
                    inventoryId: inv.id
                },
                compositeScore: 0 // Will be calculated later
            };
        });
}

// Calculate seller ranking score
function calculateSellerRankingScore(seller: any): number {
    const trustWeight = 0.35;
    const successWeight = 0.25;
    const experienceWeight = 0.20;
    const stakeWeight = 0.20;

    // Use trust_score directly (already 0-1 scale from domains table)
    const trustScore = seller.trust_score || 0;
    // For domains-based sellers, we don't have transaction history
    const successRate = 0.7;  // Default assumption
    const experienceScore = seller.is_verified ? 0.8 : 0.3;
    const stakeScore = Math.min((seller.stake_amount || 0) / 10, 1);

    return (
        trustScore * trustWeight +
        successRate * successWeight +
        experienceScore * experienceWeight +
        stakeScore * stakeWeight
    );
}

// Calculate composite scores for all flights
function calculateCompositeScores(
    flights: SellerFlight[],
    timePreference: string
): SellerFlight[] {
    if (flights.length === 0) return [];

    // Find min/max prices for normalization
    const prices = flights.map(f => f.flight.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    return flights.map(flight => {
        // Price score (inverted - lower is better)
        const priceScore = 1 - ((flight.flight.price - minPrice) / priceRange);

        // Trust score (direct from seller)
        const trustScore = flight.seller.trustScore;

        // Time match score
        const timeScore = calculateTimeMatchScore(flight.flight.departure, timePreference);

        // Experience score (from seller ranking)
        const experienceScore = flight.seller.rankingScore;

        // Composite score
        const compositeScore = (
            priceScore * 0.30 +
            trustScore * 0.30 +
            timeScore * 0.20 +
            experienceScore * 0.20
        );

        return { ...flight, compositeScore };
    });
}

// Calculate how well departure time matches preference
function calculateTimeMatchScore(departure: string, preference: string): number {
    if (preference === 'ANY') return 0.5;

    const hour = parseInt(departure.split(':')[0]);

    const timeRanges: Record<string, [number, number]> = {
        'MORNING': [5, 12],
        'AFTERNOON': [12, 17],
        'EVENING': [17, 21],
        'NIGHT': [21, 5]
    };

    const range = timeRanges[preference];
    if (!range) return 0.5;

    if (hour >= range[0] && hour < range[1]) return 1.0;

    // Partial match for nearby times
    const midpoint = (range[0] + range[1]) / 2;
    const distance = Math.abs(hour - midpoint);
    return Math.max(0, 1 - distance / 12);
}

// Helper functions
function getPriceMultiplierForSeller(name: string): number {
    // Extract seller name from agent:// prefix
    const cleanName = name.replace('agent://', '').toLowerCase();
    const multipliers: Record<string, number> = {
        'nexusair': 1.0,
        'skyindia': 1.05,
        'jetstarindia': 0.85,
        'flydeal': 0.5  // Scammer offers "too good to be true" prices
    };
    return multipliers[cleanName] || 1.0;
}

function getSellerPrefix(name: string): string {
    const cleanName = name.replace('agent://', '').toLowerCase();
    const prefixes: Record<string, string> = {
        'nexusair': 'NX',
        'skyindia': 'SI',
        'jetstarindia': 'JS',
        'flydeal': 'FD'
    };
    return prefixes[cleanName] || cleanName.substring(0, 2).toUpperCase();
}

function getRiskLevel(seller: any): string {
    if (seller.is_flagged) return 'BLOCKED';
    const score = seller.trust_score || 0;  // 0-1 scale
    if (score < 0.3) return 'HIGH_RISK';
    if (score < 0.5) return 'MEDIUM_RISK';
    if (score < 0.7) return 'LOW_RISK';
    return 'TRUSTED';
}

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatFlightResult(f: SellerFlight) {
    return {
        seller: {
            name: f.seller.name,
            displayName: f.seller.displayName,
            trustScore: f.seller.trustScore,
            trustTier: f.seller.trustTier,
            riskLevel: f.seller.riskLevel,
            isVerified: f.seller.isVerified,
            badge: getTrustBadge(f.seller.trustTier)
        },
        flight: f.flight,
        ranking: {
            compositeScore: Math.round(f.compositeScore * 100),
            rank: `#${Math.round(f.compositeScore * 100)}`
        }
    };
}

function getTrustBadge(tier: string): string {
    const badges: Record<string, string> = {
        'master': '🏆 Master',
        'expert': '⭐ Expert',
        'pro': '✓ Pro',
        'initiate': '🆕 New'
    };
    return badges[tier] || tier;
}
