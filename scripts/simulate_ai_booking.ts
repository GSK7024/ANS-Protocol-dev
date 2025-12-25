/**
 * SIMULATION: "Economic Darwinism"
 * Scenario: 
 * The AI Agent discovers 3 competing providers for the same service ("book_mars_shuttle").
 * It crawls all 3, parses their pricing, and autonomously selects the cheapest one.
 */

import { AgentManifest } from '../utils/schema';

const TARGET_SKILL = "book_mars_shuttle";

async function main() {
    console.log("🤖 AI AGENT STARTED: 'EconomistBot v1'");
    console.log("📋 MISSION: Find the CHEAPEST ticket to Mars.\n");

    // --- STEP 1: DISCOVERY ---
    console.log("🔍 STEP 1: MARKET DISCOVERY");
    console.log(`   > Searching for skill: '${TARGET_SKILL}'...`);

    // Simulating the Search Result returning 3 competitors
    const searchResults = [
        { name: "luxspace", endpoint: "http://localhost:3000/agent-luxspace.json" },
        { name: "budget-rocket", endpoint: "http://localhost:3000/agent-budget.json" },
        { name: "mediocre-air", endpoint: "http://localhost:3000/agent-mid.json" }
    ];

    console.log(`   ✅ Found ${searchResults.length} Agents offering this service.\n`);

    // --- STEP 2: PARALLEL CRAWLING ---
    console.log("🕷️ STEP 2: CRAWLING & PARSING (Reading Manifests...)");

    const quotes: any[] = [];

    for (const agent of searchResults) {
        process.stdout.write(`   - Fetching ${agent.name}... `);
        try {
            const res = await fetch(agent.endpoint);
            const manifest: AgentManifest = await res.json();

            // Extract Price
            const skill = manifest.skills.find(s =>
                (typeof s !== 'string' && s.name === TARGET_SKILL)
            );

            if (skill && typeof skill !== 'string' && skill.pricing) {
                console.log(`OK! Price: ${skill.pricing.amount} ${skill.pricing.currency}`);
                quotes.push({
                    agent: manifest.identity,
                    price: skill.pricing.amount,
                    currency: skill.pricing.currency,
                    description: skill.description
                });
            } else {
                console.log("Failed (No pricing data)");
            }
        } catch (e) {
            console.log("Error fetching");
        }
    }


    // --- STEP 3: REASONING (The Decision) ---
    console.log("\n🧠 STEP 3: REASONING (Economic Darwinism)");

    if (quotes.length === 0) {
        console.error("No valid quotes found.");
        return;
    }

    // Sort by price (Lowest First)
    quotes.sort((a, b) => a.price - b.price);

    console.log("   --- QUOTE SHEET ---");
    quotes.forEach((q, i) => {
        const isWinner = i === 0;
        const mark = isWinner ? "🏆 WINNER" : "❌ REJECT";
        console.log(`   ${mark}: ${q.agent} | ${q.price} ${q.currency} | "${q.description}"`);
    });

    const winner = quotes[0];
    const savings = quotes.length > 1 ? (quotes[quotes.length - 1].price - winner.price).toFixed(2) : "0";
    console.log(`\n   💡 DECISION: Booking with ${winner.agent} because it saved us ${savings} SOL compared to the most expensive option.`);


    // --- STEP 4: TRANSACTION ---
    console.log("\n⚡ STEP 4: EXECUTION");
    console.log(`   > Triggering skill '${TARGET_SKILL}' on ${winner.agent}...`);

    // Simulating Transaction
    const payload = { date: "2025-12-01" };
    console.log(`   > Payload: ${JSON.stringify(payload)}`);

    await new Promise(r => setTimeout(r, 800));

    console.log(`   ✅ TRANSACTION CONFIRMED.`);
    console.log(`   🎫 Ticket Issued: MARS-ECO-${Math.floor(Math.random() * 1000)}`);
}

main().catch(console.error);
