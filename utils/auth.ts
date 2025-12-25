/**
 * NEXUS API Authentication Middleware
 * 
 * Helper to validate API keys in route handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkKeyRateLimit, trackKeyUsage, ApiKeyData } from './api_keys';
import { checkRateLimit } from './rate_limit';

export interface AuthResult {
    authenticated: boolean;
    keyData?: ApiKeyData;
    error?: NextResponse;
}

/**
 * Authenticate a request using API key
 * 
 * @param req - The incoming request
 * @param options.required - If true, return 401 if no key provided
 * @returns Auth result with key data or error response
 */
export async function withApiKeyAuth(
    req: NextRequest,
    options: { required?: boolean } = {}
): Promise<AuthResult> {
    const authHeader = req.headers.get('Authorization');

    // ADMIN BYPASS for testing - check X-NEXUS-Admin header
    const adminKey = req.headers.get('X-NEXUS-Admin');
    if (adminKey === process.env.NEXUS_ADMIN_KEY && process.env.NEXUS_ADMIN_KEY) {
        return {
            authenticated: true,
            keyData: {
                id: 'admin',
                name: 'Admin Key',
                owner_wallet: 'admin',
                rate_limit_per_minute: 1000,
                key_prefix: 'admin',
                total_requests: 0,
                is_active: true,
                created_at: new Date().toISOString()
            }
        };
    }

    // SYSTEM KEY BYPASS for internal AI function calls
    const systemKey = req.headers.get('x-api-key');
    const validSystemKeys = [
        process.env.ANS_SYSTEM_API_KEY,
        'demo-system-key'  // Fallback for development
    ].filter(Boolean);

    if (systemKey && validSystemKeys.includes(systemKey)) {
        return {
            authenticated: true,
            keyData: {
                id: 'system',
                name: 'System API Key',
                owner_wallet: 'system',
                rate_limit_per_minute: 1000,
                key_prefix: 'system',
                total_requests: 0,
                is_active: true,
                created_at: new Date().toISOString()
            }
        };
    }

    // No auth header provided
    if (!authHeader) {
        // Also check for x-api-key header as alternative
        if (options.required) {
            return {
                authenticated: false,
                error: NextResponse.json(
                    { error: 'API key required. Get one at nexus.io/dashboard' },
                    { status: 401 }
                )
            };
        }
        return { authenticated: false };
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
            authenticated: false,
            error: NextResponse.json(
                { error: 'Invalid Authorization header. Use: Bearer nxs_xxx' },
                { status: 401 }
            )
        };
    }

    const apiKey = parts[1];

    // Validate key
    const validation = await validateApiKey(apiKey);

    if (!validation.valid || !validation.keyData) {
        return {
            authenticated: false,
            error: NextResponse.json(
                { error: validation.error || 'Invalid API key' },
                { status: 401 }
            )
        };
    }

    // Check rate limit
    const withinLimit = checkKeyRateLimit(
        validation.keyData.id,
        validation.keyData.rate_limit_per_minute
    );

    if (!withinLimit) {
        return {
            authenticated: false,
            error: NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    limit: validation.keyData.rate_limit_per_minute,
                    window: '1 minute'
                },
                { status: 429 }
            )
        };
    }

    // Track usage (async, don't await)
    trackKeyUsage(validation.keyData.id).catch(console.error);

    return {
        authenticated: true,
        keyData: validation.keyData
    };
}

/**
 * Combined rate limiting: Use API key limits if authenticated, else IP-based
 */
export async function withCombinedRateLimit(
    req: NextRequest
): Promise<{ allowed: boolean; authenticated: boolean; keyData?: ApiKeyData; error?: NextResponse }> {

    // Try API key auth first
    const auth = await withApiKeyAuth(req, { required: false });

    if (auth.authenticated && auth.keyData) {
        // Key-based rate limiting (already checked in withApiKeyAuth)
        return { allowed: true, authenticated: true, keyData: auth.keyData };
    }

    // Fall back to IP-based rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await checkRateLimit(ip);

    if (!allowed) {
        return {
            allowed: false,
            authenticated: false,
            error: NextResponse.json(
                { error: 'Rate limit exceeded. Use an API key for higher limits.' },
                { status: 429 }
            )
        };
    }

    return { allowed: true, authenticated: false };
}
