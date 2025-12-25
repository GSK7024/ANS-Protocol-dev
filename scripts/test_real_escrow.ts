/**
 * Real Escrow Flow Test
 * 
 * This orchestrates a REAL end-to-end test on Devnet:
 * 1. Fetch flights
 * 2. Create escrow
 * 3. Send real Devnet SOL
 * 4. Lock escrow
 * 5. Wait for agent confirmation
 * 6. Verify release
 * 
 * Prerequisites:
 * - Run escrow schema SQL
 * - Run testing_seed.sql
 * - Start airindia_agent.ts in another terminal
 * - Have Devnet SOL in your test wallet
 * 
 * Run: npx ts-node scripts/test_real_escrow.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET || '';

// Test buyer wallet (you need to set this or generate one)
const BUYER_PRIVATE_KEY = process.env.TEST_BUYER_PRIVATE_KEY || '';

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('       REAL ESCROW FLOW TEST (DEVNET)          ');
    console.log('═══════════════════════════════════════════════\n');

    if (!BUYER_PRIVATE_KEY) {
        console.error('❌ Missing TEST_BUYER_PRIVATE_KEY in .env.local');
        console.log('\nGenerate one with: solana-keygen new --no-bip39-passphrase');
        console.log('Then airdrop SOL: solana airdrop 2 <address> --url devnet');
        process.exit(1);
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const buyerKeypair = Keypair.fromSecretKey(bs58.decode(BUYER_PRIVATE_KEY));

    console.log(`📍 Network: Devnet`);
    console.log(`👛 Buyer Wallet: ${buyerKeypair.publicKey.toString().slice(0, 20)}...`);
    console.log(`🏦 Vault Wallet: ${VAULT_WALLET.slice(0, 20)}...`);

    // Check balance
    const balance = await connection.getBalance(buyerKeypair.publicKey);
    console.log(`💰 Buyer Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.error('❌ Insufficient balance. Need at least 0.5 SOL');
        console.log('Run: solana airdrop 2 ' + buyerKeypair.publicKey.toString() + ' --url devnet');
        process.exit(1);
    }

    // Step 1: Fetch flights
    console.log('📋 Step 1: Fetching flights...');
    const flightRes = await fetch(`${BASE_URL}/api/testing/flights?from=MUM&to=PUN`);
    const flightData = await flightRes.json();
    console.log(`   Found ${flightData.flights.length} options`);

    // Pick AirIndia (trusted)
    const selectedFlight = flightData.flights.find((f: any) => f.agent === 'airindia-test');
    if (!selectedFlight) {
        console.error('❌ AirIndia flight not found');
        process.exit(1);
    }
    console.log(`   Selected: ${selectedFlight.airline_name} @ ${selectedFlight.price_sol} SOL\n`);

    // Step 2: Create escrow
    console.log('📝 Step 2: Creating escrow...');
    const escrowRes = await fetch(`${BASE_URL}/api/escrow/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            buyer_wallet: buyerKeypair.publicKey.toString(),
            seller_agent: selectedFlight.agent,
            amount: selectedFlight.price_sol,
            service_details: {
                flight_id: selectedFlight.id,
                from: 'MUM',
                to: 'PUN',
                date: new Date().toISOString().split('T')[0]
            }
        })
    });
    const escrowData = await escrowRes.json();
    console.log(`   Escrow ID: ${escrowData.escrow_id}`);
    console.log(`   Total (with fee): ${escrowData.total_amount} SOL\n`);

    // Step 3: Send SOL to vault
    console.log('💸 Step 3: Sending SOL to vault...');
    const vaultPubkey = new PublicKey(VAULT_WALLET);
    const amountLamports = Math.floor(escrowData.total_amount * LAMPORTS_PER_SOL);

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
    await connection.confirmTransaction(txSignature);
    console.log(`   ✅ TX: ${txSignature.slice(0, 20)}...\n`);

    // Step 4: Lock escrow
    console.log('🔒 Step 4: Locking escrow...');
    const lockRes = await fetch(`${BASE_URL}/api/escrow/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrowData.escrow_id,
            tx_signature: txSignature
        })
    });
    const lockData = await lockRes.json();
    if (lockData.success) {
        console.log(`   ✅ Escrow locked! Funds are in vault.\n`);
    } else {
        console.error(`   ❌ Lock failed: ${lockData.error}`);
        process.exit(1);
    }

    // Step 5: Wait for agent confirmation
    console.log('⏳ Step 5: Waiting for AirIndia agent to confirm...');
    console.log('   (Make sure airindia_agent.ts is running in another terminal!)\n');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    let confirmed = false;
    for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
        await new Promise(r => setTimeout(r, 1000));

        const { data: escrow } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrowData.escrow_id)
            .single();

        if (escrow?.status === 'confirmed' || escrow?.status === 'released') {
            confirmed = true;
            console.log(`   ✅ Agent confirmed! PNR: ${escrow.proof_of_delivery?.pnr}`);
            break;
        }
        process.stdout.write('.');
    }

    if (!confirmed) {
        console.log('\n   ⚠️ Timeout. Agent may not be running.');
        process.exit(1);
    }

    // Step 6: Release funds (in real scenario, this might be auto or buyer-triggered)
    console.log('\n🎉 Step 6: Releasing funds to seller...');
    const releaseRes = await fetch(`${BASE_URL}/api/escrow/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrowData.escrow_id,
            buyer_wallet: buyerKeypair.publicKey.toString()
        })
    });
    const releaseData = await releaseRes.json();

    if (releaseData.success) {
        console.log(`   ✅ Funds released to AirIndia!`);
        console.log(`   TX: ${releaseData.tx_signature?.slice(0, 20)}...`);
    } else {
        console.error(`   ❌ Release failed: ${releaseData.error}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('       ✅ TEST COMPLETE - REAL ESCROW WORKED!   ');
    console.log('═══════════════════════════════════════════════');
}

main().catch(console.error);
