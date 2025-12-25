/**
 * THE JUDGE: Graph-Based Ranking System (AgentRank)
 * 
 * Logic:
 * 1. Fetch all agents from DB.
 * 2. Build the "Web of Trust" Graph (Who peers with whom?).
 * 3. Calculate Scores (Iterative PageRank).
 *    - Base Score: 1.0
 *    - Vote: If Agent A peers with B, A passes some score to B.
 * 4. Update 'trust_score' in DB.
 */

import 'dotenv/config';
import { supabase } from '../utils/supabase/client';

type Node = {
    id: string; // db uuid
    name: string; // agent name
    peers: string[]; // array of URLs
    score: number;
    stake: number; // SOL Balance
    velocity: number; // Daily Volume
    ageMs: number; // Age in milliseconds
    bond: number; // Security Bond in SOL
    outDegree: number;
    isVerified: boolean;
    verificationTier: string;
};

async function main() {
    console.log("⚖️  THE JUDGE: Court is in Session (Calculating AgentRank)");
    console.log("-------------------------------------------------------");

    // 1. Fetch World State
    const { data: agents, error } = await supabase
        .from('domains')
        .select('id, name, peers, is_verified, verification_tier')
        .eq('status', 'active');

    if (error || !agents) {
        console.error("❌ Failed to fetch agents:", error);
        return;
    }

    console.log(`   📜 Analyzing ${agents.length} agents...`);

    // 2. Build Graph
    const graph: Record<string, Node> = {};
    const nameToId: Record<string, string> = {};

    // 2a. Simulate Economic Stake (In prod, we'd query Solana RPC for wallet balance)
    const MOCK_STAKES: Record<string, number> = {
        'luxspace': 500.0,      // Rich/Established
        'budget-rocket': 50.0,  // Small Biz
        'mediocre-air': 10.0,
        'galaxy-news': 5.0,
        'spam-bot': 0.0         // Broke
    };

    // VELOCITY: Who is "Hot" right now?
    const MOCK_VELOCITY: Record<string, number> = {
        'luxspace': 20,       // Consistent
        'budget-rocket': 50,  // High Volume/Viral!
        'mediocre-air': 5,
        'galaxy-news': 100,   // Breaking News! Very Viral.
        'spam-bot': 0         // Dead
    };

    // 2b. Mock TIMESTAMPS (Who is new?)
    const NOW = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const MOCK_AGE: Record<string, number> = {
        'luxspace': 365 * DAY,   // Old Giant
        'galaxy-news': 2 * DAY,  // 🔥 NEW (2 days old)
        'spam-bot': 1 * DAY,     // New Scammer
        'budget-rocket': 30 * DAY
    };

    // 2c. Mock SECURITY BOND (Who locked 100 SOL?)
    const MOCK_BOND: Record<string, number> = {
        'luxspace': 0,          // Old agents might not need bond
        'galaxy-news': 100.0,   // ✅ Posted the Bond!
        'spam-bot': 0.0         // ❌ No Bond (Cheap scammer)
    };

    // Initialize Nodes
    agents.forEach(a => {
        const stake = MOCK_STAKES[a.name] || 0.1; // Default low stake
        const velocity = MOCK_VELOCITY[a.name] || 0;
        const age = MOCK_AGE[a.name] || 999 * DAY;
        const bond = MOCK_BOND[a.name] || 0;
        // Component 1: Graph Score (Starts at 1.0)
        // Component 2: Stake Score (Logarithmic scaling to prevent infinite dominance)
        // formula: score = GraphScore

        graph[a.id] = {
            id: a.id,
            name: a.name,
            peers: a.peers || [],
            score: 1.0,
            stake: stake,
            velocity: velocity,
            ageMs: age,
            bond: bond,
            outDegree: 0,
            isVerified: a.is_verified || false,
            verificationTier: a.verification_tier || 'none'
        };
        nameToId[a.name] = a.id;
    });

    // ... (Graph calculation logic stays same for Peer Score) ...

    // Calculate Out-Degrees (How many people does this agent trust?)
    Object.values(graph).forEach(node => {
        // Filter peers to only those we know in our network
        // Peer URL format: "http://.../agent-name.json" -> extract "agent-name"
        const validPeers = node.peers.map(p => {
            // simplified extraction: get filename without extension
            const parts = p.split('/');
            const filename = parts[parts.length - 1]; // "agent-budget.json"
            return filename.replace('agent-', '').replace('.json', '');
        }).filter(name => nameToId[name]);

        node.outDegree = validPeers.length;

        // Store resolved IDs for cleaner math later? 
        // For this simple version, we'll re-resolve in the loop.
    });

    // 3. The Algorithm (Simplified PageRank)
    // Run 5 Iterations
    const DAMPING = 0.85; // Probability of continuing the chain
    const ITERATIONS = 5;

    for (let i = 0; i < ITERATIONS; i++) {
        const newScores: Record<string, number> = {};

        // Initialize new scores with base damping value
        Object.keys(graph).forEach(id => {
            newScores[id] = (1 - DAMPING);
        });

        // Distribute Influence
        Object.values(graph).forEach(source => {
            if (source.outDegree > 0) {
                const influence = (source.score * DAMPING) / source.outDegree;

                source.peers.forEach(p => {
                    const parts = p.split('/');
                    const targetName = parts[parts.length - 1].replace('agent-', '').replace('.json', '');
                    const targetId = nameToId[targetName];

                    if (targetId && newScores[targetId]) {
                        newScores[targetId] += influence;
                    }
                });
            } else {
                // Dangling node (no peers): Distribute to everyone (or sink it)
                // For simplicity: We let it sink (Trust requires outgoing links in this model? 
                // Actually PageRank distributes dangling to everyone, but let's keep it simple: 
                // If you trust no one, your score stays with you and dies.)
            }
        });

        // Update Graph
        Object.keys(graph).forEach(id => {
            graph[id].score = newScores[id];
        });

        console.log(`   🔄 Iteration ${i + 1}: Max Score = ${Math.max(...Object.values(graph).map(n => n.score)).toFixed(3)}`);
    }

    // 4. Update Database with Hybrid Score (The Holy Trinity)
    console.log("\n   💾 Saving Judgement (40% Graph + 30% Stake + 30% Velocity)...");
    for (const node of Object.values(graph)) {

        // 1. Reputation (Peers)
        const graphScore = node.score;

        // 2. Security (Stake) - Log scale
        const stakeScore = Math.log10(node.stake + 1);

        // 3. Utility (Velocity/Daily Volume) 
        // A new agent with 100 tx/day should rival an old agent with 1000 links
        const velocityScore = Math.log10(node.velocity + 1);

        // --- THE LAUNCHPAD (BOOTSTRAPPER) ---
        // Problem: New agents have no history/velocity/peers.
        // Solution: Tiered Bonds (Gold vs Bronze)

        let launchpadMultiplier = 1.0;
        const isNew = node.ageMs < (7 * 24 * 60 * 60 * 1000); // < 7 Days

        if (isNew) {
            if (node.bond >= 100) {
                console.log(`      🚀 LAUNCHPAD: ${node.name} is GOLD TIER (100+ SOL)! 2x Boost.`);
                launchpadMultiplier = 2.0;
            } else if (node.bond >= 5) {
                console.log(`      ✨ LAUNCHPAD: ${node.name} is BRONZE TIER (5+ SOL). 1.2x Boost.`);
                launchpadMultiplier = 1.2;
            } else {
                console.log(`      🌱 ORGANIC: ${node.name} is New. No Bond = No Boost (Standard 1.0x).`);
                launchpadMultiplier = 1.0; // No Penalty. Just organic start.
            }
        }

        // --- VERIFIED SELLER BOOST ---
        // Gold = 2.0x, Silver = 1.5x, Bronze = 1.2x, None = 1.0x
        let verifiedMultiplier = 1.0;
        if (node.isVerified) {
            if (node.verificationTier === 'gold') {
                console.log(`      ✅ VERIFIED: ${node.name} is GOLD VERIFIED! 2x Boost.`);
                verifiedMultiplier = 2.0;
            } else if (node.verificationTier === 'silver') {
                console.log(`      ✅ VERIFIED: ${node.name} is SILVER VERIFIED. 1.5x Boost.`);
                verifiedMultiplier = 1.5;
            } else if (node.verificationTier === 'bronze') {
                console.log(`      ✅ VERIFIED: ${node.name} is BRONZE VERIFIED. 1.2x Boost.`);
                verifiedMultiplier = 1.2;
            }
        }

        // THE FORMULA
        // Graph (40%) + Stake (30%) + Velocity (30%)
        // Multiplied by Launchpad AND Verified status
        const hybridScore = ((graphScore * 0.4) + (stakeScore * 0.3) + (velocityScore * 0.3)) * launchpadMultiplier * verifiedMultiplier;

        const finalScore = Number(hybridScore.toFixed(4));

        const { error } = await supabase
            .from('domains')
            .update({ trust_score: finalScore })
            .eq('id', node.id);

        if (error) console.error(`Failed to update ${node.name}:`, error);

        console.log(`      • ${node.name}: ${finalScore} (Graph: ${graphScore.toFixed(2)}, Stake: ${node.stake}, Velocity: ${node.velocity}, Bond: ${node.bond})`);
    }

    console.log("-------------------------------------------------------");
    console.log("✅ RANKING COMPLETE");
}

main().catch(console.error);
