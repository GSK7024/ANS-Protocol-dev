/**
 * Economic Tiers Configuration
 * Defines the "Stake-for-Capacity" rules.
 */

export type TierLevel = 'micro' | 'standard' | 'premium';

export interface TierConfig {
    id: TierLevel;
    label: string;
    description: string;
    stake_sol: number;
    transaction_limit_usd: number;
    features: string[];
}

export const TIERS: Record<TierLevel, TierConfig> = {
    micro: {
        id: 'micro',
        label: 'Micro-Merchant',
        description: 'Perfect for small vendors & hobbyists.',
        stake_sol: 0.1,
        transaction_limit_usd: 100,
        features: [
            'Basic Profile',
            'Low Transaction Limit ($100)',
            'Community Support'
        ]
    },
    standard: {
        id: 'standard',
        label: 'Standard Business',
        description: 'For freelancers and growing shops.',
        stake_sol: 2.0,
        transaction_limit_usd: 5000,
        features: [
            'Verified Badge',
            'Medium Limit ($5,000)',
            'Priority Indexing'
        ]
    },
    premium: {
        id: 'premium',
        label: 'Global Brand',
        description: 'For enterprise and high-volume agents.',
        stake_sol: 100.0,
        transaction_limit_usd: Infinity, // Unlimited
        features: [
            'Gold Verification',
            'Unlimited Transactions',
            'Legal Recourse',
            'Dedicated API Nodes'
        ]
    }
};

export function getTierForStake(solAmount: number): TierConfig {
    if (solAmount >= TIERS.premium.stake_sol) return TIERS.premium;
    if (solAmount >= TIERS.standard.stake_sol) return TIERS.standard;
    return TIERS.micro;
}
