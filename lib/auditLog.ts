/**
 * Audit Logging System
 * 
 * Logs all significant actions for:
 * - Security forensics
 * - Compliance
 * - Debugging
 * - Analytics
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Action types for type safety
export type AuditAction =
    | 'domain_register'
    | 'domain_transfer'
    | 'escrow_create'
    | 'escrow_release'
    | 'escrow_refund'
    | 'review_submit'
    | 'reputation_query'
    | 'wallet_connect'
    | 'login'
    | 'logout'
    | 'rate_limit_hit'
    | 'abuse_detected'
    | 'ban_applied'
    | 'api_error';

export interface AuditLogEntry {
    action_type: AuditAction;
    actor_wallet?: string;
    actor_ip?: string;
    target_entity?: string;
    target_id?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    error_message?: string;
    request_id?: string;
}

/**
 * Hash IP address for privacy-preserving logging
 */
function hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex').substring(0, 16);
}

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Log an action to the audit trail
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        await supabase.from('audit_logs').insert({
            action_type: entry.action_type,
            actor_wallet: entry.actor_wallet,
            actor_ip_hash: entry.actor_ip ? hashIP(entry.actor_ip) : null,
            target_entity: entry.target_entity,
            target_id: entry.target_id,
            metadata: entry.metadata || {},
            success: entry.success ?? true,
            error_message: entry.error_message,
            request_id: entry.request_id || generateRequestId()
        });
    } catch (err) {
        // Never fail the main request due to logging
        console.error('[AUDIT] Failed to log:', err);
    }
}

/**
 * Log security events (higher priority)
 */
export async function logSecurityEvent(
    action: 'rate_limit_hit' | 'abuse_detected' | 'ban_applied',
    ip: string,
    wallet: string | null,
    details: Record<string, any>
): Promise<void> {
    await logAudit({
        action_type: action,
        actor_ip: ip,
        actor_wallet: wallet || undefined,
        metadata: {
            ...details,
            timestamp: new Date().toISOString(),
            severity: action === 'ban_applied' ? 'critical' : 'high'
        }
    });
}

/**
 * Log API errors
 */
export async function logApiError(
    endpoint: string,
    error: Error,
    ip?: string,
    wallet?: string
): Promise<void> {
    await logAudit({
        action_type: 'api_error',
        actor_ip: ip,
        actor_wallet: wallet,
        target_entity: 'api',
        target_id: endpoint,
        success: false,
        error_message: error.message,
        metadata: {
            stack: error.stack?.substring(0, 500),
            name: error.name
        }
    });
}

/**
 * Bulk query audit logs (for admin dashboard)
 */
export async function queryAuditLogs(filters: {
    action_type?: AuditAction;
    actor_wallet?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
}): Promise<any[]> {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

    if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
    }
    if (filters.actor_wallet) {
        query = query.eq('actor_wallet', filters.actor_wallet);
    }
    if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
    }

    const { data } = await query;
    return data || [];
}
