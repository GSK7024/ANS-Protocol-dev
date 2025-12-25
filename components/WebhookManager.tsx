"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/utils/supabase/client';
import {
    Webhook,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    Settings,
    Eye,
    Copy,
    Plus,
    Trash2
} from 'lucide-react';

interface WebhookConfig {
    id: string;
    url: string;
    events: string[];
    secret: string;
    active: boolean;
    created_at: string;
}

interface WebhookLog {
    id: string;
    url: string;
    webhook_type: string;
    status: string;
    response_status: number | null;
    attempts: number;
    last_error: string | null;
    created_at: string;
    completed_at: string | null;
}

const WEBHOOK_EVENTS = [
    { id: 'escrow.created', label: 'Escrow Created', description: 'When buyer initiates payment' },
    { id: 'escrow.locked', label: 'Escrow Locked', description: 'When funds are locked in escrow' },
    { id: 'escrow.released', label: 'Escrow Released', description: 'When payment is released to seller' },
    { id: 'escrow.refunded', label: 'Escrow Refunded', description: 'When payment is refunded to buyer' },
    { id: 'booking.created', label: 'Booking Created', description: 'When a new booking is made' },
    { id: 'booking.confirmed', label: 'Booking Confirmed', description: 'When booking is confirmed' },
    { id: 'booking.cancelled', label: 'Booking Cancelled', description: 'When booking is cancelled' },
];

export default function WebhookManager({ domain }: { domain: string }) {
    const { publicKey } = useWallet();
    const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (domain) {
            fetchWebhooks();
            fetchLogs();
        }
    }, [domain]);

    const fetchWebhooks = async () => {
        try {
            const { data, error } = await supabase
                .from('domain_webhooks')
                .select('*')
                .eq('domain_name', domain);

            if (!error && data) {
                setWebhooks(data);
            }
        } catch (err) {
            console.error('Failed to fetch webhooks:', err);
        }
        setLoading(false);
    };

    const fetchLogs = async () => {
        try {
            // Get webhook logs for this domain's escrow transactions
            const { data, error } = await supabase
                .from('webhook_queue')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    };

    const addWebhook = async () => {
        if (!newWebhook.url || newWebhook.events.length === 0) return;
        setSaving(true);

        try {
            // Generate a webhook secret
            const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');

            const { error } = await supabase
                .from('domain_webhooks')
                .insert({
                    domain_name: domain,
                    url: newWebhook.url,
                    events: newWebhook.events,
                    secret,
                    active: true
                });

            if (!error) {
                fetchWebhooks();
                setShowAddModal(false);
                setNewWebhook({ url: '', events: [] });
            }
        } catch (err) {
            console.error('Failed to add webhook:', err);
        }
        setSaving(false);
    };

    const toggleWebhook = async (id: string, active: boolean) => {
        await supabase
            .from('domain_webhooks')
            .update({ active: !active })
            .eq('id', id);
        fetchWebhooks();
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm('Delete this webhook endpoint?')) return;
        await supabase
            .from('domain_webhooks')
            .delete()
            .eq('id', id);
        fetchWebhooks();
    };

    const copySecret = (secret: string) => {
        navigator.clipboard.writeText(secret);
        alert('Secret copied to clipboard');
    };

    const retryWebhook = async (id: string) => {
        await supabase
            .from('webhook_queue')
            .update({
                status: 'pending',
                next_retry_at: new Date().toISOString(),
                attempts: 0
            })
            .eq('id', id);
        fetchLogs();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
            case 'failed':
                return <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
            case 'pending':
                return <span className="flex items-center gap-1 text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
            default:
                return <span className="text-gray-400">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-white/10 rounded"></div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-lg">Webhooks</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { fetchWebhooks(); fetchLogs(); }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Endpoint
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'config'
                            ? 'text-white border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Settings className="w-4 h-4 inline mr-1" />
                    Endpoints ({webhooks.length})
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'logs'
                            ? 'text-white border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Delivery Logs ({logs.length})
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'config' && (
                    <div className="space-y-3">
                        {webhooks.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No webhook endpoints configured</p>
                                <p className="text-sm mt-1">Add an endpoint to receive real-time notifications</p>
                            </div>
                        ) : (
                            webhooks.map(webhook => (
                                <div key={webhook.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${webhook.active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                                <span className="font-mono text-sm truncate">{webhook.url}</span>
                                            </div>
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {webhook.events.map(event => (
                                                    <span key={event} className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                                        {event}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button
                                                onClick={() => copySecret(webhook.secret)}
                                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                                title="Copy secret"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleWebhook(webhook.id, webhook.active)}
                                                className={`p-1.5 rounded transition-colors ${webhook.active ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'
                                                    }`}
                                                title={webhook.active ? 'Disable' : 'Enable'}
                                            >
                                                {webhook.active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteWebhook(webhook.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-2">
                                        Secret: <span className="font-mono">••••••••{webhook.secret.slice(-8)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-2">
                        {logs.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No webhook deliveries yet</p>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="bg-black/30 border border-white/10 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(log.status)}
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">{log.webhook_type}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="font-mono text-xs text-gray-400 truncate">{log.url}</div>
                                    {log.last_error && (
                                        <div className="text-[10px] text-red-400 mt-1 truncate">{log.last_error}</div>
                                    )}
                                    <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                                        <span>Attempts: {log.attempts} | Status: {log.response_status || 'N/A'}</span>
                                        {log.status === 'failed' && (
                                            <button
                                                onClick={() => retryWebhook(log.id)}
                                                className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add Webhook Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-md">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold">Add Webhook Endpoint</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Endpoint URL</label>
                                <input
                                    type="url"
                                    value={newWebhook.url}
                                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://api.yourdomain.com/webhook"
                                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Events to Subscribe</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {WEBHOOK_EVENTS.map(event => (
                                        <label key={event.id} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-white/5 rounded">
                                            <input
                                                type="checkbox"
                                                checked={newWebhook.events.includes(event.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewWebhook(prev => ({ ...prev, events: [...prev.events, event.id] }));
                                                    } else {
                                                        setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event.id) }));
                                                    }
                                                }}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <div className="text-sm font-medium">{event.label}</div>
                                                <div className="text-[10px] text-gray-500">{event.description}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={addWebhook}
                                disabled={saving || !newWebhook.url || newWebhook.events.length === 0}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
                            >
                                {saving ? 'Adding...' : 'Add Webhook'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
