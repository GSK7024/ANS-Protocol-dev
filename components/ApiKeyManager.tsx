"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Key, Copy, Trash2, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    total_requests: number;
    is_active: boolean;
    created_at: string;
    last_request_at: string | null;
}

export default function ApiKeyManager() {
    const { publicKey, signMessage } = useWallet();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (publicKey) {
            fetchKeys();
        } else {
            setLoading(false);
        }
    }, [publicKey]);

    const fetchKeys = async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/keys?wallet=${publicKey.toString()}`);
            const json = await res.json();
            if (res.ok) {
                setKeys(json.keys || []);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to fetch keys:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateKey = async () => {
        if (!publicKey || !signMessage) {
            setError('Please connect a wallet that supports message signing');
            return;
        }

        setGenerating(true);
        setError(null);

        // Timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            setGenerating(false);
            setError('Request timed out. Please try again.');
        }, 30000); // 30 second timeout

        try {
            // Sign message to prove wallet ownership
            const message = `Generate ANS API Key for ${publicKey.toString()}`;
            const encodedMessage = new TextEncoder().encode(message);

            let signature;
            try {
                signature = await signMessage(encodedMessage);
            } catch (signError: any) {
                clearTimeout(timeoutId);
                setGenerating(false);
                if (signError.message?.includes('User rejected')) {
                    setError('Signature rejected. Please approve the signature request.');
                } else {
                    setError('Failed to sign message: ' + (signError.message || 'Unknown error'));
                }
                return;
            }

            // Convert signature to base58
            const bs58 = await import('bs58');
            const signatureBase58 = bs58.default.encode(signature);

            // Call API
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: publicKey.toString(),
                    signature: signatureBase58,
                    name: 'Default Key',
                    message
                })
            });

            clearTimeout(timeoutId);

            const json = await res.json();

            if (res.ok) {
                setNewKey(json.api_key);
                setShowKey(true);
                fetchKeys();
            } else {
                setError(json.error || 'Failed to generate key');
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error('Key generation error:', err);
            setError(err.message || 'Failed to generate key');
        } finally {
            setGenerating(false);
        }
    };


    const revokeKey = async (keyId: string) => {
        if (!publicKey || !signMessage) return;
        if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

        try {
            const message = `Revoke ANS API Key ${keyId}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signature = await signMessage(encodedMessage);

            const bs58 = await import('bs58');
            const signatureBase58 = bs58.default.encode(signature);

            const res = await fetch('/api/keys', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key_id: keyId,
                    wallet: publicKey.toString(),
                    signature: signatureBase58,
                    message
                })
            });

            if (res.ok) {
                setNewKey(null);
                fetchKeys();
            } else {
                const json = await res.json();
                setError(json.error || 'Failed to revoke key');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to revoke key');
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const activeKey = keys.find(k => k.is_active);
    const hasActiveKey = !!activeKey;

    if (!publicKey) {
        return (
            <div className="p-6 border border-white/10 rounded-xl bg-white/[0.02] text-center">
                <Key className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-500">Connect wallet to manage API keys</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-yellow-400" />
                    <h2 className="font-bold">API Key</h2>
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        1 per wallet
                    </span>
                </div>
                <button
                    onClick={fetchKeys}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">{error}</span>
                </div>
            )}

            {/* New Key Alert */}
            {newKey && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">API Key Generated!</span>
                    </div>
                    <p className="text-xs text-yellow-400 mb-3">
                        ⚠️ Save this key now! It will never be shown again.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/50 px-3 py-2 rounded text-sm font-mono text-green-400">
                            {showKey ? newKey : '••••••••••••••••••••••••••••'}
                        </code>
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="p-2 hover:bg-white/5 rounded"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(newKey)}
                            className="p-2 hover:bg-white/5 rounded"
                        >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {loading ? (
                <div className="p-6 border border-white/10 rounded-xl text-center">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-500" />
                </div>
            ) : hasActiveKey ? (
                /* Existing Key */
                <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="font-medium">{activeKey.name}</span>
                            </div>
                            <button
                                onClick={() => revokeKey(activeKey.id)}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                Revoke
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 text-xs block">Key Prefix</span>
                                <code className="text-purple-400">{activeKey.key_prefix}</code>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs block">Total Requests</span>
                                <span className="text-blue-400">{activeKey.total_requests.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs block">Created</span>
                                <span className="text-gray-400">{new Date(activeKey.created_at).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs block">Last Used</span>
                                <span className="text-gray-400">
                                    {activeKey.last_request_at
                                        ? new Date(activeKey.last_request_at).toLocaleDateString()
                                        : 'Never'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Usage Example */}
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <span className="text-xs text-gray-500 block mb-2">Usage</span>
                        <code className="text-xs text-gray-400 block bg-black/50 p-2 rounded overflow-x-auto">
                            curl -H "Authorization: Bearer YOUR_KEY" https://ans.domains/api/resolve?name=agent
                        </code>
                    </div>
                </div>
            ) : (
                /* No Key - Generate Button */
                <div className="p-6 border border-dashed border-white/20 rounded-xl text-center">
                    <Key className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400 mb-4">No API key yet</p>
                    <button
                        onClick={generateKey}
                        disabled={generating}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? 'Generating...' : 'Generate API Key'}
                    </button>
                    <p className="text-xs text-gray-600 mt-3">
                        You'll need to sign a message to prove wallet ownership
                    </p>
                </div>
            )}

            {/* Docs Link */}
            <div className="text-center">
                <a
                    href="/docs#api"
                    className="text-xs text-purple-400 hover:underline"
                >
                    📚 View API Documentation →
                </a>
            </div>
        </div>
    );
}
