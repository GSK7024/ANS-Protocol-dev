/**
 * API Key Authentication Utility
 * 
 * Validates API keys for protected endpoints.
 * API keys are stored in the database with hashed values.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Lazy-load supabase client to avoid issues during testing
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _supabase;
}

export interface ApiKeyInfo {
    id: string;
    name: string;
    wallet_address: string;
    permissions: string[];
    rate_limit: number;
    created_at: string;
    last_used_at: string | null;
}

export interface AuthResult {
    valid: boolean;
    key?: ApiKeyInfo;
    error?: string;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key
 */
export function generateApiKey(prefix: string = 'ans'): string {
    const randomBytes = crypto.randomBytes(24).toString('hex');
    return `${prefix}_${randomBytes}`;
}

/**
 * Validate an API key from request headers
 */
export async function validateApiKey(request: Request): Promise<AuthResult> {
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    let apiKey: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7);
    } else {
        // Check X-API-Key header as fallback
        apiKey = request.headers.get('X-API-Key');
    }

    if (!apiKey) {
        return {
            valid: false,
            error: 'No API key provided. Use Authorization: Bearer <key> or X-API-Key header.',
        };
    }

    // Hash the key for lookup
    const hashedKey = hashApiKey(apiKey);

    try {
        // Look up the key in the database
        const { data, error } = await getSupabase()
            .from('api_keys')
            .select('id, name, wallet_address, permissions, rate_limit, created_at, last_used_at')
            .eq('key_hash', hashedKey)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return {
                valid: false,
                error: 'Invalid or expired API key.',
            };
        }

        // Update last_used_at timestamp
        await getSupabase()
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', data.id);

        return {
            valid: true,
            key: data as ApiKeyInfo,
        };
    } catch (err) {
        console.error('API key validation error:', err);
        return {
            valid: false,
            error: 'Failed to validate API key.',
        };
    }
}

/**
 * Check if API key has specific permission
 */
export function hasPermission(key: ApiKeyInfo, permission: string): boolean {
    return key.permissions.includes('*') || key.permissions.includes(permission);
}

/**
 * Middleware helper for protected routes
 */
export async function requireApiKey(
    request: Request,
    requiredPermission?: string
): Promise<{ authorized: boolean; key?: ApiKeyInfo; errorResponse?: Response }> {
    const result = await validateApiKey(request);

    if (!result.valid) {
        return {
            authorized: false,
            errorResponse: new Response(
                JSON.stringify({ error: result.error }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                }
            ),
        };
    }

    if (requiredPermission && !hasPermission(result.key!, requiredPermission)) {
        return {
            authorized: false,
            errorResponse: new Response(
                JSON.stringify({ error: `Missing permission: ${requiredPermission}` }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                }
            ),
        };
    }

    return {
        authorized: true,
        key: result.key,
    };
}
