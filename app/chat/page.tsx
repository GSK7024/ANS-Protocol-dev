'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Link from 'next/link';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    functionsCalled?: string[];
    isLoading?: boolean;
}

interface FlightCard {
    flightNumber: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price: number;
    seatsAvailable: number;
    inventoryId: number;
    sellerName?: string;
    trustScore?: number;
    trustBadge?: string;
}

interface PendingPayment {
    escrowId: string;
    vaultAddress: string;
    amountSol: number;
    amountInr: number;
    sellerName: string;
    bookingRef: string;
}

interface PendingTransfer {
    recipientWallet: string;
    recipientName: string;
    amount: number;
    token: string;
    note: string;
    warning?: string;
}

export default function ChatPage() {
    const { connected, publicKey, sendTransaction } = useWallet();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `👋 **Welcome to ANS Flight Booking AI!**

I'm your intelligent travel assistant powered by Gemini AI. I can help you:

✈️ Search for flights between any cities
💺 Compare prices and availability  
📋 Book flights with passenger details
💰 Process secure payments via Solana

**Try saying:**
- "Find flights from Delhi to Mumbai tomorrow"
- "What's the cheapest flight to Bangalore next week?"
- "Book me a morning flight to Goa for 2 passengers"

${!connected ? '\n⚠️ **Connect your wallet** to enable booking and payments.' : '\n✅ **Wallet connected!** You\'re ready to book.'}`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [flightResults, setFlightResults] = useState<FlightCard[]>([]);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
    const [isPayingNow, setIsPayingNow] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Solana connection (devnet for testing)
    const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
        'confirmed'
    );

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on load
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Add loading message
        const loadingId = `loading-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: loadingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isLoading: true
        }]);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages.filter(m => !m.isLoading), userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    walletAddress: publicKey?.toBase58()
                })
            });

            const data = await response.json();

            // Remove loading message and add response
            setMessages(prev => [
                ...prev.filter(m => m.id !== loadingId),
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.message || data.error || 'Sorry, I encountered an error.',
                    timestamp: new Date(),
                    functionsCalled: data.functionsCalled
                }
            ]);

            // Extract flight results if present
            if (data.functionsResults) {
                const flightSearch = data.functionsResults.find(
                    (r: any) => r.name === 'search_flights' && r.result?.flights
                );
                if (flightSearch && flightSearch.result.flights.length > 0) {
                    // Map the nested API response to flat FlightCard structure
                    const mappedFlights = flightSearch.result.flights.slice(0, 4).map((f: any) => {
                        // Handle both nested (from aggregated API) and flat structures
                        const flight = f.flight || f;
                        const seller = f.seller || {};
                        return {
                            flightNumber: flight.flightNumber || f.flightNumber || 'N/A',
                            from: flight.from || f.from || '',
                            to: flight.to || f.to || '',
                            departure: flight.departure || f.departure || '',
                            arrival: flight.arrival || f.arrival || '',
                            price: flight.price || f.price || 0,
                            seatsAvailable: flight.seatsAvailable || f.seatsAvailable || 0,
                            inventoryId: flight.inventoryId || f.inventoryId || 0,
                            sellerName: seller.displayName || seller.name || 'NexusAir',
                            trustScore: seller.trustScore || 0,
                            trustBadge: seller.badge || ''
                        };
                    });
                    setFlightResults(mappedFlights);
                }

                // Check for payment/escrow response
                const paymentResult = data.functionsResults.find(
                    (r: any) => r.name === 'initiate_payment' && r.result?.escrow_id
                );
                if (paymentResult && paymentResult.result) {
                    const p = paymentResult.result;
                    setPendingPayment({
                        escrowId: p.escrow_id,
                        vaultAddress: p.vault_address,
                        amountSol: p.amount_sol || p.total_sol || 0.01,
                        amountInr: p.amount_inr || p.total_inr || 0,
                        sellerName: p.agent || 'NexusAir',
                        bookingRef: p.booking_ref || ''
                    });
                }

                // Check for send_money response
                const transferResult = data.functionsResults.find(
                    (r: any) => r.name === 'send_money' && r.result?.action === 'send_money'
                );
                if (transferResult && transferResult.result?.transaction) {
                    const t = transferResult.result.transaction;
                    setPendingTransfer({
                        recipientWallet: t.recipientWallet,
                        recipientName: t.recipientName,
                        amount: t.amount,
                        token: t.token || 'SOL',
                        note: t.note || '',
                        warning: transferResult.result.warningIfNew
                    });
                }
            }

        } catch (err: any) {
            setMessages(prev => [
                ...prev.filter(m => m.id !== loadingId),
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `❌ Error: ${err.message}. Please try again.`,
                    timestamp: new Date()
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const selectFlight = (flight: FlightCard) => {
        setInput(`I want to book flight ${flight.flightNumber} from ${flight.from} to ${flight.to}`);
        inputRef.current?.focus();
    };

    // Execute Solana payment
    const executePayment = async () => {
        if (!pendingPayment || !publicKey || !sendTransaction) {
            alert('Please connect your wallet first');
            return;
        }

        setIsPayingNow(true);
        try {
            const lamports = Math.floor(pendingPayment.amountSol * LAMPORTS_PER_SOL);
            const vaultPubkey = new PublicKey(pendingPayment.vaultAddress);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: vaultPubkey,
                    lamports
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Notify backend of payment
            await fetch('/api/escrow/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    escrow_id: pendingPayment.escrowId,
                    tx_signature: signature
                })
            });

            // Clear payment and add success message
            setPendingPayment(null);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ **Payment Successful!**\n\nTransaction: \`${signature.slice(0, 20)}...\`\n\nYour booking is now confirmed. You'll receive your e-ticket shortly.`,
                timestamp: new Date()
            }]);

        } catch (err: any) {
            console.error('Payment error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ Payment failed: ${err.message}\n\nPlease try again or contact support.`,
                timestamp: new Date()
            }]);
        } finally {
            setIsPayingNow(false);
        }
    };

    // Execute direct SOL transfer
    const executeTransfer = async () => {
        if (!pendingTransfer || !publicKey || !sendTransaction) {
            alert('Please connect your wallet first');
            return;
        }

        setIsPayingNow(true);
        try {
            const lamports = Math.floor(pendingTransfer.amount * LAMPORTS_PER_SOL);
            const recipientPubkey = new PublicKey(pendingTransfer.recipientWallet);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubkey,
                    lamports
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Clear transfer and add success message
            setPendingTransfer(null);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ **Transfer Successful!**\n\nSent **${pendingTransfer.amount} ${pendingTransfer.token}** to **${pendingTransfer.recipientName}**\n\nTransaction: \`${signature.slice(0, 20)}...\`\n\n[View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)`,
                timestamp: new Date()
            }]);

        } catch (err: any) {
            console.error('Transfer error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ Transfer failed: ${err.message}\n\nPlease try again.`,
                timestamp: new Date()
            }]);
        } finally {
            setIsPayingNow(false);
        }
    };

    const quickActions = [
        { label: '🛫 Delhi to Mumbai', query: 'Find flights from Delhi to Mumbai tomorrow' },
        { label: '🌴 Flights to Goa', query: 'Show me flights to Goa this weekend' },
        { label: '💼 Business Class', query: 'Search business class flights from Mumbai to Bangalore' },
        { label: '💸 Send SOL', query: 'Send 0.01 SOL to agent://testbuyer2' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                            ✈️
                        </div>
                        <div>
                            <h1 className="text-white font-semibold">ANS Flight AI</h1>
                            <p className="text-xs text-gray-400">Powered by Gemini</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            NexusAir Connected
                        </span>
                        <WalletMultiButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-[calc(100vh-140px)]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2 custom-scrollbar">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-5 py-3 ${message.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                                        : 'bg-white/10 backdrop-blur border border-white/10 text-gray-100'
                                        } ${message.isLoading ? 'animate-pulse' : ''}`}
                                >
                                    {message.isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-gray-400 text-sm">Searching flights...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="prose prose-invert prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatMessage(message.content)
                                                }}
                                            />
                                            {message.functionsCalled && message.functionsCalled.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                                                    {message.functionsCalled.map((fn, i) => (
                                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                                                            🔧 {fn}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Flight Results Cards */}
                    {flightResults.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-white/70 text-sm mb-2 px-1">🎫 Available Flights</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {flightResults.map((flight, i) => (
                                    <button
                                        key={i}
                                        onClick={() => selectFlight(flight)}
                                        className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-400 font-mono font-semibold">{flight.flightNumber || 'N/A'}</span>
                                                {flight.sellerName && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                                                        {flight.sellerName}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-lg font-bold text-green-400">₹{(flight.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white">
                                            <span className="font-medium">{flight.from || '-'}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="font-medium">{flight.to || '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                                            <span>{flight.departure || '-'} - {flight.arrival || '-'}</span>
                                            <span className={(flight.seatsAvailable || 0) < 10 ? 'text-orange-400' : ''}>
                                                {flight.seatsAvailable || 0} seats
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    {messages.length <= 2 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {quickActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(action.query);
                                        inputRef.current?.focus();
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 hover:border-purple-500/50 transition-all"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Payment Card */}
                    {pendingPayment && (
                        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        💰 Payment Ready
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {pendingPayment.sellerName} • Booking {pendingPayment.bookingRef}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-400">
                                        {pendingPayment.amountSol.toFixed(4)} SOL
                                    </p>
                                    {pendingPayment.amountInr > 0 && (
                                        <p className="text-gray-400 text-sm">
                                            ≈ ₹{pendingPayment.amountInr.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingPayment(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executePayment}
                                    disabled={isPayingNow || !connected}
                                    className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPayingNow ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            💳 Pay Now
                                        </>
                                    )}
                                </button>
                            </div>

                            {!connected && (
                                <p className="text-yellow-400 text-xs mt-2 text-center">
                                    ⚠️ Connect your wallet to pay
                                </p>
                            )}
                        </div>
                    )}

                    {/* Transfer Card (for send_money) */}
                    {pendingTransfer && (
                        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        💸 Send Money
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        To: <span className="text-cyan-400">{pendingTransfer.recipientName}</span>
                                    </p>
                                    {pendingTransfer.note && (
                                        <p className="text-gray-500 text-xs mt-1 italic">"{pendingTransfer.note}"</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-cyan-400">
                                        {pendingTransfer.amount} {pendingTransfer.token}
                                    </p>
                                </div>
                            </div>

                            {pendingTransfer.warning && (
                                <p className="text-yellow-400 text-xs mb-3 bg-yellow-500/10 px-2 py-1 rounded">
                                    {pendingTransfer.warning}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingTransfer(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeTransfer}
                                    disabled={isPayingNow || !connected}
                                    className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPayingNow ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            ✓ Confirm Send
                                        </>
                                    )}
                                </button>
                            </div>

                            {!connected && (
                                <p className="text-yellow-400 text-xs mt-2 text-center">
                                    ⚠️ Connect your wallet to send
                                </p>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="flex gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 transition-colors">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me to find flights, check prices, or book..."
                                rows={1}
                                className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 resize-none focus:outline-none"
                                style={{ minHeight: '50px', maxHeight: '150px' }}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Send
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-2">
                            Powered by <span className="text-purple-400">Gemini AI</span> ·
                            <span className="text-cyan-400"> ANS Protocol</span> ·
                            NexusAir Demo
                        </p>
                    </form>
                </div>

                {/* Right Sidebar - Booking Info */}
                <aside className="hidden lg:block w-80 space-y-4">
                    {/* Wallet Status */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            💳 Wallet
                        </h3>
                        {connected && publicKey ? (
                            <div className="space-y-2">
                                <div className="text-sm text-gray-400">Connected</div>
                                <div className="font-mono text-xs text-purple-400 truncate">
                                    {publicKey.toBase58()}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm">
                                Connect wallet to enable booking & payments
                            </div>
                        )}
                    </div>

                    {/* How it Works */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                        <h3 className="text-white font-semibold mb-3">🎯 How it Works</h3>
                        <div className="space-y-3 text-sm text-gray-400">
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
                                <span>Tell me where you want to fly</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                                <span>I'll search real flights & prices</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
                                <span>Provide passenger details</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold">4</span>
                                <span>Pay with SOL via escrow</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-500/30 text-green-400 flex items-center justify-center text-xs font-bold">✓</span>
                                <span>Get instant PNR & e-ticket</span>
                            </div>
                        </div>
                    </div>

                    {/* Trust Badge */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <div className="text-white font-semibold">Escrow Protected</div>
                                <div className="text-xs text-gray-400">Powered by ANS Protocol</div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Your payment is held in escrow until the ticket is confirmed.
                            Automatic refunds if anything goes wrong.
                        </p>
                    </div>
                </aside>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 92, 246, 0.5);
                }
            `}</style>
        </div>
    );
}

// Format markdown-like content
function formatMessage(content: string): string {
    return content
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Code
        .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs">$1</code>')
        // Line breaks
        .replace(/\n/g, '<br/>')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cyan-400 hover:underline" target="_blank">$1</a>')
        // Emojis stay as is
        ;
}
