/**
 * Production Configuration Module
 * Phase 22: Environment validation and mainnet setup
 */

export interface ProductionConfig {
    network: 'devnet' | 'mainnet-beta';
    rpcUrl: string;
    vaultWallet: string;
    isProduction: boolean;
}

export function getProductionConfig(): ProductionConfig {
    const isProduction = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';

    return {
        network: isProduction ? 'mainnet-beta' : 'devnet',
        rpcUrl: isProduction
            ? (process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com')
            : (process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'),
        vaultWallet: process.env.NEXT_PUBLIC_VAULT_WALLET || '',
        isProduction
    };
}

/**
 * Validates all required environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_VAULT_WALLET'
    ];

    for (const key of required) {
        if (!process.env[key]) {
            errors.push(`Missing required env var: ${key}`);
        }
    }

    // Validate wallet format (basic check)
    const vaultWallet = process.env.NEXT_PUBLIC_VAULT_WALLET;
    if (vaultWallet && (vaultWallet.length < 32 || vaultWallet.length > 44)) {
        errors.push('NEXT_PUBLIC_VAULT_WALLET appears to be invalid');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Production-ready error wrapper
 */
export class NexusError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, code: string, statusCode = 500, isOperational = true) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const ErrorCodes = {
    INVALID_REQUEST: 'INVALID_REQUEST',
    AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
    ESCROW_NOT_FOUND: 'ESCROW_NOT_FOUND',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};
