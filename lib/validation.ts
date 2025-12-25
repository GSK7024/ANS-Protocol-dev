/**
 * Enterprise Input Validation Layer
 * 
 * Validates and sanitizes all user input to prevent:
 * - SQL Injection
 * - XSS attacks
 * - Invalid data corruption
 * - Name squatting attacks
 */

// Agent name validation
const AGENT_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,30}[a-z0-9]$/;
const RESERVED_PREFIXES = ['admin', 'system', 'nexus', 'ans', 'god', 'root', 'api'];
const BLOCKED_PATTERNS = ['<', '>', '{', '}', '[', ']', '|', '\\', ';', "'", '"', '`', '$', '!', '@', '#', '%', '^', '&', '*', '(', ')'];

// Wallet validation (Solana base58)
const SOLANA_WALLET_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface ValidationResult {
    valid: boolean;
    sanitized?: string;
    error?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Validate agent name
 */
export function validateAgentName(name: string): ValidationResult {
    // Trim and lowercase
    const sanitized = name.trim().toLowerCase();

    // Check length
    if (sanitized.length < 3) {
        return { valid: false, error: 'Name too short (min 3 chars)', severity: 'low' };
    }
    if (sanitized.length > 32) {
        return { valid: false, error: 'Name too long (max 32 chars)', severity: 'low' };
    }

    // Check for blocked characters (potential injection)
    for (const char of BLOCKED_PATTERNS) {
        if (sanitized.includes(char)) {
            return {
                valid: false,
                error: `Invalid character: ${char}`,
                severity: 'high' // Potential attack
            };
        }
    }

    // Check regex pattern
    if (!AGENT_NAME_REGEX.test(sanitized)) {
        return {
            valid: false,
            error: 'Name must be alphanumeric with dots/hyphens only',
            severity: 'low'
        };
    }

    // Check reserved prefixes
    for (const prefix of RESERVED_PREFIXES) {
        if (sanitized.startsWith(prefix) && !sanitized.startsWith('user.')) {
            return {
                valid: false,
                error: `Reserved prefix: ${prefix}`,
                severity: 'medium'
            };
        }
    }

    // Check for confusing patterns (homograph attacks)
    if (sanitized.includes('..') || sanitized.includes('--')) {
        return { valid: false, error: 'Invalid consecutive separators', severity: 'medium' };
    }

    return { valid: true, sanitized };
}

/**
 * Validate Solana wallet address
 */
export function validateWallet(wallet: string): ValidationResult {
    const trimmed = wallet.trim();

    if (!SOLANA_WALLET_REGEX.test(trimmed)) {
        return {
            valid: false,
            error: 'Invalid Solana wallet format',
            severity: 'medium'
        };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * Validate and sanitize escrow amount
 */
export function validateAmount(amount: any): ValidationResult {
    const num = parseFloat(amount);

    if (isNaN(num)) {
        return { valid: false, error: 'Amount must be a number', severity: 'low' };
    }

    if (num <= 0) {
        return { valid: false, error: 'Amount must be positive', severity: 'low' };
    }

    if (num > 1000000) { // 1M SOL cap
        return { valid: false, error: 'Amount exceeds maximum', severity: 'medium' };
    }

    // Round to 9 decimal places (Solana precision)
    const sanitized = Math.round(num * 1e9) / 1e9;

    return { valid: true, sanitized: sanitized.toString() };
}

/**
 * Validate review rating
 */
export function validateRating(rating: any): ValidationResult {
    const num = parseInt(rating);

    if (isNaN(num) || num < 1 || num > 5) {
        return { valid: false, error: 'Rating must be 1-5', severity: 'low' };
    }

    return { valid: true, sanitized: num.toString() };
}

/**
 * Sanitize free-text input (comments, descriptions)
 */
export function sanitizeText(text: string, maxLength: number = 500): ValidationResult {
    if (!text || typeof text !== 'string') {
        return { valid: true, sanitized: '' };
    }

    // Remove potential script tags and HTML
    let sanitized = text
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();

    // Truncate to max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return { valid: true, sanitized };
}

/**
 * Validate all escrow creation inputs
 */
export function validateEscrowInput(data: {
    buyer_wallet: string;
    seller_agent: string;
    amount: number;
}): ValidationResult {
    const walletCheck = validateWallet(data.buyer_wallet);
    if (!walletCheck.valid) return walletCheck;

    const agentCheck = validateAgentName(data.seller_agent.replace('agent://', ''));
    if (!agentCheck.valid) return agentCheck;

    const amountCheck = validateAmount(data.amount);
    if (!amountCheck.valid) return amountCheck;

    return { valid: true };
}
