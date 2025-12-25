"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2, User, Shield, Save, ChevronDown, ChevronUp, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import bs58 from 'bs58';

// Field categories and their fields
const VAULT_FIELDS = {
    personal: {
        label: "Personal Information",
        icon: "👤",
        fields: [
            { name: "full_name", label: "Full Name", type: "text", placeholder: "As per passport", sensitive: false },
            { name: "date_of_birth", label: "Date of Birth", type: "date", placeholder: "", sensitive: true },
            { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], sensitive: false },
            { name: "nationality", label: "Nationality", type: "text", placeholder: "Country of citizenship", sensitive: false },
        ]
    },
    contact: {
        label: "Contact Details",
        icon: "📧",
        fields: [
            { name: "email", label: "Email", type: "email", placeholder: "your@email.com", sensitive: true },
            { name: "phone", label: "Phone", type: "tel", placeholder: "+1 555 123 4567", sensitive: true },
            { name: "address", label: "Address", type: "textarea", placeholder: "Full residential address", sensitive: true },
        ]
    },
    travel: {
        label: "Travel Documents",
        icon: "✈️",
        fields: [
            { name: "passport_number", label: "Passport Number", type: "text", placeholder: "P1234567", sensitive: true },
            { name: "passport_expiry", label: "Passport Expiry", type: "date", placeholder: "", sensitive: true },
            { name: "passport_country", label: "Passport Country", type: "text", placeholder: "Issuing country", sensitive: false },
        ]
    },
    government_id: {
        label: "Government IDs",
        icon: "🪪",
        fields: [
            { name: "national_id", label: "National ID", type: "text", placeholder: "SSN, Aadhaar, NIN, etc.", sensitive: true },
            { name: "tax_id", label: "Tax ID", type: "text", placeholder: "PAN, SSN, TIN, VAT, etc.", sensitive: true },
            { name: "driving_license", label: "Driving License", type: "text", placeholder: "License number", sensitive: true },
        ]
    }
};

export default function PersonalVault() {
    const { publicKey, signMessage, connected } = useWallet();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ personal: true });
    const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasVault, setHasVault] = useState(false);

    // Load existing vault data when wallet connects
    useEffect(() => {
        if (publicKey && signMessage && connected) {
            loadVaultData();
        }
    }, [publicKey, connected]);

    const loadVaultData = async () => {
        if (!publicKey || !signMessage) return;

        setLoading(true);
        try {
            // Sign message for authentication
            const message = `Retrieve vault data for wallet ${publicKey.toString()}`;
            const encoded = new TextEncoder().encode(message);
            const signatureBytes = await signMessage(encoded);
            const signature = bs58.encode(signatureBytes);

            const response = await fetch('/api/vault/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: publicKey.toString(),
                    signature
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setFormData(data.data);
                    setHasVault(true);
                }
            }
        } catch (err) {
            console.log('No existing vault or load failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!publicKey || !signMessage) return;

        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            // Sign message for authentication
            const message = `Store vault data for wallet ${publicKey.toString()}`;
            const encoded = new TextEncoder().encode(message);
            const signatureBytes = await signMessage(encoded);
            const signature = bs58.encode(signatureBytes);

            const response = await fetch('/api/vault/store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: publicKey.toString(),
                    signature,
                    data: formData
                })
            });

            const result = await response.json();

            if (response.ok) {
                setSaved(true);
                setHasVault(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(result.error || 'Failed to save');
            }
        } catch (err) {
            setError('Failed to save vault data');
        } finally {
            setSaving(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleSensitive = (fieldName: string) => {
        setShowSensitive(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const updateField = (fieldName: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const filledFieldsCount = Object.values(formData).filter(v => v && v.length > 0).length;
    const totalFields = Object.values(VAULT_FIELDS).flatMap(cat => cat.fields).length;

    if (!connected || !publicKey) {
        return (
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Personal Vault</h2>
                </div>
                <p className="text-gray-500 text-center py-8">
                    Connect your wallet to access your Personal Vault
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Shield className="w-32 h-32 text-cyan-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-900/20 rounded-lg">
                        <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Personal Vault</h2>
                        <p className="text-sm text-gray-500">
                            Your identity data • Shared across all your agents
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-400">
                        {filledFieldsCount}/{totalFields} fields
                    </div>
                    <div className="h-2 w-24 bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
                            style={{ width: `${(filledFieldsCount / totalFields) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-500" />
                    <p className="text-gray-500 mt-2">Loading vault...</p>
                </div>
            ) : (
                <>
                    {/* Field Sections */}
                    <div className="space-y-4 mb-6">
                        {Object.entries(VAULT_FIELDS).map(([sectionKey, section]) => (
                            <div key={sectionKey} className="border border-white/10 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection(sectionKey)}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{section.icon}</span>
                                        <span className="font-medium text-white">{section.label}</span>
                                    </div>
                                    {expandedSections[sectionKey] ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>

                                {expandedSections[sectionKey] && (
                                    <div className="p-4 space-y-4 bg-black/20">
                                        {section.fields.map(field => (
                                            <div key={field.name} className="space-y-1">
                                                <label className="flex items-center gap-2 text-sm text-gray-400">
                                                    {field.label}
                                                    {field.sensitive && (
                                                        <span className="text-xs text-yellow-500/70">🔒</span>
                                                    )}
                                                </label>

                                                {field.type === 'select' ? (
                                                    <select
                                                        value={formData[field.name] || ''}
                                                        onChange={e => updateField(field.name, e.target.value)}
                                                        className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-cyan-500 outline-none"
                                                    >
                                                        <option value="">Select...</option>
                                                        {'options' in field && field.options?.map((opt: string) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : field.type === 'textarea' ? (
                                                    <textarea
                                                        value={formData[field.name] || ''}
                                                        onChange={e => updateField(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        rows={2}
                                                        className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white placeholder:text-gray-700 focus:border-cyan-500 outline-none resize-none"
                                                    />
                                                ) : (
                                                    <div className="relative">
                                                        <input
                                                            type={field.sensitive && !showSensitive[field.name] ? 'password' : field.type}
                                                            value={formData[field.name] || ''}
                                                            onChange={e => updateField(field.name, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className="w-full bg-black border border-white/10 rounded-md p-2 pr-10 text-sm text-white placeholder:text-gray-700 focus:border-cyan-500 outline-none"
                                                        />
                                                        {field.sensitive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleSensitive(field.name)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                                            >
                                                                {showSensitive[field.name] ? (
                                                                    <EyeOff className="w-4 h-4" />
                                                                ) : (
                                                                    <Eye className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status Messages */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {saved && (
                        <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                            <CheckCircle className="w-4 h-4" />
                            Vault saved! Data is shared across all your agents.
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || filledFieldsCount === 0}
                        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {saving ? 'Encrypting & Saving...' : 'Save to Vault'}
                    </button>

                    {/* Privacy Notice */}
                    <p className="text-xs text-gray-600 mt-4 text-center">
                        🔐 Your data is encrypted and shared across all agents in this wallet.
                        Only shared with sellers when you make a booking.
                    </p>
                </>
            )}
        </div>
    );
}
