/**
 * NEXUS Core Orchestrator - End-to-End Test
 * 
 * Tests the complete flow:
 * 1. User AI searches for flights
 * 2. Picks an option
 * 3. Books via orchestrator
 * 4. Sends SOL to vault
 * 5. Confirms payment (triggers seller notification)
 * 6. Seller agent confirms delivery
 * 7. Funds released
 * 
 * Prerequisites:
 * - Run orchestrator_schema.sql in Supabase
 * - Run testing_seed.sql with real wallet addresses
 * - Have Devnet SOL in TEST_BUYER_PRIVATE_KEY wallet
 * - Start airindia_agent.ts in another terminal
 * 
 * Run: npx ts-node scripts/test_orchestrator.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET || '';
const BUYER_PRIVATE_KEY = process.env.TEST_BUYER_PRIVATE_KEY || '';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     NEXUS CORE ORCHESTRATOR - END-TO-END TEST            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Validation
    if (!BUYER_PRIVATE_KEY) {
        console.error('❌ Missing TEST_BUYER_PRIVATE_KEY in .env.local');
        process.exit(1);
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const buyerKeypair = Keypair.fromSecretKey(bs58.decode(BUYER_PRIVATE_KEY));

    console.log(`🌐 Network: ${RPC_URL.includes('devnet') ? 'Devnet' : 'Mainnet'}`);
    console.log(`👛 Buyer: ${buyerKeypair.publicKey.toString().slice(0, 20)}...`);
    console.log(`🏦 Vault: ${VAULT_WALLET.slice(0, 20)}...\n`);

    // Check balance
    const balance = await connection.getBalance(buyerKeypair.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.error('❌ Need at least 0.5 SOL');
        console.log(`Run: solana airdrop 2 ${buyerKeypair.publicKey.toString()} --url devnet`);
        process.exit(1);
    }

    console.log('\n' + '─'.repeat(60));
    console.log('📍 STEP 1: Search for flights via Orchestrator');
    console.log('─'.repeat(60));

    const searchRes = await fetch(`${BASE_URL}/api/orchestrate/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: 'travel',
            intent: 'flight',
            params: { from: 'MUM', to: 'PUN' }
        })
    });

    const searchData = await searchRes.json();

    if (!searchData.success || !searchData.options?.length) {
        console.error('❌ No flights found:', searchData);
        console.log('\n💡 Make sure test agents exist in DB with api_config.');
        console.log('   Run: db/testing_seed.sql and db/orchestrator_schema.sql');
        process.exit(1);
    }

    console.log(`✅ Found ${searchData.options.length} options:`);
    searchData.options.forEach((opt: any, i: number) => {
        console.log(`   ${i + 1}. ${opt.agent} - ${opt.price.toFixed(4)} SOL (trust: ${opt.trust_score})`);
    });

    // Pick the trusted option (not scamair)
    const selectedOption = searchData.options.find((o: any) =>
        o.trust_score > 0.5 && !o.agent.includes('scamair')
    ) || searchData.options[0];

    console.log(`\n   ➡️ Selected: ${selectedOption.agent}`);

    console.log('\n' + '─'.repeat(60));
    console.log('📍 STEP 2: Book via Orchestrator');
    console.log('─'.repeat(60));

    const bookRes = await fetch(`${BASE_URL}/api/orchestrate/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agent: selectedOption.agent,
            buyer_wallet: buyerKeypair.publicKey.toString(),
            amount: selectedOption.price,
            params: {
                flight_id: selectedOption.details?.flight_id,
                from: 'MUM',
                to: 'PUN'
            }
        })
    });

    const bookData = await bookRes.json();

    if (!bookData.success) {
        console.error('❌ Booking failed:', bookData.error);
        process.exit(1);
    }

    console.log(`✅ Escrow created: ${bookData.escrow_id}`);
    console.log(`   Total: ${bookData.payment.total.toFixed(6)} SOL`);
    console.log(`   Vault: ${bookData.vault_address}`);

    console.log('\n' + '─'.repeat(60));
    console.log('📍 STEP 3: Send SOL to Vault');
    console.log('─'.repeat(60));

    const vaultPubkey = new PublicKey(VAULT_WALLET);
    const amountLamports = Math.ceil(bookData.payment.total * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: buyerKeypair.publicKey,
            toPubkey: vaultPubkey,
            lamports: amountLamports
        })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerKeypair.publicKey;
    transaction.sign(buyerKeypair);

    const txSignature = await connection.sendRawTransaction(transaction.serialize());
    console.log(`   📤 Transaction sent: ${txSignature.slice(0, 30)}...`);

    await connection.confirmTransaction(txSignature);
    console.log(`   ✅ Confirmed!`);

    console.log('\n' + '─'.repeat(60));
    console.log('📍 STEP 4: Confirm Payment (Lock Escrow + Notify Seller)');
    console.log('─'.repeat(60));

    const confirmRes = await fetch(`${BASE_URL}/api/orchestrate/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: bookData.escrow_id,
            tx_signature: txSignature
        })
    });

    const confirmData = await confirmRes.json();

    if (!confirmData.success) {
        console.error('❌ Confirm failed:', confirmData.error);
        process.exit(1);
    }

    console.log(`✅ Escrow locked!`);
    console.log(`   Seller notified: ${confirmData.seller_notified}`);
    console.log(`   Seller: ${confirmData.seller_agent}`);

    console.log('\n' + '─'.repeat(60));
    console.log('📍 STEP 5: Wait for Seller Agent to Deliver');
    console.log('─'.repeat(60));
    console.log('   ⏳ Waiting for agent to process and confirm...');
    console.log('   (Make sure airindia_agent.ts is running!)\n');

    let finalStatus = null;
    for (let i = 0; i < 40; i++) { // Wait up to 40 seconds
        await sleep(1000);

        const statusRes = await fetch(`${BASE_URL}/api/orchestrate/status?escrow_id=${bookData.escrow_id}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'released') {
            finalStatus = statusData;
            break;
        } else if (statusData.status === 'confirmed') {
            console.log('   📦 Seller confirmed delivery, releasing funds...');
        }

        process.stdout.write('.');
    }

    if (!finalStatus) {
        console.log('\n   ⚠️ Timeout waiting for completion.');
        console.log('   The agent may not be running. Check status manually:');
        console.log(`   GET /api/orchestrate/status?escrow_id=${bookData.escrow_id}`);
        process.exit(1);
    }

    console.log('\n\n' + '─'.repeat(60));
    console.log('📍 STEP 6: Transaction Complete!');
    console.log('─'.repeat(60));

    console.log(`\n   🎉 SUCCESS!\n`);
    console.log(`   Escrow ID:    ${finalStatus.escrow_id}`);
    console.log(`   Status:       ${finalStatus.status}`);
    console.log(`   Amount:       ${finalStatus.payment.amount} SOL`);
    console.log(`   Release TX:   ${finalStatus.transactions.release_tx?.slice(0, 30)}...`);

    if (finalStatus.proof_of_delivery) {
        console.log(`\n   📄 Ticket Details:`);
        console.log(`      PNR:       ${finalStatus.proof_of_delivery.pnr}`);
        console.log(`      Airline:   ${finalStatus.proof_of_delivery.airline}`);
        console.log(`      Flight:    ${finalStatus.proof_of_delivery.flight_number}`);
        console.log(`      Seat:      ${finalStatus.proof_of_delivery.seat}`);
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     ✅ NEXUS ORCHESTRATOR TEST PASSED!                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
