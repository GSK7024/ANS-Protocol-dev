/**
 * Live Test: Verified Seller System
 * 
 * Tests two scenarios:
 * 1. Book intent with verified-only (default) - should only show verified sellers
 * 2. Book intent with include_unverified=true - should show all, ranked by trust score
 * 
 * Run: npx ts-node scripts/test_verified_sellers.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'nxs_live_3UpaIr_Biggux7vebormBjOsaahM6EQR';

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     NEXUS VERIFIED SELLER SYSTEM - LIVE TEST                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`🌐 Testing against: ${BASE_URL}`);
    console.log(`🔑 Using API Key: ${API_KEY.slice(0, 15)}...\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Book intent with VERIFIED ONLY (default behavior)
    // ═══════════════════════════════════════════════════════════════
    console.log('━'.repeat(60));
    console.log('📋 TEST 1: Book Intent (Verified Only - DEFAULT)');
    console.log('━'.repeat(60));
    console.log('   Intent: "book" → System should auto-filter to verified sellers\n');

    try {
        const res1 = await fetch(`${BASE_URL}/api/orchestrate/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                category: 'travel',
                intent: 'book',
                params: { from: 'DEL', to: 'MUM' }
            })
        });

        const data1 = await res1.json();

        if (data1.success && data1.options) {
            console.log(`   ✅ Found ${data1.options.length} agent(s):\n`);
            data1.options.forEach((opt: any, i: number) => {
                const verifiedBadge = opt.is_verified ? '✓ VERIFIED' : '✗ Unverified';
                console.log(`   ${i + 1}. ${opt.agent}`);
                console.log(`      Trust: ${opt.trust_score} | ${verifiedBadge}`);
                console.log(`      Price: ${opt.price} SOL\n`);
            });

            if (data1.options.every((o: any) => o.agent.includes('airindia'))) {
                console.log('   🎯 RESULT: Only verified seller (airindia) returned!');
            }
        } else {
            console.log('   ⚠️ No options found or error:', data1.error || 'Unknown');
        }
    } catch (err: any) {
        console.log('   ❌ Error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Book intent with INCLUDE UNVERIFIED
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '━'.repeat(60));
    console.log('📋 TEST 2: Book Intent (Include Unverified)');
    console.log('━'.repeat(60));
    console.log('   Flag: include_unverified=true → Should show ALL sellers\n');

    try {
        const res2 = await fetch(`${BASE_URL}/api/orchestrate/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                category: 'travel',
                intent: 'book',
                params: { from: 'DEL', to: 'MUM' },
                include_unverified: true  // ← Override to show all
            })
        });

        const data2 = await res2.json();

        if (data2.success && data2.options) {
            console.log(`   ✅ Found ${data2.options.length} agent(s):\n`);
            data2.options.forEach((opt: any, i: number) => {
                const verifiedBadge = opt.is_verified ? '✓ VERIFIED' : '✗ Unverified';
                console.log(`   ${i + 1}. ${opt.agent}`);
                console.log(`      Trust: ${opt.trust_score} | ${verifiedBadge}`);
                console.log(`      Price: ${opt.price} SOL\n`);
            });

            // Check if skyjet (unverified but higher trust) is ranked first
            const firstAgent = data2.options[0]?.agent || '';
            if (firstAgent.includes('skyjet')) {
                console.log('   🎯 RESULT: SkyJet (unverified, higher trust) ranked FIRST!');
            } else if (firstAgent.includes('airindia')) {
                console.log('   🎯 RESULT: AirIndia (verified) ranked first due to verified boost!');
            }
        } else {
            console.log('   ⚠️ No options found or error:', data2.error || 'Unknown');
        }
    } catch (err: any) {
        console.log('   ❌ Error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 2B: Sort by PRICE (Cheapest First)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '━'.repeat(60));
    console.log('📋 TEST 2B: Sort by PRICE (Cheapest First)');
    console.log('━'.repeat(60));
    console.log('   Flag: sort_by="price" → Cheapest legit seller wins\n');

    try {
        const res2b = await fetch(`${BASE_URL}/api/orchestrate/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                category: 'travel',
                intent: 'book',
                params: { from: 'DEL', to: 'MUM' },
                include_unverified: true,
                sort_by: 'price'  // ← Sort by cheapest
            })
        });

        const data2b = await res2b.json();

        if (data2b.success && data2b.options) {
            console.log(`   ✅ Found ${data2b.options.length} agent(s):\n`);
            data2b.options.forEach((opt: any, i: number) => {
                const verifiedBadge = opt.is_verified ? '✓ VERIFIED' : '✗ Unverified';
                console.log(`   ${i + 1}. ${opt.agent}`);
                console.log(`      Trust: ${opt.trust_score} | ${verifiedBadge}`);
                console.log(`      Price: ${opt.price} SOL\n`);
            });

            // Verify scammer is NOT first even with cheapest price
            const first = data2b.options[0];
            if (first.trust_score < 0.5) {
                console.log('   ❌ FAIL: Scammer ranked first!');
            } else {
                console.log('   🎯 RESULT: Cheapest LEGIT option ranked first (scammer blocked)!');
            }
        }
    } catch (err: any) {
        console.log('   ❌ Error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Simple Search (Public API)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '━'.repeat(60));
    console.log('📋 TEST 3: Public Search API (All + Verified Only)');
    console.log('━'.repeat(60));

    // All agents
    try {
        const res3a = await fetch(`${BASE_URL}/api/search?category=travel`);
        const data3a = await res3a.json();
        console.log(`\n   All travel agents: ${data3a.count || 0}`);
        (data3a.agents || []).forEach((a: any) => {
            const badge = a.is_verified ? '✓' : '✗';
            console.log(`      ${badge} ${a.name} (trust: ${a.trust_score})`);
        });
    } catch (err: any) {
        console.log('   ❌ Error:', err.message);
    }

    // Verified only
    try {
        const res3b = await fetch(`${BASE_URL}/api/search?category=travel&verified_only=true`);
        const data3b = await res3b.json();
        console.log(`\n   Verified only: ${data3b.count || 0}`);
        (data3b.agents || []).forEach((a: any) => {
            const badge = a.is_verified ? '✓' : '✗';
            console.log(`      ${badge} ${a.name} (trust: ${a.trust_score})`);
        });
    } catch (err: any) {
        console.log('   ❌ Error:', err.message);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TESTING COMPLETE');
    console.log('═'.repeat(60));
}

main().catch(console.error);
