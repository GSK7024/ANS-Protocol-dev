import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { ANS_CONFIG, getFeeBreakdown } from '@/lib/fees';
import { validateEscrowInput, validateWallet } from '@/lib/validation';
import { rateLimitMiddleware, getRateLimitHeaders } from '@/lib/rateLimiter';
import { logEscrowCreate, logRateLimitHit, hashIP } from '@/lib/auditLogger';

/**
 * ANS Escrow API
 * 
 * Trustless payment protocol for agent commerce.
 * 
 * Flow:
 * 1. CREATE: Buyer initiates booking → escrow created (status: pending)
 * 2. LOCK: Buyer pays SOL → funds locked in escrow (status: locked)
 * 3. CONFIRM: Seller delivers service → submits proof (status: confirmed)
 * 4. RELEASE: System verifies → funds released to seller (status: released)
 * 
 * Safety:
 * - If seller doesn't deliver in 24h → auto-refund to buyer
 * - If dispute → hold until resolution
 * - ANS Fee: Configurable (currently: ${ANS_CONFIG.feeEnabled ? ANS_CONFIG.feePercent + '%' : 'FREE'})
 */

// POST: Create new escrow
export async function POST(req: NextRequest) {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = hashIP(ip);

    // Rate limit check
    const rateLimitResult = rateLimitMiddleware(ipHash, 'escrow_create');
    if (rateLimitResult) {
        await logRateLimitHit(ipHash, '/api/escrow', ipHash);
        return NextResponse.json(
            { error: rateLimitResult.error },
            { status: rateLimitResult.status, headers: rateLimitResult.headers }
        );
    }

    try {
        const {
            buyer_wallet,
            seller_agent,
            amount,
            service_details,
            expires_hours = 24,
            network = 'mainnet'  // Support mainnet/devnet
        } = await req.json();

        // 🔒 SECURITY FIX #3: Validate network parameter
        if (network !== 'mainnet' && network !== 'devnet') {
            return NextResponse.json({ error: 'Invalid network. Must be mainnet or devnet.' }, { status: 400 });
        }

        if (!buyer_wallet || !seller_agent || !amount || !service_details) {
            return NextResponse.json({
                error: 'Missing required fields: buyer_wallet, seller_agent, amount, service_details'
            }, { status: 400 });
        }

        // 🔒 SECURITY FIX #5: Validate escrow inputs
        const inputValidation = validateEscrowInput({ buyer_wallet, seller_agent, amount });
        if (!inputValidation.valid) {
            return NextResponse.json({
                error: inputValidation.error || 'Invalid input',
                severity: inputValidation.severity
            }, { status: 400 });
        }

        // Determine domain prefix based on network
        const domainPrefix = network === 'devnet' ? 'dev.agent://' : 'agent://';

        // Resolve seller's wallet address from ANS
        const resolveRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/resolve?name=${seller_agent}&network=${network}`);
        const resolved = await resolveRes.json();

        const seller_wallet = resolved?.owner || null;

        // Calculate fee using configurable ANS_CONFIG (FREE at launch!)
        const feeBreakdown = getFeeBreakdown(parseFloat(amount));
        const expires_at = new Date(Date.now() + expires_hours * 60 * 60 * 1000);

        // Clean up agent name (remove any prefix)
        const cleanAgentName = seller_agent
            .replace('agent://', '')
            .replace('dev.agent://', '')
            .replace('dev.', '');

        // Create escrow record
        const { data: escrow, error } = await supabase
            .from('escrow_transactions')
            .insert({
                buyer_wallet,
                seller_agent: cleanAgentName,
                seller_wallet,
                amount: parseFloat(amount),
                fee: feeBreakdown.ansFee,
                status: 'pending',
                service_details,
                expires_at: expires_at.toISOString(),
                network  // Store network for filtering
            })
            .select()
            .single();

        if (error) {
            console.error('Escrow create error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            escrow_id: escrow.id,
            status: 'pending',
            amount: escrow.amount,
            network,
            seller: {
                agent: `${domainPrefix}${escrow.seller_agent}`,
                wallet: escrow.seller_wallet
            },
            expires_at: escrow.expires_at,
            message: 'Escrow created successfully.',
            next_step: 'Pay to lock funds in escrow'
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// GET: Check escrow status
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const escrow_id = searchParams.get('id');
    const buyer_wallet = searchParams.get('buyer');
    const network = searchParams.get('network') || 'mainnet';

    try {
        let query = supabase.from('escrow_transactions').select('*');

        if (escrow_id) {
            query = query.eq('id', escrow_id);
        } else if (buyer_wallet) {
            query = query
                .eq('buyer_wallet', buyer_wallet)
                .eq('network', network)  // Filter by network
                .order('created_at', { ascending: false });
        } else {
            return NextResponse.json({ error: 'Provide escrow id or buyer wallet' }, { status: 400 });
        }

        const { data: escrows, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            network,
            escrows: escrows?.map(e => {
                const prefix = e.network === 'devnet' ? 'dev.agent://' : 'agent://';
                return {
                    ...e,
                    seller_agent: `${prefix}${e.seller_agent}`
                };
            })
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT: Update escrow status (lock, confirm, release, refund)
export async function PUT(req: NextRequest) {
    try {
        const { escrow_id, action, tx_signature, proof_of_delivery } = await req.json();

        if (!escrow_id || !action) {
            return NextResponse.json({ error: 'Missing escrow_id or action' }, { status: 400 });
        }

        // Get current escrow
        const { data: escrow, error: fetchError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchError || !escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        let updates: any = {};
        let message = '';

        switch (action) {
            case 'lock':
                // Buyer has paid - lock funds
                if (escrow.status !== 'pending') {
                    return NextResponse.json({ error: 'Escrow not in pending state' }, { status: 400 });
                }
                updates = {
                    status: 'locked',
                    lock_tx_signature: tx_signature,
                    locked_at: new Date().toISOString()
                };
                message = 'Funds locked in escrow. Waiting for seller confirmation.';
                break;

            case 'confirm':
                // Seller has delivered - submit proof
                if (escrow.status !== 'locked') {
                    return NextResponse.json({ error: 'Escrow not locked yet' }, { status: 400 });
                }
                updates = {
                    status: 'confirmed',
                    proof_of_delivery: proof_of_delivery,
                    confirmed_at: new Date().toISOString()
                };
                message = 'Delivery confirmed. Ready for release.';
                break;

            case 'release':
                // Verify and release to seller
                if (escrow.status !== 'confirmed') {
                    return NextResponse.json({ error: 'Escrow not confirmed yet' }, { status: 400 });
                }
                updates = {
                    status: 'released',
                    release_tx_signature: tx_signature,
                    released_at: new Date().toISOString()
                };
                message = `Funds released to seller. ANS Fee: ${escrow.fee} SOL`;
                break;

            case 'refund':
                // Return funds to buyer
                if (!['pending', 'locked', 'expired'].includes(escrow.status)) {
                    return NextResponse.json({ error: 'Cannot refund this escrow' }, { status: 400 });
                }
                updates = {
                    status: 'refunded',
                    refund_tx_signature: tx_signature,
                    notes: 'Refunded to buyer'
                };
                message = 'Funds refunded to buyer.';
                break;

            case 'dispute':
                updates = {
                    status: 'disputed',
                    notes: proof_of_delivery?.reason || 'Dispute opened'
                };
                message = 'Dispute opened. Under review.';
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Update escrow
        const { data: updated, error: updateError } = await supabase
            .from('escrow_transactions')
            .update(updates)
            .eq('id', escrow_id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            escrow_id: updated.id,
            status: updated.status,
            network: updated.network,
            message,
            escrow: {
                ...updated,
                seller_agent: `${updated.network === 'devnet' ? 'dev.agent://' : 'agent://'}${updated.seller_agent}`
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
