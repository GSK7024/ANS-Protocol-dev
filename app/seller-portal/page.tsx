"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Building2, Shield, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import ClientWalletButton from '@/components/ClientWalletButton';

type Category = 'flights' | 'hotels' | 'ecommerce' | 'services' | 'other';

interface SellerFormData {
    agentName: string;
    displayName: string;
    description: string;
    category: Category;
    quoteUrl: string;
    bookUrl: string;
    webhookUrl: string;
    supportedRoutes: string;
    requiredFields: string[];
    optionalFields: string[];
}

const FIELD_OPTIONS = [
    'full_name', 'email', 'phone', 'dob', 'passport_number', 'aadhaar',
    'pan_card', 'address', 'city', 'country', 'postal_code'
];

export default function SellerPortal() {
    const { connected, publicKey } = useWallet();
    const [step, setStep] = useState<'info' | 'register' | 'success'>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<SellerFormData>({
        agentName: '',
        displayName: '',
        description: '',
        category: 'flights',
        quoteUrl: '',
        bookUrl: '',
        webhookUrl: '',
        supportedRoutes: '',
        requiredFields: ['full_name'],
        optionalFields: ['email', 'phone']
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connected || !publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/seller/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: formData.agentName,
                    seller_wallet: publicKey.toString(),
                    quote_url: formData.quoteUrl,
                    book_url: formData.bookUrl,
                    supported_routes: formData.supportedRoutes.split(',').map(r => r.trim()).filter(Boolean),
                    required_fields: formData.requiredFields,
                    optional_fields: formData.optionalFields,
                    display_name: formData.displayName,
                    description: formData.description,
                    category: formData.category,
                    stake_amount: 0 // Will stake later
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleField = (field: string, type: 'required' | 'optional') => {
        setFormData(prev => {
            const key = type === 'required' ? 'requiredFields' : 'optionalFields';
            const otherKey = type === 'required' ? 'optionalFields' : 'requiredFields';

            if (prev[key].includes(field)) {
                return { ...prev, [key]: prev[key].filter(f => f !== field) };
            } else {
                return {
                    ...prev,
                    [key]: [...prev[key], field],
                    [otherKey]: prev[otherKey].filter(f => f !== field)
                };
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header */}
            <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to ANS
                </Link>
                <div className="bg-white text-black rounded-full overflow-hidden">
                    <ClientWalletButton style={{
                        backgroundColor: 'white',
                        color: 'black',
                        height: '40px',
                        borderRadius: '999px',
                        fontWeight: '600',
                        fontSize: '14px',
                        padding: '0 20px'
                    }} />
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-purple-500/30 bg-purple-500/10 rounded text-xs font-mono text-purple-400">
                        <Building2 className="w-3 h-3" />
                        SELLER ONBOARDING
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Become an ANS Seller
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Register your service as an agent on ANS Protocol. Accept crypto payments,
                        build trust through reputation, and reach AI agents worldwide.
                    </p>
                </div>

                {step === 'info' && (
                    <>
                        {/* Benefits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <Shield className="w-8 h-8 text-green-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Escrow Protection</h3>
                                <p className="text-gray-400 text-sm">
                                    All transactions protected by smart contract escrow. Funds released only after service delivery.
                                </p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Instant Payments</h3>
                                <p className="text-gray-400 text-sm">
                                    Receive SOL, USDC, or ANS tokens instantly. No chargebacks, no middlemen.
                                </p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <Building2 className="w-8 h-8 text-purple-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Build Reputation</h3>
                                <p className="text-gray-400 text-sm">
                                    Earn trust through on-chain transactions. Higher reputation = more visibility.
                                </p>
                            </div>
                        </div>

                        {/* Requirements */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                            <h3 className="font-bold text-lg mb-4">Requirements</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Own an ANS domain (agent://your-name)
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Have a working API endpoint for quotes and bookings
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Stake minimum 5 SOL for trust verification
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Agree to ANS Protocol terms of service
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => setStep('register')}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
                        >
                            Start Registration
                        </button>
                    </>
                )}

                {step === 'register' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <span className="text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Basic Info */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Agent Name (your ANS domain)</label>
                                    <div className="flex">
                                        <span className="bg-white/10 text-gray-500 px-3 py-2 rounded-l-lg border border-r-0 border-white/10">agent://</span>
                                        <input
                                            type="text"
                                            value={formData.agentName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                            placeholder="your-name"
                                            className="flex-1 bg-black border border-white/10 rounded-r-lg px-4 py-2 outline-none focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        placeholder="Your Business Name"
                                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm text-gray-400 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe your service..."
                                    rows={3}
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500 resize-none"
                                    required
                                />
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm text-gray-400 mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                                >
                                    <option value="flights">✈️ Flights</option>
                                    <option value="hotels">🏨 Hotels</option>
                                    <option value="ecommerce">🛒 E-commerce</option>
                                    <option value="services">💼 Services</option>
                                    <option value="other">📦 Other</option>
                                </select>
                            </div>
                        </div>

                        {/* API Endpoints */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">API Endpoints</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Quote URL</label>
                                    <input
                                        type="url"
                                        value={formData.quoteUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quoteUrl: e.target.value }))}
                                        placeholder="https://api.yourdomain.com/quote"
                                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Book URL</label>
                                    <input
                                        type="url"
                                        value={formData.bookUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bookUrl: e.target.value }))}
                                        placeholder="https://api.yourdomain.com/book"
                                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Webhook URL (for order updates)</label>
                                    <input
                                        type="url"
                                        value={formData.webhookUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                                        placeholder="https://api.yourdomain.com/webhook"
                                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Required Fields */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">Customer Data Requirements</h3>
                            <p className="text-sm text-gray-400 mb-4">Select which customer fields you need to receive from the vault:</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {FIELD_OPTIONS.map(field => (
                                    <div key={field} className="flex flex-col gap-1">
                                        <span className="text-xs text-gray-500 capitalize">{field.replace('_', ' ')}</span>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleField(field, 'required')}
                                                className={`flex-1 text-[10px] py-1 rounded ${formData.requiredFields.includes(field)
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                                    }`}
                                            >
                                                Required
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleField(field, 'optional')}
                                                className={`flex-1 text-[10px] py-1 rounded ${formData.optionalFields.includes(field)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                                    }`}
                                            >
                                                Optional
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !connected}
                                className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Registering...
                                    </>
                                ) : !connected ? (
                                    'Connect Wallet First'
                                ) : (
                                    'Register as Seller'
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'success' && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Registration Complete!</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Your seller profile has been created. You'll start with INITIATE trust tier.
                            Complete transactions to build your reputation.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link href="/dashboard" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors">
                                Go to Dashboard
                            </Link>
                            <Link href="/docs" className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">
                                Read Integration Docs
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
