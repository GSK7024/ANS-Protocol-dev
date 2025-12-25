/**
 * SkyJet Test Agent
 * 
 * Similar to AirIndia but with slightly slower response time.
 * Run with: npx ts-node scripts/agents/skyjet_agent.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const AGENT_NAME = 'skyjet-test';
const POLL_INTERVAL_MS = 8000; // Slower than AirIndia
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function generatePNR(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = 'SJ';
    for (let i = 0; i < 4; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}

function generateTicket(escrow: any) {
    const pnr = generatePNR();
    const now = new Date();
    const flightDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
        pnr,
        airline: 'SkyJet Airways',
        flight_number: 'SJ' + Math.floor(200 + Math.random() * 800),
        passenger: 'AGENT/' + escrow.buyer_wallet.slice(0, 8).toUpperCase(),
        from: escrow.service_details?.from || 'BOM',
        to: escrow.service_details?.to || 'PNQ',
        date: flightDate.toISOString().split('T')[0],
        departure: '19:00',
        arrival: '19:50',
        seat: `${Math.floor(1 + Math.random() * 25)}${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`,
        status: 'CONFIRMED',
        issued_at: now.toISOString()
    };
}

async function confirmEscrow(escrowId: string, ticket: any) {
    console.log(`✈️ [${AGENT_NAME}] Confirming escrow ${escrowId} with PNR: ${ticket.pnr}`);

    const response = await fetch(`${BASE_URL}/api/escrow/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrowId,
            proof_of_delivery: ticket
        })
    });

    const result = await response.json();
    if (result.success) {
        console.log(`✅ [${AGENT_NAME}] Escrow confirmed!`);
    } else {
        console.log(`❌ [${AGENT_NAME}] Failed: ${result.error}`);
    }
    return result;
}

async function monitorEscrows() {
    console.log(`\n🛩️ [${AGENT_NAME}] Agent started. Polling every ${POLL_INTERVAL_MS / 1000}s\n`);
    const processedEscrows = new Set<string>();

    setInterval(async () => {
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (!escrows || escrows.length === 0) {
            process.stdout.write('.');
            return;
        }

        for (const escrow of escrows) {
            if (processedEscrows.has(escrow.id)) continue;

            console.log(`\n📦 [${AGENT_NAME}] Processing: ${escrow.id}`);
            await new Promise(r => setTimeout(r, 3000)); // Slightly slower

            const ticket = generateTicket(escrow);
            await confirmEscrow(escrow.id, ticket);
            processedEscrows.add(escrow.id);
        }
    }, POLL_INTERVAL_MS);
}

console.log('═══════════════════════════════════════════════');
console.log('       SKYJET TEST AGENT (Autonomous)          ');
console.log('═══════════════════════════════════════════════');
monitorEscrows();
