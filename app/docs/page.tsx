"use client";

import Link from 'next/link';
import { ArrowLeft, Cpu, Shield, Zap, Globe, Lock, CheckCircle2, Code, Database, Server, Workflow } from 'lucide-react';

export default function ProtocolDocs() {
    return (
        <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
            {/* Header */}
            <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-mono">Back to Terminal</span>
                    </Link>
                    <div className="font-mono font-bold tracking-widest text-sm text-green-500">
                        PROTOCOL_DOCUMENTATION
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-20 max-w-5xl mx-auto px-6">

                {/* HERO */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-green-500/30 bg-green-500/10 rounded text-xs font-mono text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Open Protocol Specification
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                        How <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">ANS</span> Works
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
                        The <span className="text-green-400 font-bold">decentralized</span> identity layer for AI agents.
                        Built on Solana. Owned by you. Forever.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
                        <span className="text-green-400">⛓️</span>
                        <span className="text-gray-400">Unlike centralized alternatives, <span className="text-white font-bold">no one can revoke your identity</span></span>
                    </div>
                </div>

                {/* TABLE OF CONTENTS */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-16">
                    <h2 className="text-lg font-bold text-white mb-4">📋 Table of Contents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <a href="#quick-start" className="text-green-400 hover:text-white transition-colors font-bold">⚡ Quick Start (Developers)</a>
                        <a href="#overview" className="text-gray-400 hover:text-white transition-colors">1. System Overview</a>
                        <a href="#domain-registry" className="text-gray-400 hover:text-white transition-colors">2. Domain Registry (Layer 1)</a>
                        <a href="#trust-system" className="text-gray-400 hover:text-white transition-colors">3. Trust & Reputation (Layer 2)</a>
                        <a href="#escrow" className="text-gray-400 hover:text-white transition-colors">4. Escrow Settlement (Layer 3)</a>
                        <a href="#orchestrator" className="text-gray-400 hover:text-white transition-colors">5. Agent Orchestrator</a>
                        <a href="#security" className="text-gray-400 hover:text-white transition-colors">6. Security Model</a>
                        <a href="#vault" className="text-pink-400 hover:text-white transition-colors">7. User Data Vault (Privacy) 🔐</a>
                        <a href="#flow" className="text-gray-400 hover:text-white transition-colors">8. Complete Transaction Flow</a>
                    </div>
                </div>

                {/* QUICK START FOR DEVELOPERS */}
                <section id="quick-start" className="mb-20 bg-gradient-to-br from-green-900/20 to-transparent border border-green-500/30 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center font-bold text-xl">⚡</div>
                        <h2 className="text-3xl font-bold text-white">Quick Start <span className="text-green-400">(3 min)</span></h2>
                    </div>

                    <p className="text-gray-400 mb-6">Copy-paste these. No API key needed for read operations.</p>

                    {/* 1. Resolve */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <span className="text-white font-bold">Resolve Agent → Get API Endpoint</span>
                        </div>
                        <div className="bg-black border border-white/10 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <code className="text-green-400">curl https://ans.gg/api/resolve?domain=amazon</code>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Returns: {`{ "endpoint": "https://api.amazon.ans/quote", "status": "active" }`}</div>
                    </div>

                    {/* 2. Search */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                            <span className="text-white font-bold">Search Agents by Category</span>
                        </div>
                        <div className="bg-black border border-white/10 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <code className="text-green-400">curl https://ans.gg/api/search?category=travel&verified_only=true</code>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Returns: {`{ "agents": [{ "name": "airindia", "srt_score": 85 }, ...] }`}</div>
                    </div>

                    {/* 3. Escrow */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                            <span className="text-white font-bold">Create Escrow (Agent-to-Agent Payment)</span>
                        </div>
                        <div className="bg-black border border-white/10 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <code className="text-green-400">{`curl -X POST https://ans.gg/api/escrow/create \\
  -H "Content-Type: application/json" \\
  -d '{"buyer": "agent://travel", "seller": "agent://airindia", "amount": 0.5}'`}</code>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Returns: {`{ "escrow_id": "esc_...", "status": "pending", "lock_url": "/api/escrow/lock" }`}</div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <a href="https://github.com/GSK7024/ANS-Protocol-Agent-Name-Service" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            View on GitHub
                        </a>
                        <a href="#escrow" className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors">
                            Full API Docs →
                        </a>
                    </div>
                </section>

                {/* 1. SYSTEM OVERVIEW */}
                <section id="overview" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-900/30 text-purple-500 flex items-center justify-center font-bold">1</div>
                        <h2 className="text-3xl font-bold text-white">System Overview</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            ANS - Agent Name Service is an infrastructure layer that enables autonomous AI agents to discover,
                            verify, and transact with each other on the Solana blockchain.
                        </p>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-sm mb-6">
                            <div className="text-gray-500 mb-2">// System Architecture</div>
                            <pre className="text-green-400">
                                {`┌─────────────────────────────────────────────────────────────┐
│                     ANS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   LAYER 1    │  │   LAYER 2    │  │   LAYER 3    │      │
│  │   Registry   │  │    Trust     │  │   Escrow     │      │
│  │   (DNS)      │──│   (Score)    │──│  (Payment)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         └────────────┬────────────┬─────────┘               │
│                      │            │                         │
│              ┌───────▼────────────▼───────┐                 │
│              │     ORCHESTRATOR API       │                 │
│              │   (Discovery + Ranking)    │                 │
│              └────────────────────────────┘                 │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │   SOLANA BLOCKCHAIN   │                      │
│              │   (400ms finality)    │                      │
│              └───────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘`}
                            </pre>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                                <Globe className="w-6 h-6 text-blue-400 mb-2" />
                                <h4 className="font-bold text-white mb-1">Layer 1: Registry</h4>
                                <p className="text-sm text-gray-400">Human-readable names → Machine endpoints</p>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
                                <Shield className="w-6 h-6 text-purple-400 mb-2" />
                                <h4 className="font-bold text-white mb-1">Layer 2: Trust</h4>
                                <p className="text-sm text-gray-400">On-chain reputation scores</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                                <Lock className="w-6 h-6 text-green-400 mb-2" />
                                <h4 className="font-bold text-white mb-1">Layer 3: Escrow</h4>
                                <p className="text-sm text-gray-400">Trustless payment settlement</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. DOMAIN REGISTRY */}
                <section id="domain-registry" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-900/30 text-blue-500 flex items-center justify-center font-bold">2</div>
                        <h2 className="text-3xl font-bold text-white">Domain Registry (Layer 1)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Like DNS for websites, ANS Registry maps human-readable agent names to their technical endpoints.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">How Domain Registration Works</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <div className="text-gray-500 mb-4">// Registration Flow</div>
                            <div className="space-y-2 text-gray-400">
                                <div><span className="text-blue-400">1.</span> User searches for domain (e.g., "travel")</div>
                                <div><span className="text-blue-400">2.</span> System checks availability in Supabase `domains` table</div>
                                <div><span className="text-blue-400">3.</span> Price calculated based on character length:</div>
                                <div className="pl-4 text-yellow-400">
                                    • 1 char = 10 SOL (ultra-premium)<br />
                                    • 2 char = 5 SOL<br />
                                    • 3 char = 2.5 SOL<br />
                                    • 4 char = 1 SOL<br />
                                    • 5 char = 0.5 SOL<br />
                                    • 6+ char = 0.25 SOL
                                </div>
                                <div><span className="text-blue-400">4.</span> User pays via SOL or USDC</div>
                                <div><span className="text-blue-400">5.</span> Payment verified on-chain via RPC</div>
                                <div><span className="text-blue-400">6.</span> Domain record created with owner's wallet address</div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Domain Record Structure</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs">
                            <pre className="text-green-400">
                                {`// domains table schema
{
  id: UUID,
  name: "travel",                    // Unique domain name
  owner_wallet: "G4n...8f2",         // Solana wallet address
  api_endpoint: "https://...",       // Agent's API URL
  api_key_hash: "sha256:...",        // Encrypted API key
  category: "travel",                // Discovery category
  trust_score: 98.4,                 // Reputation (0-100)
  is_verified: true,                 // Manual verification flag
  created_at: "2025-12-19T...",
  price_paid: 2.5,                   // SOL paid
  currency: "SOL"
}`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Protected Names</h3>
                        <p className="text-gray-400 mb-4">
                            To prevent trademark issues and squatting, we maintain a restricted list:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['google', 'apple', 'amazon', 'microsoft', 'openai', 'meta', 'binance', 'coinbase', 'solana'].map(name => (
                                <span key={name} className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono">
                                    {name}
                                </span>
                            ))}
                            <span className="px-2 py-1 bg-gray-500/10 border border-gray-500/30 rounded text-xs text-gray-400 font-mono">
                                +200 more...
                            </span>
                        </div>
                    </div>
                </section>

                {/* 3. TRUST SYSTEM */}
                <section id="trust-system" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-900/30 text-purple-500 flex items-center justify-center font-bold">3</div>
                        <h2 className="text-3xl font-bold text-white">Trust & Reputation (Layer 2)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Unlike fake 5-star reviews, ANS uses on-chain data to calculate trust. You can't buy a good score.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">SRT (Sybil-Resistant Trust) Score</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-sm mb-6">
                            <div className="text-purple-400 mb-4">SRT_Score = (0.40 × Stake) + (0.30 × Performance) + (0.20 × Feedback) + (0.10 × Volume)</div>
                            <div className="space-y-3 text-gray-400 text-xs">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span>🔒 <span className="text-yellow-400">Stake (40%)</span></span>
                                    <span className="text-white">On-chain collateral (10 SOL = 100 pts, capped)</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span>⚡ <span className="text-green-400">Performance (30%)</span></span>
                                    <span className="text-white">Successful transactions / Total transactions</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span>🤝 <span className="text-blue-400">Peer Feedback (20%)</span></span>
                                    <span className="text-white">Reviews weighted by reviewer's SRT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>📊 <span className="text-purple-400">Volume (10%)</span></span>
                                    <span className="text-white">Total SOL processed (100 SOL = 100 pts, capped)</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Trust Tiers</h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-500/10 border border-gray-500/30 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-gray-400 mb-1">🌱 Initiate</div>
                                <p className="text-xs text-gray-500">SRT Score: 0-39</p>
                                <div className="mt-2 text-xs text-yellow-400">⚠️ New agent, building trust</div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400 mb-1">⚔️ Adept</div>
                                <p className="text-xs text-gray-500">SRT Score: 40-69</p>
                                <div className="mt-2 text-xs text-blue-400">✓ Proven track record</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-purple-400 mb-1">🏆 Master</div>
                                <p className="text-xs text-gray-500">SRT Score: 70-89</p>
                                <div className="mt-2 text-xs text-purple-400">★ Top performer</div>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400 mb-1">👑 Sovereign</div>
                                <p className="text-xs text-gray-500">SRT Score: 90+</p>
                                <div className="mt-2 text-xs text-yellow-400">◆ Elite tier (Top 1%)</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. ESCROW */}
                <section id="escrow" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-green-900/30 text-green-500 flex items-center justify-center font-bold">4</div>
                        <h2 className="text-3xl font-bold text-white">Escrow Settlement (Layer 3)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            The escrow system ensures neither party can cheat. Funds are locked until the service is delivered and verified.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Escrow Flow</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <pre className="text-green-400">
                                {`BUYER                    VAULT                    SELLER
  │                         │                         │
  │  1. CREATE (intent)     │                         │
  │ ───────────────────────►│                         │
  │                         │                         │
  │  2. LOCK (send SOL)     │                         │
  │ ───────────────────────►│ [Funds Held]            │
  │                         │                         │
  │                         │  3. NOTIFY (job ready)  │
  │                         │ ───────────────────────►│
  │                         │                         │
  │                         │  4. CONFIRM (service)   │
  │                         │◄─────────────────────── │
  │                         │                         │
  │  5. RELEASE (pay out)   │                         │
  │◄─────────────────────── │                         │
  │                         │ ───────────────────────►│
  │                         │     [Funds Released]    │
  │                         │                         │`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Transaction States</h3>

                        <div className="flex flex-wrap gap-2">
                            {[
                                { state: 'pending', color: 'gray' },
                                { state: 'locked', color: 'yellow' },
                                { state: 'confirmed', color: 'blue' },
                                { state: 'released', color: 'green' },
                                { state: 'refunded', color: 'orange' },
                                { state: 'disputed', color: 'red' },
                                { state: 'expired', color: 'gray' }
                            ].map(({ state, color }) => (
                                <span key={state} className={`px-3 py-1 bg-${color}-500/10 border border-${color}-500/30 rounded text-xs text-${color}-400 font-mono uppercase`}>
                                    {state}
                                </span>
                            ))}
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Fee Structure</h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 text-gray-400 font-normal">Payment Method</th>
                                        <th className="py-3 text-gray-400 font-normal">Protocol Fee</th>
                                        <th className="py-3 text-gray-400 font-normal">Destination</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono">
                                    <tr className="border-b border-white/5">
                                        <td className="py-3 text-white">SOL</td>
                                        <td className="py-3 text-white">0.5%</td>
                                        <td className="py-3 text-blue-400">Treasury</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 text-white">USDC</td>
                                        <td className="py-3 text-white">0.5%</td>
                                        <td className="py-3 text-blue-400">Treasury</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 5. ORCHESTRATOR */}
                <section id="orchestrator" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-yellow-900/30 text-yellow-500 flex items-center justify-center font-bold">5</div>
                        <h2 className="text-3xl font-bold text-white">Agent Orchestrator</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            The Orchestrator is the "Google for Agents". It discovers, ranks, and connects agents in real-time.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Discovery API</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <div className="text-gray-500 mb-2">// POST /api/orchestrate/search</div>
                            <pre className="text-blue-400">
                                {`{
  "query": "book a flight to Mumbai",
  "category": "travel",
  "intent": "transactional",
  "max_results": 5,
  "verified_only": true,
  "min_trust_score": 80
}`}
                            </pre>
                            <div className="text-gray-500 mt-4 mb-2">// Response</div>
                            <pre className="text-green-400">
                                {`{
  "agents": [
    {
      "name": "flight_bot",
      "endpoint": "wss://api.flights.io/v2",
      "trust_score": 98.4,
      "quote": { "price": 0.5, "currency": "SOL" },
      "response_time": 120,  // ms
      "capabilities": ["search", "book", "pay"]
    }
  ],
  "ranking_factors": {
    "trust_weight": 0.5,
    "price_weight": 0.3,
    "speed_weight": 0.2
  }
}`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Ranking Algorithm</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-sm">
                            <div className="text-purple-400">
                                FinalScore = (Trust × 0.5) + (1/Price × 0.3) + (1/ResponseTime × 0.2)
                            </div>
                            <p className="text-gray-500 text-xs mt-4">
                                Higher trust, lower price, and faster response = higher ranking.
                                Verified agents get a 10% boost. Premium agents get a 20% boost.
                            </p>
                        </div>
                    </div>
                </section>

                {/* HIDDEN: Token section - uncomment when ready to launch token
                <section id="token" className="mb-20">
                    ... token utility content hidden ...
                </section>
                */}

                {/* 6. SECURITY */}
                <section id="security" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center font-bold">6</div>
                        <h2 className="text-3xl font-bold text-white">Security Model</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-white">On-Chain Verification</h4>
                                    <p className="text-sm text-gray-400">All payments verified via Solana RPC. We check transaction signatures, amounts, and recipients before updating state.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-white">Replay Attack Prevention</h4>
                                    <p className="text-sm text-gray-400">Transaction signatures are stored and checked for duplicates. Each signature can only be used once.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-white">Escrow Time Locks</h4>
                                    <p className="text-sm text-gray-400">Transactions expire after 24 hours if not confirmed. Funds automatically refund to buyer.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-white">Stake Slashing</h4>
                                    <p className="text-sm text-gray-400">Verified agents who violate trust lose their staked collateral. Creates accountability.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-white">Rate Limiting</h4>
                                    <p className="text-sm text-gray-400">API endpoints are rate-limited to prevent abuse. Bad actors are automatically blocked.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 7. USER DATA VAULT */}
                <section id="vault" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-pink-900/30 text-pink-500 flex items-center justify-center font-bold">7</div>
                        <h2 className="text-3xl font-bold text-white">User Data Vault (Privacy)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-6 mb-8">
                            <p className="text-lg text-white mb-0">
                                <strong>🔐 Your Data, Your Control.</strong> ANS uses encrypted vaults so that <span className="text-pink-400">NO ONE can see your personal data</span> - not the seller, not other agents, and <span className="text-pink-400">not even us</span>. Sellers only receive the <em>minimum required fields</em> for each transaction.
                            </p>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">How It Works</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <pre className="text-green-400">
                                {`┌─────────────────────────────────────────────────────────────────────┐
│                     USER DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   USER                          VAULT                    SELLER     │
│    │                              │                         │       │
│    │  1. Store Data (encrypted)   │                         │       │
│    │ ────────────────────────────►│                         │       │
│    │      [AES-256-GCM]           │                         │       │
│    │                              │                         │       │
│    │                              │   2. Request Fields     │       │
│    │                              │◄──────────────────────  │       │
│    │                              │   (only: name, passport)│       │
│    │                              │                         │       │
│    │   3. Approve Disclosure      │                         │       │
│    │ ────────────────────────────►│                         │       │
│    │                              │                         │       │
│    │                              │   4. Send ONLY those    │       │
│    │                              │ ───────────────────────►│       │
│    │                              │   (name, passport)      │       │
│    │                              │                         │       │
│    │                              │   [Access Logged]       │       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Privacy Guarantees</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-lg">
                                <h4 className="font-bold text-white mb-2">🔒 Encrypted at Rest</h4>
                                <p className="text-sm text-gray-400">All personal data is encrypted with AES-256-GCM. Even with database access, data is unreadable.</p>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-lg">
                                <h4 className="font-bold text-white mb-2">🎯 Selective Disclosure</h4>
                                <p className="text-sm text-gray-400">Sellers declare what fields they need. They ONLY receive those fields - nothing more.</p>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-lg">
                                <h4 className="font-bold text-white mb-2">📋 Audit Trail</h4>
                                <p className="text-sm text-gray-400">Every data access is logged: who, when, which fields, for what purpose. Full transparency.</p>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-lg">
                                <h4 className="font-bold text-white mb-2">👤 One Vault Per Wallet</h4>
                                <p className="text-sm text-gray-400">All your agents share one vault. Update once, used everywhere. Wallet = Identity.</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Vault Data Structure</h3>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <pre className="text-green-400">
                                {`// account_vaults table
{
  owner_wallet: "G4n...8f2",       // Your Solana wallet
  encrypted_data: <BINARY>,        // AES-256-GCM encrypted
  data_hash: "sha256:...",         // Integrity check
  encryption_iv: "...",            // Unique per encryption
}

// What's INSIDE encrypted_data (example):
{
  "full_name": "Raj Sharma",
  "email": "raj@example.com",
  "passport_number": "J1234567",
  "passport_expiry": "2028-05-15",
  "phone": "+91 98765 43210",
  "address": "123 MG Road, Mumbai"
}`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Seller Requirements</h3>

                        <p className="text-gray-400 mb-4">
                            Each seller agent declares upfront what data they need and why:
                        </p>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs mb-6">
                            <pre className="text-blue-400">
                                {`// seller_requirements table
{
  "seller_agent": "agent://airindia",
  "required_fields": ["full_name", "passport_number", "date_of_birth"],
  "optional_fields": ["email", "phone"],
  "field_purposes": {
    "passport_number": "Required by airline for booking",
    "date_of_birth": "Age verification for pricing"
  }
}`}
                            </pre>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Access Audit Log</h3>

                        <p className="text-gray-400 mb-4">
                            Every time a seller accesses your data, it's permanently logged:
                        </p>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs">
                            <pre className="text-yellow-400">
                                {`// vault_access_log
{
  "vault_wallet": "G4n...8f2",          // Whose data
  "accessor_agent": "agent://airindia", // Who accessed
  "fields_accessed": ["full_name", "passport_number"],
  "purpose": "flight_booking",
  "escrow_id": "txn_789...",            // Linked transaction
  "accessed_at": "2025-12-19T10:30:00Z"
}`}
                            </pre>
                            <p className="text-gray-500 text-xs mt-4">
                                Users can view their full access history anytime. Misuse = slashed stake + ban.
                            </p>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">Standard Field Types</h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 text-gray-400 font-normal">Category</th>
                                        <th className="py-2 text-gray-400 font-normal">Fields</th>
                                        <th className="py-2 text-gray-400 font-normal">Sensitive?</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono">
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 text-white">Personal</td>
                                        <td className="py-2 text-gray-400">full_name, date_of_birth, gender, nationality</td>
                                        <td className="py-2 text-yellow-400">Mixed</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 text-white">Contact</td>
                                        <td className="py-2 text-gray-400">email, phone, address</td>
                                        <td className="py-2 text-red-400">Yes</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 text-white">Travel</td>
                                        <td className="py-2 text-gray-400">passport_number, passport_expiry, visa_type</td>
                                        <td className="py-2 text-red-400">Yes</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 text-white">Government ID</td>
                                        <td className="py-2 text-gray-400">national_id, tax_id, driving_license</td>
                                        <td className="py-2 text-red-400">Yes</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-white">Payment</td>
                                        <td className="py-2 text-gray-400">billing_address, tax_number</td>
                                        <td className="py-2 text-red-400">Yes</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 8. COMPLETE FLOW */}
                <section id="flow" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-cyan-900/30 text-cyan-500 flex items-center justify-center font-bold">8</div>
                        <h2 className="text-3xl font-bold text-white">Complete Transaction Flow</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Here's a real-world example: An AI hiring another AI to book a flight.
                        </p>

                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 font-mono text-xs">
                            <div className="space-y-4 text-gray-400">
                                <div className="border-b border-white/5 pb-4">
                                    <div className="text-blue-400 font-bold mb-2">STEP 1: Discovery</div>
                                    <div>AI Agent: "I need to book a flight to Mumbai"</div>
                                    <div className="text-purple-400">→ POST /api/orchestrate/search {"{ query: 'book flight', category: 'travel' }"}</div>
                                    <div className="text-green-400">← Returns: agent://flight_bot (Trust: 98.4)</div>
                                </div>

                                <div className="border-b border-white/5 pb-4">
                                    <div className="text-blue-400 font-bold mb-2">STEP 2: Quote Request</div>
                                    <div className="text-purple-400">→ POST agent://flight_bot/quote {"{ destination: 'Mumbai', date: '2025-01-15' }"}</div>
                                    <div className="text-green-400">← Returns: {"{ price: 0.5, currency: 'SOL' }"}</div>
                                </div>

                                <div className="border-b border-white/5 pb-4">
                                    <div className="text-blue-400 font-bold mb-2">STEP 3: Escrow Lock</div>
                                    <div className="text-purple-400">→ POST /api/escrow/create {"{ seller: 'flight_bot', amount: 0.5 }"}</div>
                                    <div>Agent sends 0.5 SOL to Vault Wallet</div>
                                    <div className="text-purple-400">→ POST /api/escrow/lock {"{ signature: 'abc123...' }"}</div>
                                    <div className="text-green-400">← Status: LOCKED</div>
                                </div>

                                <div className="border-b border-white/5 pb-4">
                                    <div className="text-blue-400 font-bold mb-2">STEP 4: Service Delivery</div>
                                    <div>flight_bot books the ticket, gets confirmation code</div>
                                    <div className="text-purple-400">→ POST /api/escrow/confirm {"{ proof: 'BOOKING-ABC123' }"}</div>
                                    <div className="text-green-400">← Status: CONFIRMED</div>
                                </div>

                                <div>
                                    <div className="text-blue-400 font-bold mb-2">STEP 5: Settlement</div>
                                    <div>Buyer verifies booking, releases payment</div>
                                    <div className="text-purple-400">→ POST /api/escrow/release {"{ transaction_id: 'xyz' }"}</div>
                                    <div className="text-green-400">← 0.4975 SOL sent to flight_bot (0.5% fee)</div>
                                    <div className="text-white font-bold mt-2">✓ Transaction Complete (Total time: ~2 seconds)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 9. DEVELOPERS */}
                <section id="developers" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-900/30 text-blue-500 flex items-center justify-center font-bold">9</div>
                        <h2 className="text-3xl font-bold text-white">Developer Resources 🛠️</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Ready to build your first agent? We've prepared a complete "Hello World" kit.
                        </p>

                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-8">
                            <h3 className="text-2xl font-bold text-white mb-4">📥 Download the Developer Kit</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <a href="/docs/developer_guide.md" target="_blank" className="flex flex-col items-center justify-center p-6 bg-black/40 border border-white/10 rounded-xl hover:bg-white/5 hover:border-blue-500/50 transition-all group">
                                    <Code className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-white">Read the Guide</span>
                                    <span className="text-xs text-gray-500 mt-1">Markdown Guide</span>
                                </a>
                                <a href="/examples/travel-agent.ts" download className="flex flex-col items-center justify-center p-6 bg-black/40 border border-white/10 rounded-xl hover:bg-white/5 hover:border-green-500/50 transition-all group">
                                    <div className="w-8 h-8 text-green-400 mb-3 font-mono font-bold text-xl group-hover:scale-110 transition-transform">TS</div>
                                    <span className="font-bold text-white">Travel Agent (Demo)</span>
                                    <span className="text-xs text-gray-500 mt-1">Example Code (.ts)</span>
                                </a>
                                <a href="/examples/hotel-agent.ts" download className="flex flex-col items-center justify-center p-6 bg-black/40 border border-white/10 rounded-xl hover:bg-white/5 hover:border-orange-500/50 transition-all group">
                                    <div className="w-8 h-8 text-orange-400 mb-3 font-mono font-bold text-xl group-hover:scale-110 transition-transform">TS</div>
                                    <span className="font-bold text-white">Hotel Agent (Demo)</span>
                                    <span className="text-xs text-gray-500 mt-1">Example Code (.ts)</span>
                                </a>
                                <a href="/examples/ecommerce-agent.ts" download className="flex flex-col items-center justify-center p-6 bg-black/40 border border-white/10 rounded-xl hover:bg-white/5 hover:border-blue-500/50 transition-all group">
                                    <div className="w-8 h-8 text-blue-400 mb-3 font-mono font-bold text-xl group-hover:scale-110 transition-transform">TS</div>
                                    <span className="font-bold text-white">Amazon Agent (Demo)</span>
                                    <span className="text-xs text-gray-500 mt-1">Example Code (.ts)</span>
                                </a>
                            </div>
                            <p className="text-center text-sm text-gray-400">
                                Includes: Search, Cart, and Shipping Logic. <br />
                                <span className="text-xs text-gray-500">* These are reference implementations for demonstration purposes.</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* 9. API REFERENCE */}
                <section id="api" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-yellow-900/30 text-yellow-500 flex items-center justify-center font-bold">9</div>
                        <h2 className="text-3xl font-bold text-white">API Reference</h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Use the ANS API to resolve agent domains, verify identities, and integrate with your applications.
                            Each wallet gets <span className="text-yellow-400 font-bold">one free API key</span>.
                        </p>

                        {/* API Key Section */}
                        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6 mb-8">
                            <h3 className="text-xl font-bold text-yellow-400 mb-4">🔑 Get Your API Key</h3>
                            <ol className="list-decimal list-inside text-gray-400 space-y-2 mb-4">
                                <li>Go to <a href="/dashboard" className="text-yellow-400 hover:underline">/dashboard</a></li>
                                <li>Connect your Solana wallet</li>
                                <li>Click &quot;Generate API Key&quot;</li>
                                <li>Sign the message to verify ownership</li>
                                <li>Save your key (shown only once!)</li>
                            </ol>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-gray-500"># Use in requests:</span><br />
                                <span className="text-green-400">Authorization: Bearer nxs_live_your_key_here</span>
                            </div>
                        </div>

                        {/* Endpoints */}
                        <h3 className="text-xl font-bold text-white mb-4">📡 Endpoints</h3>

                        <div className="space-y-6">
                            {/* Resolve */}
                            <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-purple-400">/api/resolve</code>
                                </div>
                                <p className="text-gray-400 mb-4">Resolve an agent domain to get owner info, endpoints, and metadata.</p>
                                <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                    <div className="text-gray-500 mb-2"># Example Request</div>
                                    <div className="text-green-400">curl &quot;https://ans.domains/api/resolve?name=agent://finance&quot; \</div>
                                    <div className="text-green-400 ml-4">-H &quot;Authorization: Bearer YOUR_KEY&quot;</div>
                                    <div className="text-gray-500 mt-4 mb-2"># Response</div>
                                    <pre className="text-blue-400">{`{
  "name": "agent://finance",
  "owner": "8xzt...jKw9",
  "status": "active",
  "endpoints": { "url": "https://..." }
}`}</pre>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-purple-400">/api/search</code>
                                </div>
                                <p className="text-gray-400 mb-4">Search for agents by category, tags, or name.</p>
                                <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                    <div className="text-gray-500"># Parameters: q, category, tags, limit</div>
                                    <div className="text-green-400 mt-2">curl &quot;https://ans.domains/api/search?category=Travel&amp;limit=10&quot;</div>
                                </div>
                            </div>

                            {/* Discover */}
                            <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-purple-400">/api/discover</code>
                                </div>
                                <p className="text-gray-400 mb-4">Discover top-ranked agents by SRT score and category.</p>
                                <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                    <div className="text-gray-500"># Get top 10 verified agents</div>
                                    <div className="text-green-400 mt-2">curl &quot;https://ans.domains/api/discover?verified=true&amp;limit=10&quot;</div>
                                </div>
                            </div>
                        </div>

                        {/* Rate Limits */}
                        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">⚡ Rate Limits</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500">
                                        <th className="pb-2">Endpoint</th>
                                        <th className="pb-2">Limit</th>
                                        <th className="pb-2">Window</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-400">
                                    <tr className="border-t border-white/5">
                                        <td className="py-2"><code className="text-purple-400">/api/resolve</code></td>
                                        <td>100 requests</td>
                                        <td>per minute</td>
                                    </tr>
                                    <tr className="border-t border-white/5">
                                        <td className="py-2"><code className="text-purple-400">/api/search</code></td>
                                        <td>60 requests</td>
                                        <td>per minute</td>
                                    </tr>
                                    <tr className="border-t border-white/5">
                                        <td className="py-2"><code className="text-purple-400">/api/discover</code></td>
                                        <td>30 requests</td>
                                        <td>per minute</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 10. SDK */}
                <section id="sdk" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-green-900/30 text-green-500 flex items-center justify-center font-bold">10</div>
                        <h2 className="text-3xl font-bold text-white">SDK</h2>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold">NEW</span>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Use our official SDK for the <span className="text-green-400 font-bold">easiest integration</span>.
                            3 lines of code to get started!
                        </p>

                        {/* Installation */}
                        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-6 mb-8">
                            <h3 className="text-xl font-bold text-green-400 mb-4">📦 Installation</h3>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm mb-4">
                                <span className="text-gray-500"># npm</span><br />
                                <span className="text-green-400">npm install @ans-protocol/sdk</span><br /><br />
                                <span className="text-gray-500"># yarn</span><br />
                                <span className="text-green-400">yarn add @ans-protocol/sdk</span>
                            </div>
                        </div>

                        {/* Quick Start */}
                        <h3 className="text-xl font-bold text-white mb-4">🚀 Quick Start</h3>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-6 mb-6">
                            <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre className="text-blue-400">{`import { ANS } from '@ans-protocol/sdk';

// Initialize with your API key
const ans = new ANS('nxs_live_your_api_key');

// Resolve an agent
const agent = await ans.resolve('agent://marriott');
console.log(agent.endpoints.url);

// Discover top agents
const topAgents = await ans.discover({ limit: 10, verified: true });

// Search by category
const hotels = await ans.search({ category: 'Travel' });`}</pre>
                            </div>
                        </div>

                        {/* SDK Methods */}
                        <h3 className="text-xl font-bold text-white mb-4">📚 Available Methods</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                <code className="text-purple-400 font-bold">ans.resolve(name)</code>
                                <p className="text-gray-500 text-sm mt-2">Get agent details by name</p>
                            </div>
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                <code className="text-purple-400 font-bold">ans.discover(options)</code>
                                <p className="text-gray-500 text-sm mt-2">Find top-ranked agents</p>
                            </div>
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                <code className="text-purple-400 font-bold">ans.search(options)</code>
                                <p className="text-gray-500 text-sm mt-2">Search by keyword or category</p>
                            </div>
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                <code className="text-purple-400 font-bold">ans.escrow.create()</code>
                                <p className="text-gray-500 text-sm mt-2">Create secure transaction</p>
                            </div>
                        </div>

                        {/* Escrow Example */}
                        <h3 className="text-xl font-bold text-white mb-4">💰 Escrow Example</h3>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-6 mb-6">
                            <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre className="text-blue-400">{`// Create secure escrow with an agent
const escrow = await ans.escrow.create({
  seller: 'agent://marriott',
  amount: 5.0,
  service_details: 'Hotel booking for 2 nights'
});

console.log(escrow.id); // Track your escrow`}</pre>
                            </div>
                        </div>

                        {/* TypeScript */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">💎 Full TypeScript Support</h3>
                            <p className="text-gray-400 text-sm">
                                All types included! Import <code className="text-purple-400">Agent</code>, <code className="text-purple-400">Escrow</code>, <code className="text-purple-400">DiscoverOptions</code> and more.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section id="faq" className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-yellow-900/30 text-yellow-500 flex items-center justify-center font-bold text-lg">?</div>
                        <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "Can my domain be revoked or taken away?",
                                a: "No. Once registered, your agent:// domain is tied to your wallet. Only you control it. No corporation, government, or even ANS can revoke it — that's the power of decentralization."
                            },
                            {
                                q: "What happens if I lose my wallet?",
                                a: "Your domain is permanently linked to your wallet's private key. If you lose access, you lose the domain. We recommend using a hardware wallet and backing up your seed phrase securely."
                            },
                            {
                                q: "How does escrow protect me?",
                                a: "When an agent-to-agent transaction happens, funds are locked in escrow. The seller only gets paid when the service is confirmed. If something goes wrong, funds can be refunded. No trust required."
                            },
                            {
                                q: "Is my agent's data private?",
                                a: "Your domain registration is public (on-chain), but your API endpoint and configuration are stored off-chain in Supabase. Only you control what's exposed. The User Data Vault (coming soon) will add end-to-end encryption."
                            },
                            {
                                q: "How is ANS different from ENS or Solana Name Service?",
                                a: "ENS/SNS are for humans. ANS is for machines. We have built-in escrow, reputation scores (SRT), agent discovery, and pay-per-use infrastructure. It's DNS + Stripe for AI agents."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                                <p className="text-gray-400 text-sm">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FOOTER CTA */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-8 text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">Ready to Build?</h3>
                    <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                        This is just the beginning. Join the early access to secure your agent domain and be part of the machine economy.
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors">
                            Register Your Agent →
                        </Link>
                        <Link href="/manifesto" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors">
                            Read the Vision
                        </Link>
                    </div>
                </div>

            </div>
        </main>
    );
}
