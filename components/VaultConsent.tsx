'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Check, X, User, Lock, Clock } from 'lucide-react';

interface ConsentRequest {
    id: string;
    from: string;
    for_seller: string;
    seller_display_name?: string;
    fields: string[];
    purpose: string;
    context?: {
        route?: string;
        date?: string;
    };
    seller_trust?: number;
    seller_stake?: number;
    expires_at: string;
}

interface SellerInfo {
    name: string;
    displayName: string;
    trustScore: number;
    trustTier: string;
    stakeAmount: number;
    isVerified: boolean;
}

interface VaultConsentModalProps {
    request: ConsentRequest;
    sellerInfo?: SellerInfo;
    onApprove: (consentId: string, fieldsApproved: string[]) => void;
    onDeny: (consentId: string) => void;
    onClose: () => void;
}

export function VaultConsentModal({
    request,
    sellerInfo,
    onApprove,
    onDeny,
    onClose
}: VaultConsentModalProps) {
    const [selectedFields, setSelectedFields] = useState<string[]>(request.fields);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const trustScore = sellerInfo?.trustScore || request.seller_trust || 0;
    const trustPercent = Math.round(trustScore * 100);
    const trustTier = sellerInfo?.trustTier ||
        (trustScore >= 0.8 ? 'master' : trustScore >= 0.5 ? 'adept' : 'initiate');

    const handleApprove = async () => {
        setIsSubmitting(true);
        await onApprove(request.id, selectedFields);
        setIsSubmitting(false);
    };

    const handleDeny = async () => {
        setIsSubmitting(true);
        await onDeny(request.id);
        setIsSubmitting(false);
    };

    const toggleField = (field: string) => {
        setSelectedFields(prev =>
            prev.includes(field)
                ? prev.filter(f => f !== field)
                : [...prev, field]
        );
    };

    const getTrustColor = () => {
        if (trustScore >= 0.8) return 'text-green-400';
        if (trustScore >= 0.5) return 'text-blue-400';
        if (trustScore >= 0.3) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getTrustBadge = () => {
        if (trustTier === 'master') return '🟡';
        if (trustTier === 'adept') return '🔵';
        return '⚪';
    };

    const formatFieldName = (field: string) => {
        const labels: Record<string, string> = {
            'full_name': 'Full Name',
            'firstName': 'First Name',
            'lastName': 'Last Name',
            'dob': 'Date of Birth',
            'dateOfBirth': 'Date of Birth',
            'email': 'Email Address',
            'phone': 'Phone Number',
            'passport_number': 'Passport Number',
            'gender': 'Gender',
            'address': 'Address'
        };
        return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a2e] border border-cyan-500/30 rounded-xl max-w-md w-full shadow-2xl shadow-cyan-500/10">
                {/* Header */}
                <div className="p-4 border-b border-cyan-500/20 flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Vault Access Request</h2>
                        <p className="text-sm text-gray-400">Review before sharing your data</p>
                    </div>
                </div>

                {/* Seller Info */}
                <div className="p-4 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{getTrustBadge()}</span>
                            <span className="font-medium text-white">
                                {sellerInfo?.displayName || request.for_seller}
                            </span>
                            {sellerInfo?.isVerified && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    ✓ Verified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Trust Score Bar */}
                    <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Trust Score</span>
                            <span className={getTrustColor()}>{trustPercent}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${trustScore >= 0.8 ? 'bg-green-500' :
                                        trustScore >= 0.5 ? 'bg-blue-500' :
                                            trustScore >= 0.3 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${trustPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Stake Amount */}
                    {(sellerInfo?.stakeAmount || request.seller_stake) && (
                        <div className="text-xs text-gray-400">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Stake: {sellerInfo?.stakeAmount || request.seller_stake} SOL
                        </div>
                    )}
                </div>

                {/* Purpose */}
                {request.context && (
                    <div className="px-4 py-3 bg-purple-500/5 border-b border-cyan-500/10">
                        <p className="text-sm text-gray-300">
                            <span className="text-gray-500">For:</span> {request.purpose}
                            {request.context.route && ` • ${request.context.route}`}
                            {request.context.date && ` • ${request.context.date}`}
                        </p>
                    </div>
                )}

                {/* Fields to Share */}
                <div className="p-4">
                    <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Data to be shared:
                    </p>
                    <div className="space-y-2">
                        {request.fields.map(field => (
                            <label
                                key={field}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFields.includes(field)}
                                    onChange={() => toggleField(field)}
                                    className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-gray-700"
                                />
                                <span className="text-gray-200">{formatFieldName(field)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Warning for low trust */}
                {trustScore < 0.5 && (
                    <div className="mx-4 mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-200">
                            This seller has a low trust score. Consider carefully before sharing sensitive data.
                        </p>
                    </div>
                )}

                {/* Expiry */}
                <div className="px-4 pb-2 text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires: {new Date(request.expires_at).toLocaleString()}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-cyan-500/20 flex gap-3">
                    <button
                        onClick={handleDeny}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                        Deny
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isSubmitting || selectedFields.length === 0}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                        Approve ({selectedFields.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

// Inline consent card for chat messages
interface ConsentCardProps {
    request: ConsentRequest;
    onApprove: () => void;
    onDeny: () => void;
    status?: 'pending' | 'approved' | 'denied';
}

export function ConsentCard({ request, onApprove, onDeny, status = 'pending' }: ConsentCardProps) {
    if (status === 'approved') {
        return (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-200 text-sm">
                    Vault access approved for {request.for_seller}
                </span>
            </div>
        );
    }

    if (status === 'denied') {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                <X className="w-5 h-5 text-red-400" />
                <span className="text-red-200 text-sm">
                    Vault access denied for {request.for_seller}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
                <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-white font-medium">Vault Access Request</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {request.for_seller} wants access to: {request.fields.join(', ')}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onDeny}
                    className="px-3 py-1.5 text-xs rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                    Deny
                </button>
                <button
                    onClick={onApprove}
                    className="px-3 py-1.5 text-xs rounded bg-cyan-500 text-white hover:bg-cyan-600"
                >
                    Approve
                </button>
            </div>
        </div>
    );
}
