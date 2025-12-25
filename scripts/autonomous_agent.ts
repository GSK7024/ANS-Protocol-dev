
import { OpenAI } from 'openai'; // Compatible with xAI (Grok) and Groq
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import 'dotenv/config';
import bs58 from 'bs58';
import fetch from 'node-fetch'; // Standard fetch in Node 18+, but using explicit for compat
import readline from 'readline';
import { AGENT_SYSTEM_PROMPT, TOOLS_CONFIG } from './prompts/agent_prompts';

// --- CONFIGURATION ---
const ANS_ORCHESTRATOR_URL = 'http://localhost:3000/api/orchestrate';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// 1. AI CONFIG (Gemini / Grok / Groq / OpenAI)
// Gemini Base URL: https://generativelanguage.googleapis.com/v1beta/openai/
// xAI Base URL: https://api.x.ai/v1
// Groq Base URL: https://api.groq.com/openai/v1
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const AI_API_KEY = process.env.AI_API_KEY;

// 2. ANS IDENTITY
const ANS_API_KEY = process.env.ANS_API_KEY; // The Key form Dashboard
const WALLET_PRIVATE_KEY = process.env.DEV_PRIVATE_KEY; // To configure wallet for signing

// ---------------------

async function main() {
    console.log("🤖 ANS Autonomous Agent Starting...");
    console.log(`🔌 Connecting to Brain: ${AI_BASE_URL}`);

    // --- LOAD WALLET IDENTITY ---
    const walletKey = process.env.TEST_BUYER_PRIVATE_KEY || process.env.DEV_PRIVATE_KEY || process.env.VAULT_PRIVATE_KEY;
    if (!walletKey) {
        console.error("❌ No Private Key found in .env (need TEST_BUYER_PRIVATE_KEY, DEV_PRIVATE_KEY, or VAULT_PRIVATE_KEY)");
        process.exit(1);
    }

    let buyerKeypair: Keypair;
    try {
        if (walletKey.includes('[')) {
            buyerKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(walletKey)));
        } else {
            buyerKeypair = Keypair.fromSecretKey(bs58.decode(walletKey));
        }
        console.log(`👤 Agent Wallet: ${buyerKeypair.publicKey.toBase58()}`);
    } catch (e) {
        console.error("❌ Invalid Key Format");
        process.exit(1);
    }
    // -----------------------------

    if (!AI_API_KEY) {
        console.error("❌ Missing AI_API_KEY. Please set it in .env");
        console.log("   (For Grok: console.x.ai | For Groq: console.groq.com)");
        process.exit(1);
    }
    if (!ANS_API_KEY) {
        console.warn("⚠️ Missing ANS_API_KEY. Agent will run in 'Guest Mode' (some features limited).");
    }

    const ai = new OpenAI({
        apiKey: AI_API_KEY,
        baseURL: AI_BASE_URL
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // REPL Loop
    console.log("\n💬 Chat with your Agent (Type 'exit' to quit)");
    console.log("   Example: 'Find me a hotel in Tokyo for under 2 SOL'");

    const askQuestion = () => {
        rl.question('YOU: ', async (userInput) => {
            if (userInput.toLowerCase() === 'exit') {
                rl.close();
                process.exit(0);
            }

            try {
                // 1. THINK: Interpret User Intent
                console.log("🧠 Thinking...");

                const completion = await ai.chat.completions.create({
                    messages: [
                        { role: "system", content: AGENT_SYSTEM_PROMPT },
                        { role: "user", content: userInput }
                    ],
                    model: "gemini-2.5-flash", // Gemini 2.5 Flash
                    tools: TOOLS_CONFIG as any, // Type cast to avoid TS strictness
                    tool_choice: "auto"
                });

                const msg = completion.choices[0].message;

                // 2. ACT: Execute Tools
                if (msg.tool_calls) {
                    for (const toolCall of msg.tool_calls) {
                        const fn = toolCall.function;
                        const args = JSON.parse(fn.arguments);

                        if (fn.name === 'search_agents') {
                            console.log(`🔍 Searching ANS for: ${args.query}...`);
                            console.log(`   📋 Full args:`, JSON.stringify(args));

                            // Map AI categories to database categories
                            const categoryMap: Record<string, string> = {
                                'hotel': 'Travel',
                                'travel': 'Travel',
                                'flight': 'Travel',
                                'shopping': 'Shopping',
                                'finance': 'Finance'
                            };
                            const dbCategory = categoryMap[args.category] || args.category || 'Travel';
                            console.log(`   🏷️ Using category: ${dbCategory}`);

                            // Call local API (POST required)
                            const res = await fetch(`${ANS_ORCHESTRATOR_URL}/search`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    category: dbCategory,
                                    intent: 'book', // Assume booking intent to find verified sellers
                                    include_unverified: true, // Allow unverified (mock) agents
                                    params: {
                                        query: args.query
                                    }
                                })
                            });
                            const data: any = await res.json();

                            // Handle search options (The API returns { options: [...] })
                            const results = data.options || data.agents || [];

                            // Show results with DOMAIN NAME (what user needs to book)
                            console.log("   📋 Results:");
                            results.forEach((a: any) => {
                                const domainName = a.domain || a.agent_id || a.agent_name;
                                console.log(`      • ${domainName} - ${a.agent_name} (${a.price} SOL)`);
                            });
                            console.log(`   💡 To book, say: "book <domain-name>"`);


                            // In a real loop, we would add the tool result back to messages array 
                            // and call the AI again to generate the final answer.
                        }

                        if (fn.name === 'book_agent') {
                            console.log(`💸 Booking ${args.agent_name} for ${args.amount_sol} SOL...`);

                            // 1. ORCHESTRATE BOOKING
                            const bookRes = await fetch(`${ANS_ORCHESTRATOR_URL}/book`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${ANS_API_KEY}`
                                },
                                body: JSON.stringify({
                                    agent: args.agent_name,
                                    buyer_wallet: buyerKeypair.publicKey.toBase58(),
                                    amount: args.amount_sol,
                                    params: JSON.parse(args.details || '{}')
                                })
                            });

                            const bookData: any = await bookRes.json();
                            if (!bookData.success) {
                                console.error(`❌ Booking Failed: ${bookData.error}`);
                                continue;
                            }

                            console.log(`   ✅ Escrow Created: ${bookData.escrow_id}`);
                            console.log(`   💰 Payment Required: ${bookData.payment.total} SOL (Fee: ${bookData.payment.fee_percentage})`);

                            // 2. SIGN & PAY
                            const walletKey = process.env.TEST_BUYER_PRIVATE_KEY || process.env.DEV_PRIVATE_KEY;
                            if (!walletKey) {
                                console.error("❌ No Private Key found in .env (TEST_BUYER_PRIVATE_KEY)");
                                continue;
                            }

                            // Load Keypair (Support BS58 or JSON)
                            let keypair;
                            try {
                                if (walletKey.includes('[')) {
                                    keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(walletKey)));
                                } else {
                                    keypair = Keypair.fromSecretKey(bs58.decode(walletKey));
                                }
                            } catch (e) {
                                console.error("❌ Invalid Key Format");
                                continue;
                            }

                            // Verify Orchestrator used correct wallet?
                            // Actually we should have passed the public key in step 1.
                            // Let's assume we reform the request if needed, but for now we proceed.

                            const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
                            const vaultPubkey = new PublicKey(bookData.vault_address);

                            const tx = new Transaction().add(
                                SystemProgram.transfer({
                                    fromPubkey: keypair.publicKey,
                                    toPubkey: vaultPubkey,
                                    lamports: Math.round(bookData.payment.total * 1_000_000_000) // LAMPORTS_PER_SOL (rounded)
                                })
                            );

                            console.log("   📝 Signing Transaction...");
                            const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
                            console.log(`   ✅ Payment Sent! Sig: ${sig.substring(0, 15)}...`);

                            // 3. CONFIRM PAYMENT
                            const confirmRes = await fetch(`${ANS_ORCHESTRATOR_URL}/confirm-payment`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${ANS_API_KEY}`
                                },
                                body: JSON.stringify({
                                    escrow_id: bookData.escrow_id,
                                    tx_signature: sig
                                })
                            });

                            const confirmData: any = await confirmRes.json();
                            if (confirmData.success) {
                                console.log("   🎉 BOOKING COMPLETE!");
                                console.log(`   📝 Message: ${confirmData.message}`);

                                // Display ticket details if seller auto-fulfilled!
                                if (confirmData.ticket) {
                                    console.log("\n   🎫 ===== YOUR TICKET =====");
                                    console.log(`   📍 PNR: ${confirmData.ticket.pnr}`);
                                    console.log(`   ✈️  Flight: ${confirmData.ticket.flight_number}`);
                                    if (confirmData.ticket.route) {
                                        console.log(`   🛫 Route: ${confirmData.ticket.route.from} → ${confirmData.ticket.route.to}`);
                                        console.log(`   ⏰ Departure: ${new Date(confirmData.ticket.route.departure).toLocaleString()}`);
                                    }
                                    if (confirmData.ticket.passenger) {
                                        console.log(`   👤 Passenger: ${confirmData.ticket.passenger.name}`);
                                        console.log(`   💺 Seat: ${confirmData.ticket.passenger.seat} (${confirmData.ticket.passenger.class})`);
                                    }
                                    console.log("   ========================\n");
                                }

                                if (confirmData.seller_message) {
                                    console.log(`   💬 ${confirmData.seller_message}`);
                                }

                                // STEP 4: Verify the booking and release funds
                                if (confirmData.ticket) {
                                    console.log("\n   🔍 Verifying booking...");

                                    // 4a. Call verify API
                                    const verifyRes = await fetch(`${ANS_ORCHESTRATOR_URL}/verify`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${ANS_API_KEY}`
                                        },
                                        body: JSON.stringify({ escrow_id: confirmData.escrow_id })
                                    });

                                    const verifyData: any = await verifyRes.json();

                                    if (verifyData.verified) {
                                        console.log("   ✅ Booking verified!");
                                        console.log("   💸 Releasing funds to seller...");

                                        // 4b. Call release API
                                        const releaseRes = await fetch(`${ANS_ORCHESTRATOR_URL}/release`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${ANS_API_KEY}`
                                            },
                                            body: JSON.stringify({ escrow_id: confirmData.escrow_id })
                                        });

                                        const releaseData: any = await releaseRes.json();

                                        if (releaseData.success) {
                                            console.log(`   ✅ ${releaseData.amount_released} SOL released to seller!`);
                                            console.log(`   📝 Tx: ${releaseData.tx_signature?.slice(0, 20)}...`);
                                        } else {
                                            console.log(`   ⚠️ Release failed: ${releaseData.error}`);
                                        }
                                    } else {
                                        console.log(`   ⚠️ Verification failed: ${verifyData.message}`);
                                        console.log("   📌 Funds held in escrow for review.");
                                    }
                                }
                            } else {
                                console.error(`   ⚠️ Payment sent but confirmation failed: ${confirmData.error}`);
                            }
                        }
                    }
                } else {
                    console.log(`🤖 AGENT: ${msg.content}`);
                }

            } catch (err: any) {
                console.error("❌ AI Error:", err.message);
            }

            askQuestion(); // Loop
        });
    };

    askQuestion();
}

main();
