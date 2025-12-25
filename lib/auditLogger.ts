/**
 * Enhanced Audit Logger
 * 
 * Centralized audit logging for security-critical operations
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export type AuditEventType =
    | 'domain_register'
    | 'domain_transfer'
    | 'domain_update'
    | 'escrow_create'
    | 'escrow_complete'
    | 'escrow_dispute'
    | 'escrow_refund'
    | 'payment_received'
    | 'payment_failed'
    | 'api_key_create'
    | 'api_key_revoke'
    | 'api_key_use'
    | 'auth_success'
    | 'auth_failure'
    | 'rate_limit_hit'
    | 'abuse_detected'
    | 'admin_action';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
    event_type: AuditEventType;
    actor_wallet?: string;
    actor_ip_hash?: string;
    target_type?: string;
    target_id?: string;
    action: string;
    metadata?: Record<string, any>;
    risk_level?: RiskLevel;
}

/**
 * Hash IP for privacy-preserving logging
 */
export function hashIP(ip: string): string {
    const salt = process.env.IP_SALT || 'default-salt';
    return crypto.createHash('sha256')
        .update(ip + salt)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Determine risk level based on event type and context
 */
function calculateRiskLevel(entry: AuditLogEntry): RiskLevel {
    // Critical events
    if (['abuse_detected', 'auth_failure'].includes(entry.event_type)) {
        const attempts = entry.metadata?.attempts || 1;
        if (attempts >= 5) return 'critical';
        if (attempts >= 3) return 'high';
        return 'medium';
    }

    // High-value events
    if (['escrow_dispute', 'api_key_revoke', 'admin_action'].includes(entry.event_type)) {
        return 'high';
    }

    // Medium events
    if (['domain_transfer', 'escrow_complete', 'payment_received'].includes(entry.event_type)) {
        return 'medium';
    }

    // Check for unusual amounts
    if (entry.metadata?.amount && entry.metadata.amount > 100) {
        return 'medium';
    }

    return entry.risk_level || 'low';
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const riskLevel = calculateRiskLevel(entry);

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                event_type: entry.event_type,
                actor_wallet: entry.actor_wallet,
                actor_ip_hash: entry.actor_ip_hash,
                target_type: entry.target_type,
                target_id: entry.target_id,
                action: entry.action,
                metadata: entry.metadata || {},
                risk_level: riskLevel
            });

        if (error) {
            console.error('Audit log error:', error);
        }

        // Log critical events to console for immediate visibility
        if (riskLevel === 'critical') {
            console.warn('🚨 CRITICAL AUDIT EVENT:', {
                type: entry.event_type,
                actor: entry.actor_wallet?.slice(0, 8),
                action: entry.action,
                metadata: entry.metadata
            });
        }
    } catch (e) {
        console.error('Audit logging failed:', e);
    }
}

/**
 * Log domain registration
 */
export async function logDomainRegister(
    wallet: string,
    domain: string,
    network: string,
    paymentMethod: string,
    amount: number,
    ipHash?: string
): Promise<void> {
    await logAudit({
        event_type: 'domain_register',
        actor_wallet: wallet,
        actor_ip_hash: ipHash,
        target_type: 'domain',
        target_id: domain,
        action: `Registered domain ${domain} on ${network}`,
        metadata: { network, payment_method: paymentMethod, amount }
    });
}

/**
 * Log escrow creation
 */
export async function logEscrowCreate(
    buyerWallet: string,
    seller: string,
    amount: number,
    escrowId: string,
    ipHash?: string
): Promise<void> {
    await logAudit({
        event_type: 'escrow_create',
        actor_wallet: buyerWallet,
        actor_ip_hash: ipHash,
        target_type: 'escrow',
        target_id: escrowId,
        action: `Created escrow with ${seller} for ${amount} SOL`,
        metadata: { seller, amount }
    });
}

/**
 * Log authentication event
 */
export async function logAuth(
    wallet: string,
    success: boolean,
    reason?: string,
    ipHash?: string
): Promise<void> {
    await logAudit({
        event_type: success ? 'auth_success' : 'auth_failure',
        actor_wallet: wallet,
        actor_ip_hash: ipHash,
        target_type: 'auth',
        action: success ? 'Authentication successful' : `Authentication failed: ${reason}`,
        metadata: { reason },
        risk_level: success ? 'low' : 'medium'
    });
}

/**
 * Log rate limit hit
 */
export async function logRateLimitHit(
    identifier: string,
    endpoint: string,
    ipHash?: string
): Promise<void> {
    await logAudit({
        event_type: 'rate_limit_hit',
        actor_wallet: identifier.startsWith('nxs_') ? undefined : identifier,
        actor_ip_hash: ipHash,
        target_type: 'endpoint',
        target_id: endpoint,
        action: `Rate limit exceeded on ${endpoint}`,
        metadata: { endpoint },
        risk_level: 'medium'
    });
}

/**
 * Log abuse detection
 */
export async function logAbuseDetected(
    wallet: string,
    abuseType: string,
    details: Record<string, any>,
    ipHash?: string
): Promise<void> {
    await logAudit({
        event_type: 'abuse_detected',
        actor_wallet: wallet,
        actor_ip_hash: ipHash,
        target_type: 'abuse',
        target_id: abuseType,
        action: `Abuse detected: ${abuseType}`,
        metadata: details,
        risk_level: 'critical'
    });
}

/**
 * Query recent audit logs (admin only)
 */
export async function getRecentAuditLogs(options: {
    limit?: number;
    risk_level?: RiskLevel;
    event_type?: AuditEventType;
    actor_wallet?: string;
}) {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options.limit || 100);

    if (options.risk_level) {
        query = query.eq('risk_level', options.risk_level);
    }
    if (options.event_type) {
        query = query.eq('event_type', options.event_type);
    }
    if (options.actor_wallet) {
        query = query.eq('actor_wallet', options.actor_wallet);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Audit log query error:', error);
        return [];
    }

    return data;
}
