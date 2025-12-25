/**
 * Security Middleware
 * 
 * Unified security layer that combines:
 * - Rate limiting
 * - Input validation
 * - Abuse detection
 * - Audit logging
 * 
 * Use this for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitResult } from '@/utils/rate_limit';
import { logAudit, logSecurityEvent, generateRequestId, AuditAction } from '@/lib/auditLog';
import { runAbuseChecks, logAbuseFlag } from '@/lib/abuseDetection';
import crypto from 'crypto';

export interface SecurityContext {
    requestId: string;
    ip: string;
    ipHash: string;
    wallet: string | null;
    rateLimit: RateLimitResult;
}

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
}

/**
 * Hash IP for privacy
 */
function hashIP(ip: string): string {
    return crypto.createHash('sha256')
        .update(ip + (process.env.IP_SALT || 'default'))
        .digest('hex')
        .substring(0, 16);
}

/**
 * Run security checks and return context or error response
 */
export async function runSecurityChecks(
    req: NextRequest,
    operation: 'read' | 'write' = 'read',
    wallet: string | null = null
): Promise<{ ok: true; context: SecurityContext } | { ok: false; response: NextResponse }> {
    const requestId = generateRequestId();
    const ip = getClientIP(req);
    const ipHash = hashIP(ip);

    // 1. Rate limiting
    const rateResult = await checkRateLimit(ip, wallet, operation);

    if (!rateResult.allowed) {
        await logSecurityEvent('rate_limit_hit', ip, wallet, {
            operation,
            reason: rateResult.reason,
            endpoint: req.nextUrl.pathname
        });

        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    reason: rateResult.reason,
                    retry_after: rateResult.resetIn
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': rateResult.resetIn.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-Request-Id': requestId
                    }
                }
            )
        };
    }

    // 2. Background abuse detection (non-blocking for writes)
    if (operation === 'write' && wallet) {
        // Run async - don't block the request
        runAbuseChecks(wallet, ipHash).then(flags => {
            for (const flag of flags) {
                logAbuseFlag(flag);
            }
        }).catch(err => console.error('[SECURITY] Abuse check error:', err));
    }

    return {
        ok: true,
        context: {
            requestId,
            ip,
            ipHash,
            wallet,
            rateLimit: rateResult
        }
    };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(context: SecurityContext): Record<string, string> {
    return {
        'X-Request-Id': context.requestId,
        'X-RateLimit-Remaining': context.rateLimit.remaining.toString(),
        'X-RateLimit-Reset': context.rateLimit.resetIn.toString()
    };
}

/**
 * Wrap an API handler with security checks
 */
export function withSecurity(
    handler: (req: NextRequest, context: SecurityContext) => Promise<NextResponse>,
    options: {
        operation?: 'read' | 'write';
        auditAction?: AuditAction;
        extractWallet?: (req: NextRequest) => string | null;
    } = {}
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        const { operation = 'read', auditAction, extractWallet } = options;
        const wallet = extractWallet ? extractWallet(req) : null;

        const securityResult = await runSecurityChecks(req, operation, wallet);

        if (!securityResult.ok) {
            return securityResult.response;
        }

        const { context } = securityResult;

        try {
            const response = await handler(req, context);

            // Log successful actions
            if (auditAction) {
                await logAudit({
                    action_type: auditAction,
                    actor_ip: context.ip,
                    actor_wallet: context.wallet || undefined,
                    target_entity: req.nextUrl.pathname,
                    request_id: context.requestId,
                    success: response.status < 400
                });
            }

            return response;
        } catch (err) {
            // Log errors
            if (auditAction) {
                await logAudit({
                    action_type: auditAction,
                    actor_ip: context.ip,
                    actor_wallet: context.wallet || undefined,
                    target_entity: req.nextUrl.pathname,
                    request_id: context.requestId,
                    success: false,
                    error_message: (err as Error).message
                });
            }
            throw err;
        }
    };
}
