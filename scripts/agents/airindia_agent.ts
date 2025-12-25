/**
 * AirIndia Test Agent (Smart)
 * 
 * 1. Monitors escrows for "payment_received"
 * 2. Extracts PASSENGER DETAILS from the order
 * 3. Calls Airline Backend to ISSUE A REAL TICKET
 * 4. Submits PNR to NEXUS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const AGENT_NAME = 'airindia-test';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
const AIRLINE_BACKEND_URL = `${BASE_URL}/api/testing/airlines/backend`;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Generate unique PNR
function generatePNR(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = 'AI';
    for (let i = 0; i < 4; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}

// Interact with Airline Backend to confirm booking
async function issueTicketInBackend(escrow: any) {
    const pnr = generatePNR();

    // Default passenger if none provided (for basic tests)
    const passenger = escrow.service_details?.passenger || {
        name: 'Unknown Agent',
        age: 30,
        email: 'agent@nexus.protocol'
    };

    const flight = {
        id: escrow.service_details?.flight_id || 'AI-GEN',
        from: escrow.service_details?.from || 'MUM',
        to: escrow.service_details?.to || 'PUN'
    };

    console.log(`✈️ [AGENT] Issuing ticket for ${passenger.name} on backend...`);

    try {
        const response = await fetch(AIRLINE_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer backend-key-secret'
            },
            body: JSON.stringify({
                action: 'issue_ticket',
                pnr,
                passenger,
                flight
            })
        });

        if (!response.ok) {
            throw new Error(`Backend failed: ${response.status}`);
        }

        console.log(`   ✅ Ticket Issued! PNR: ${pnr}`);

        return {
            pnr,
            airline: 'Air India Express',
            flight_number: flight.id,
            passenger_name: passenger.name,
            seat: '12A',
            status: 'CONFIRMED'
        };

    } catch (err) {
        console.error('   ❌ Booking failed:', err);
        return null;
    }
}

async function confirmEscrow(escrowId: string, ticket: any) {
    if (!ticket) return;

    console.log(`📦 [AGENT] Submitting proof to NEXUS...`);

    const response = await fetch(`${BASE_URL}/api/orchestrate/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrowId,
            proof: ticket
        })
    });

    const result = await response.json();
    if (result.success) {
        console.log(`   ✅ Delivery Accepted! Fund release: ${result.release_status || 'DONE'}`);
    } else {
        console.log(`   ❌ Delivery Rejected: ${result.error}`);
    }
}

async function monitorEscrows() {
    console.log(`\n👨‍✈️ [${AGENT_NAME}] SMART AGENT STARTED.`);
    console.log(`   Monitoring for orders...`);

    const processedEscrows = new Set<string>();

    setInterval(async () => {
        // Find escrows where payment is locked (waiting for fulfillment)
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (!escrows) return;

        for (const escrow of escrows) {
            if (processedEscrows.has(escrow.id)) continue;

            console.log(`\n🔔 [AGENT] New Order! Escrow: ${escrow.id.slice(0, 8)}`);
            console.log(`   Passenger: ${escrow.service_details?.passenger?.name || 'Unknown'}`);

            // 1. Issue Real Ticket
            const ticket = await issueTicketInBackend(escrow);

            // 2. Submit Proof
            await confirmEscrow(escrow.id, ticket);

            processedEscrows.add(escrow.id);
        }
    }, 5000);
}

monitorEscrows();
