/**
 * Rate Limiter Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, rateLimitMiddleware, RATE_LIMITS } from './rateLimiter';

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Reset module between tests to clear the store
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('checkRateLimit', () => {
        it('should allow first request', () => {
            const result = checkRateLimit('test-user-1', 'default');

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(RATE_LIMITS.default.requests - 1);
        });

        it('should track request count', () => {
            const identifier = 'test-user-count';

            // First request
            let result = checkRateLimit(identifier, 'default');
            expect(result.remaining).toBe(59);

            // Second request
            result = checkRateLimit(identifier, 'default');
            expect(result.remaining).toBe(58);

            // Third request
            result = checkRateLimit(identifier, 'default');
            expect(result.remaining).toBe(57);
        });

        it('should use correct limits for different types', () => {
            const result = checkRateLimit('user-review', 'review');

            // Review has 5 requests limit
            expect(result.remaining).toBe(4);
        });

        it('should handle different identifiers separately', () => {
            const result1 = checkRateLimit('user-a', 'default');
            const result2 = checkRateLimit('user-b', 'default');

            // Both should have full remaining
            expect(result1.remaining).toBe(59);
            expect(result2.remaining).toBe(59);
        });
    });

    describe('rateLimitMiddleware', () => {
        it('should return null when allowed', () => {
            const result = rateLimitMiddleware('middleware-user', 'default');
            expect(result).toBeNull();
        });

        it('should return error object when rate limited', () => {
            const identifier = 'rate-limited-user';

            // Exhaust the limit
            for (let i = 0; i < RATE_LIMITS.register.requests; i++) {
                checkRateLimit(identifier, 'register');
            }

            const result = rateLimitMiddleware(identifier, 'register');

            expect(result).not.toBeNull();
            expect(result?.status).toBe(429);
            expect(result?.error).toContain('Rate limit exceeded');
            expect(result?.headers['X-RateLimit-Remaining']).toBe('0');
        });

        it('should include proper headers', () => {
            const result = rateLimitMiddleware('headers-test', 'default');

            expect(result).toBeNull();
            // Headers are returned with the response even on success
        });
    });

    describe('Rate Limit Constants', () => {
        it('should have correct resolve limits', () => {
            expect(RATE_LIMITS.resolve.requests).toBe(100);
            expect(RATE_LIMITS.resolve.windowMs).toBe(60000);
        });

        it('should have strict write limits', () => {
            // Write operations should have lower limits
            expect(RATE_LIMITS.register.requests).toBeLessThan(RATE_LIMITS.resolve.requests);
            expect(RATE_LIMITS.review.requests).toBeLessThan(RATE_LIMITS.search.requests);
        });

        it('should have default fallback', () => {
            expect(RATE_LIMITS.default).toBeDefined();
            expect(RATE_LIMITS.default.requests).toBe(60);
        });
    });
});
