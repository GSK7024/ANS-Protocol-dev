/**
 * NEXUS API Key Utilities
 * 
 * Functions for generating, hashing, and validating API keys.
 * Key format: nxs_live_<32 random alphanumeric chars>
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Use service role for key validation (bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface ApiKeyData {
    id: string;
    key_prefix: string;
    name: string;
    owner_wallet: string | null;
    rate_limit_per_minute: number;
    total_requests: number;
    is_active: boolean;
    created_at: string;
}

/**
 * Generate a new API key
 * Returns the raw key (show once) and hash (store in DB)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
    // Generate 32 random bytes, encode as base64url
    const randomBytes = crypto.randomBytes(24);
    const randomPart = randomBytes.toString('base64url');

    // Full key format: nxs_live_<random>
    const key = `nxs_live_${randomPart}`;

    // SHA256 hash for storage
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    // Prefix for display (first 12 chars)
    const prefix = key.substring(0, 12) + '...';

    return { key, hash, prefix };
}

/**
 * Hash an API key for lookup
 */
export function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key against the database
 */
export async function validateApiKey(key: string): Promise<{
    valid: boolean;
    keyData?: ApiKeyData;
    error?: string;
}> {
    if (!key || !key.startsWith('nxs_')) {
        return { valid: false, error: 'Invalid key format' };
    }

    const hash = hashApiKey(key);

    const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, owner_wallet, rate_limit_per_minute, total_requests, is_active, created_at')
        .eq('key_hash', hash)
        .single();

    if (error || !data) {
        return { valid: false, error: 'API key not found' };
    }

    if (!data.is_active) {
        return { valid: false, error: 'API key has been revoked' };
    }

    return { valid: true, keyData: data as ApiKeyData };
}

/**
 * Track API key usage (increment counter)
 */
export async function trackKeyUsage(keyId: string): Promise<void> {
    await supabase.rpc('increment_api_key_usage', { key_id: keyId });
}

/**
 * Simple in-memory rate limiter for API keys
 * In production, use Redis for distributed rate limiting
 */
const keyRequestLog: Record<string, number[]> = {};
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

export function checkKeyRateLimit(keyId: string, limit: number): boolean {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    if (!keyRequestLog[keyId]) {
        keyRequestLog[keyId] = [];
    }

    // Remove old requests
    keyRequestLog[keyId] = keyRequestLog[keyId].filter(ts => ts > windowStart);

    // Check limit
    if (keyRequestLog[keyId].length >= limit) {
        return false; // RATE LIMITED
    }

    // Record this request
    keyRequestLog[keyId].push(now);
    return true; // ALLOWED
}

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    for (const keyId in keyRequestLog) {
        keyRequestLog[keyId] = keyRequestLog[keyId].filter(ts => ts > windowStart);
        if (keyRequestLog[keyId].length === 0) {
            delete keyRequestLog[keyId];
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes
