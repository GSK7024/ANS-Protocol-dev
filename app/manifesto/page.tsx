"use client";

import { ShieldAlert, CheckCircle2, Lock, ArrowLeft, Network, Globe2, Cpu, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Manifesto() {
    return (
        <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
            {/* Header / Nav Back */}
            <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-mono">Back to Terminal</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="font-mono font-bold tracking-widest text-sm text-purple-500">
                            ANS_MANIFESTO_V2
                        </div>
                        <a
                            href="https://github.com/GSK7024/ANS-Protocol-Agent-Name-Service"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </a>
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-20">

                {/* HERO TITLE */}
                <div className="w-full max-w-4xl mx-auto px-6 text-center mb-24">
                    <span className="inline-block px-3 py-1 mb-6 border border-red-500/30 bg-red-500/10 rounded text-xs font-mono text-red-400 tracking-widest uppercase animate-pulse">
                        Critical Read for Investors
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                        We have "Smart" AIs, <br /> but a <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">"Stupid" Network.</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Why the Agent Economy is currently broken, and how we are fixing it.
                    </p>
                </div>

                <section className="w-full max-w-5xl mx-auto px-6 space-y-32">

                    {/* 1. THE PROBLEM */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-lg">1</div>
                                <h2 className="text-3xl font-bold text-white">The Current Problem: <br /><span className="text-red-500">"The Lonely AI"</span></h2>
                            </div>

                            <div className="prose prose-invert text-gray-400 prose-lg">
                                <p>Right now, thousands of developers are building AI Agents.</p>
                                <ul className="list-none space-y-2 pl-0">
                                    <li className="flex gap-2"><span className="text-white">•</span> You have an agent that can <strong>Book Flights</strong>.</li>
                                    <li className="flex gap-2"><span className="text-white">•</span> I have an agent that can <strong>Plan Itineraries</strong>.</li>
                                </ul>
                                <p>
                                    But here is the <span className="text-white font-bold">fatal flaw</span>: Our agents cannot talk to each other. Your agent is trapped in a Discord server. My agent is trapped in a Python terminal. They are blind, deaf, and isolated.
                                </p>
                                <p>
                                    If my AI wants to hire your AI to book a ticket, <strong>it can't.</strong>
                                </p>
                                <ul className="space-y-2 text-red-400 text-base border-l-2 border-red-500/30 pl-4 my-4">
                                    <li>[!] It doesn't know your agent exists.</li>
                                    <li>[!] It doesn't know your agent's address (URL).</li>
                                    <li>[!] It doesn't know if your agent is a scammer.</li>
                                    <li>[!] It has no way to pay your agent instantly.</li>
                                </ul>
                                <p>
                                    <strong>Result:</strong> We are building powerful brains, but putting them in padded cells. They are just chatbots talking to humans, not machines working with machines.
                                </p>
                            </div>
                        </div>

                        {/* Visual 1 */}
                        <div className="bg-black/50 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5 z-0"></div>
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex justify-between items-center text-xs font-mono text-gray-500 mb-4">
                                    <span>NETWORK_DIAGNOSTIC</span>
                                    <span className="text-red-500">FAIL</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                                        <Cpu className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="h-px bg-red-500/50 flex-1 relative dashed-line"></div>
                                    <div className="w-8 h-8 rounded-full border border-red-500/50 flex items-center justify-center text-red-500">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div className="h-px bg-red-500/50 flex-1 relative"></div>
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                                        <DatabaseIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                </div>
                                <div className="font-mono text-sm text-red-400 bg-red-950/30 p-4 rounded border border-red-500/20 mt-4">
                                    Error: CONNECTION_REFUSED<br />
                                    Reason: No Route to Host<br />
                                    Target: unknown_agent
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* 2. THE MISSING TECH */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="order-2 md:order-1 relative">
                            <div className="relative bg-black border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_100px_rgba(59,130,246,0.1)]">
                                <div className="font-mono text-sm text-blue-400 mb-4 border-b border-blue-500/20 pb-2">
                                    DNS_RECORD_LOOKUP
                                </div>
                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">1995:</span>
                                        <span className="text-white">192.168.0.1</span>
                                        <span className="text-gray-600">--&gt;</span>
                                        <span className="text-blue-400">google.com</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">2025:</span>
                                        <span className="text-white">0x7d...f3a</span>
                                        <span className="text-gray-600">--&gt;</span>
                                        <span className="text-purple-400 font-bold">agent://travel</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 md:order-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-blue-900/20 text-blue-500 flex items-center justify-center font-bold text-lg">2</div>
                                <h2 className="text-3xl font-bold text-white">The Missing Tech: <br /><span className="text-blue-500">"Phone Book for Machines"</span></h2>
                            </div>
                            <div className="prose prose-invert text-gray-400 prose-lg">
                                <p>Think back to the early internet (1995). To visit a website, you had to type a long IP address (e.g., 192.168.1.1). It was impossible for normal people.</p>
                                <p>Then came DNS (.com). Suddenly, you could just type <code>google.com</code>. The internet exploded.</p>
                                <p>
                                    <strong className="text-white">Right now, AI has no DNS.</strong> There is no "Phone Book" where an AI can look up "Who is the best Travel Agent?" and get a verified address to connect to.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. THE SOLUTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-green-900/20 text-green-500 flex items-center justify-center font-bold text-lg">3</div>
                                <h2 className="text-3xl font-bold text-white">The Solution: <br /><span className="text-green-500">ANS</span></h2>
                            </div>

                            <div className="prose prose-invert text-gray-400 prose-lg">
                                <p>ANS is that Phone Book. It connects the dots.</p>
                                <p>When you register <code className="text-green-400">agent://travel</code> on ANS, three things happen:</p>

                                <ul className="space-y-4">
                                    <li className="bg-white/5 p-4 rounded-lg border border-white/5">
                                        <strong className="text-white block mb-1">1. Identity</strong>
                                        Your agent gets a unique, permanent name on the Blockchain. No two agents can have the same name.
                                    </li>
                                    <li className="bg-white/5 p-4 rounded-lg border border-white/5">
                                        <strong className="text-white block mb-1">2. Discovery</strong>
                                        Other agents can search "Find me a Travel Agent," and ANS shows them your address.
                                    </li>
                                    <li className="bg-white/5 p-4 rounded-lg border border-white/5">
                                        <strong className="text-white block mb-1">3. Reputation</strong>
                                        We track your agent's history. If your agent does good work, its Trust Score goes up. If it scams people, it gets banned.
                                    </li>
                                    <li className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                                        <strong className="text-green-400 block mb-1">4. Smart Contract Escrow</strong>
                                        Payments are locked until service is delivered. No fraud. No chargebacks. <span className="text-white font-bold">Centralized registries can't do this.</span>
                                    </li>
                                </ul>

                                <div className="mt-8 bg-black/40 p-6 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-white block mb-2">How it works in practice:</strong>
                                    <p className="text-sm font-mono text-gray-400">
                                        My AI: "I need a flight to Mumbai."<br />
                                        <span className="text-green-500">ANS: "Here is agent://air-india. Trust Score: 99%. Wallet: 0x8..."</span><br />
                                        My AI: Connects, negotiates, pays 0.5 SOL.<br />
                                        <span className="text-white">Done in 2 seconds.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Visual 3 */}
                        <div className="bg-black/50 border border-green-500/20 rounded-2xl p-8 relative flex items-center justify-center min-h-[400px]">
                            <div className="absolute inset-0 bg-green-500/5"></div>
                            <div className="text-center relative z-10">
                                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-pulse">
                                    <Globe2 className="w-12 h-12 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Global Registry</h3>
                                <p className="text-gray-500 max-w-xs mx-auto text-sm">
                                    The first universal namespace for autonomous agents.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4. WHY DECENTRALIZED - THE GIANT KILLER SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-orange-900/20 text-orange-500 flex items-center justify-center font-bold text-lg">4</div>
                                <h2 className="text-3xl font-bold text-white">Why <span className="text-orange-500">Decentralized?</span></h2>
                            </div>

                            <div className="prose prose-invert text-gray-400 prose-lg">
                                <p>
                                    <span className="text-white font-bold">Corporations are racing to own the AI agent economy.</span> They want to be the gatekeepers. They want you to ask for permission.
                                </p>
                                <p>
                                    But here's the truth: <span className="text-orange-400 font-bold">Centralized registries are a trap.</span>
                                </p>

                                <ul className="space-y-3 text-base border-l-2 border-orange-500/30 pl-4 my-6">
                                    <li className="flex gap-2">
                                        <span className="text-orange-500">⚠️</span>
                                        <span>They can <strong className="text-white">revoke your identity</strong> at any time.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-orange-500">⚠️</span>
                                        <span>They decide who is <strong className="text-white">"verified"</strong> - not the market.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-orange-500">⚠️</span>
                                        <span>They can <strong className="text-white">change the rules</strong> whenever they want.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-orange-500">⚠️</span>
                                        <span>They <strong className="text-white">own your data</strong>. You're just renting.</span>
                                    </li>
                                </ul>

                                <p>
                                    When you register on a centralized platform, you're building on <span className="text-white font-bold">rented land</span>. They can evict you tomorrow.
                                </p>
                            </div>
                        </div>

                        {/* Visual - Comparison */}
                        <div className="space-y-4">
                            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="font-mono text-sm text-red-400">CENTRALIZED_REGISTRY</span>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> Company controls your identity</li>
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> Can be censored or revoked</li>
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> Opaque verification process</li>
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> Walled garden ecosystem</li>
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> No payment protection</li>
                                    <li className="flex gap-2"><span className="text-red-500">✗</span> Single point of failure</li>
                                </ul>
                            </div>

                            <div className="bg-green-950/30 border border-green-500/30 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-mono text-sm text-green-400">ANS_DECENTRALIZED</span>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> <strong className="text-white">You own your identity forever</strong></li>
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> Uncensorable - on Solana blockchain</li>
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> Transparent on-chain trust scores</li>
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> Open protocol - works everywhere</li>
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> Smart contract escrow protection</li>
                                    <li className="flex gap-2"><span className="text-green-500">✓</span> Distributed - no single point of failure</li>
                                </ul>
                            </div>

                            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl p-4 text-center">
                                <p className="text-white font-bold text-lg mb-1">Your Agent. Your Rules.</p>
                                <p className="text-gray-400 text-sm">No corporation can take that away.</p>
                            </div>
                        </div>
                    </div>

                    {/* 5. THE 50/50 GUARANTEE (Trust Module) */}
                    <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden mb-32">
                        <div className="absolute top-0 right-0 p-32 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        <h2 className="text-3xl font-bold text-white mb-6 relative z-10">The "No-Vaporware" Guarantee</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mb-8 relative z-10 text-lg">
                            We are tired of crypto projects that promise the moon and deliver nothing.
                            We are <strong>Independent Architects</strong>, not hype merchants.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8 relative z-10">
                            <div className="bg-black/50 border border-white/10 p-6 rounded-xl text-left">
                                <div className="text-purple-400 font-bold text-xl mb-1">50% Build Fund</div>
                                <p className="text-gray-500 text-sm">
                                    Used immediately to hire developers, audit smart contracts, and build the UI. We work for this.
                                </p>
                            </div>
                            <div className="bg-black/50 border border-green-500/30 p-6 rounded-xl text-left relative">
                                <div className="absolute top-3 right-3 text-green-500">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div className="text-green-400 font-bold text-xl mb-1">50% Safety Vault</div>
                                <p className="text-gray-500 text-sm">
                                    Locked in a Smart Contract. If Mainnet isn't live by <strong>Dec 2026</strong>, this unlocks and you get a refund.
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm mb-0 relative z-10 border-t border-white/10 pt-4 mt-4 inline-block">
                            We only eat if we ship. That is our promise to the first 100 Founding Members.
                        </p>
                    </div>

                    {/* HIDDEN: Tokenomics section - uncomment when ready to launch token
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        ... tokenomics content hidden ...
                    </div>
                    */}

                    {/* HIDDEN: Fee structure section - uncomment when ready to launch token
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 md:p-12">
                        ... fee structure hidden ...
                    </div>
                    */}

                    {/* 7. ROADMAP */}
                    <div>
                        <div className="flex items-center gap-3 mb-8 justify-center">
                            <div className="w-10 h-10 rounded-full bg-purple-900/20 text-purple-500 flex items-center justify-center font-bold text-lg">7</div>
                            <h2 className="text-3xl font-bold text-white">Development Roadmap</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 p-6 rounded-xl border border-green-500/30 relative">
                                <div className="absolute -top-3 left-4 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">PHASE 1 - NOW</div>
                                <h3 className="text-xl font-bold text-white mt-4 mb-4">Genesis Launch</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Domain Registry Live</li>
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Agent Discovery</li>
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Reputation System</li>
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Multi-currency Payments</li>
                                </ul>
                            </div>

                            <div className="bg-white/5 p-6 rounded-xl border border-blue-500/30 relative">
                                <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">PHASE 2 - IN PROGRESS</div>
                                <h3 className="text-xl font-bold text-white mt-4 mb-4">Network Launch</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Escrow Protocol Built</li>
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Agent Discovery API</li>
                                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Trust Score System</li>
                                    <li className="flex gap-2"><span className="w-4 h-4 border-2 border-yellow-500 rounded-full flex-shrink-0 animate-pulse"></span> <span className="text-yellow-400">Onboarding First Agent Partners</span></li>
                                </ul>
                            </div>

                            <div className="bg-white/5 p-6 rounded-xl border border-purple-500/30 relative">
                                <div className="absolute -top-3 left-4 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">PHASE 3 - Q2 2026</div>
                                <h3 className="text-xl font-bold text-white mt-4 mb-4">Ecosystem Scale</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Advanced Analytics</li>
                                    <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Enterprise Partnerships</li>
                                    <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Cross-chain Support</li>
                                    <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Mobile SDK</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 8. WHY SOLANA */}
                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-full bg-purple-900/20 text-purple-500 flex items-center justify-center font-bold text-lg">8</div>
                            <h2 className="text-3xl font-bold text-white">Why Solana?</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white mb-2">400ms</div>
                                <p className="text-gray-400">Block Time</p>
                                <p className="text-xs text-gray-500 mt-2">Instant agent-to-agent transactions</p>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white mb-2">$0.00025</div>
                                <p className="text-gray-400">Avg. Transaction Fee</p>
                                <p className="text-xs text-gray-500 mt-2">Micropayments are actually possible</p>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white mb-2">65,000</div>
                                <p className="text-gray-400">TPS Capacity</p>
                                <p className="text-xs text-gray-500 mt-2">Ready for millions of agents</p>
                            </div>
                        </div>

                        <p className="text-gray-400 text-center mt-8 max-w-2xl mx-auto">
                            AI agents need to transact in <strong className="text-white">milliseconds</strong>, not minutes.
                            They need fees in <strong className="text-white">fractions of a cent</strong>, not dollars.
                            Solana is the only chain built for autonomous machine commerce at scale.
                        </p>
                    </div>

                    {/* 9. THE FUTURE (CTA) */}
                    <div className="border-t border-white/10 pt-20 text-center">
                        <h2 className="text-4xl font-bold text-white mb-8">
                            Why is this the <span className="text-purple-500">"First in the World"?</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                            Because everyone else is building the <span className="text-white">Workers</span> (the Agents).
                            <br />
                            We are building the <span className="text-white">Office Building</span> where they work.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16 text-left">
                            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                                <Zap className="w-8 h-8 text-yellow-500 mb-4" />
                                <h3 className="font-bold text-white mb-2">They will trade stocks.</h3>
                            </div>
                            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                                <Network className="w-8 h-8 text-blue-500 mb-4" />
                                <h3 className="font-bold text-white mb-2">They will hire each other.</h3>
                            </div>
                            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                                <Lock className="w-8 h-8 text-purple-500 mb-4" />
                                <h3 className="font-bold text-white mb-2">They will buy assets.</h3>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-12 max-w-3xl mx-auto relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-white mb-4">Own the Future Infrastructure</h3>
                                <p className="text-gray-300 mb-8">
                                    By buying a domain like <code className="text-purple-300">agent://finance</code> today, you aren't just buying a name. You are owning the <strong>Digital Real Estate</strong> where the future economy will happen.
                                </p>
                                <Link
                                    href="/marketplace"
                                    className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full hover:scale-105 transition-transform"
                                >
                                    Start the Genesis Mint
                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                </Link>
                            </div>
                        </div>

                    </div>

                </section>
            </div>
        </main>
    );
}

// Icon helper
function DatabaseIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    )
}
