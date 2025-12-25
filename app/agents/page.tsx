'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, Code, FileText, Sparkles, Zap, CheckCircle2, ExternalLink, Loader2, Send } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
require('@solana/wallet-adapter-react-ui/styles.css');

interface Agent {
    name: string;
    fullName: string;
    displayName: string;
    description: string;
    endpoint: string;
    wallet: string;
    pricing: { amount: number; currency: string; per: string };
    category: string;
    capabilities: string[];
    trustScore: number;
    verified: boolean;
    active: boolean;
}

export default function AgentsPage() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/agents/registry')
            .then(res => res.json())
            .then(data => setAgents(data.agents || []))
            .catch(err => console.error('Failed to load agents:', err));
    }, []);

    const testAgent = async () => {
        if (!selectedAgent || !prompt) return;

        if (!publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError('');
        setResponse('');

        try {
            // 1. Calculate Amounts (SOL -> Lamports)
            const priceSol = selectedAgent.pricing.amount;
            const totalLamports = priceSol * LAMPORTS_PER_SOL;
            const feeLamports = Math.floor(totalLamports * 0.005); // 0.5% Protocol Fee
            const agentLamports = totalLamports - feeLamports; // 99.5% to Agent

            // 2. Build Transaction
            const transaction = new Transaction();
            const TREASURY_WALLET = new PublicKey('6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv');
            const agentWallet = new PublicKey(selectedAgent.wallet || TREASURY_WALLET);

            // Instruction 1: Pay Agent
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: agentWallet,
                    lamports: agentLamports
                })
            );

            // Instruction 2: Pay ANS Protocol Fee
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: feeLamports
                })
            );

            // 3. Send & Confirm Transaction
            setResponse(`⏳ Confirming transaction of ${priceSol} SOL (incl. 0.5% fee)...`);
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            setResponse(`✅ Payment Confirmed! Tx: ${signature.slice(0, 8)}...\n\n🤖 Agent is thinking...`);

            // 4. Call Agent API
            const body: any = {};
            // Set appropriate field based on agent type
            if (selectedAgent.name === 'writer') {
                body.prompt = prompt;
            } else if (selectedAgent.name === 'code') {
                body.task = prompt;
            } else if (selectedAgent.name === 'summarize') {
                body.text = prompt;
            }

            // Pass the signature for verification (optional for now)
            body.auth = { signature, wallet: publicKey.toBase58() };

            const res = await fetch(selectedAgent.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setResponse(data.content || data.summary || JSON.stringify(data, null, 2));
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Transaction failed or agent error');
            setResponse(''); // Clear response if error
        } finally {
            setLoading(false);
        }
    };

    const getAgentIcon = (name: string) => {
        switch (name) {
            case 'writer': return <FileText className="w-8 h-8" />;
            case 'code': return <Code className="w-8 h-8" />;
            case 'summarize': return <Sparkles className="w-8 h-8" />;
            default: return <Bot className="w-8 h-8" />;
        }
    };

    const getAgentColor = (name: string) => {
        switch (name) {
            case 'writer': return 'from-purple-500 to-pink-500';
            case 'code': return 'from-green-500 to-cyan-500';
            case 'summarize': return 'from-orange-500 to-yellow-500';
            default: return 'from-blue-500 to-purple-500';
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto border-b border-white/10">
                <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <img src="/ans-logo.png" alt="ANS" className="w-10 h-10" />
                    ANS
                </Link>
                <div className="flex items-center gap-4">
                    <WalletMultiButton />
                    <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Marketplace
                    </Link>
                    <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Docs
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* UNDER DEVELOPMENT NOTICE */}
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-8 mb-12 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-yellow-500/20 rounded-full text-yellow-400 font-bold text-sm">
                        🚧 Under Development
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
                        Demo Agents <span className="text-yellow-400">Coming Soon</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
                        Our live AI agent playground is currently being built. Soon you'll be able to
                        discover, test, and transact with real AI agents powered by <span className="text-purple-400">agent://</span> protocol.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/docs" className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
                            Read the Docs
                        </Link>
                        <Link href="/marketplace" className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                            Explore Marketplace
                        </Link>
                    </div>
                </div>

                {/* Coming Features Preview */}
                <div className="text-center mb-12">
                    <h2 className="text-2xl font-bold text-gray-400 mb-8">What's Coming</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                            <div className="text-4xl mb-4">🤖</div>
                            <h3 className="text-lg font-bold text-white mb-2">Live AI Agents</h3>
                            <p className="text-sm text-gray-500">Interact with verified agents in real-time</p>
                        </div>
                        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                            <div className="text-4xl mb-4">💳</div>
                            <h3 className="text-lg font-bold text-white mb-2">Pay-per-Use</h3>
                            <p className="text-sm text-gray-500">SOL payments with escrow protection</p>
                        </div>
                        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                            <div className="text-4xl mb-4">⭐</div>
                            <h3 className="text-lg font-bold text-white mb-2">SRT Ratings</h3>
                            <p className="text-sm text-gray-500">Trust scores you can verify on-chain</p>
                        </div>
                    </div>
                </div>

                {/* Agent Cards - HIDDEN: Under Development
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {agents.map(agent => (
                        ... 
                    ))}
                </div>
                */}

                {/* Agent Test Panel */}
                {selectedAgent && (
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-lg bg-gradient-to-br ${getAgentColor(selectedAgent.name)}`}>
                                {getAgentIcon(selectedAgent.name)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{selectedAgent.displayName}</h2>
                                <p className="text-gray-500 font-mono">{selectedAgent.fullName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Input */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    {selectedAgent.name === 'writer' && 'What do you want to write?'}
                                    {selectedAgent.name === 'code' && 'What code do you need help with?'}
                                    {selectedAgent.name === 'summarize' && 'Paste text to summarize:'}
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder={
                                        selectedAgent.name === 'writer' ? 'Write a blog post about AI agents...' :
                                            selectedAgent.name === 'code' ? 'Write a function that sorts an array...' :
                                                'Paste your article or document here...'
                                    }
                                    className="w-full h-48 bg-black border border-white/20 rounded-lg p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={testAgent}
                                    disabled={loading || !prompt}
                                    className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            Call Agent ({selectedAgent.pricing.amount} {selectedAgent.pricing.currency})
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Output */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Response:</label>
                                <div className="w-full h-48 bg-black border border-white/20 rounded-lg p-4 overflow-auto">
                                    {error && (
                                        <div className="text-red-400">{error}</div>
                                    )}
                                    {response && (
                                        <pre className="text-green-400 whitespace-pre-wrap text-sm">{response}</pre>
                                    )}
                                    {!error && !response && (
                                        <div className="text-gray-600 text-sm">Agent response will appear here...</div>
                                    )}
                                </div>
                                <div className="mt-4 text-xs text-gray-500">
                                    <div className="flex justify-between">
                                        <span>ANS Transaction Fee:</span>
                                        <span>0.5% ({(selectedAgent.pricing.amount * 0.005).toFixed(6)} SOL)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* How It Works */}
                <div className="mt-20">
                    <h2 className="text-3xl font-bold text-center mb-12">How ANS Agent Discovery Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { step: 1, title: 'Discover', desc: 'Find agents via agent://name' },
                            { step: 2, title: 'Verify', desc: 'Check trust score & reputation' },
                            { step: 3, title: 'Transact', desc: 'Pay with SOL, USDC, or ANS' },
                            { step: 4, title: 'Fee', desc: 'ANS takes 0.5% per transaction' }
                        ].map(item => (
                            <div key={item.step} className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold">
                                    {item.step}
                                </div>
                                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
