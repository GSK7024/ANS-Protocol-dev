/**
 * Genesis Constants Tests
 */

import { describe, it, expect } from 'vitest';
import {
    getDomainPrice,
    isValidDomainName,
    isUserSubdomain,
    getUsernameFromSubdomain,
    RESTRICTED_NAMES,
    CROWN_JEWELS,
    FREE_USER_PREFIX
} from './genesis_constants';

describe('Domain Pricing', () => {
    describe('getDomainPrice', () => {
        it('should price 1 char domains at 10 SOL', () => {
            const result = getDomainPrice('a');
            expect(result.price).toBe(10);
            expect(result.tier).toContain('1 char');
        });

        it('should price 2 char domains at 5 SOL', () => {
            const result = getDomainPrice('ai');
            expect(result.price).toBe(5);
            expect(result.tier).toContain('2 char');
        });

        it('should price 3 char domains at 2.5 SOL', () => {
            const result = getDomainPrice('bot');
            expect(result.price).toBe(2.5);
        });

        it('should price 4 char domains at 1 SOL', () => {
            const result = getDomainPrice('test');
            expect(result.price).toBe(1);
        });

        it('should price 5 char domains at 0.5 SOL', () => {
            const result = getDomainPrice('hello');
            expect(result.price).toBe(0.5);
        });

        it('should price 6+ char domains at 0.25 SOL', () => {
            const result = getDomainPrice('myagent');
            expect(result.price).toBe(0.25);
            expect(result.tier).toContain('6+');
        });

        it('should include strike price for discount display', () => {
            const result = getDomainPrice('test');
            expect(result.strike).toBeDefined();
            expect(result.strike).toBeGreaterThan(result.price);
        });
    });
});

describe('Domain Validation', () => {
    describe('isValidDomainName', () => {
        it('should accept valid domain names', () => {
            expect(isValidDomainName('myagent').valid).toBe(true);
            expect(isValidDomainName('agent123').valid).toBe(true);
            expect(isValidDomainName('my-agent').valid).toBe(true);
            expect(isValidDomainName('user.john').valid).toBe(true);
        });

        it('should reject empty names', () => {
            const result = isValidDomainName('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('short');
        });

        it('should reject names over 32 characters', () => {
            const longName = 'a'.repeat(33);
            const result = isValidDomainName(longName);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('long');
        });

        it('should reject consecutive dots', () => {
            const result = isValidDomainName('user..name');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('dots');
        });

        it('should reject uppercase letters', () => {
            const result = isValidDomainName('MyAgent');
            expect(result.valid).toBe(false);
        });
    });
});

describe('User Subdomains', () => {
    describe('isUserSubdomain', () => {
        it('should identify user subdomains', () => {
            expect(isUserSubdomain('user.john')).toBe(true);
            expect(isUserSubdomain('user.mybot')).toBe(true);
        });

        it('should reject non-user domains', () => {
            expect(isUserSubdomain('myagent')).toBe(false);
            expect(isUserSubdomain('users.john')).toBe(false);
        });
    });

    describe('getUsernameFromSubdomain', () => {
        it('should extract username', () => {
            expect(getUsernameFromSubdomain('user.john')).toBe('john');
            expect(getUsernameFromSubdomain('user.mybot123')).toBe('mybot123');
        });

        it('should return null for non-user domains', () => {
            expect(getUsernameFromSubdomain('myagent')).toBeNull();
        });
    });

    it('should have correct prefix', () => {
        expect(FREE_USER_PREFIX).toBe('user.');
    });
});

describe('Reserved Names', () => {
    it('should include major tech companies', () => {
        expect(RESTRICTED_NAMES.has('google')).toBe(true);
        expect(RESTRICTED_NAMES.has('openai')).toBe(true);
        expect(RESTRICTED_NAMES.has('anthropic')).toBe(true);
    });

    it('should include crypto projects', () => {
        expect(RESTRICTED_NAMES.has('solana')).toBe(true);
        expect(RESTRICTED_NAMES.has('ethereum')).toBe(true);
        expect(RESTRICTED_NAMES.has('coinbase')).toBe(true);
    });

    it('should include government terms', () => {
        expect(RESTRICTED_NAMES.has('gov')).toBe(true);
        expect(RESTRICTED_NAMES.has('fbi')).toBe(true);
    });

    it('should not include regular words', () => {
        expect(RESTRICTED_NAMES.has('myagent')).toBe(false);
        expect(RESTRICTED_NAMES.has('travel')).toBe(false);
    });
});

describe('Crown Jewels', () => {
    it('should include premium single words', () => {
        expect(CROWN_JEWELS.has('ai')).toBe(true);
        expect(CROWN_JEWELS.has('bank')).toBe(true);
        expect(CROWN_JEWELS.has('crypto')).toBe(true);
    });

    it('should not include regular words', () => {
        expect(CROWN_JEWELS.has('travel')).toBe(false);
        expect(CROWN_JEWELS.has('booking')).toBe(false);
    });
});
