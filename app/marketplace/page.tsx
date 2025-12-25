"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Search, TrendingUp, DollarSign, Filter, ShoppingCart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Mock Data for "Ticker" tape
const RECENT_SALES = [
    { name: 'agent://gpt5', price: 450 },
    { name: 'agent://tesla', price: 120 },
    { name: 'agent://moon', price: 85 },
    { name: 'agent://defi', price: 50 },
];

const TREASURY_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET!;

export default function Marketplace() {
    const { connection } = useConnection();
    const { connected, publicKey, sendTransaction } = useWallet();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
    const [filter, setFilter] = useState('all'); // all, titan, cheap

    // Fetch Listings
    const fetchListings = async () => {
        setLoading(true);
        try {
            // Fetch domains where marketplace_status is active
            const { data, error } = await supabase
                .from('domains')
                .select('*')
                .eq('marketplace_status', 'active')
                .order('created_at', { ascending: false });

            if (data) {
                console.log('Marketplace Data:', data);
                setListings(data);
            }
        } catch (err) {
            console.error("Error fetching marketplace:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleBuy = async (item: any) => {
        if (!connected || !publicKey) {
            alert("Please connect your wallet first!");
            return;
        }

        if (item.owner_wallet === publicKey.toString()) {
            alert("You cannot buy your own domain.");
            return;
        }

        const price = Number(item.list_price);
        if (!price || isNaN(price)) {
            alert("Invalid price.");
            return;
        }

        setBuying(item.id);
        try {
            // 0. Validate Seller Wallet
            if (!item.owner_wallet) {
                throw new Error("Seller wallet not found for this item.");
            }

            const sellerKey = new PublicKey(item.owner_wallet);

            console.log(`[BUY] Processing: ${publicKey.toString()} -> ${sellerKey.toString()} (${price} SOL)`);

            // 1. Create Transaction (Buyer -> Seller) - P2P Transfer
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: sellerKey,
                    lamports: price * LAMPORTS_PER_SOL,
                })
            );

            // 2. Send Transaction
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'processed');

            // 3. Call API to Swap Ownership
            const res = await fetch('/api/marketplace/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature,
                    domainName: item.name,
                    buyerWallet: publicKey.toString(),
                    price: price
                })
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            alert(`Successfully purchased agent://${item.name}!`);
            fetchListings(); // Refresh grid

        } catch (err: any) {
            console.error("Buy failed:", err);
            // Provide clearer error if mostly likely funds or simulation
            if (err.message?.includes("0x1")) {
                alert("Purchase failed: Insufficient Funds?");
            } else {
                alert(`Purchase failed: ${err.message}`);
            }
        } finally {
            setBuying(null);
        }
    };

    const filteredListings = listings.filter(item => {
        if (filter === 'titan') return item.price_paid >= 2.5;
        if (filter === 'cheap') return (item.list_price || 0) < 1;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold tracking-tighter flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/ans-logo.png" alt="ANS" className="w-10 h-10" />
                        ANS
                    </Link>
                    <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                        <Link href="/dashboard" className="hover:text-white transition-colors">My Assets</Link>
                        <span className="text-white">Marketplace</span>
                        <div className="bg-white text-black rounded-full overflow-hidden scale-90">
                            <WalletMultiButton style={{ height: 36, padding: '0 16px', backgroundColor: 'white', color: 'black' }} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Ticker Tape */}
            <div className="bg-green-900/10 border-b border-green-500/10 overflow-hidden whitespace-nowrap h-10 flex items-center">
                <div className="animate-[marquee_20s_linear_infinite] flex items-center gap-8 text-xs font-mono text-green-400">
                    {RECENT_SALES.map((sale, i) => (
                        <span key={i} className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> SOLD: <span className="text-white">{sale.name}</span> for {sale.price} SOL
                        </span>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {RECENT_SALES.map((sale, i) => (
                        <span key={`dup-${i}`} className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> SOLD: <span className="text-white">{sale.name}</span> for {sale.price} SOL
                        </span>
                    ))}
                </div>
            </div>

            {/* Header */}
            <header className="py-20 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                    Agent <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Stock Market</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
                    Buy, Sell, and Trade verified autonomous identities. <br />
                    <span className="text-green-500 font-mono">2.5% Royalties. Zero Friction.</span>
                </p>

                {/* Search Bar */}
                <div className="max-w-md mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <div className="relative bg-black border border-white/10 rounded-xl p-3 flex items-center">
                        <Search className="w-5 h-5 text-gray-500 ml-2 mr-3" />
                        <input
                            type="text"
                            placeholder="Search active listings..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600"
                        />
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 mb-8 flex gap-4 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${filter === 'all' ? 'bg-white text-black border-white' : 'bg-black text-gray-400 border-white/10 hover:border-white/30'}`}
                >
                    All Listings
                </button>
                <button
                    onClick={() => setFilter('titan')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${filter === 'titan' ? 'bg-purple-500 text-white border-purple-500' : 'bg-black text-gray-400 border-white/10 hover:border-purple-500/50'}`}
                >
                    Titan Tier (Premium)
                </button>
                <button
                    onClick={() => setFilter('cheap')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${filter === 'cheap' ? 'bg-green-600 text-white border-green-600' : 'bg-black text-gray-400 border-white/10 hover:border-green-600/50'}`}
                >
                    Under 1 SOL
                </button>
            </div>

            {/* Grid */}
            <main className="max-w-7xl mx-auto px-6 pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p>Loading market data...</p>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500 text-xl mb-4">No active listings found.</p>
                        <p className="text-gray-600 text-sm">Be the first to list a domain from your dashboard!</p>
                        <Link href="/dashboard" className="inline-block mt-6 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors">
                            List My Domain
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredListings.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-green-500/50 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-5 h-5 -rotate-45 text-green-500" />
                                </div>

                                <div className="mb-4">
                                    <div className="text-xs text-gray-500 font-mono mb-1">DOMAIN NAME</div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        agent://<span className="text-gray-300">{item.name}</span>
                                    </h3>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-xs text-gray-500 font-mono mb-1">ASK PRICE</div>
                                        <div className="text-xl font-bold text-green-400 flex items-center gap-1">
                                            {item.list_price || '---'} <span className="text-xs text-green-600">SOL</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={buying === item.id}
                                        className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {buying === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                        {buying === item.id ? "Swapping..." : "Buy Now"}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
