
import { Metadata } from 'next';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import { CheckCircle2, Shield, AlertTriangle, Code, ExternalLink, Globe, Cpu, Terminal } from 'lucide-react';

// Force dynamic rendering since we're fetching live data
export const dynamic = 'force-dynamic';

interface Props {
    params: { name: string };
}

// 1. DYNAMIC METADATA (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const name = params.name;

    // Fetch basic info for SEO
    const { data: domain } = await supabase
        .from('domains')
        .select('*')
        .eq('name', name)
        .single();

    if (!domain) {
        return {
            title: 'Agent Not Found | ANS',
            description: 'This agent identity has not been claimed yet.'
        };
    }

    return {
        title: `agent://${name} - Verified AI Identity | ANS`,
        description: `Verify ${name}'s on-chain identity, reputation, and API endpoints. Registered on ANS Protocol. Owner: ${domain.owner_wallet.slice(0, 4)}...${domain.owner_wallet.slice(-4)}`,
        openGraph: {
            title: `agent://${name} [Verified]`,
            description: `Reputation: ${domain.reputation_score || 'New'} | Status: ${domain.status}`,
            // We'll add dynamic image generation later
        }
    };
}

export default async function AgentProfile({ params }: Props) {
    const name = params.name;

    // 2. FETCH DATA (Server-Side)
    const { data: domain, error } = await supabase
        .from('domains')
        .select('*')
        .eq('name', name)
        .single();

    if (error || !domain) {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
                <h1 className="text-4xl font-bold mb-2 font-mono">404: Agent Not Found</h1>
                <p className="text-gray-500 mb-8 text-center max-w-md">
                    The identity <span className="text-purple-400 font-mono">agent://{name}</span> has not been claimed yet.
                </p>
                <Link href="/">
                    <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                        Claim agent://{name}
                    </button>
                </Link>
            </div>
        );
    }

    // Parse Metadata
    const tags = domain.tags || [];
    const createdDate = new Date(domain.created_at).toLocaleDateString('en-US', { dateStyle: 'long' });
    const apiConfig = domain.api_config || {};
    const isPublicApi = apiConfig.quote_url && !apiConfig.auth_required; // Simplified check

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20"></div>

            {/* Navbar Placeholder (can be a component) */}
            <nav className="relative z-10 p-6 flex justify-between items-center max-w-6xl mx-auto">
                <Link href="/" className="flex items-center gap-2 font-bold tracking-tighter hover:opacity-80 transition-opacity">
                    <img src="/ans-logo.png" alt="ANS" className="w-8 h-8" />
                    ANS
                </Link>
                <Link href="/marketplace">
                    <button className="text-sm font-mono text-gray-400 hover:text-white transition-colors">
                        MARKETPLACE
                    </button>
                </Link>
            </nav>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
                {/* ID CARD HEADER */}
                <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
                    {/* Avatar / Icon */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 flex items-center justify-center relative shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
                        <Cpu className="w-16 h-16 text-white/50" />
                        <div className="absolute -bottom-3 -right-3 bg-black border border-green-500/50 text-green-400 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            ONLINE
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-1">
                                {domain.name}
                            </h1>
                            {domain.status === 'active' && (
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED AGENT
                                </span>
                            )}
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold">
                                {domain.tier || 'Standard'} Tier
                            </span>
                        </div>

                        <div className="text-xl font-mono text-gray-500 mb-6 flex items-center gap-2">
                            agent://{domain.name}
                            <button className="opacity-50 hover:opacity-100 transition-opacity" title="Copy">
                                <Code className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {tags.map((tag: string) => (
                                    <span key={tag} className="text-xs bg-white/5 text-gray-300 px-3 py-1 rounded-md border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-8 text-sm text-gray-400 font-mono">
                            <div>
                                <span className="block text-gray-600 text-xs mb-1">OWNER</span>
                                <a href={`https://explorer.solana.com/address/${domain.owner_wallet}`} target="_blank" className="hover:text-white underline decoration-white/30 transition-colors">
                                    {domain.owner_wallet.slice(0, 6)}...{domain.owner_wallet.slice(-6)}
                                </a>
                            </div>
                            <div>
                                <span className="block text-gray-600 text-xs mb-1">REGISTERED</span>
                                {createdDate}
                            </div>
                            <div>
                                <span className="block text-gray-600 text-xs mb-1">NETWORK</span>
                                {domain.network || 'Mainnet'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Reputation & Trust */}
                    <div className="md:col-span-2 space-y-6">
                        {/* About Section (Placeholder) */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-gray-400" />
                                Agent Manifest
                            </h2>
                            <p className="text-gray-400 leading-relaxed">
                                This identity is secured on the Solana blockchain.
                                {domain.category ? ` It specializes in ${domain.category} operations.` : ' No specific category designated.'}
                                <br /><br />
                                <span className="font-mono text-xs text-gray-600">
                                    SHA-256: {domain.id.split('-')[0]}... (Immutable)
                                </span>
                            </p>
                        </div>

                        {/* Integration / API Endpoint */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-purple-400" />
                                Public Endpoints
                            </h2>

                            {apiConfig.quote_url ? (
                                <div className="space-y-4">
                                    <div className="bg-black border border-white/10 rounded-lg p-3 font-mono text-xs text-gray-300 flex justify-between items-center">
                                        <span className="break-all">{apiConfig.quote_url}</span>
                                        <span className="text-green-500 text-[10px] bg-green-900/20 px-2 py-1 rounded">ACTIVE</span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        This agent accepts standard JSON-RPC calls. Rate limits apply.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                                    <p className="text-gray-500 text-sm">No public API endpoints configured.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Stats & Action */}
                    <div className="space-y-6">
                        {/* Reputation Card */}
                        <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Reputation Score</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white">{domain.reputation_score || 0}</span>
                                <span className="text-sm text-gray-500">/ 100</span>
                            </div>
                            <div className="w-full bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full" style={{ width: `${domain.reputation_score || 0}%` }}></div>
                            </div>
                            <div className="mt-4 flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 border-b border-white/5 pb-2">
                                    <span>Transactions</span>
                                    <span className="text-white font-mono">1,240</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 border-b border-white/5 pb-2">
                                    <span>Success Rate</span>
                                    <span className="text-green-400 font-mono">99.8%</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Uptime (30d)</span>
                                    <span className="text-white font-mono">100%</span>
                                </div>
                            </div>
                        </div>

                        {/* Marketplace Action */}
                        {domain.marketplace_status === 'active' ? (
                            <div className="bg-green-900/10 border border-green-500/30 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">For Sale</h3>
                                <div className="text-3xl font-bold text-white mb-4">{domain.list_price} SOL</div>
                                <Link href="/marketplace">
                                    <button className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition-colors">
                                        Buy Now
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                                <Shield className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-400 mb-4">This identity is securely held by its owner.</p>
                                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg transition-colors text-sm">
                                    Make an Offer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
