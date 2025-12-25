import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

/**
 * VERIFY BOOKING
 * 
 * Calls the seller's verify_url to confirm the booking is real.
 * If verified, marks escrow as "verified" and ready for release.
 * 
 * POST /api/orchestrate/verify
 * Body: { escrow_id: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { escrow_id } = body;

        if (!escrow_id) {
            return NextResponse.json({ error: 'escrow_id required' }, { status: 400 });
        }

        console.log(`🔍 [Verify] Checking escrow: ${escrow_id}`);

        // 1. Get escrow details
        const { data: escrow, error: escrowErr } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (escrowErr || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        if (escrow.status !== 'locked') {
            return NextResponse.json({
                error: `Cannot verify escrow in status: ${escrow.status}`
            }, { status: 400 });
        }

        // 2. Get seller's verify_url from domain config
        const { data: sellerDomain } = await supabase
            .from('domains')
            .select('api_config, payment_config')
            .eq('name', escrow.seller_agent)
            .single();

        const verifyUrl = (sellerDomain?.api_config as any)?.verify_url;
        const fulfillmentData = escrow.fulfillment_data;

        // 3. If seller has verify_url, call it
        let verified = false;
        let verificationResult: any = null;

        if (verifyUrl && fulfillmentData?.ticket) {
            console.log(`   📡 Calling seller verify API: ${verifyUrl}`);

            try {
                const verifyRes = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pnr: fulfillmentData.ticket.pnr,
                        escrow_id: escrow_id,
                        buyer_wallet: escrow.buyer_wallet
                    })
                });

                verificationResult = await verifyRes.json();
                verified = verificationResult.verified === true;
                console.log(`   ${verified ? '✅' : '❌'} Verification result: ${verified}`);

            } catch (verifyErr) {
                console.log(`   ⚠️ Verify API error: ${verifyErr}`);
            }
        } else if (fulfillmentData?.ticket) {
            // No verify_url but has ticket - auto-verify for demo
            // In production, this would require manual review
            console.log(`   ⚠️ No verify_url. Auto-verifying for demo.`);
            verified = true;
            verificationResult = { auto_verified: true, reason: 'No verify_url configured' };
        }

        // 4. Update escrow status
        if (verified) {
            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'verified',
                    verified_at: new Date().toISOString(),
                    verification_data: verificationResult
                })
                .eq('id', escrow_id);

            console.log(`   ✅ Escrow verified! Ready for fund release.`);

            return NextResponse.json({
                success: true,
                verified: true,
                escrow_id,
                status: 'verified',
                message: 'Booking verified. Funds ready for release.',
                next_step: `/api/orchestrate/release { escrow_id: "${escrow_id}" }`
            });
        } else {
            await supabase
                .from('escrow_transactions')
                .update({
                    status: 'dispute',
                    verification_data: verificationResult
                })
                .eq('id', escrow_id);

            console.log(`   ❌ Verification failed. Escrow in dispute.`);

            return NextResponse.json({
                success: false,
                verified: false,
                escrow_id,
                status: 'dispute',
                message: 'Booking verification failed. Funds held for review.',
                verification_result: verificationResult
            });
        }

    } catch (err) {
        console.error('Verify error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
