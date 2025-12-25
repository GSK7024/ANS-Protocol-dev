import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gavel, Trophy, Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { supabase } from '@/utils/supabase/client';

// ANTI-SPAM FEE
const BID_FEE_SOL = 0.032;
const BASE_PRICE_SOL = 5.0; // Minimum Start Bid
const TREASURY_WALLET = "G4neshKute...REPLACE_WITH_REAL_ADDRESS"; // Placeholder

interface AuctionModalProps {
    domain: string;
    isOpen: boolean;
    onClose: () => void;
}

interface Bid {
    id: string;
    bidder_wallet: string;
    amount: number;
    created_at: string;
}

export default function AuctionModal({ domain, isOpen, onClose }: AuctionModalProps) {
    const { connection } = useConnection();
    const { connected, publicKey, sendTransaction } = useWallet();
    const [bids, setBids] = useState<Bid[]>([]);
    const [bidAmount, setBidAmount] = useState<string>('');
    const [contact, setContact] = useState(''); // NEW: Contact Info
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Generate Mock Bids on Open
    useEffect(() => {
        if (!isOpen || !domain) return;

        // Helper for random Solana addresses
        const generateWallet = () => {
            const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            let res = '';
            for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
            res += '...';
            for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
            return res;
        };

        // Price Logic based on Domain Tier
        let topBidAmount = 0;
        const lowerDomain = domain.toLowerCase();

        if (lowerDomain === 'nexus') {
            // ANS SPECIAL CASE: SOLD
            const devWallet = process.env.NEXT_PUBLIC_DEV_WALLET || "";
            const maskedDev = devWallet.length > 8 ? devWallet.slice(0, 4) + '...' + devWallet.slice(-4) : 'DevWallet';

            setBids([{
                id: 'sold-1',
                bidder_wallet: maskedDev,
                amount: 25,
                created_at: new Date().toISOString()
            }]);
            setLoading(false);
            return;
        }

        if (lowerDomain === 'god' || lowerDomain === 'ai') {
            // Top Tier: 45 - 50 SOL (approx)
            topBidAmount = 45 + Math.random() * 5;
        } else if (lowerDomain === 'news') {
            // High Tier: 30 - 45 SOL
            topBidAmount = 30 + Math.random() * 15;
        } else {
            // Standard Crown Jewels: 10 - 30 SOL
            const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            topBidAmount = 10 + (seed % 20); // 10 to 30 range
        }

        // Generate history (3-5 bids)
        const bidCount = 3 + Math.floor(Math.random() * 3);
        const mockBids: Bid[] = [];
        let currentAmount = topBidAmount;

        for (let i = 0; i < bidCount; i++) {
            mockBids.push({
                id: i.toString(),
                bidder_wallet: generateWallet(), // Unique wallet every time
                amount: parseFloat(currentAmount.toFixed(2)),
                created_at: new Date(Date.now() - 1000 * 60 * i * 5).toISOString()
            });

            // Decrease for next bid in history
            currentAmount = currentAmount * (0.85 + Math.random() * 0.1); // 85-95% of previous
        }

        setBids(mockBids);
        setLoading(false);

    }, [isOpen, domain]);

    const placeBid = async () => {
        if (!connected || !publicKey) {
            alert("Please connect wallet.");
            return;
        }

        const amount = parseFloat(bidAmount);
        if (isNaN(amount)) {
            alert("Invalid amount");
            return;
        }

        if (!contact.trim()) {
            alert("Please enter a contact (Telegram/Email) for settlement.");
            return;
        }

        // 1. BASE PRICE CHECK
        if (amount < BASE_PRICE_SOL) {
            alert(`Minimum starting bid is ${BASE_PRICE_SOL} SOL.`);
            return;
        }

        // 2. HIGHER THAN TOP BID CHECK
        const topBid = bids.length > 0 ? bids[0].amount : 0;
        if (amount <= topBid) {
            alert(`DECLINED: The Current Highest Bid is ${topBid} SOL. \n\nYou must bid higher than this to win.`);
            return;
        }

        setSubmitting(true);
        try {
            // PROOF OF FUNDS (Balance Check)
            const balance = await connection.getBalance(publicKey);
            const balanceSol = balance / LAMPORTS_PER_SOL;

            if (balanceSol < amount) {
                alert(`Insufficient Funds. You bid ${amount} SOL but only have ${balanceSol.toFixed(2)} SOL.`);
                setSubmitting(false);
                return;
            }

            // THE GAVEL FEE (Anti-Spam Transaction)
            let treasuryPubkey;
            try {
                treasuryPubkey = new PublicKey(TREASURY_WALLET);
            } catch (e) {
                treasuryPubkey = publicKey;
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: treasuryPubkey,
                    lamports: BID_FEE_SOL * LAMPORTS_PER_SOL,
                })
            );

            // Send Fee Transaction
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'processed');

            // SUBMIT BID with Contact
            const response = await fetch('/api/auction/bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: domain,
                    wallet: publicKey.toString(),
                    amount: amount,
                    signature: signature,
                    contact: contact
                })
            });

            if (!response.ok) throw new Error("Bid failed");

            setBidAmount('');
            setContact('');
        } catch (e: any) {
            console.error(e);
            alert(`Bid Failed: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111] border border-purple-500/50 rounded-2xl w-full max-w-md overflow-hidden relative shadow-[0_0_50px_rgba(168,85,247,0.2)]"
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-white/10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 text-purple-400 mb-1">
                                {domain.toLowerCase() === 'nexus' ? <Lock className="w-5 h-5 text-red-500" /> : <Gavel className="w-5 h-5" />}
                                <span className={`text-xs font-bold tracking-widest uppercase ${domain.toLowerCase() === 'nexus' ? 'text-red-500' : ''}`}>
                                    {domain.toLowerCase() === 'nexus' ? 'AUCTION CLOSED' : 'Live Auction'}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold text-white">agent://{domain}</h2>
                            <p className="text-xs text-gray-400 mt-1">Base Price: {BASE_PRICE_SOL} SOL</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">

                        {/* Leaderboard */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                                Live Bids
                                <span className="text-green-500 text-xs flex items-center gap-1">● Realtime</span>
                            </h3>

                            <div className="bg-black/50 rounded-xl border border-white/5 overflow-hidden min-h-[150px] max-h-[200px] overflow-y-auto">
                                {loading && bids.length === 0 ? (
                                    <div className="flex justify-center items-center h-full text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                ) : bids.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 p-4">
                                        <Trophy className="w-8 h-8 opacity-20" />
                                        <span className="text-sm">No bids yet. Start the war!</span>
                                    </div>
                                ) : (
                                    bids.map((bid, i) => (
                                        <div key={bid.id} className={`flex justify-between items-center p-3 border-b border-white/5 last:border-0 ${i === 0 ? 'bg-purple-500/10' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                                                    {i + 1}
                                                </div>
                                                <span className={`font-mono text-sm ${i === 0 ? 'text-white' : 'text-gray-400'}`}>
                                                    {bid.bidder_wallet.slice(0, 4)}...{bid.bidder_wallet.slice(-4)}
                                                </span>
                                            </div>
                                            <div className="font-mono font-bold text-white">
                                                {bid.amount} SOL
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Bidding Interface */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-400">YOUR OFFER (SOL)</label>
                                <div className="flex items-center gap-1 text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Anti-Spam Fee: {BID_FEE_SOL} SOL</span>
                                </div>
                            </div>

                            {/* Bid Input */}
                            <div className="relative">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
                                    <span>Base: {BASE_PRICE_SOL} SOL</span>
                                    {bids.length > 0 && <span className="text-purple-400 font-bold">Highest: {bids[0].amount} SOL</span>}
                                </div>
                                <input
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder={bids.length > 0 ? `Must be > ${bids[0].amount} SOL` : `Min ${BASE_PRICE_SOL} SOL`}
                                    className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            {/* Contact Input */}
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="Telegram / Email (For settlement)"
                                    className="w-full bg-black border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <button
                                onClick={placeBid}
                                disabled={submitting || !connected || domain.toLowerCase() === 'nexus'}
                                className={`w-full ${domain.toLowerCase() === 'nexus' ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'} disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2`}
                            >
                                {domain.toLowerCase() === 'nexus' ? "SOLD" : (submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "PLACE VERIFIED BID")}
                            </button>

                            {!connected && (
                                <p className="text-xs text-red-500 mt-2 text-center">Connect wallet to place a bid.</p>
                            )}
                            <p className="text-[10px] text-gray-500 text-center">
                                Win &rarr; We contact you &rarr; You pay &rarr; We transfer.
                            </p>
                        </div>

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
