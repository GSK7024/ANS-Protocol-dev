"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/utils/supabase/client';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

interface Transaction {
    id: string;
    buyer_wallet: string;
    amount: number;
    status: string;
    created_at: string;
    service_details: string;
}

interface SellerStats {
    totalRevenue: number;
    totalTransactions: number;
    successRate: number;
    avgTransactionValue: number;
    revenueChange: number;
    pendingEscrows: number;
}

export default function SellerAnalytics({ domain }: { domain: string }) {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        if (domain) {
            fetchAnalytics();
        }
    }, [domain, period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Get escrow transactions for this seller
            const startDate = new Date();
            if (period === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
            else startDate.setDate(startDate.getDate() - 90);

            const { data: escrows, error } = await supabase
                .from('escrow_transactions')
                .select('*')
                .eq('seller_agent', domain)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Calculate stats
            const completedEscrows = (escrows || []).filter(e => e.status === 'released');
            const failedEscrows = (escrows || []).filter(e => e.status === 'refunded' || e.status === 'failed');
            const pendingEscrows = (escrows || []).filter(e => e.status === 'locked' || e.status === 'pending');

            const totalRevenue = completedEscrows.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalTransactions = (escrows || []).length;
            const successRate = totalTransactions > 0
                ? (completedEscrows.length / totalTransactions) * 100
                : 0;
            const avgTransactionValue = completedEscrows.length > 0
                ? totalRevenue / completedEscrows.length
                : 0;

            // Calculate previous period for comparison
            const prevStartDate = new Date(startDate);
            if (period === '7d') prevStartDate.setDate(prevStartDate.getDate() - 7);
            else if (period === '30d') prevStartDate.setDate(prevStartDate.getDate() - 30);
            else prevStartDate.setDate(prevStartDate.getDate() - 90);

            const { data: prevEscrows } = await supabase
                .from('escrow_transactions')
                .select('amount, status')
                .eq('seller_agent', domain)
                .eq('status', 'released')
                .gte('created_at', prevStartDate.toISOString())
                .lt('created_at', startDate.toISOString());

            const prevRevenue = (prevEscrows || []).reduce((sum, e) => sum + (e.amount || 0), 0);
            const revenueChange = prevRevenue > 0
                ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
                : 0;

            setStats({
                totalRevenue,
                totalTransactions,
                successRate,
                avgTransactionValue,
                revenueChange,
                pendingEscrows: pendingEscrows.length
            });

            setTransactions((escrows || []).slice(0, 10) as Transaction[]);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        }
        setLoading(false);
    };

    const formatSol = (amount: number) => {
        return `${amount.toFixed(2)} SOL`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'released':
                return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
            case 'refunded':
                return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Refunded</span>;
            case 'locked':
                return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock className="w-3 h-3" /> In Escrow</span>;
            case 'pending':
                return <span className="flex items-center gap-1 text-blue-400 text-xs"><Clock className="w-3 h-3" /> Pending</span>;
            default:
                return <span className="text-gray-400 text-xs">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-white/10 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-lg">Seller Analytics</h3>
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
                        className="bg-black border border-white/10 rounded-lg px-2 py-1 text-sm"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <button
                        onClick={fetchAnalytics}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        {stats && stats.revenueChange !== 0 && (
                            <span className={`flex items-center text-xs ${stats.revenueChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.revenueChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(stats.revenueChange).toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats ? formatSol(stats.totalRevenue) : '-'}
                    </div>
                    <div className="text-xs text-gray-500">Total Revenue</div>
                </div>

                {/* Transactions */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <ShoppingCart className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats?.totalTransactions || 0}
                    </div>
                    <div className="text-xs text-gray-500">Total Orders</div>
                </div>

                {/* Success Rate */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats ? `${stats.successRate.toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                </div>

                {/* Pending */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats?.pendingEscrows || 0}
                    </div>
                    <div className="text-xs text-gray-500">Pending Escrows</div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="p-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-gray-400 mb-3">Recent Transactions</h4>
                {transactions.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        No transactions yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(tx.status)}
                                        <span className="text-sm font-mono truncate text-gray-400">
                                            {tx.buyer_wallet.slice(0, 8)}...{tx.buyer_wallet.slice(-4)}
                                        </span>
                                    </div>
                                    {tx.service_details && (
                                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                            {tx.service_details}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white">{formatSol(tx.amount)}</div>
                                    <div className="text-[10px] text-gray-500">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
