/**
 * ANS Fee Configuration
 * 
 * Fee Structure:
 * - Pay with $ANS: 0% ANS fee (only Solana network fee ~$0.001)
 * - Pay with SOL: Configurable fee (currently 0% at launch)
 * 
 * Solana network fee (~0.000005 SOL) applies to ALL transactions - unavoidable.
 */

// Solana network fee (approximate, varies slightly)
export const SOLANA_NETWORK_FEE = 0.000005; // ~$0.001 USD

export const ANS_CONFIG = {
    // Fee toggle - set to true when ready to charge SOL users
    feeEnabled: process.env.ANS_FEE_ENABLED === 'true',

    // Fee percentage for SOL payments (0.5 = 0.5%)
    solFeePercent: parseFloat(process.env.ANS_FEE_PERCENT || '0.5'),

    // Fee percentage for ANS token payments (ALWAYS 0%)
    ansFeePercent: 0,

    // Treasury wallet for fee collection
    treasuryWallet: '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',

    // ANS Token mint address (mainnet - update if needed)
    ansTokenMint: 'ANSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // TODO: Replace with real mint
};

// Calculate fee based on payment method
export function calculateFee(amount: number, paymentMethod: 'SOL' | 'ANS'): {
    grossAmount: number;
    ansFee: number;
    solanaNetworkFee: number;
    netToSeller: number;
    feePercent: number;
    paymentMethod: string;
} {
    // ANS token payments = 0% ANS fee (always!)
    if (paymentMethod === 'ANS') {
        return {
            grossAmount: amount,
            ansFee: 0,
            solanaNetworkFee: SOLANA_NETWORK_FEE,
            netToSeller: amount,
            feePercent: 0,
            paymentMethod: 'ANS'
        };
    }

    // SOL payments = configurable fee
    const ansFee = ANS_CONFIG.feeEnabled
        ? amount * (ANS_CONFIG.solFeePercent / 100)
        : 0;

    return {
        grossAmount: amount,
        ansFee,
        solanaNetworkFee: SOLANA_NETWORK_FEE,
        netToSeller: amount - ansFee,
        feePercent: ANS_CONFIG.feeEnabled ? ANS_CONFIG.solFeePercent : 0,
        paymentMethod: 'SOL'
    };
}

// Get fee breakdown for display to users
export function getFeeBreakdown(amount: number, paymentMethod: 'SOL' | 'ANS' = 'SOL') {
    return calculateFee(amount, paymentMethod);
}

// Format fee message for users
export function getFeeMessage(paymentMethod: 'SOL' | 'ANS'): string {
    if (paymentMethod === 'ANS') {
        return `Network fee: ~${SOLANA_NETWORK_FEE} SOL (~$0.001) | ANS Protocol fee: 0%`;
    }

    if (ANS_CONFIG.feeEnabled) {
        return `Network fee: ~${SOLANA_NETWORK_FEE} SOL (~$0.001) | ANS Protocol fee: ${ANS_CONFIG.solFeePercent}%`;
    }

    return `Network fee: ~${SOLANA_NETWORK_FEE} SOL (~$0.001) | ANS Protocol fee: 0%`;
}
