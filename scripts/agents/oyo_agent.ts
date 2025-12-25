/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * MOCK OYO AGENT (Hotel Booking)
 */

const AGENT_NAME = 'oyo-test';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log(`🏨 [oyo-test] HOTEL AGENT STARTED. Monitoring for bookings...`);

async function generateBookingId() {
    return 'OYO' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function monitorEscrows() {
    setInterval(async () => {
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (escrows && escrows.length > 0) {
            for (const escrow of escrows) {
                try {
                    console.log(`\n🔔 [AGENT] New Hotel Booking! Escrow: ${escrow.id.slice(0, 8)}`);

                    const bookingId = await generateBookingId();
                    const checkIn = escrow.service_details?.check_in || new Date().toISOString();
                    const checkOut = escrow.service_details?.check_out || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                    console.log(`   🏨 Booking Confirmed: ${bookingId}`);
                    console.log(`   📅 Check-in: ${checkIn.slice(0, 10)}`);

                    // Store in mock_tickets
                    await supabase.from('mock_tickets').insert({
                        pnr: bookingId,
                        passenger_name: escrow.service_details?.guest_name || 'Unknown Guest',
                        flight_id: escrow.service_details?.hotel_name || 'OYO Rooms',
                        status: 'CONFIRMED'
                    });

                    // Submit proof to NEXUS
                    const response = await fetch(`${BASE_URL}/api/orchestrate/deliver`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            escrow_id: escrow.id,
                            proof_of_delivery: {
                                booking_id: bookingId,
                                hotel: 'OYO Townhouse',
                                room: 'Deluxe Suite',
                                check_in: checkIn,
                                check_out: checkOut
                            }
                        })
                    });

                    const data = await response.json();
                    console.log(data.success ? `   ✅ Booking Accepted!` : `   ❌ Rejected: ${data.error}`);

                } catch (err: any) {
                    console.error(`❌ Error: ${err.message}`);
                }
            }
        }
    }, 5000);
}

monitorEscrows();
