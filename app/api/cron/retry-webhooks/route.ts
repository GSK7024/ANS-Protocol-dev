import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook Retry Queue - Process Failed Webhooks
 * 
 * When seller notifications fail, they're added to a queue.
 * This cron job retries them with exponential backoff.
 * 
 * Schedule: Every 5 minutes (cron: 0/5 * * * *)
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret-change-me';
const MAX_RETRIES = 5;

export async function GET(req: NextRequest) {
    // Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');

    if (cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [WEBHOOK-RETRY] Starting retry queue processing...');

    const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        permanent_failed: 0
    };

    try {
        // Get pending webhooks ready for retry
        const { data: pendingWebhooks, error: fetchError } = await supabase
            .from('webhook_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('next_retry_at', new Date().toISOString())
            .lt('attempts', MAX_RETRIES)
            .order('created_at', { ascending: true })
            .limit(20);

        if (fetchError) {
            console.error('❌ [WEBHOOK-RETRY] Fetch error:', fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!pendingWebhooks || pendingWebhooks.length === 0) {
            console.log('✅ [WEBHOOK-RETRY] No pending webhooks');
            return NextResponse.json({ success: true, message: 'No pending webhooks', ...results });
        }

        console.log(`📋 [WEBHOOK-RETRY] Processing ${pendingWebhooks.length} webhooks`);
        results.processed = pendingWebhooks.length;

        for (const webhook of pendingWebhooks) {
            try {
                // Attempt webhook delivery
                const response = await fetch(webhook.url, {
                    method: webhook.method || 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-ANS-Webhook-ID': webhook.id,
                        'X-ANS-Retry-Count': String(webhook.attempts),
                        ...(webhook.headers || {})
                    },
                    body: JSON.stringify(webhook.payload),
                    signal: AbortSignal.timeout(10000) // 10s timeout
                });

                if (response.ok) {
                    // Success - mark as completed
                    await supabase
                        .from('webhook_queue')
                        .update({
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            response_status: response.status
                        })
                        .eq('id', webhook.id);

                    console.log(`   ✅ Webhook ${webhook.id} delivered`);
                    results.succeeded++;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (err: any) {
                const newAttempts = webhook.attempts + 1;

                if (newAttempts >= MAX_RETRIES) {
                    // Max retries reached - mark as permanently failed
                    await supabase
                        .from('webhook_queue')
                        .update({
                            status: 'failed',
                            attempts: newAttempts,
                            last_error: err.message,
                            failed_at: new Date().toISOString()
                        })
                        .eq('id', webhook.id);

                    console.log(`   ❌ Webhook ${webhook.id} permanently failed after ${MAX_RETRIES} attempts`);
                    results.permanent_failed++;
                } else {
                    // Schedule next retry with exponential backoff
                    const backoffMinutes = Math.pow(2, newAttempts); // 2, 4, 8, 16, 32 minutes
                    const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

                    await supabase
                        .from('webhook_queue')
                        .update({
                            attempts: newAttempts,
                            next_retry_at: nextRetry.toISOString(),
                            last_error: err.message
                        })
                        .eq('id', webhook.id);

                    console.log(`   ⏳ Webhook ${webhook.id} will retry in ${backoffMinutes} minutes`);
                    results.failed++;
                }
            }
        }

        console.log(`🏁 [WEBHOOK-RETRY] Complete. Succeeded: ${results.succeeded}, Failed: ${results.failed}`);
        return NextResponse.json({ success: true, ...results });

    } catch (err: any) {
        console.error('❌ [WEBHOOK-RETRY] Critical error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
