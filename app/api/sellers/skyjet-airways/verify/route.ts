import { NextRequest, NextResponse } from 'next/server';

/**
 * SKYJET AIRWAYS - Booking Verification API
 * 
 * This endpoint verifies if a PNR is valid.
 * Called by ANS Orchestrator to confirm bookings before releasing funds.
 * 
 * POST /api/sellers/skyjet-airways/verify
 * Body: { pnr: string }
 */

// In-memory store of valid PNRs (in production, this would be a database)
// For demo, we'll accept any PNR that starts with "SKY"
const validPNRPattern = /^SKY[A-Z0-9]+$/;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { pnr, escrow_id, buyer_wallet } = body;

        console.log(`🔍 [SkyJet Airways] Verify request for PNR: ${pnr}`);

        if (!pnr) {
            return NextResponse.json({
                verified: false,
                error: 'PNR required'
            }, { status: 400 });
        }

        // Verify PNR format (demo: accept any SKY* PNR)
        const isValidFormat = validPNRPattern.test(pnr);

        if (!isValidFormat) {
            console.log(`   ❌ Invalid PNR format: ${pnr}`);
            return NextResponse.json({
                verified: false,
                pnr,
                reason: 'Invalid PNR format'
            });
        }

        // In production, this would:
        // 1. Check against actual booking database
        // 2. Verify the passenger name matches
        // 3. Confirm flight hasn't been cancelled
        // 4. Check departure date is still valid

        console.log(`   ✅ PNR verified: ${pnr}`);

        return NextResponse.json({
            verified: true,
            pnr,
            airline: 'SkyJet Airways',
            status: 'CONFIRMED',
            message: 'Booking is valid and confirmed',
            verified_at: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('Verify error:', e);
        return NextResponse.json({
            verified: false,
            error: e.message
        }, { status: 500 });
    }
}

// GET: Check verification status
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const pnr = searchParams.get('pnr');

    if (!pnr) {
        return NextResponse.json({ error: 'pnr query param required' }, { status: 400 });
    }

    const isValid = validPNRPattern.test(pnr);

    return NextResponse.json({
        pnr,
        verified: isValid,
        airline: 'SkyJet Airways'
    });
}
