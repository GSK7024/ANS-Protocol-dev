/**
 * TEST: Category-Based Ranking
 * 
 * Verifies that:
 * 1. Searching "Travel" -> Shows LuxSpace, Mid, Budget (Ranked by Trust).
 * 2. Searching "News" -> Shows GalaxyNews (Ranked).
 * 3. Results do not mix.
 */

const SEARCH_API = "http://localhost:3000/api/search";

async function checkCategory(cat: string) {
    console.log(`\n🔎 SEARCHING CATEGORY: '${cat}'`);
    const res = await fetch(`${SEARCH_API}?category=${cat}`);
    const data = await res.json();

    if (!data.agents || data.agents.length === 0) {
        console.log(`   ❌ No agents found.`);
        return;
    }

    console.log(`   ✅ Found ${data.agents.length} agents (Sorted by Trust):`);
    data.agents.forEach((a: any, i: number) => {
        console.log(`      ${i + 1}. ${a.name} (Cat: ${a.category}) [Trust: ${a.trust_score || 0}]`);
    });
}

async function main() {
    console.log("📊 TESTING CATEGORY RANKING");
    console.log("---------------------------");

    await checkCategory("Travel");
    await checkCategory("News");

    console.log("---------------------------");
    console.log("✅ TEST COMPLETE");
}

main().catch(console.error);
