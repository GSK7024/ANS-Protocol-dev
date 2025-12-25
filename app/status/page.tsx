"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, Server, Zap } from 'lucide-react';

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    services: {
        database: 'up' | 'down';
    };
    latency: {
        database: number;
    };
}

export default function StatusPage() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            setHealth(data);
            setError(null);
            setLastChecked(new Date());
        } catch (err) {
            setError('Failed to fetch health status');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'up':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'degraded':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'unhealthy':
            case 'down':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'up':
                return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'degraded':
                return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'unhealthy':
            case 'down':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            default:
                return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header */}
            <nav className="flex justify-between items-center p-6 max-w-4xl mx-auto border-b border-white/5">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to ANS
                </Link>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">System Status</h1>
                    <p className="text-gray-400">
                        Real-time status of ANS Protocol services
                    </p>
                </div>

                {error ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* Overall Status */}
                        <div className={`rounded-xl p-6 mb-8 border ${health ? getStatusColor(health.status) : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {health ? getStatusIcon(health.status) : <div className="w-5 h-5 bg-gray-600 rounded-full animate-pulse" />}
                                    <div>
                                        <h2 className="text-xl font-bold capitalize">
                                            {health?.status || 'Checking...'}
                                        </h2>
                                        <p className="text-sm text-gray-400">
                                            All systems {health?.status === 'healthy' ? 'operational' : 'experiencing issues'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    <div>v{health?.version || '...'}</div>
                                    {lastChecked && (
                                        <div>Checked: {lastChecked.toLocaleTimeString()}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Services */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-400 mb-4">Services</h3>

                            {/* Database */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <div className="font-medium">Database</div>
                                        <div className="text-sm text-gray-500">Supabase PostgreSQL</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {health?.latency?.database && (
                                        <span className="text-sm text-gray-500">{health.latency.database}ms</span>
                                    )}
                                    {health ? getStatusIcon(health.services.database) : <div className="w-5 h-5 bg-gray-600 rounded-full animate-pulse" />}
                                </div>
                            </div>

                            {/* API */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Server className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <div className="font-medium">API</div>
                                        <div className="text-sm text-gray-500">Next.js API Routes</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {health ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <div className="w-5 h-5 bg-gray-600 rounded-full animate-pulse" />
                                    )}
                                </div>
                            </div>

                            {/* Blockchain */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-yellow-400" />
                                    <div>
                                        <div className="font-medium">Blockchain</div>
                                        <div className="text-sm text-gray-500">Solana Network</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <a
                                        href="https://status.solana.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-purple-400 hover:underline"
                                    >
                                        View Solana Status →
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Uptime Note */}
                        <div className="mt-12 text-center text-sm text-gray-500">
                            <p>Status is updated every 30 seconds.</p>
                            <p className="mt-1">For incidents, check our <a href="https://twitter.com/ansprotocol" className="text-purple-400 hover:underline">Twitter</a>.</p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
