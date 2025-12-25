/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * MOCK AMAZON AGENT (E-commerce Orders)
 */

const AGENT_NAME = 'amazon-test';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log(`📦 [amazon-test] E-COMMERCE AGENT STARTED. Monitoring for orders...`);

async function generateOrderId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

async function monitorEscrows() {
    setInterval(async () => {
        const { data: escrows } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('seller_agent', AGENT_NAME)
            .eq('status', 'locked');

        if (escrows && escrows.length > 0) {
            for (const escrow of escrows) {
                try {
                    console.log(`\n🔔 [AGENT] New Order! Escrow: ${escrow.id.slice(0, 8)}`);

                    const orderId = await generateOrderId();
                    const trackingUrl = `https://track.amazon.in/${orderId}`;

                    console.log(`   📦 Order Placed: ${orderId}`);
                    console.log(`   📍 Tracking: ${trackingUrl}`);

                    // Store in mock_tickets (reusing table)
                    await supabase.from('mock_tickets').insert({
                        pnr: orderId, // Reuse column
                        passenger_name: escrow.buyer_wallet?.slice(0, 12) || 'Unknown',
                        flight_id: escrow.service_details?.product || 'Generic Product',
                        status: 'SHIPPED'
                    });

                    // Submit proof to NEXUS
                    const response = await fetch(`${BASE_URL}/api/orchestrate/deliver`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            escrow_id: escrow.id,
                            proof_of_delivery: {
                                order_id: orderId,
                                tracking_url: trackingUrl,
                                status: 'SHIPPED',
                                eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                            }
                        })
                    });

                    const data = await response.json();
                    console.log(data.success ? `   ✅ Delivery Accepted!` : `   ❌ Rejected: ${data.error}`);

                } catch (err: any) {
                    console.error(`❌ Error: ${err.message}`);
                }
            }
        }
    }, 5000);
}

monitorEscrows();
