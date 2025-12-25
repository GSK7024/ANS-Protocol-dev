/**
 * Enhanced Rate Limiter
 * 
 * Simple in-memory rate limiting for API routes
 * For production, use Redis-based solution
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Default limits per endpoint type
export const RATE_LIMITS = {
    // Read operations
    resolve: { requests: 100, windowMs: 60000 },    // 100/min
    search: { requests: 60, windowMs: 60000 },      // 60/min
    discover: { requests: 30, windowMs: 60000 },    // 30/min

    // Write operations (more restrictive)
    register: { requests: 10, windowMs: 60000 },    // 10/min
    escrow_create: { requests: 20, windowMs: 60000 }, // 20/min
    escrow_action: { requests: 30, windowMs: 60000 }, // 30/min
    review: { requests: 5, windowMs: 60000 },       // 5/min
    api_key: { requests: 3, windowMs: 60000 },      // 3/min
    marketplace: { requests: 10, windowMs: 60000 }, // 10/min
    presale: { requests: 5, windowMs: 60000 },      // 5/min
    auction: { requests: 10, windowMs: 60000 },     // 10/min

    // Default
    default: { requests: 60, windowMs: 60000 }      // 60/min
};

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if request should be rate limited
 * Returns: { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
    identifier: string, // IP hash, wallet, or API key
    type: RateLimitType = 'default'
): { allowed: boolean; remaining: number; resetIn: number } {
    const limit = RATE_LIMITS[type] || RATE_LIMITS.default;
    const now = Date.now();
    const key = `${type}:${identifier}`;

    const entry = rateLimitStore.get(key);

    // No entry or expired window - reset
    if (!entry || now >= entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + limit.windowMs
        });
        return {
            allowed: true,
            remaining: limit.requests - 1,
            resetIn: Math.ceil(limit.windowMs / 1000)
        };
    }

    // Check if over limit
    if (entry.count >= limit.requests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.ceil((entry.resetTime - now) / 1000)
        };
    }

    // Increment and allow
    entry.count++;
    return {
        allowed: true,
        remaining: limit.requests - entry.count,
        resetIn: Math.ceil((entry.resetTime - now) / 1000)
    };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
    identifier: string,
    type: RateLimitType = 'default'
): Record<string, string> {
    const result = checkRateLimit(identifier, type);
    const limit = RATE_LIMITS[type] || RATE_LIMITS.default;

    // Undo the count increment from checkRateLimit
    const key = `${type}:${identifier}`;
    const entry = rateLimitStore.get(key);
    if (entry && entry.count > 0) {
        entry.count--;
    }

    return {
        'X-RateLimit-Limit': limit.requests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetIn.toString()
    };
}

/**
 * Express/Next.js middleware helper
 * Returns null if allowed, or error response if rate limited
 */
export function rateLimitMiddleware(
    identifier: string,
    type: RateLimitType = 'default'
): { error: string; status: number; headers: Record<string, string> } | null {
    const result = checkRateLimit(identifier, type);
    const headers = {
        'X-RateLimit-Limit': (RATE_LIMITS[type] || RATE_LIMITS.default).requests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetIn.toString(),
        'Retry-After': result.resetIn.toString()
    };

    if (!result.allowed) {
        return {
            error: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
            status: 429,
            headers
        };
    }

    return null;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
