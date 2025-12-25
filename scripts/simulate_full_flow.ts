/**
 * SIMULATION: The Complete "Headless Browser" Flow
 * 
 * Scenario:
 * 1. USER: "I want to go to Mars."
 * 2. BROWSER: Searches Index (via /api/search) for skill="book_mars_shuttle".
 * 3. BROWSER: Finds 'BudgetRocket' and 'LuxSpace'.
 * 4. BROWSER: Checks 'BudgetRocket'. Sees it's DYNAMIC.
 * 5. BROWSER: Fetches LIVE QUOTE from BudgetRocket -> 0.54 SOL.
 * 6. BROWSER: Checks 'LuxSpace'. Sees it's FIXED -> 5.0 SOL.
 * 7. BROWSER: Selects BudgetRocket (Cheapest).
 */

import 'dotenv/config';

const SEARCH_API = "http://localhost:3000/api/search";

async function main() {
    console.log("🚀 STARTING HEADLESS BROWSER SIMULATION");
    console.log("   Goal: Book Mars Shuttle (Cheapest)");
    console.log("---------------------------------------");

    // 1. SEARCH INDEX
    console.log(`\n🔎 STEP 1: Searching Index for 'book_mars_shuttle'...`);
    const searchUrl = `${SEARCH_API}?skill=book_mars_shuttle`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!data.agents || data.agents.length === 0) {
        console.error("❌ No agents found via Search API. (Did you run the Crawler?)");
        return;
    }

    console.log(`   ✅ Found ${data.agents.length} candidates in Index:`);
    data.agents.forEach((a: any) => console.log(`      - ${a.name}`));

    // 2. EVALUATE & LIVE QUOTE
    console.log(`\n💰 STEP 2: Evaluating Candidates (Live Quotes)...`);

    let bestOption = null;
    let lowestPrice = Infinity;

    for (const agent of data.agents) {
        const skill = agent.skills.find((s: any) => s.name === 'book_mars_shuttle');
        let finalPrice = skill.pricing.amount;
        let isLive = false;

        process.stdout.write(`   • Checking ${agent.name}... `);

        // Check for Dynamic Pricing
        if (skill.dynamic && skill.quote_url) {
            try {
                const quoteRes = await fetch(skill.quote_url, { method: 'POST' });
                const quote = await quoteRes.json();
                finalPrice = quote.price.amount;
                isLive = true;
            } catch (e) {
                console.log(`(⚠️ Oracle Query Failed)`);
            }
        }

        console.log(`Price: ${finalPrice} SOL ${isLive ? '(⚡ LIVE)' : '(📄 CACHED)'}`);

        if (finalPrice < lowestPrice) {
            lowestPrice = finalPrice;
            bestOption = agent;
        }
    }

    // 3. SELECTION
    console.log(`\n🏆 STEP 3: Selecting Best Agent`);
    console.log(`   🎉 WINNER: ${bestOption.name}`);
    console.log(`   💸 Final Price: ${lowestPrice} SOL`);
    console.log("---------------------------------------");
    console.log("✅ HEADLESS BOOKING FLOW COMPLETE");
}

main().catch(console.error);
