
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

/**
 * MOCK UBER AGENT (Transport Vertical)
 * 
 * - Monitors 'transport' escrows
 * - Books a "Ride" on the backend
 * - Submits Trip ID to NEXUS
 */

const AGENT_NAME = 'uber-test';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
const TRANSPORT_BACKEND_URL = `${BASE_URL}/api/testing/transport/backend`; // We'll create this

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log(`🛺 [uber-test] AGENT STARTED. Monitoring for orders...`);

async function generateTripId() {
    return 'TRIP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

async function bookRideInBackend(escrow: any) {
    const tripId = await generateTripId();

    // Simulate booking via API
    // In prod, this would call Uber/Rapido API
    console.log(`🛺 [AGENT] Booking ride for ${escrow.buyer_wallet.slice(0, 6)}...`);

    // Call our mock backend to register the trip
    // (We reuse the pattern from airline backend)
    const response = await fetch(TRANSPORT_BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer uber-secret-key'
        },
        body: JSON.stringify({
            action: 'book_ride',
            trip_id: tripId,
            rider: escrow.buyer_wallet,
            pickup: escrow.service_details?.pickup,
            dropoff: escrow.service_details?.dropoff
        })
    });

    if (!response.ok) {
        throw new Error(`Backend Booking Failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`   ✅ Trip Booked! ID: ${tripId} (Driver: ${data.trip.driver_name})`);

    return {
        trip_id: tripId,
        driver_name: data.trip.driver_name,
        vehicle: data.trip.vehicle,
        status: 'SCHEDULED'
    };
}

async function confirmEscrow(escrowId: string, proof: any) {
    console.log(`📦 [AGENT] Submitting proof to NEXUS...`);

    const response = await fetch(`${BASE_URL}/api/orchestrate/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrowId,
            proof_of_delivery: proof
        })
    });

    const data = await response.json();
    if (data.success) {
        console.log(`   ✅ Delivery Accepted! Fund release: DONE`);
    } else {
        console.log(`   ❌ Delivery Rejected: ${data.error}`);
    }
}

async function monitorEscrows() {
    setInterval(async () => {
        // Find locked escrows for THIS agent
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (escrows && escrows.length > 0) {
            for (const escrow of escrows) {
                try {
                    console.log(`\n🔔 [AGENT] New Ride Request! Escrow: ${escrow.id.slice(0, 8)}`);

                    // 1. Book the ride
                    const tripProof = await bookRideInBackend(escrow);

                    // 2. Submit proof
                    await confirmEscrow(escrow.id, tripProof);

                } catch (err: any) {
                    console.error(`❌ Error processing order: ${err.message}`);
                }
            }
        }
    }, 5000); // Check every 5s
}

monitorEscrows();
