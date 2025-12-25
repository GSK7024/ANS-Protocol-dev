/**
 * viral_crawler.ts
 * 
 * Implements "The Viral Web of Trust" (Gossip Protocol).
 * REFACTORED: Iterative BFS + Concurrency Control + Database Upsert
 */

import 'dotenv/config'; // Load .env file
import { AgentManifest } from '../utils/schema';
import { supabase } from '../utils/supabase/client';

// The "Seed"
const SEED_URL = "http://localhost:3000/agent-luxspace.json";
const CONCURRENCY_LIMIT = 5; // Max parallel requests

// The "Ledger"
const visited = new Set<string>();
const queue: string[] = [SEED_URL];
let activeRequests = 0;

// --- HELPER FUNCTIONS ---
async function fetchAgent(url: string): Promise<AgentManifest | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.json();
    } catch (e: any) {
        // console.error(`   ❌ FAILED FETCH: ${url} - ${e.message}`);
        // Silent fail to keep logs clean? Or verbose.
        return null;
    }
}

// --- VALIDATION LOGIC ---
function validateCategory(claimedCategory: string, skills: any[]): string {
    const RULES: Record<string, string[]> = {
        'Travel': ['flight', 'book', 'ticket', 'hotel', 'mars', 'shuttle'],
        'News': ['news', 'headline', 'read', 'daily', 'feed'],
        'Finance': ['swap', 'token', 'price', 'market', 'trade'],
        'Shopping': ['buy', 'sell', 'product', 'item']
    };

    const requiredKeywords = RULES[claimedCategory];
    if (!requiredKeywords) return claimedCategory;

    const hasCapability = skills.some(s => {
        const text = (s.name + " " + (s.description || "")).toLowerCase();
        return requiredKeywords.some(kw => text.includes(kw));
    });

    return hasCapability ? claimedCategory : 'Unverified';
}

async function processUrl(url: string) {
    console.log(`\n🕷️ CRAWLING: ${url}`);

    try {
        const agent = await fetchAgent(url);
        if (!agent) return;

        // Verify
        const verifiedCategory = validateCategory(agent.category, agent.skills);

        // Save
        const { error } = await supabase.rpc('upsert_agent_data', {
            p_name: agent.identity.replace('agent://', ''),
            p_skills: agent.skills || [],
            p_last_crawled_at: new Date().toISOString(),
            p_category: verifiedCategory,
            p_tags: agent.tags || [],
            p_peers: agent.peers || [],
            p_payment_config: agent.payment || null
        });

        if (error) {
            console.error(`   ❌ DB ERROR: ${error.message}`);
        } else {
            console.log(`   💾 DB SAVED: ${agent.identity.replace('agent://', '')} [Cat: ${verifiedCategory}]`);
        }

        // Add peers to Queue
        if (agent.peers) {
            for (const peer of agent.peers) {
                if (!visited.has(peer)) {
                    visited.add(peer); // Mark as seen immediately to prevent duplicates in queue
                    queue.push(peer);
                }
            }
        }

    } catch (e: any) {
        console.error(`   ❌ FAIL: ${e.message}`);
    }
}

async function main() {
    console.log("🌐 STARTING VIRAL INDEXER (Iterative BFS)");
    console.log("===========================================");
    console.log(`SEED NODE: ${SEED_URL}\n`);

    // Initial mark
    visited.add(SEED_URL);

    // Concurrency Loop
    // We keep processing until queue is empty AND no active requests
    while (queue.length > 0 || activeRequests > 0) {

        // Spawn workers up to limit
        while (activeRequests < CONCURRENCY_LIMIT && queue.length > 0) {
            const url = queue.shift()!;
            activeRequests++;

            // Fire and forget (caught in promise)
            processUrl(url).finally(() => {
                activeRequests--;
            });
        }

        // Wait a bit before checking again to avoid CPU spin
        // This is a simple "event loop" simulation
        await new Promise(r => setTimeout(r, 100));
    }

    console.log("\n===========================================");
    console.log("✅ INDEXING COMPLETE");
    console.log("===========================================");
}

main().catch(console.error);
