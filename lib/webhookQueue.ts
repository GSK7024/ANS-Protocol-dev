import { createClient } from '@supabase/supabase-js';

/**
 * Webhook Queue Utility
 * 
 * Queue webhooks for reliable delivery with automatic retry.
 * Use this instead of direct fetch() for critical notifications.
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface WebhookPayload {
    url: string;
    method?: 'POST' | 'GET' | 'PUT';
    headers?: Record<string, string>;
    payload: any;
    escrowId?: string;
    type?: 'booking' | 'payment' | 'delivery' | 'refund' | 'notification';
}

/**
 * Queue a webhook for delivery
 * Returns immediately - delivery happens async via cron job
 */
export async function queueWebhook(webhook: WebhookPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('webhook_queue')
            .insert({
                url: webhook.url,
                method: webhook.method || 'POST',
                headers: webhook.headers || {},
                payload: webhook.payload,
                escrow_id: webhook.escrowId,
                webhook_type: webhook.type || 'notification',
                status: 'pending',
                next_retry_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) {
            console.error('[WEBHOOK-QUEUE] Insert error:', error);
            return { success: false, error: error.message };
        }

        console.log(`[WEBHOOK-QUEUE] Queued: ${webhook.type} to ${webhook.url}`);
        return { success: true, id: data.id };

    } catch (err: any) {
        console.error('[WEBHOOK-QUEUE] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Send webhook immediately, falling back to queue on failure
 * Use this for time-sensitive notifications
 */
export async function sendWebhookWithFallback(webhook: WebhookPayload): Promise<{ success: boolean; queued?: boolean; error?: string }> {
    try {
        // Attempt immediate delivery
        const response = await fetch(webhook.url, {
            method: webhook.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(webhook.headers || {})
            },
            body: JSON.stringify(webhook.payload),
            signal: AbortSignal.timeout(5000) // 5s timeout for immediate
        });

        if (response.ok) {
            return { success: true };
        }

        // Failed - queue for retry
        await queueWebhook(webhook);
        return { success: false, queued: true };

    } catch (err: any) {
        // Network error - queue for retry
        console.log(`[WEBHOOK] Immediate delivery failed, queuing: ${err.message}`);
        await queueWebhook(webhook);
        return { success: false, queued: true, error: err.message };
    }
}

/**
 * Notify seller about new booking
 */
export async function notifySellerBooking(
    sellerUrl: string,
    escrowId: string,
    buyerData: Record<string, any>,
    bookingParams: any,
    amount: number,
    apiKey?: string
) {
    return sendWebhookWithFallback({
        url: sellerUrl,
        headers: {
            'X-ANS-Escrow-ID': escrowId,
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        payload: {
            event: 'booking_created',
            escrow_id: escrowId,
            buyer_data: buyerData,
            booking_params: bookingParams,
            amount,
            timestamp: new Date().toISOString()
        },
        escrowId,
        type: 'booking'
    });
}

/**
 * Notify seller about payment received
 */
export async function notifySellerPayment(
    sellerUrl: string,
    escrowId: string,
    txSignature: string,
    amount: number,
    apiKey?: string
) {
    return sendWebhookWithFallback({
        url: sellerUrl,
        headers: {
            'X-ANS-Escrow-ID': escrowId,
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        payload: {
            event: 'payment_received',
            escrow_id: escrowId,
            tx_signature: txSignature,
            amount,
            status: 'locked',
            timestamp: new Date().toISOString()
        },
        escrowId,
        type: 'payment'
    });
}

/**
 * Notify buyer about refund
 */
export async function notifyBuyerRefund(
    buyerEmail: string | null,
    escrowId: string,
    refundTx: string,
    amount: number,
    reason: string
) {
    // If we had email notifications configured, we'd send here
    // For now, just log
    console.log(`[REFUND-NOTIFICATION] Escrow ${escrowId} refunded ${amount} SOL. TX: ${refundTx}. Reason: ${reason}`);

    // Could integrate with email service like Resend, SendGrid, etc.
    // Could integrate with Discord/Telegram bots
    return { success: true };
}
