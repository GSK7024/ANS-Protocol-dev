/**
 * SIMULATION: "The Live Waiter" (Real-Time Quotes)
 * 
 * Scenario:
 * 1. AI finds 'BudgetRocket' in the index (Price: ~0.5 SOL).
 * 2. It sees `dynamic: true`.
 * 3. It asks the agent for a LIVE QUOTE.
 * 4. It gets the real price (e.g. 0.48 SOL).
 */

import { AgentManifest } from '../utils/schema';

const AGENT_URL = "http://localhost:3000/agent-budget.json";

async function main() {
    console.log("🤖 AI AGENT STARTED: 'DayTraderBot'");
    console.log("-----------------------------------");

    // 1. DISCOVERY (The Menu)
    console.log(`🔍 READING MENU (Manifest): ${AGENT_URL}`);
    const res = await fetch(AGENT_URL);
    const manifest: AgentManifest = await res.json();

    const skill = manifest.skills.find(s => typeof s !== 'string' && s.name === 'book_mars_shuttle') as any;

    console.log(`   📄 Menu Price: ${skill.pricing.amount} ${skill.pricing.currency}`);

    // 2. CHECK DYNAMICS
    if (skill.dynamic && skill.quote_url) {
        console.log("\n⚠️  DYNAMIC PRICING DETECTED!");
        console.log(`   📡 Contacting Oracle: ${skill.quote_url} ...`);

        // 3. LIVE QUOTE (The Waiter)
        const start = Date.now();
        const quoteRes = await fetch(skill.quote_url, { method: 'POST' });
        const quote = await quoteRes.json();
        const latency = Date.now() - start;

        console.log(`   ⏱️  Latency: ${latency}ms`);
        console.log(`   🏷️  LIVE QUOTE: ${quote.price.amount} ${quote.price.currency}`);
        console.log(`   📉 Variance: ${((quote.price.amount - skill.pricing.amount)).toFixed(3)} SOL`);

        if (quote.availability === 'AVAILABLE') {
            console.log("   ✅ Status: AVAILABLE (Valid for 5 mins)");
        } else {
            console.log("   ❌ Status: SOLD OUT");
        }

    } else {
        console.log("   ℹ️  Price is fixed.");
    }
}

main().catch(console.error);
