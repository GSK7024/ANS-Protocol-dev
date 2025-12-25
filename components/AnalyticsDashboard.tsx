"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Eye, Star, Activity, ChevronDown, Download, RefreshCw } from 'lucide-react';

interface AnalyticsSummary {
    total_lookups: number;
    total_revenue: number;
    total_escrows: number;
    avg_srt: number;
}

interface DomainAnalytics {
    name: string;
    full_name: string;
    lookups: number;
    revenue: number;
    escrows: number;
    srt: number;
}

interface ComparisonMetric {
    metric: string;
    value_7d: number;
    value_30d: number;
    change_pct: number;
    vs_category_avg?: number;
}

interface DashboardData {
    wallet: string;
    network: string;
    period: string;
    total_domains: number;
    summary: AnalyticsSummary;
    domains: DomainAnalytics[];
    comparison?: ComparisonMetric[];
}

interface Props {
    network?: string;
}

export default function AnalyticsDashboard({ network = 'mainnet' }: Props) {
    const { publicKey } = useWallet();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30d');
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
    const [domainData, setDomainData] = useState<any>(null);
    const [showComparison, setShowComparison] = useState(true);

    useEffect(() => {
        if (publicKey) {
            fetchDashboard();
        } else {
            setLoading(false);
        }
    }, [publicKey, period, network]);

    const fetchDashboard = async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            const res = await fetch(
                `/api/analytics?wallet=${publicKey.toString()}&period=${period}&network=${network}`
            );
            const json = await res.json();

            if (res.ok) {
                setData(json);
                setError(null);
            } else {
                setError(json.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError('Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    const fetchDomainDetails = async (domainName: string) => {
        try {
            const res = await fetch(
                `/api/analytics?domain=${encodeURIComponent(domainName)}&period=${period}&network=${network}`
            );
            const json = await res.json();
            if (res.ok) {
                setDomainData(json);
            }
        } catch (err) {
            console.error('Failed to fetch domain details:', err);
        }
    };

    const handleDomainClick = (domain: DomainAnalytics) => {
        if (expandedDomain === domain.full_name) {
            setExpandedDomain(null);
            setDomainData(null);
        } else {
            setExpandedDomain(domain.full_name);
            fetchDomainDetails(domain.full_name);
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!data) return;

        const headers = ['Domain', 'Lookups', 'Revenue (SOL)', 'Escrows', 'SRT Score'];
        const rows = data.domains.map(d => [
            d.name,
            d.lookups.toString(),
            d.revenue.toString(),
            d.escrows.toString(),
            d.srt.toString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${network}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!publicKey) {
        return (
            <div className="p-6 border border-white/10 rounded-xl bg-white/[0.02] text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-500">Connect wallet to view analytics</p>
                <p className="text-xs text-gray-600 mt-2">💡 Tip: Integrate our resolve API to start tracking lookups</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 border border-white/10 rounded-xl bg-white/[0.02]">
                <div className="flex items-center justify-center gap-2">
                    <Activity className="w-5 h-5 animate-pulse text-purple-500" />
                    <span className="text-gray-400">Loading analytics...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border border-red-500/20 rounded-xl bg-red-900/5 text-center">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={fetchDashboard}
                    className="mt-3 text-sm text-purple-400 hover:underline flex items-center gap-1 mx-auto"
                >
                    <RefreshCw className="w-3 h-3" /> Try Again
                </button>
            </div>
        );
    }

    if (!data || data.total_domains === 0) {
        return (
            <div className="p-6 border border-white/10 rounded-xl bg-white/[0.02] text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-500">No analytics data yet</p>
                <p className="text-xs text-gray-600 mt-2 max-w-xs mx-auto">
                    💡 Data will appear once your domains receive traffic.
                    <br />Make sure your API calls use our <code className="text-purple-400">/api/resolve</code> endpoint.
                </p>
            </div>
        );
    }

    // Use real comparison data from API if available, otherwise default to 0
    const comparisonData: ComparisonMetric[] = data.comparison || [
        {
            metric: 'Lookups',
            value_7d: 0,
            value_30d: data.summary.total_lookups,
            change_pct: 0,
            vs_category_avg: 0
        },
        {
            metric: 'Revenue (SOL)',
            value_7d: 0,
            value_30d: data.summary.total_revenue,
            change_pct: 0,
            vs_category_avg: 0
        },
        {
            metric: 'Escrows',
            value_7d: 0,
            value_30d: data.summary.total_escrows,
            change_pct: 0,
            vs_category_avg: 0
        },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold">Analytics</h2>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                        {data.total_domains} domains
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Export Button */}
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <Download className="w-3 h-3" />
                        Export CSV
                    </button>

                    {/* Period Selector */}
                    <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                        {['7d', '30d', '90d'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${period === p
                                    ? 'bg-purple-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comparison Table (7d vs 30d with % change) */}
            {showComparison && (
                <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-400">📊 Period Comparison</span>
                        <button
                            onClick={() => setShowComparison(false)}
                            className="text-xs text-gray-500 hover:text-white"
                        >
                            Hide
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-xs border-b border-white/10">
                                <th className="text-left px-4 py-2">Metric</th>
                                <th className="text-center px-4 py-2">7d</th>
                                <th className="text-center px-4 py-2">30d</th>
                                <th className="text-center px-4 py-2">Change</th>
                                <th className="text-center px-4 py-2">vs Avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonData.map((row) => (
                                <tr key={row.metric} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-medium">{row.metric}</td>
                                    <td className="px-4 py-3 text-center text-gray-400">{row.value_7d}</td>
                                    <td className="px-4 py-3 text-center font-medium">{row.value_30d}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${row.change_pct > 0
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {row.change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {row.change_pct > 0 ? '+' : ''}{row.change_pct}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs ${(row.vs_category_avg || 0) >= 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                            }`}>
                                            {(row.vs_category_avg || 0) >= 0 ? '+' : ''}{row.vs_category_avg}% vs avg
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    icon={<Eye className="w-4 h-4" />}
                    label="Total Lookups"
                    value={data.summary.total_lookups.toLocaleString()}
                    color="blue"
                    change={comparisonData.find(c => c.metric === 'Lookups')?.change_pct}
                />
                <SummaryCard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Revenue"
                    value={`${data.summary.total_revenue} SOL`}
                    color="green"
                    change={comparisonData.find(c => c.metric === 'Revenue (SOL)')?.change_pct}
                />
                <SummaryCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Escrows"
                    value={data.summary.total_escrows.toString()}
                    color="purple"
                    change={comparisonData.find(c => c.metric === 'Escrows')?.change_pct}
                />
                <SummaryCard
                    icon={<Star className="w-4 h-4" />}
                    label="Avg SRT"
                    value={data.summary.avg_srt.toString()}
                    color="yellow"
                    // toggle off comparison for SRT if not supported by API yet
                    change={0}
                />
            </div>

            {/* Domain List */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 px-4 py-2 text-xs text-gray-500 grid grid-cols-5 gap-2">
                    <span>Domain</span>
                    <span className="text-center">Lookups</span>
                    <span className="text-center">Revenue</span>
                    <span className="text-center">Escrows</span>
                    <span className="text-center">SRT</span>
                </div>

                {data.domains.map((domain) => (
                    <div key={domain.full_name}>
                        <button
                            onClick={() => handleDomainClick(domain)}
                            className="w-full px-4 py-3 grid grid-cols-5 gap-2 items-center hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                            <span className="text-left font-mono text-sm flex items-center gap-2">
                                <ChevronDown
                                    className={`w-4 h-4 transition-transform ${expandedDomain === domain.full_name ? 'rotate-180' : ''
                                        }`}
                                />
                                <span className="text-purple-400">{domain.name}</span>
                            </span>
                            <span className="text-center text-blue-400">{domain.lookups}</span>
                            <span className="text-center text-green-400">{domain.revenue} SOL</span>
                            <span className="text-center text-purple-400">{domain.escrows}</span>
                            <span className="text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${domain.srt >= 80 ? 'bg-green-500/20 text-green-400' :
                                    domain.srt >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                        domain.srt > 0 ? 'bg-red-500/20 text-red-400' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {domain.srt || 'N/A'}
                                </span>
                            </span>
                        </button>

                        {/* Expanded Domain Details */}
                        {expandedDomain === domain.full_name && domainData && (
                            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
                                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                    <div>
                                        <span className="text-gray-500 text-xs block">Unique Lookups</span>
                                        <span className="text-blue-400">{domainData.summary?.unique_lookups || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Success Rate</span>
                                        <span className="text-green-400">{domainData.summary?.success_rate || 100}%</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Reviews</span>
                                        <span className="text-yellow-400">{domainData.summary?.total_reviews || 0}</span>
                                    </div>
                                </div>

                                {/* Recent Events */}
                                {domainData.recent_events && domainData.recent_events.length > 0 && (
                                    <div>
                                        <span className="text-xs text-gray-500 mb-2 block">Recent Activity</span>
                                        <div className="space-y-1">
                                            {domainData.recent_events.slice(0, 5).map((event: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">
                                                        {event.type === 'lookup' && '👁️ Lookup'}
                                                        {event.type === 'escrow_complete' && '✅ Escrow Complete'}
                                                        {event.type === 'escrow_create' && '📝 Escrow Created'}
                                                        {event.type === 'review' && '⭐ Review'}
                                                        {event.resolver && ` from ${event.resolver}`}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        {new Date(event.time).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    color,
    change
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'blue' | 'green' | 'purple' | 'yellow';
    change?: number;
}) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs text-gray-400">{label}</span>
                </div>
                {change !== undefined && (
                    <span className={`text-xs flex items-center gap-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            <span className="text-xl font-bold">{value}</span>
        </div>
    );
}
