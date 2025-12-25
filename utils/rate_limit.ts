import { cache } from './cache';
import { createClient } from '@supabase/supabase-js';

/**
 * Enterprise-Grade Rate Limiter
 * 
 * Protects against:
 * - Bot flooding (per IP)
 * - Wallet abuse (per wallet)
 * - Write spam (stricter limits)
 * - DDoS (global circuit breaker)
 */

// Configuration
const LIMITS = {
    read: {
        perIp: { max: 100, windowSec: 60 },      // 100 reads/min per IP
        perWallet: { max: 200, windowSec: 60 },  // 200 reads/min per wallet
    },
    write: {
        perIp: { max: 10, windowSec: 60 },       // 10 writes/min per IP
        perWallet: { max: 20, windowSec: 60 },   // 20 writes/min per wallet
    },
    global: {
        max: 10000, windowSec: 60                // 10k total/min (circuit breaker)
    }
};

// Abuse thresholds
const ABUSE_THRESHOLD = 5; // Consecutive blocks before flagging
const BAN_DURATION_SEC = 3600; // 1 hour ban for flagged abusers

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    reason?: string;
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
    ip: string,
    wallet: string | null,
    operation: 'read' | 'write' = 'read'
): Promise<RateLimitResult> {
    const limits = LIMITS[operation];

    // 1. Check if IP is banned
    const banKey = `banned:ip:${ip}`;
    const isBanned = await cache.get<boolean>(banKey);
    if (isBanned) {
        return { allowed: false, remaining: 0, resetIn: BAN_DURATION_SEC, reason: 'IP temporarily banned' };
    }

    // 2. Check wallet ban
    if (wallet) {
        const walletBanKey = `banned:wallet:${wallet}`;
        const isWalletBanned = await cache.get<boolean>(walletBanKey);
        if (isWalletBanned) {
            return { allowed: false, remaining: 0, resetIn: BAN_DURATION_SEC, reason: 'Wallet temporarily banned' };
        }
    }

    // 3. Check global circuit breaker
    const globalKey = `ratelimit:global:${operation}`;
    const globalCount = await cache.get<number>(globalKey) || 0;
    if (globalCount >= LIMITS.global.max) {
        return { allowed: false, remaining: 0, resetIn: 60, reason: 'Service overloaded' };
    }
    await cache.set(globalKey, globalCount + 1, LIMITS.global.windowSec);

    // 4. Check IP limit
    const ipKey = `ratelimit:${operation}:ip:${ip}`;
    const ipCount = await cache.get<number>(ipKey) || 0;

    if (ipCount >= limits.perIp.max) {
        await incrementAbuseCounter(ip, 'ip');
        return {
            allowed: false,
            remaining: 0,
            resetIn: limits.perIp.windowSec,
            reason: `Rate limit exceeded (${limits.perIp.max}/${operation}/min)`
        };
    }
    await cache.set(ipKey, ipCount + 1, limits.perIp.windowSec);

    // 5. Check wallet limit (if provided)
    if (wallet) {
        const walletKey = `ratelimit:${operation}:wallet:${wallet}`;
        const walletCount = await cache.get<number>(walletKey) || 0;

        if (walletCount >= limits.perWallet.max) {
            await incrementAbuseCounter(wallet, 'wallet');
            return {
                allowed: false,
                remaining: 0,
                resetIn: limits.perWallet.windowSec,
                reason: `Wallet rate limit exceeded`
            };
        }
        await cache.set(walletKey, walletCount + 1, limits.perWallet.windowSec);
    }

    return {
        allowed: true,
        remaining: limits.perIp.max - ipCount - 1,
        resetIn: limits.perIp.windowSec
    };
}

/**
 * Track abuse and auto-ban repeat offenders
 */
async function incrementAbuseCounter(identifier: string, type: 'ip' | 'wallet'): Promise<void> {
    const abuseKey = `abuse:${type}:${identifier}`;
    const count = (await cache.get<number>(abuseKey) || 0) + 1;

    await cache.set(abuseKey, count, 3600); // 1 hour window

    if (count >= ABUSE_THRESHOLD) {
        // Auto-ban and log
        await cache.set(`banned:${type}:${identifier}`, true, BAN_DURATION_SEC);
        await logAbuse(identifier, type, count);
        console.warn(`🚨 [SECURITY] Auto-banned ${type}: ${identifier} after ${count} violations`);
    }
}

/**
 * Log abuse to database for review
 */
async function logAbuse(identifier: string, type: 'ip' | 'wallet', violationCount: number): Promise<void> {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        await supabase.from('abuse_logs').insert({
            identifier,
            identifier_type: type,
            violation_count: violationCount,
            action_taken: 'auto_ban',
            ban_expires_at: new Date(Date.now() + BAN_DURATION_SEC * 1000).toISOString()
        });
    } catch (err) {
        console.error('Failed to log abuse:', err);
    }
}

/**
 * Manually ban an IP or wallet
 */
export async function banIdentifier(identifier: string, type: 'ip' | 'wallet', durationSec: number = BAN_DURATION_SEC): Promise<void> {
    await cache.set(`banned:${type}:${identifier}`, true, durationSec);
}

/**
 * Unban an IP or wallet
 */
export async function unbanIdentifier(identifier: string, type: 'ip' | 'wallet'): Promise<void> {
    await cache.delete(`banned:${type}:${identifier}`);
}
