import { NexusClient } from '../sdk/nexus-client';
import dotenv from 'dotenv';
import path from 'path';

// Helper to load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🛠️  Initializing NEXUS SDK...");

    // Point to local dev server
    const nexus = new NexusClient({
        baseUrl: 'http://localhost:3000',
        apiKey: process.env.NEXUS_ADMIN_KEY // Simulate Admin/Dev Agent
    });

    try {
        // 1. Resolve
        console.log("\n🔍 1. Resolving 'agent://solana'...");
        const agent = await nexus.resolve('agent://solana');
        console.log("   ✅ Found Agent:", agent.owner);

        // 2. Book (Simulate)
        console.log("\n✈️  2. Booking Flight (Simulated)...");
        // We use a try/catch because we might not have 'agent://solana' or 'agent://airindia' set up with requirements in local DB
        // But we want to show the SDK Syntax.

        console.log("   (Skipping actual HTTP call in this demo to avoid DB errors if seeds missing)");
        console.log("   > await nexus.book({ buyer: 'agent://goku', seller: 'agent://airindia', ... })");

        // 3. Oracle Release
        console.log("\n🤖 3. Validating Proof...");
        console.log("   > await nexus.releaseEscrow({ escrow_id: '...', proof: 'FLT-123' })");

        console.log("\n🎉 SDK Demo Complete. It's clean!");

    } catch (err) {
        console.error("❌ SDK Error:", err);
    }
}

main();
