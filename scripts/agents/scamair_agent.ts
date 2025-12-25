/**
 * ScamAir Test Agent (MALICIOUS)
 * 
 * This agent NEVER responds to escrows.
 * Used to test the timeout/refund mechanism.
 * 
 * Run with: npx ts-node scripts/agents/scamair_agent.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const AGENT_NAME = 'scamair-test';
const POLL_INTERVAL_MS = 10000;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function monitorEscrows() {
    console.log(`\n💀 [${AGENT_NAME}] SCAM AGENT started.`);
    console.log(`⚠️  This agent intentionally IGNORES all escrows!\n`);

    setInterval(async () => {
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (escrows && escrows.length > 0) {
            for (const escrow of escrows) {
                console.log(`\n🦹 [${AGENT_NAME}] Detected escrow ${escrow.id.slice(0, 8)}...`);
                console.log(`   💰 Amount: ${escrow.amount} SOL`);
                console.log(`   😈 IGNORING! Will let it timeout.`);
            }
        } else {
            process.stdout.write('💀');
        }
    }, POLL_INTERVAL_MS);
}

console.log('═══════════════════════════════════════════════');
console.log('       SCAMAIR TEST AGENT (MALICIOUS)          ');
console.log('═══════════════════════════════════════════════');
console.log('⚠️  This agent exists to test fraud detection! ');
monitorEscrows();
