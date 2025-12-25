'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

interface AgentOption {
    id: string;
    agent: string;
    price: number;
    trust_score: number;
    trust_tier?: string;
    airline_name?: string;
}

export default function BookPage() {
    const { publicKey, sendTransaction } = useWallet();
    const [searchParams, setSearchParams] = useState({ from: '', to: '', date: '' });
    const [results, setResults] = useState<AgentOption[]>([]);
    const [selectedOption, setSelectedOption] = useState<AgentOption | null>(null);
    const [bookingStatus, setBookingStatus] = useState<string>('');
    const [escrowId, setEscrowId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const tierBadge = (tier: string) => {
        switch (tier) {
            case 'master': return '🟡';
            case 'adept': return '🔵';
            default: return '⚪';
        }
    };

    const searchAgents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orchestrate/search?from=${searchParams.from}&to=${searchParams.to}`);
            const data = await res.json();
            setResults(data.results || []);
        } catch (err) {
            console.error('Search failed:', err);
        }
        setLoading(false);
    };

    const bookAgent = async (option: AgentOption) => {
        if (!publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setBookingStatus('Creating escrow...');
        setSelectedOption(option);

        try {
            const res = await fetch('/api/orchestrate/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent: option.agent,
                    buyer_wallet: publicKey.toBase58(),
                    amount: option.price,
                    params: { from: searchParams.from, to: searchParams.to, date: searchParams.date }
                })
            });

            const data = await res.json();
            if (!data.escrow_id) throw new Error(data.error);

            setEscrowId(data.escrow_id);
            setBookingStatus(`Escrow created! Fee: ${data.payment.fee_percentage}. Send ${data.payment.total.toFixed(4)} SOL...`);

            // Send SOL
            const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com');
            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(data.vault_address),
                    lamports: Math.floor(data.payment.total * LAMPORTS_PER_SOL)
                })
            );

            const signature = await sendTransaction(tx, connection);
            setBookingStatus(`Payment sent! TX: ${signature.slice(0, 16)}... Confirming...`);

            await connection.confirmTransaction(signature);

            // Confirm payment
            await fetch('/api/orchestrate/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ escrow_id: data.escrow_id })
            });

            setBookingStatus(`✅ Payment confirmed! Waiting for agent delivery...`);

            // Poll for completion
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await fetch(`/api/orchestrate/status?escrow_id=${data.escrow_id}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'released') {
                    setBookingStatus(`🎉 Booking Complete! ${statusData.transaction?.proof_of_delivery?.pnr || 'ID: ' + data.escrow_id.slice(0, 8)}`);
                    break;
                }
            }

        } catch (err: any) {
            setBookingStatus(`❌ Error: ${err.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    🌐 ANS Book
                </h1>

                {/* Wallet */}
                <div className="mb-8">
                    <WalletMultiButton />
                </div>

                {/* Search Form */}
                <div className="bg-zinc-900 rounded-xl p-6 mb-8 border border-zinc-800">
                    <h2 className="text-xl mb-4">Search Services</h2>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input
                            placeholder="From"
                            value={searchParams.from}
                            onChange={e => setSearchParams({ ...searchParams, from: e.target.value })}
                            className="bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700"
                        />
                        <input
                            placeholder="To"
                            value={searchParams.to}
                            onChange={e => setSearchParams({ ...searchParams, to: e.target.value })}
                            className="bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700"
                        />
                        <input
                            type="date"
                            value={searchParams.date}
                            onChange={e => setSearchParams({ ...searchParams, date: e.target.value })}
                            className="bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700"
                        />
                    </div>
                    <button
                        onClick={searchAgents}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 py-3 rounded-lg font-bold hover:opacity-90 transition"
                    >
                        {loading ? '⏳ Searching...' : '🔍 Search Agents'}
                    </button>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-4 mb-8">
                        <h2 className="text-xl">Available Options</h2>
                        {results.map(option => (
                            <div
                                key={option.id}
                                className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-purple-500 transition cursor-pointer"
                                onClick={() => bookAgent(option)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-2xl mr-2">{tierBadge(option.trust_tier || 'initiate')}</span>
                                        <span className="font-bold">{option.agent}</span>
                                        <span className="text-zinc-500 ml-2">({option.airline_name})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-cyan-400">{option.price.toFixed(4)} SOL</div>
                                        <div className="text-sm text-zinc-500">Trust: {(option.trust_score * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Booking Status */}
                {bookingStatus && (
                    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                        <h2 className="text-xl mb-2">Booking Status</h2>
                        <p className="text-lg">{bookingStatus}</p>
                        {escrowId && (
                            <p className="text-sm text-zinc-500 mt-2">Escrow ID: {escrowId}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
