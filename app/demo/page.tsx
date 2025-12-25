'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Bot, Send, Loader2, Plane, Building, Wallet, ArrowRight, CheckCircle2, X } from 'lucide-react';
require('@solana/wallet-adapter-react-ui/styles.css');

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    data?: any;
    actions?: Action[];
}

interface Action {
    type: 'flight' | 'hotel' | 'transfer' | 'confirm' | 'product';
    label: string;
    data: any;
}

export default function DemoPage() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `👋 Welcome to ANS AI Assistant!

I can help you with:
• ✈️ **Book flights** via agent://airindia - "Book a flight to Mumbai"
• 🏨 **Book hotels** via agent://marriott - "Find a hotel in Mumbai"
• 🛒 **Shop products** via agent://amazon - "Buy a swimsuit"
• 💸 **Send crypto** - "Send 1 SOL to agent://developer"

*Note: These are DEMO agents running on the ANS testnet for demonstration purposes.*`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addMessage = (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    const processCommand = async (text: string) => {
        if (!text.trim()) return;

        addMessage({ role: 'user', content: text });
        setInput('');
        setLoading(true);

        try {
            // Simple intent detection (in production, use Gemini for this)
            const lowerText = text.toLowerCase();

            if (lowerText.includes('flight') || lowerText.includes('fly')) {
                await handleFlightSearch(text);
            } else if (lowerText.includes('hotel') || lowerText.includes('stay') || lowerText.includes('room')) {
                await handleHotelSearch(text);
            } else if (lowerText.includes('send') && (lowerText.includes('sol') || lowerText.includes('crypto'))) {
                await handleCryptoTransfer(text);
            } else if (lowerText.includes('buy') || lowerText.includes('shop') || lowerText.includes('order')) {
                await handleShopping(text);
            } else {
                // Generic response
                addMessage({
                    role: 'assistant',
                    content: `I understand you want to: "${text}"

Try commands like:
• "Book a flight to Mumbai" (via agent://airindia)
• "Find hotels in Delhi" (via agent://marriott)
• "Buy a swimsuit" (via agent://amazon)
• "Send 0.5 SOL to agent://developer"

*(Demo agents enabled)*`
                });
            }
        } catch (err: any) {
            addMessage({
                role: 'assistant',
                content: `❌ Error: ${err.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFlightSearch = async (text: string) => {
        // Extract destination from text
        const destMatch = text.match(/to\s+(\w+)/i);
        const dest = destMatch ? destMatch[1] : 'Mumbai';

        // Extract origin if specified
        const fromMatch = text.match(/from\s+(\w+)/i);
        const from = fromMatch ? fromMatch[1] : 'Delhi';

        addMessage({
            role: 'assistant',
            content: `🔍 Discovering flight agents in ANS registry...`
        });

        // STEP 1: Discover airline agents via ANS
        const discoverRes = await fetch('/api/discover?category=airlines');
        const discovered = await discoverRes.json();

        if (!discovered.agents || discovered.agents.length === 0) {
            addMessage({
                role: 'assistant',
                content: `❌ No airline agents found in ANS registry. Register one first!`
            });
            return;
        }

        // Get the top airline (highest trust score)
        const airline = discovered.agents[0];

        addMessage({
            role: 'assistant',
            content: `✅ Found **${airline.agent}** (Trust: ${airline.trust_score}⭐, Tier: ${airline.trust_tier})
            
Searching flights ${from} → ${dest}...`
        });

        // STEP 2: Call the seller's API endpoint from the registry
        const sellerEndpoint = airline.endpoint || `/api/sellers/${airline.name}`;

        const res = await fetch(sellerEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search', from, to: dest })
        });

        const data = await res.json();

        if (data.flights && data.flights.length > 0) {
            const flights = data.flights.slice(0, 3);
            addMessage({
                role: 'assistant',
                content: `✈️ **${airline.agent}** returned ${flights.length} flights (${from.toUpperCase()} → ${dest.toUpperCase()}):`,
                data: {
                    type: 'flights', items: flights.map((f: any) => ({
                        ...f,
                        price: f.price_usd,
                        price_inr: f.price_inr
                    }))
                },
                actions: flights.map((f: any) => ({
                    type: 'flight',
                    label: `Book ${f.flight_number} - ₹${f.price_inr}`,
                    data: { ...f, seller: airline.agent, seller_wallet: airline.wallet }
                }))
            });
        } else {
            addMessage({
                role: 'assistant',
                content: `No flights found ${from} → ${dest}. Try: Mumbai, Delhi, Bangalore`
            });
        }
    };

    const handleHotelSearch = async (text: string) => {
        // Extract city from text
        const cityMatch = text.match(/in\s+(\w+)/i);
        const city = cityMatch ? cityMatch[1] : 'Mumbai';

        addMessage({
            role: 'assistant',
            content: `🔍 Discovering hotel agents in ANS registry...`
        });

        // STEP 1: Discover hotel agents via ANS
        const discoverRes = await fetch('/api/discover?category=hotels');
        const discovered = await discoverRes.json();

        if (!discovered.agents || discovered.agents.length === 0) {
            addMessage({
                role: 'assistant',
                content: `❌ No hotel agents found in ANS registry. Register one first!`
            });
            return;
        }

        // Get the top hotel (highest trust score)
        const hotelAgent = discovered.agents[0];

        addMessage({
            role: 'assistant',
            content: `✅ Found **${hotelAgent.agent}** (Trust: ${hotelAgent.trust_score}⭐, Tier: ${hotelAgent.trust_tier})
            
Searching hotels in ${city}...`
        });

        // STEP 2: Call the seller's API endpoint from the registry
        const sellerEndpoint = hotelAgent.endpoint || `/api/sellers/${hotelAgent.name}`;

        const res = await fetch(sellerEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search', city })
        });

        const data = await res.json();

        if (data.hotels && data.hotels.length > 0) {
            const hotels = data.hotels.slice(0, 3);
            addMessage({
                role: 'assistant',
                content: `🏨 **${hotelAgent.agent}** returned ${hotels.length} hotels in ${city}:`,
                data: {
                    type: 'hotels', items: hotels.map((h: any) => ({
                        ...h,
                        name: h.property_name,
                        price_per_night: h.price_per_night_usd,
                        price_inr: h.price_per_night_inr,
                        stars: 5
                    }))
                },
                actions: hotels.map((h: any) => ({
                    type: 'hotel',
                    label: `Book ${h.property_name.split(' ').slice(0, 2).join(' ')} - ₹${h.price_per_night_inr}`,
                    data: { ...h, seller: hotelAgent.agent, seller_wallet: hotelAgent.wallet }
                }))
            });
        } else {
            addMessage({
                role: 'assistant',
                content: `No hotels found in ${city}. Try: Mumbai, Delhi, Bangalore`
            });
        }
    };

    const handleShopping = async (text: string) => {
        // Extract product query
        const query = text.replace(/buy|shop|order|a|an|the/gi, '').trim() || 'swimsuit';

        addMessage({
            role: 'assistant',
            content: `🔍 Discovering shopping agents in ANS registry...`
        });

        // STEP 1: Discover shopping agents via ANS
        const discoverRes = await fetch('/api/discover?category=shopping');
        const discovered = await discoverRes.json();

        if (!discovered.agents || discovered.agents.length === 0) {
            addMessage({
                role: 'assistant',
                content: `❌ No shopping agents found in ANS registry. Register one first!`
            });
            return;
        }

        // Get the top shop (highest trust score)
        const shopAgent = discovered.agents[0];

        addMessage({
            role: 'assistant',
            content: `✅ Found **${shopAgent.agent}** (Trust: ${shopAgent.trust_score}⭐, Tier: ${shopAgent.trust_tier})
            
Searching for "${query}"...`
        });

        // STEP 2: Call the seller's API endpoint from the registry
        const sellerEndpoint = shopAgent.endpoint || `/api/sellers/${shopAgent.name}`;

        const res = await fetch(sellerEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search', query })
        });

        const data = await res.json();

        if (data.products && data.products.length > 0) {
            const products = data.products.slice(0, 3);
            addMessage({
                role: 'assistant',
                content: `🛍️ **${shopAgent.agent}** returned ${products.length} products:`,
                data: { type: 'products', items: products },
                actions: products.map((p: any) => ({
                    type: 'product',
                    label: `Buy ${p.name.slice(0, 20)}... - ₹${p.price}`,
                    data: { ...p, seller: shopAgent.agent, seller_wallet: shopAgent.wallet }
                }))
            });
        } else {
            addMessage({
                role: 'assistant',
                content: `No products found for "${query}".`
            });
        }
    };

    const handleCryptoTransfer = async (text: string) => {
        // Extract amount and recipient
        const amountMatch = text.match(/(\d+\.?\d*)\s*sol/i);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.1;

        const recipientMatch = text.match(/to\s+(agent:\/\/\w+|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
        const recipient = recipientMatch ? recipientMatch[1] : null;

        if (!recipient) {
            addMessage({
                role: 'assistant',
                content: `Please specify a recipient. Example: "Send 1 SOL to agent://developer"`
            });
            return;
        }

        addMessage({
            role: 'assistant',
            content: `💸 Preparing transfer of ${amount} SOL to ${recipient}...`
        });

        const res = await fetch('/api/agents/send-sol', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, amount })
        });

        const data = await res.json();

        if (data.success) {
            setPendingAction({
                type: 'transfer',
                data: data.instructions
            });
            addMessage({
                role: 'assistant',
                content: `Ready to send **${data.instructions.transfers[0].amount.toFixed(4)} SOL** to **${data.instructions.recipient.name}**

ANS Fee: ${data.instructions.ans_fee.toFixed(6)} SOL (0.5%)
Total: ${data.instructions.total_amount} SOL`,
                actions: [{
                    type: 'confirm',
                    label: `Confirm & Send ${data.instructions.total_amount} SOL`,
                    data: data.instructions
                }]
            });
        } else {
            addMessage({
                role: 'assistant',
                content: `❌ ${data.error}`
            });
        }
    };

    const executeTransfer = async (instructions: any) => {
        if (!publicKey) {
            addMessage({ role: 'assistant', content: '❌ Please connect your wallet first!' });
            return;
        }

        setLoading(true);
        try {
            const transaction = new Transaction();

            for (const transfer of instructions.transfers) {
                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: new PublicKey(transfer.to),
                        lamports: Math.floor(transfer.amount * LAMPORTS_PER_SOL)
                    })
                );
            }

            addMessage({ role: 'assistant', content: '⏳ Confirming transaction...' });

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            addMessage({
                role: 'assistant',
                content: `✅ **Transaction Successful!**

Sent: ${instructions.transfers[0].amount.toFixed(4)} SOL
To: ${instructions.recipient.name}
ANS Fee: ${instructions.ans_fee.toFixed(6)} SOL

🔗 [View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)`
            });
            setPendingAction(null);
        } catch (err: any) {
            addMessage({ role: 'assistant', content: `❌ Transaction failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: Action) => {
        if (action.type === 'confirm' && action.data) {
            await executeTransfer(action.data);
        } else if (action.type === 'flight') {
            await createEscrowBooking(action.data, 'flight');
        } else if (action.type === 'hotel') {
            await createEscrowBooking(action.data, 'hotel');
        } else if (action.type === 'product') {
            await createEscrowBooking(action.data, 'product');
        }
    };

    const createEscrowBooking = async (data: any, type: string) => {
        if (!publicKey) {
            addMessage({ role: 'assistant', content: '❌ Please connect your wallet first!' });
            return;
        }

        setLoading(true);

        try {
            // Calculate price in SOL (₹83 = 1 USD, 1 SOL ≈ $100)
            const priceInr = data.price_inr || data.price_per_night_inr || data.price || 0;
            const priceInSol = priceInr / 83 / 100; // Convert INR → USD → SOL

            addMessage({
                role: 'assistant',
                content: `🔐 Creating secure payment...

**${type === 'flight' ? data.airline + ' ' + data.flight_number : type === 'hotel' ? data.property_name : data.name}**

💰 **Fee Breakdown:**
├ Solana Network: ~0.000005 SOL (~$0.001)
├ ANS Protocol ($ANS): **0%** ✨
└ Total: ${priceInSol.toFixed(4)} SOL

Funds held securely until ${data.seller} confirms delivery.`
            });

            // STEP 1: Create escrow via ANS API
            const escrowRes = await fetch('/api/escrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyer_wallet: publicKey.toString(),
                    seller_agent: data.seller,
                    amount: priceInSol,
                    service_details: {
                        type,
                        item: type === 'flight' ? data.flight_number : type === 'hotel' ? data.property_name : data.name,
                        price_inr: priceInr,
                        details: data
                    }
                })
            });

            const escrowData = await escrowRes.json();

            if (!escrowData.success) {
                addMessage({ role: 'assistant', content: `❌ Payment failed: ${escrowData.error}` });
                return;
            }

            addMessage({
                role: 'assistant',
                content: `✅ **Payment Ready!**

Amount: ${escrowData.amount.toFixed(4)} SOL
Seller: ${escrowData.seller.agent}
Protected until: ${new Date(escrowData.expires_at).toLocaleString()}

💡 Click below to pay. Funds are protected until delivery is confirmed.`,
                actions: [{
                    type: 'confirm',
                    label: `Pay ${escrowData.amount.toFixed(4)} SOL`,
                    data: {
                        escrow_id: escrowData.escrow_id,
                        total_amount: escrowData.amount,
                        transfers: [
                            {
                                to: escrowData.seller.wallet || '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
                                amount: escrowData.amount
                            }
                        ],
                        recipient: { name: data.seller }
                    }
                }]
            });

        } catch (err: any) {
            addMessage({ role: 'assistant', content: `❌ Error: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <nav className="flex justify-between items-center p-4 border-b border-white/10">
                <Link href="/" className="text-lg font-bold flex items-center gap-2">
                    <img src="/ans-logo.png" alt="ANS" className="w-8 h-8" />
                    ANS Demo
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live on Devnet
                    </span>
                    <WalletMultiButton />
                </div>
            </nav>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#111] border border-white/10'
                            }`}>
                            <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{
                                __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />

                            {/* Data Display */}
                            {msg.data?.type === 'flights' && (
                                <div className="mt-3 space-y-2">
                                    {msg.data.items.map((f: any, j: number) => (
                                        <div key={j} className="bg-black/50 rounded-lg p-3 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold">{f.airline} {f.flight_number}</div>
                                                <div className="text-xs text-gray-400">{f.departure} - {f.arrival} • {f.duration}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-400">${f.price}</div>
                                                <div className="text-xs text-gray-500">{f.class}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {msg.data?.type === 'hotels' && (
                                <div className="mt-3 space-y-2">
                                    {msg.data.items.map((h: any, j: number) => (
                                        <div key={j} className="bg-black/50 rounded-lg p-3 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold">{h.name}</div>
                                                <div className="text-xs text-gray-400">{'⭐'.repeat(h.stars)} • {h.location}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-400">${h.price_per_night}</div>
                                                <div className="text-xs text-gray-500">per night</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {msg.data?.type === 'products' && (
                                <div className="mt-3 space-y-2">
                                    {msg.data.items.map((p: any, j: number) => (
                                        <div key={j} className="bg-black/50 rounded-lg p-3 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold">{p.name}</div>
                                                <div className="text-xs text-gray-400">{p.brand} • {p.category}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-400">₹{p.price}</div>
                                                <div className="text-xs text-gray-500">{p.delivery_days}d delivery</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.actions.map((action, j) => (
                                        <button
                                            key={j}
                                            onClick={() => handleAction(action)}
                                            className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1"
                                        >
                                            {action.type === 'flight' && <Plane className="w-4 h-4" />}
                                            {action.type === 'hotel' && <Building className="w-4 h-4" />}
                                            {action.type === 'confirm' && <Wallet className="w-4 h-4" />}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 max-w-4xl mx-auto w-full">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && processCommand(input)}
                        placeholder="Try: Book a flight to Mumbai tonight..."
                        className="flex-1 bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                        onClick={() => processCommand(input)}
                        disabled={loading || !input.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl flex items-center gap-2"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                    <button onClick={() => setInput('Book a flight to Mumbai')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400">
                        ✈️ Book flight (Air India)
                    </button>
                    <button onClick={() => setInput('Find hotels in Mumbai')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400">
                        🏨 Hotels (Marriott)
                    </button>
                    <button onClick={() => setInput('Buy a swimsuit')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400">
                        🛒 Shop (Amazon)
                    </button>
                    <button onClick={() => setInput('Send 0.1 SOL to agent://developer')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400">
                        💸 Send crypto
                    </button>
                </div>
            </div>
        </div>
    );
}
