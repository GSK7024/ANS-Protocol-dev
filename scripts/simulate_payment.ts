/**
 * SIMULATION: "The Economic Handshake"
 * 
 * Scenario:
 * 1. AI Agent finds 'BudgetRocket'.
 * 2. It requests a payment address for 0.5 SOL.
 * 3. It constructs a Solana Pay transaction.
 * 4. It simulates the blockchain confirmation.
 */

import { AgentManifest } from '../utils/schema';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

// Mock Wallet for the "User Agent"
const USER_WALLET = Keypair.generate();
const ANS_RESOLVER = "http://localhost:3000";

async function main() {
    console.log("🤖 AI AGENT STARTED: 'WhaleBot v3'");
    console.log(`💼 WALLET: ${USER_WALLET.publicKey.toBase58().substring(0, 8)}...`);
    console.log("--------------------------------------------------");

    // 1. DISCOVERY (Already done in previous step)
    const agentUrl = `${ANS_RESOLVER}/agent-budget.json`;
    console.log(`🔍 TARGET: ${agentUrl}`);

    const res = await fetch(agentUrl);
    const manifest: AgentManifest = await res.json();


    // 2. PAYMENT NEGOTIATION
    console.log("\n💰 NEGOTIATING PAYMENT...");

    if (!manifest.payment) {
        console.error("❌ Agent does not accept payments.");
        return;
    }

    const recipient = new PublicKey(manifest.payment.receiver);
    const skill = manifest.skills.find(s => typeof s !== 'string' && s.name === 'book_mars_shuttle') as any;

    if (!skill || !skill.pricing) {
        console.error("❌ Skill price not found.");
        return;
    }

    const price = skill.pricing.amount;
    const currency = skill.pricing.currency;

    console.log(`   📝 Invoice: ${price} ${currency} for '${skill.description}'`);
    console.log(`   Example Recipient: ${recipient.toBase58()}`);


    // 3. TRANSACTION COSNTRUCTION (Solana)
    console.log("\n⚡ BUILDING SOLANA TRANSACTION...");

    // In a real app, we would fetch a recent blockhash from the mainnet
    // const connection = new Connection("https://api.mainnet-beta.solana.com");
    // const { blockhash } = await connection.getLatestBlockhash();

    // Mocking the transaction structure
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: USER_WALLET.publicKey,
            toPubkey: recipient,
            lamports: price * LAMPORTS_PER_SOL,
        })
    );

    // transaction.recentBlockhash = blockhash;
    // transaction.feePayer = USER_WALLET.publicKey;

    console.log(`   🧱 Instruction: Transfer ${price} SOL -> ${recipient.toBase58().substring(0, 10)}...`);
    console.log(`   ✍️  Signing with Agent Key...`);

    // 4. BROADCAST & CONFIRMATION
    console.log("\n📡 BROADCASTING TO CLUSTER...");

    // Simulate Network Latency
    await new Promise(r => setTimeout(r, 1500));

    const signature = "5KtPenGZ...SimulatedSignature...9Xr";
    console.log(`   ✅ CONFIRMED!`);
    console.log(`   🔗 Signature: ${signature}`);


    // 5. SERVICE DELIVERY
    console.log("\n🎟️  REDEEMING TICKET...");
    console.log(`   > POST /execute { "proof": "${signature}" }`);

    await new Promise(r => setTimeout(r, 500));
    console.log(`   ✅ SERVICE DELIVERED: "Here is your boarding pass."`);
}

main().catch(console.error);
