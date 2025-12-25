/**
 * Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
    validateAgentName,
    validateWallet,
    validateAmount,
    validateRating,
    sanitizeText,
    validateEscrowInput,
} from './validation';

describe('Agent Name Validation', () => {
    describe('validateAgentName', () => {
        it('should accept valid agent names', () => {
            expect(validateAgentName('myagent').valid).toBe(true);
            expect(validateAgentName('agent123').valid).toBe(true);
            expect(validateAgentName('my-agent').valid).toBe(true);
            expect(validateAgentName('my.agent').valid).toBe(true);
        });

        it('should reject names too short', () => {
            const result = validateAgentName('ab');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('short');
        });

        it('should reject names too long', () => {
            const result = validateAgentName('a'.repeat(40));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('long');
        });

        it('should reject blocked characters', () => {
            expect(validateAgentName('test<script>').valid).toBe(false);
            expect(validateAgentName("test'or").valid).toBe(false);
            expect(validateAgentName('test;drop').valid).toBe(false);
        });

        it('should reject reserved prefixes', () => {
            expect(validateAgentName('admin-test').valid).toBe(false);
            expect(validateAgentName('system123').valid).toBe(false);
        });

        it('should sanitize and lowercase input', () => {
            const result = validateAgentName('  MyAgent  ');
            expect(result.sanitized).toBe('myagent');
        });
    });
});

describe('Wallet Validation', () => {
    describe('validateWallet', () => {
        it('should accept valid Solana addresses', () => {
            // Valid base58 format
            const result = validateWallet('7xKXtg2CV1vxGg7HJBqHiE2NuRbGtQ1W9TGGWTdz9mJf');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid wallet formats', () => {
            expect(validateWallet('invalid').valid).toBe(false);
            expect(validateWallet('0x1234567890abcdef').valid).toBe(false); // Ethereum format
            expect(validateWallet('').valid).toBe(false);
        });

        it('should reject wallets with invalid characters', () => {
            // Base58 doesn't include 0, O, I, l
            expect(validateWallet('0xKXtg2CV1vxGg7HJBqHiE2NuRbGtQ1W9TGGWTdz9mJf').valid).toBe(false);
        });
    });
});

describe('Amount Validation', () => {
    describe('validateAmount', () => {
        it('should accept valid amounts', () => {
            expect(validateAmount(1.5).valid).toBe(true);
            expect(validateAmount(100).valid).toBe(true);
            expect(validateAmount('0.001').valid).toBe(true);
        });

        it('should reject zero or negative amounts', () => {
            expect(validateAmount(0).valid).toBe(false);
            expect(validateAmount(-1).valid).toBe(false);
        });

        it('should reject non-numeric values', () => {
            expect(validateAmount('abc').valid).toBe(false);
            expect(validateAmount(NaN).valid).toBe(false);
        });

        it('should reject amounts over maximum', () => {
            expect(validateAmount(2000000).valid).toBe(false);
        });

        it('should round to Solana precision', () => {
            const result = validateAmount(1.123456789123);
            expect(result.valid).toBe(true);
            // Should round to 9 decimal places
        });
    });
});

describe('Rating Validation', () => {
    describe('validateRating', () => {
        it('should accept ratings 1-5', () => {
            expect(validateRating(1).valid).toBe(true);
            expect(validateRating(3).valid).toBe(true);
            expect(validateRating(5).valid).toBe(true);
        });

        it('should reject out of range ratings', () => {
            expect(validateRating(0).valid).toBe(false);
            expect(validateRating(6).valid).toBe(false);
        });

        it('should handle string input', () => {
            expect(validateRating('4').valid).toBe(true);
        });
    });
});

describe('Text Sanitization', () => {
    describe('sanitizeText', () => {
        it('should remove script tags', () => {
            const result = sanitizeText('Hello <script>alert("xss")</script> World');
            expect(result.sanitized).not.toContain('script');
            expect(result.sanitized).toContain('Hello');
            expect(result.sanitized).toContain('World');
        });

        it('should remove HTML tags', () => {
            const result = sanitizeText('<b>Bold</b> text');
            expect(result.sanitized).not.toContain('<b>');
        });

        it('should remove javascript: protocol', () => {
            const result = sanitizeText('javascript:alert(1)');
            expect(result.sanitized).not.toContain('javascript:');
        });

        it('should truncate long text', () => {
            const longText = 'a'.repeat(1000);
            const result = sanitizeText(longText, 100);
            expect(result.sanitized?.length).toBe(100);
        });

        it('should handle empty input', () => {
            expect(sanitizeText('').valid).toBe(true);
            expect(sanitizeText('').sanitized).toBe('');
        });
    });
});

describe('Escrow Input Validation', () => {
    describe('validateEscrowInput', () => {
        it('should accept valid escrow data', () => {
            const result = validateEscrowInput({
                buyer_wallet: '7xKXtg2CV1vxGg7HJBqHiE2NuRbGtQ1W9TGGWTdz9mJf',
                seller_agent: 'agent://marriott',
                amount: 2.5,
            });
            expect(result.valid).toBe(true);
        });

        it('should reject invalid wallet', () => {
            const result = validateEscrowInput({
                buyer_wallet: 'invalid',
                seller_agent: 'agent://marriott',
                amount: 2.5,
            });
            expect(result.valid).toBe(false);
        });

        it('should reject invalid amount', () => {
            const result = validateEscrowInput({
                buyer_wallet: '7xKXtg2CV1vxGg7HJBqHiE2NuRbGtQ1W9TGGWTdz9mJf',
                seller_agent: 'agent://marriott',
                amount: -1,
            });
            expect(result.valid).toBe(false);
        });
    });
});
