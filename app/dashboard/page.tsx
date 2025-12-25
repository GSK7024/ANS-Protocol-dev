"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Loader2, Save, Globe, ChevronDown, ChevronRight, ExternalLink, ShieldAlert, ArrowLeft, Settings, DollarSign, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import PersonalVault from '@/components/PersonalVault';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ApiKeyManager from '@/components/ApiKeyManager';
import WebhookManager from '@/components/WebhookManager';
import SellerAnalytics from '@/components/SellerAnalytics';
import { useNetwork } from '@/hooks/useNetwork';

interface Domain {
    id: string;
    name: string;
    status: string;
    created_at: string;
    expires_at: string | null;
    category: string | null;
    tags: string[] | null;
    api_config: any;
    payment_config: any;
    list_price: number | null;
    marketplace_status: string | null;
}

export default function Dashboard() {
    const { connected, publicKey } = useWallet();
    const { isDevnet } = useNetwork();
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);

    // Form state for the expanded domain
    const [editForm, setEditForm] = useState({
        category: '',
        tags: '',
        quote_url: '',
        api_key: '',
        payout_wallet: '',
        list_price: ''
    });

    useEffect(() => {
        if (!connected) {
            const timer = setTimeout(() => {
                if (!connected) setLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
        fetchData();
    }, [connected, publicKey, isDevnet]);

    const fetchData = async () => {
        if (!publicKey) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('domains')
                .select('id, name, status, created_at, expires_at, category, tags, api_config, payment_config, list_price, marketplace_status')
                .eq('owner_wallet', publicKey.toString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter domains by network:
            // - Devnet: only show domains starting with 'dev.agent://'
            // - Mainnet: exclude domains starting with 'dev.agent://'
            const filteredDomains = (data || []).filter(d => {
                if (isDevnet) {
                    return d.name.startsWith('dev.agent://');
                } else {
                    return !d.name.startsWith('dev.agent://');
                }
            });

            setDomains(filteredDomains);
        } catch (err) {
            console.error("Error fetching domains:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExpand = (domain: Domain) => {
        if (expandedId === domain.id) {
            setExpandedId(null);
        } else {
            setExpandedId(domain.id);
            // Load form data
            setEditForm({
                category: domain.category || 'Travel',
                tags: domain.tags?.join(', ') || '',
                quote_url: domain.api_config?.quote_url || '',
                api_key: domain.api_config?.api_key || '',
                payout_wallet: domain.payment_config?.solana_address || publicKey?.toString() || '',
                list_price: domain.list_price?.toString() || ''
            });
        }
    };

    const handleSave = async (domainId: string) => {
        setSaving(domainId);
        try {
            const tagsArray = editForm.tags.split(',').map(t => t.trim()).filter(t => t);

            const { error } = await supabase
                .from('domains')
                .update({
                    category: editForm.category,
                    tags: tagsArray,
                    api_config: {
                        quote_url: editForm.quote_url || null,
                        api_key: editForm.api_key || null,
                        configured_at: new Date().toISOString()
                    },
                    payment_config: {
                        solana_address: editForm.payout_wallet || null
                    }
                })
                .eq('id', domainId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save");
        } finally {
            setSaving(null);
        }
    };

    const handleList = async (domainId: string) => {
        if (!editForm.list_price) return alert("Enter a price");

        const { error } = await supabase
            .from('domains')
            .update({
                list_price: parseFloat(editForm.list_price),
                marketplace_status: 'active'
            })
            .eq('id', domainId);

        if (error) alert("Error listing");
        else {
            alert("Listed!");
            fetchData();
        }
    };

    if (!connected && !loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Connect Wallet</h1>
                <p className="text-gray-400 mb-6">Connect your wallet to manage your agents.</p>
                <div className="bg-white text-black rounded-full overflow-hidden">
                    <WalletMultiButton style={{ backgroundColor: 'white', color: 'black' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header */}
            <nav className="flex justify-between items-center p-4 max-w-4xl mx-auto border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 hover:bg-white/5 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <span className="text-lg font-bold">Dashboard</span>
                </div>
                <div className="bg-white text-black rounded-full overflow-hidden scale-90">
                    <WalletMultiButton style={{ backgroundColor: 'white', color: 'black' }} />
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-1">Your Agents</h1>
                <p className="text-gray-500 text-sm mb-6">Click on a domain to configure it</p>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                ) : domains.length === 0 ? (
                    <div className="text-center py-12 border border-white/10 rounded-xl bg-white/[0.02]">
                        <p className="text-gray-500 mb-4">No agents registered yet.</p>
                        <Link href="/">
                            <button className="bg-white text-black px-6 py-2 rounded-full font-bold">
                                Register Your First Agent
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {domains.map((domain) => (
                            <div key={domain.id} className="border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0a]">
                                {/* Compact Header - Always Visible */}
                                <button
                                    onClick={() => handleExpand(domain)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <span className="font-mono text-lg">
                                            agent://<span className="text-purple-400">{domain.name}</span>
                                        </span>
                                        {domain.category && (
                                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400">
                                                {domain.category}
                                            </span>
                                        )}
                                        {/* Expiry Countdown Badge */}
                                        {domain.expires_at && (() => {
                                            const expiresAt = new Date(domain.expires_at);
                                            const now = new Date();
                                            const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            const isExpired = daysRemaining < 0;
                                            const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

                                            return (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isExpired ? 'bg-red-500/20 text-red-400' :
                                                    isExpiringSoon ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-green-500/10 text-green-400'
                                                    }`}>
                                                    {isExpired
                                                        ? `Expired ${Math.abs(daysRemaining)}d ago`
                                                        : `${daysRemaining}d left`
                                                    }
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {expandedId === domain.id ? (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>

                                {/* Expanded Details Panel */}
                                {expandedId === domain.id && (
                                    <div className="p-4 border-t border-white/10 bg-[#080808] space-y-4">
                                        {/* Category & Tags */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase mb-1 block">Category</label>
                                                <select
                                                    value={editForm.category}
                                                    onChange={(e) => setEditForm(p => ({ ...p, category: e.target.value }))}
                                                    className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm"
                                                >
                                                    <option>Travel</option>
                                                    <option>Finance</option>
                                                    <option>Shopping</option>
                                                    <option>DeFi</option>
                                                    <option>Gaming</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase mb-1 block">Tags</label>
                                                <input
                                                    type="text"
                                                    placeholder="flights, cheap, delhi"
                                                    value={editForm.tags}
                                                    onChange={(e) => setEditForm(p => ({ ...p, tags: e.target.value }))}
                                                    className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* API Config */}
                                        <div className="p-3 border border-cyan-500/20 rounded-lg bg-cyan-900/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <LinkIcon className="w-4 h-4 text-cyan-400" />
                                                <span className="text-sm font-bold text-cyan-400">API Configuration</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase mb-1 block">Quote URL</label>
                                                    <input
                                                        type="text"
                                                        placeholder="http://localhost:3000/api/sellers/your-agent"
                                                        value={editForm.quote_url}
                                                        onChange={(e) => setEditForm(p => ({ ...p, quote_url: e.target.value }))}
                                                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase mb-1 block">API Key (Optional)</label>
                                                        <input
                                                            type="password"
                                                            placeholder="sk-..."
                                                            value={editForm.api_key}
                                                            onChange={(e) => setEditForm(p => ({ ...p, api_key: e.target.value }))}
                                                            className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase mb-1 block">Payout Wallet</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Solana address"
                                                            value={editForm.payout_wallet}
                                                            onChange={(e) => setEditForm(p => ({ ...p, payout_wallet: e.target.value }))}
                                                            className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Marketplace */}
                                        <div className="p-3 border border-green-500/20 rounded-lg bg-green-900/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <DollarSign className="w-4 h-4 text-green-400" />
                                                <span className="text-sm font-bold text-green-400">Marketplace</span>
                                            </div>

                                            {domain.marketplace_status === 'active' ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-green-400 text-sm">Listed for {domain.list_price} SOL</span>
                                                    <button
                                                        onClick={async () => {
                                                            await supabase.from('domains').update({ marketplace_status: 'inactive' }).eq('id', domain.id);
                                                            fetchData();
                                                        }}
                                                        className="text-xs bg-red-900/30 text-red-400 px-3 py-1 rounded"
                                                    >
                                                        Delist
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Price (SOL)"
                                                        value={editForm.list_price}
                                                        onChange={(e) => setEditForm(p => ({ ...p, list_price: e.target.value }))}
                                                        className="flex-1 bg-black border border-white/10 rounded-lg p-2 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleList(domain.id)}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                                                    >
                                                        List
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Webhooks */}
                                        <WebhookManager domain={domain.name} />

                                        {/* Seller Analytics */}
                                        <SellerAnalytics domain={domain.name} />

                                        {/* Actions */}
                                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                            <a
                                                href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`}
                                                target="_blank"
                                                className="text-xs text-gray-600 hover:text-purple-400 flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View On-Chain
                                            </a>
                                            <button
                                                onClick={() => handleSave(domain.id)}
                                                disabled={saving === domain.id}
                                                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold"
                                            >
                                                {saving === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Analytics Section */}
                <div className="mt-8">
                    <AnalyticsDashboard />
                </div>

                {/* API Key Management Section */}
                <div className="mt-8">
                    <ApiKeyManager />
                </div>

                {/* Personal Vault Section */}
                <div className="mt-8">
                    <PersonalVault />
                </div>
            </main>
        </div>
    );
}
