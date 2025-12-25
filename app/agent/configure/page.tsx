'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface AgentConfig {
    name: string;
    description: string;
    category: string;
    service_type: string;
    quote_url: string;
    book_url: string;
    verify_url: string;
    webhook_url: string;
    api_key: string;
    solana_wallet: string;
}

export default function AgentConfigurePage() {
    const { publicKey } = useWallet();
    const [domains, setDomains] = useState<any[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<string>('');
    const [config, setConfig] = useState<AgentConfig>({
        name: '',
        description: '',
        category: 'travel',
        service_type: 'travel',
        quote_url: '',
        book_url: '',
        verify_url: '',
        webhook_url: '',
        api_key: '',
        solana_wallet: ''
    });
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Load user's domains
    useEffect(() => {
        if (publicKey) {
            fetchUserDomains();
        }
    }, [publicKey]);

    const fetchUserDomains = async () => {
        const res = await fetch(`/api/user/domains?wallet=${publicKey?.toBase58()}`);
        const data = await res.json();
        setDomains(data.domains || []);
    };

    const loadDomainConfig = async (name: string) => {
        setSelectedDomain(name);
        const res = await fetch(`/api/agent/config?name=${name}`);
        const data = await res.json();
        if (data.config) {
            setConfig({
                name: data.config.name || name,
                description: data.config.description || '',
                category: data.config.category || 'travel',
                service_type: data.config.service_type || 'travel',
                quote_url: data.config.api_config?.quote_url || '',
                book_url: data.config.api_config?.book_url || '',
                verify_url: data.config.api_config?.verify_url || '',
                webhook_url: data.config.api_config?.webhook_url || '',
                api_key: data.config.api_config?.api_key || '',
                solana_wallet: data.config.payment_config?.solana_address || ''
            });
        }
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/agent/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quote_url: config.quote_url })
            });
            const data = await res.json();
            setTestResult({ success: data.success, message: data.message || data.error });
        } catch (err: any) {
            setTestResult({ success: false, message: err.message });
        }
        setTesting(false);
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/agent/update-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain_name: selectedDomain,
                    wallet: publicKey?.toBase58(),
                    config
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Configuration saved successfully!');
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (err: any) {
            alert('❌ Error: ' + err.message);
        }
        setSaving(false);
    };

    const categories = [
        { value: 'travel', label: '✈️ Travel (Flights, Trains)' },
        { value: 'transport', label: '🛺 Transport (Uber, Rapido)' },
        { value: 'ecommerce', label: '📦 E-commerce (Amazon, Flipkart)' },
        { value: 'hotel', label: '🏨 Hotels (OYO, Airbnb)' },
        { value: 'food', label: '🍔 Food (Swiggy, Zomato)' },
        { value: 'other', label: '🔧 Other' }
    ];

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    🛠️ Agent Configuration
                </h1>
                <p className="text-zinc-500 mb-8">Configure your agent's APIs, wallet, and service details</p>

                {/* Wallet */}
                <div className="mb-8">
                    <WalletMultiButton />
                </div>

                {!publicKey ? (
                    <p className="text-zinc-500">Connect your wallet to configure your agents.</p>
                ) : (
                    <>
                        {/* Domain Selector */}
                        <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                            <h2 className="text-xl mb-4">Select Domain</h2>
                            {domains.length === 0 ? (
                                <p className="text-zinc-500">No domains found. Purchase one first!</p>
                            ) : (
                                <select
                                    value={selectedDomain}
                                    onChange={(e) => loadDomainConfig(e.target.value)}
                                    className="w-full bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700"
                                >
                                    <option value="">-- Select a domain --</option>
                                    {domains.map(d => (
                                        <option key={d.name} value={d.name}>agent://{d.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedDomain && (
                            <>
                                {/* Basic Info */}
                                <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                                    <h2 className="text-xl mb-4">📋 Basic Info</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-zinc-400">Description</label>
                                            <input
                                                value={config.description}
                                                onChange={e => setConfig({ ...config, description: e.target.value })}
                                                placeholder="e.g., Official Air India booking service"
                                                className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-zinc-400">Category</label>
                                            <select
                                                value={config.category}
                                                onChange={e => setConfig({ ...config, category: e.target.value, service_type: e.target.value })}
                                                className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 mt-1"
                                            >
                                                {categories.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* API Endpoints */}
                                <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                                    <h2 className="text-xl mb-4">🔗 API Endpoints</h2>
                                    <p className="text-sm text-zinc-500 mb-4">
                                        These are YOUR APIs that ANS will call to get quotes, make bookings, and verify deliveries.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-zinc-400">Quote URL (GET prices)</label>
                                            <input
                                                value={config.quote_url}
                                                onChange={e => setConfig({ ...config, quote_url: e.target.value })}
                                                placeholder="https://api.yourservice.com/quote"
                                                className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 mt-1 font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-zinc-400">Verify URL (Confirm delivery)</label>
                                            <input
                                                value={config.verify_url}
                                                onChange={e => setConfig({ ...config, verify_url: e.target.value })}
                                                placeholder="https://api.yourservice.com/verify"
                                                className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 mt-1 font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-zinc-400">API Key (Optional - for authentication)</label>
                                            <input
                                                type="password"
                                                value={config.api_key}
                                                onChange={e => setConfig({ ...config, api_key: e.target.value })}
                                                placeholder="sk-your-secret-key"
                                                className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 mt-1 font-mono text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={testConnection}
                                            disabled={testing || !config.quote_url}
                                            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm transition"
                                        >
                                            {testing ? '⏳ Testing...' : '🧪 Test Connection'}
                                        </button>
                                        {testResult && (
                                            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                {testResult.success ? '✅' : '❌'} {testResult.message}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Wallet Config */}
                                <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                                    <h2 className="text-xl mb-4">💰 Payout Wallet</h2>
                                    <p className="text-sm text-zinc-500 mb-4">
                                        This is where you'll receive payments when orders are completed.
                                    </p>
                                    <input
                                        value={config.solana_wallet}
                                        onChange={e => setConfig({ ...config, solana_wallet: e.target.value })}
                                        placeholder="Your Solana wallet address"
                                        className="w-full bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => setConfig({ ...config, solana_wallet: publicKey?.toBase58() || '' })}
                                        className="mt-2 text-sm text-cyan-400 hover:underline"
                                    >
                                        Use connected wallet
                                    </button>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={saveConfig}
                                    disabled={saving}
                                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition"
                                >
                                    {saving ? '⏳ Saving...' : '💾 Save Configuration'}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
