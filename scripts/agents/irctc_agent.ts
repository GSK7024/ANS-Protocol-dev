/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * MOCK IRCTC AGENT (Indian Railways - Train Booking)
 */

const AGENT_NAME = 'irctc-test';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log(`🚂 [irctc-test] TRAIN AGENT STARTED. Monitoring for orders...`);

async function generateTrainPNR() {
    return 'PNR' + Math.random().toString(36).substring(2, 8).toUpperCase();
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
                    console.log(`\n🔔 [AGENT] New Train Booking! Escrow: ${escrow.id.slice(0, 8)}`);

                    const pnr = await generateTrainPNR();
                    console.log(`   ✅ Ticket Booked! PNR: ${pnr}`);

                    // Store in mock_tickets (reusing table)
                    await supabase.from('mock_tickets').insert({
                        pnr,
                        passenger_name: escrow.service_details?.passenger?.name || 'Unknown',
                        flight_id: 'RAJDHANI-EXP', // Reuse column
                        status: 'CONFIRMED'
                    });

                    // Submit proof to NEXUS
                    const response = await fetch(`${BASE_URL}/api/orchestrate/deliver`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            escrow_id: escrow.id,
                            proof_of_delivery: { pnr, train: 'Rajdhani Express', coach: 'A1', seat: '42' }
                        })
                    });

                    const data = await response.json();
                    console.log(data.success ? `   ✅ Delivery Accepted!` : `   ❌ Rejected: ${data.error}`);

                } catch (err: any) {
                    console.error(`❌ Error: ${err.message}`);
                }
            }
        }
    }, 5000);
}

monitorEscrows();
