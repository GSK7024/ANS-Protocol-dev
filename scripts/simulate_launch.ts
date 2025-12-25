
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import 'dotenv/config';
import bs58 from 'bs58';

// CONFIG
const API_URL = 'http://localhost:3000/api/verify-payment'; // Adjust port if needed
// const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const RPC_URL = 'https://api.devnet.solana.com'; // Force public devnet to avoid Auth errors
const DEV_WALLET = new PublicKey(process.env.NEXT_PUBLIC_DEV_WALLET!);
const VAULT_WALLET = new PublicKey(process.env.NEXT_PUBLIC_VAULT_WALLET!);

async function main() {
    console.log("🚀 STARTING GENESIS LAUNCH SIMULATION...");
    console.log("-----------------------------------------");

    const connection = new Connection(RPC_URL, 'confirmed');

    // Generate a temporary Buyer Wallet
    const buyer = Keypair.generate();
    console.log(`👤 Generated Buyer: ${buyer.publicKey.toBase58()}`);

    // Airdrop SOL if on Devnet/Localnet
    try {
        console.log("💧 Requesting Airdrop...");
        const airdropSig = await connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig);
        console.log("✅ Airdrop Received.");
    } catch (err) {
        console.warn("⚠️ Airdrop failed (Rate limit or Mainnet). Attempting self-fund from Treasury...");

        // Fallback: Fund from Treasury if key exists
        const fundingKeyStr = process.env.DEV_PRIVATE_KEY || process.env.VAULT_PRIVATE_KEY;

        if (fundingKeyStr) {
            try {
                console.log("   🏦 Attempting to fund from Treasury...");

                let secretKey: Uint8Array;
                try {
                    // Try JSON Array format [1,2,3...]
                    secretKey = Uint8Array.from(JSON.parse(fundingKeyStr));
                } catch (jsonErr) {
                    // Try Base58 format
                    try {
                        secretKey = bs58.decode(fundingKeyStr);
                    } catch (bs58Err) {
                        throw new Error("Invalid Key Format: Must be JSON Array or Base58 String");
                    }
                }

                const fundingKey = Keypair.fromSecretKey(secretKey);

                const fundTx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fundingKey.publicKey,
                        toPubkey: buyer.publicKey,
                        lamports: 1 * LAMPORTS_PER_SOL
                    })
                );

                const sig = await sendAndConfirmTransaction(connection, fundTx, [fundingKey]);
                console.log(`✅ Funded from Treasury: ${sig}`);

                // Wait for confirmation/propagation
                await new Promise(r => setTimeout(r, 2000));

            } catch (fundErr) {
                console.error("❌ Failed to self-fund:", fundErr);
            }
        } else {
            console.log("❌ No Private Keys found (DEV_PRIVATE_KEY or VAULT_PRIVATE_KEY). Cannot fund buyer.");
            console.log("⚠️ Please add keys to .env OR manually send SOL to:", buyer.publicKey.toBase58());
        }
    }

    // --- TEST 1: LEGITIMATE PURCHASE ---
    console.log("\n[TEST 1] Legitimate Purchase (agent://valid-test-name)");
    const legitName = `valid-test-${Date.now()}`; // Unique name
    const price = 0.25; // Base price

    try {
        // Send SOL
        const sig1 = await sendSol(connection, buyer, price);
        console.log(`   💸 Sent ${price} SOL. Sig: ${sig1}`);

        // Call API
        const res1 = await callVerifyApi(sig1, legitName, buyer.publicKey.toBase58(), price);
        if (res1.success) {
            console.log("   ✅ SUCCESS: Domain Registered.");
        } else {
            console.error("   ❌ FAILED: ", res1.error);
        }
    } catch (err) {
        console.error("   ❌ EXCEPTION: ", err);
    }

    // --- TEST 2: RESTRICTED NAME SPOOFING ---
    console.log("\n[TEST 2] Spoofing Attempt (agent://user.google)");
    const spoofName = "user.google";
    // Attacker tries to pay 0 (or small amount) for a "free" domain but it's restricted
    // OR pays full price but tries to get restricted name.

    try {
        // Technically "free" flow sends a dummy sig or specific flag. 
        // Let's try the PAID flow to see if it blocks it there too.
        const sig2 = await sendSol(connection, buyer, 0.25);

        const res2 = await callVerifyApi(sig2, spoofName, buyer.publicKey.toBase58(), 0.25);
        if (res2.error && (res2.error.includes('restricted') || res2.error.includes('reserved'))) {
            console.log("   ✅ SUCCESS: Attack Blocked (Restricted Name).");
        } else if (res2.success) {
            console.error("   ❌ FAIL: Attacker registered restricted name!");
        } else {
            console.log("   ❓ Blocked but with unexpected error:", res2.error);
        }

    } catch (err) {
        console.error("   ❌ EXCEPTION: ", err);
    }

    // --- TEST 3: REPLAY ATTACK ---
    console.log("\n[TEST 3] Replay Attack (Re-using Sig from Test 1)");
    // We try to use sig1 (which was successful) to register ANOTHER domain
    const anotherName = `scam-attempt-${Date.now()}`;

    // We don't send new SOL. We just call API with old sig.
    // NOTE: passing the SAME sig1 from Test 1.

    // Check if we have sig1 defined (from scope above, we assume main function scope)
    // Actually we need to capture sig1 from Test 1 properly. 
    // For this script simplicity, let's just create a NEW tx, use it once, then try again.

    const sigReplay = await sendSol(connection, buyer, 0.25);
    console.log(`   💸 Legit Tx for Replay Test: ${sigReplay}`);
    const nameReplay1 = `replay-legit-${Date.now()}`;

    // First Use (Should success)
    await callVerifyApi(sigReplay, nameReplay1, buyer.publicKey.toBase58(), 0.25);

    // Second Use (Should fail)
    console.log("   🔄 Replaying signature...");
    const nameReplay2 = `replay-attack-${Date.now()}`;
    const resReplay = await callVerifyApi(sigReplay, nameReplay2, buyer.publicKey.toBase58(), 0.25);

    if (resReplay.error && resReplay.error.includes('already used')) {
        console.log("   ✅ SUCCESS: Replay Attack Blocked.");
    } else if (resReplay.success) {
        console.error("   ❌ FAIL: Replay Attack Succeeded!");
    } else {
        console.log("   ❓ Blocked with other error:", resReplay.error);
    }

}

// --- HELPERS ---

async function sendSol(connection: Connection, buyer: Keypair, amount: number): Promise<string> {
    const lamports = amount * LAMPORTS_PER_SOL;
    const half = Math.floor(lamports / 2);

    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: buyer.publicKey,
            toPubkey: DEV_WALLET,
            lamports: half
        }),
        SystemProgram.transfer({
            fromPubkey: buyer.publicKey,
            toPubkey: VAULT_WALLET,
            lamports: half
        })
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [buyer]);
    return sig;
}

async function callVerifyApi(signature: string, domain: string, wallet: string, amount: number) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signature,
            domain,
            wallet,
            tier: 'standard', // or implied from price
            amount,
            currency: 'SOL'
        })
    });
    return await res.json();
}

main();
