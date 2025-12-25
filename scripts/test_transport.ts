/// <reference types="node" />

import dotenv from 'dotenv';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
const BUYER_SECRET = process.env.TEST_BUYER_PRIVATE_KEY!;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log(`╔══════════════════════════════════════════════════════════╗`);
    console.log(`║     TEST: TRANSPORT VERTICAL (Uber/Rapido Flow)          ║`);
    console.log(`╚══════════════════════════════════════════════════════════╝\n`);

    if (!BUYER_SECRET) {
        console.error('❌ Missing TEST_BUYER_PRIVATE_KEY in .env.local');
        process.exit(1);
    }

    // 1. SEARCH (Category: Transport)
    console.log(`📍 STEP 1: Search for 'transport' agents...`);
    // Note: In real app, we'd pass ?category=transport. 
    // For this test, we know 'uber-test' exists and returns quotes.

    // We'll trust the Orchestrator to find 'uber-test' if we ask for a route.
    // Assuming search/route.ts handles generic queries or we filter by category.
    // Let's call the search API.

    // HACK: For this specific test, we need to ensure the search endpoint 
    // actually calls the transport agent. The current search endpoint iterates 
    // all agents. Since we added 'uber-test', it should be called!

    const searchRes = await fetch(`${BASE_URL}/api/orchestrate/search?from=Home&to=Office`);
    const searchData: any = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
        console.error('❌ No transport options found.');
        process.exit(1);
    }

    // Filter for uber-test
    const uberOption = searchData.results.find((r: any) => r.agent === 'uber-test');

    if (!uberOption) {
        console.log('⚠️ Uber agent not found in search results. Results:', searchData.results.map((r: any) => r.agent));
        console.log('Ensure uber_agent.ts is running and database is seeded properly.');
        // We'll proceed with a manual option if search fails (for dev speed), 
        // but ideally search finds it.
        process.exit(1);
    }

    console.log(`   ✅ Found generic option: ${uberOption.agent} - ${uberOption.price} SOL`);
    const selectedOption = uberOption;

    // 2. BOOK
    console.log(`\n📍 STEP 2: Booking Ride...`);
    const bookRes = await fetch(`${BASE_URL}/api/orchestrate/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            offer_id: selectedOption.id,
            agent_id: selectedOption.agent,
            price: selectedOption.price,
            service_details: {
                pickup: '123 Main St',
                dropoff: '456 Tech Park'
            },
            buyer_wallet: '6oWGBnG4ebgeKLabmyn7X5... (Replica)' // Actual wallet checked in backend
        })
    });

    const bookData: any = await bookRes.json();
    if (!bookData.escrow_id) {
        console.error('❌ Booking Failed:', bookData);
        process.exit(1);
    }
    console.log(`   ✅ Escrow created: ${bookData.escrow_id}`);

    // 3. PAY (Simulated)
    console.log(`\n📍 STEP 3: Simulating Payment...`);
    // In a real test we'd send SOL. For speed, we'll assume manual lock or 
    // use the confirm-payment endpoint if we had the private key loaded to sign.
    // Let's use the 'confirm-payment' endpoint which checks the vault.

    // To make this fully automated without sending real SOL every time, 
    // we can use the 'simulate_payment.ts' logic OR just bypass if we are admin.
    // But 'test_orchestrator.ts' sent real SOL. Let's send real SOL here too!

    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const buyerKeypair = Keypair.fromSecretKey(bs58.decode(BUYER_SECRET));
    const vaultKey = new PublicKey(bookData.vault_wallet);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: buyerKeypair.publicKey,
            toPubkey: vaultKey,
            lamports: Math.floor(selectedOption.price * LAMPORTS_PER_SOL),
        })
    );

    const signature = await connection.sendTransaction(transaction, [buyerKeypair]);
    console.log(`   📤 SOL Sent: ${signature}`);

    // Wait for confirmation
    await connection.confirmTransaction(signature);
    console.log(`   ✅ Confirmed!`);

    // 4. CONFIRM & LOCK
    console.log(`\n📍 STEP 4: Confirming Payment...`);
    await sleep(2000); // Wait for indexer
    const confirmRes = await fetch(`${BASE_URL}/api/orchestrate/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrow_id: bookData.escrow_id })
    });

    const confirmData: any = await confirmRes.json();
    console.log(`   ✅ Payment Confirmed: ${confirmData.status}`);

    // 5. WAIT FOR DELIVERY (Uber Agent should trigger this)
    console.log(`\n📍 STEP 5: Waiting for Ride Completion (Agent Delivery)...`);
    console.log(`   (Ensure 'npx ts-node scripts/agents/uber_agent.ts' is running!)`);

    let finalStatus = null;
    for (let i = 0; i < 30; i++) {
        await sleep(1000);
        process.stdout.write('.');
        const statusRes = await fetch(`${BASE_URL}/api/orchestrate/status?escrow_id=${bookData.escrow_id}`);
        const statusData: any = await statusRes.json();

        if (statusData.status === 'released') {
            finalStatus = statusData;
            break;
        }
    }

    if (finalStatus) {
        console.log(`\n\n🎉 SUCCESS! Escrow Released.`);
        console.log(`   Ride Status: ${finalStatus.transaction.status}`);
    } else {
        console.log(`\n\n❌ Timed out waiting for delivery.`);
    }
}

main().catch(err => console.error(err));
