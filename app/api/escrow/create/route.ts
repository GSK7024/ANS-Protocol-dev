import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role for database writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Fee rate: 0.0005%
const FEE_RATE = 0.000005;

// Default expiration: 24 hours
const DEFAULT_EXPIRATION_HOURS = 24;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { buyer_wallet, seller_agent, amount, service_details } = body;

        // Validation
        if (!buyer_wallet || !seller_agent || !amount || !service_details) {
            return NextResponse.json(
                { error: 'Missing required fields: buyer_wallet, seller_agent, amount, service_details' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        // Calculate fee
        const fee = amount * FEE_RATE;
        const totalAmount = amount + fee;

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

        // Resolve seller wallet from domain (optional - can be done later)
        let sellerWallet = null;
        const domainName = seller_agent.replace('agent://', '');
        const { data: domainData } = await supabase
            .from('domains')
            .select('owner_wallet')
            .eq('name', domainName)
            .single();

        if (domainData) {
            sellerWallet = domainData.owner_wallet;
        }

        // Create escrow record
        const { data, error } = await supabase
            .from('escrow_transactions')
            .insert({
                buyer_wallet,
                seller_agent,
                seller_wallet: sellerWallet,
                amount,
                fee,
                status: 'pending',
                service_details,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Escrow creation error:', error);
            return NextResponse.json(
                { error: 'Failed to create escrow: ' + error.message },
                { status: 500 }
            );
        }

        // Return escrow details
        return NextResponse.json({
            success: true,
            escrow_id: data.id,
            vault_address: process.env.NEXT_PUBLIC_VAULT_WALLET,
            total_amount: totalAmount,
            breakdown: {
                service_amount: amount,
                platform_fee: fee,
                fee_percentage: '0.0005%'
            },
            expires_at: expiresAt.toISOString(),
            message: `Send ${totalAmount} SOL to the vault address to lock this escrow.`
        });

    } catch (err) {
        console.error('Escrow create error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
