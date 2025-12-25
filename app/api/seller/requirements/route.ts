/**
 * Seller Requirements API
 * 
 * POST - Seller declares what personal data fields they need for transactions
 * GET - Get requirements for a seller
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET - Fetch seller's field requirements
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const seller_agent = searchParams.get('seller');

    if (!seller_agent) {
        return NextResponse.json(
            { error: 'Missing seller parameter' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('seller_requirements')
        .select('*')
        .eq('seller_agent', seller_agent)
        .single();

    if (error || !data) {
        return NextResponse.json({
            seller: seller_agent,
            required_fields: [],
            optional_fields: [],
            message: 'No requirements declared'
        });
    }

    return NextResponse.json({
        seller: seller_agent,
        required_fields: data.required_fields || [],
        optional_fields: data.optional_fields || [],
        field_purposes: data.field_purposes
    });
}

/**
 * POST - Seller declares their field requirements
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { seller_agent, wallet, signature, required_fields, optional_fields, field_purposes } = body;

        // Validation
        if (!seller_agent || !wallet || !signature || !required_fields) {
            return NextResponse.json(
                { error: 'Missing required fields: seller_agent, wallet, signature, required_fields' },
                { status: 400 }
            );
        }

        // Verify wallet signature
        const message = `Set requirements for agent://${seller_agent}`;
        const messageBytes = new TextEncoder().encode(message);

        try {
            const signatureBytes = bs58.decode(signature);
            const publicKey = new PublicKey(wallet);

            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKey.toBytes()
            );

            if (!verified) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        } catch (e) {
            return NextResponse.json(
                { error: 'Signature verification failed' },
                { status: 400 }
            );
        }

        // Verify seller ownership
        const { data: agent } = await supabase
            .from('domains')
            .select('owner_wallet')
            .eq('name', seller_agent)
            .single();

        if (!agent || agent.owner_wallet !== wallet) {
            return NextResponse.json(
                { error: 'You do not own this agent' },
                { status: 403 }
            );
        }

        // Validate field names against allowed types
        const { data: validFields } = await supabase
            .from('vault_field_types')
            .select('field_name');

        const validFieldNames = new Set((validFields || []).map(f => f.field_name));
        const invalidFields = required_fields.filter((f: string) => !validFieldNames.has(f));

        if (invalidFields.length > 0) {
            return NextResponse.json(
                { error: `Invalid field names: ${invalidFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Store requirements (upsert)
        const { error } = await supabase
            .from('seller_requirements')
            .upsert({
                seller_agent,
                required_fields,
                optional_fields: optional_fields || [],
                field_purposes: field_purposes || {},
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'seller_agent'
            });

        if (error) {
            console.error('Requirements store error:', error);
            return NextResponse.json(
                { error: 'Failed to store requirements' },
                { status: 500 }
            );
        }

        console.log(`📋 [SELLER] Set requirements for agent://${seller_agent}: ${required_fields.join(', ')}`);

        return NextResponse.json({
            success: true,
            seller: `agent://${seller_agent}`,
            required_fields,
            optional_fields: optional_fields || []
        });

    } catch (err) {
        console.error('Requirements error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
