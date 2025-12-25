/**
 * Rate Limiting Middleware for Production
 * Phase 22: Prevents abuse and DDoS
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
}

const defaultConfig: RateLimitConfig = {
    windowMs: 60_000,      // 1 minute
    maxRequests: 100       // 100 requests per minute
};

const endpointLimits: Record<string, RateLimitConfig> = {
    '/api/orchestrate/book': { windowMs: 60_000, maxRequests: 10 },
    '/api/orchestrate/search': { windowMs: 60_000, maxRequests: 30 },
    '/api/orchestrate/confirm-payment': { windowMs: 60_000, maxRequests: 20 },
    '/api/orchestrate/deliver': { windowMs: 60_000, maxRequests: 50 },
    '/api/orchestrate/dispute': { windowMs: 60_000, maxRequests: 5 }
};

export function checkRateLimit(
    identifier: string,
    endpoint: string
): { allowed: boolean; remaining: number; resetIn: number } {
    const config = endpointLimits[endpoint] || defaultConfig;
    const key = `${identifier}:${endpoint}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Clean up old entry
    if (entry && entry.resetAt < now) {
        rateLimitStore.delete(key);
        entry = undefined;
    }

    if (!entry) {
        entry = { count: 0, resetAt: now + config.windowMs };
        rateLimitStore.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetAt - now);

    return {
        allowed: entry.count <= config.maxRequests,
        remaining,
        resetIn
    };
}

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupRateLimits() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 5 * 60_000);
}
