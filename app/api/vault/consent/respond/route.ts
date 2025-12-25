import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const VAULT_SYSTEM_KEY = process.env.VAULT_SYSTEM_KEY || 'nexus-system-key-change-in-production';

/**
 * Vault Consent Response API
 * 
 * Allows target agent to approve or deny vault access.
 * Upon approval, the requested data is extracted and ready for the booking.
 * 
 * POST /api/vault/consent/respond
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            consent_id,       // ID of the consent request
            wallet_address,   // Wallet of the person responding (must match target)
            approved,         // true or false
            fields_shared     // Optional: subset of fields to share (can limit)
        } = body;

        // Validation
        if (!consent_id || approved === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: consent_id, approved'
            }, { status: 400 });
        }

        console.log(`🔐 [VAULT-CONSENT] Response for ${consent_id}: ${approved ? 'APPROVED' : 'DENIED'}`);

        // 1. Get the consent request
        const { data: consentRequest, error: fetchError } = await supabase
            .from('vault_consent_requests')
            .select('*')
            .eq('id', consent_id)
            .single();

        if (fetchError || !consentRequest) {
            return NextResponse.json({
                error: 'Consent request not found'
            }, { status: 404 });
        }

        // 2. Check if expired
        if (new Date(consentRequest.expires_at) < new Date()) {
            // Update status to expired
            await supabase
                .from('vault_consent_requests')
                .update({ status: 'expired' })
                .eq('id', consent_id);

            return NextResponse.json({
                error: 'Consent request has expired'
            }, { status: 410 });
        }

        // 3. Check if already responded
        if (consentRequest.status !== 'pending') {
            return NextResponse.json({
                error: `Consent request already ${consentRequest.status}`
            }, { status: 400 });
        }

        // 4. If denied, update and return
        if (!approved) {
            await supabase
                .from('vault_consent_requests')
                .update({
                    status: 'denied',
                    responded_at: new Date().toISOString()
                })
                .eq('id', consent_id);

            console.log(`   ❌ Consent denied`);

            return NextResponse.json({
                success: true,
                consent_id,
                status: 'denied',
                message: 'Vault access denied'
            });
        }

        // 5. APPROVED - Determine which fields to share
        const requestedFields = consentRequest.fields_requested;
        const approvedFields = fields_shared && fields_shared.length > 0
            ? fields_shared.filter((f: string) => requestedFields.includes(f))
            : requestedFields;

        // 6. Get the owner's vault
        // First try to resolve the target agent to their wallet
        const { data: targetAgent } = await supabase
            .from('domains')
            .select('owner_wallet')
            .eq('name', consentRequest.target_agent)
            .single();

        const targetWallet = targetAgent?.owner_wallet || wallet_address;

        if (!targetWallet) {
            return NextResponse.json({
                error: 'Could not determine vault owner wallet'
            }, { status: 400 });
        }

        // 7. Get vault data
        const { data: vault } = await supabase
            .from('account_vaults')
            .select('encrypted_data, encryption_iv')
            .eq('owner_wallet', targetWallet)
            .single();

        let extractedData: Record<string, any> = {};

        if (vault) {
            // Decrypt vault
            const decrypted = decryptVault(vault.encrypted_data, vault.encryption_iv);
            if (decrypted) {
                // Extract only approved fields
                for (const field of approvedFields) {
                    if (decrypted[field]) {
                        extractedData[field] = decrypted[field];
                    }
                }
            }
        }

        // 8. Update consent request with approval
        await supabase
            .from('vault_consent_requests')
            .update({
                status: 'approved',
                fields_approved: approvedFields,
                responded_at: new Date().toISOString()
            })
            .eq('id', consent_id);

        // 9. Log the access
        await supabase
            .from('vault_access_log')
            .insert({
                vault_wallet: targetWallet,
                accessor_agent: consentRequest.seller_agent,
                fields_accessed: Object.keys(extractedData),
                purpose: consentRequest.purpose,
                consent_id: consent_id
            });

        console.log(`   ✅ Consent approved. Fields shared: ${Object.keys(extractedData).join(', ')}`);

        return NextResponse.json({
            success: true,
            consent_id,
            status: 'approved',
            fields_approved: approvedFields,
            fields_count: Object.keys(extractedData).length,
            message: `Vault access approved. ${Object.keys(extractedData).length} fields will be shared with agent://${consentRequest.seller_agent}.`,
            // NOTE: extractedData is NOT returned to the caller!
            // It's stored/cached for the booking process to use
        });

    } catch (err: any) {
        console.error('Vault consent response error:', err);
        return NextResponse.json({
            error: 'Consent response failed: ' + err.message
        }, { status: 500 });
    }
}

/**
 * GET /api/vault/consent/respond?id=xxx
 * 
 * Get status of a consent request
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({
            error: 'id parameter required'
        }, { status: 400 });
    }

    const { data: consent, error } = await supabase
        .from('vault_consent_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !consent) {
        return NextResponse.json({
            error: 'Consent request not found'
        }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        consent: {
            id: consent.id,
            status: consent.status,
            target_agent: `agent://${consent.target_agent}`,
            seller_agent: `agent://${consent.seller_agent}`,
            fields_requested: consent.fields_requested,
            fields_approved: consent.fields_approved,
            expires_at: consent.expires_at,
            responded_at: consent.responded_at,
            created_at: consent.created_at
        }
    });
}

// Decryption helper
function decryptVault(encryptedData: any, iv: string): Record<string, any> | null {
    try {
        const key = crypto.pbkdf2Sync(VAULT_SYSTEM_KEY, 'nexus-vault-salt', 100000, 32, 'sha256');

        let encryptedBuf: Buffer;
        if (typeof encryptedData === 'string') {
            const hexString = encryptedData.startsWith('\\x')
                ? encryptedData.substring(2)
                : encryptedData;
            encryptedBuf = Buffer.from(hexString, 'hex');
        } else {
            encryptedBuf = Buffer.from(encryptedData);
        }

        const ivBuffer = Buffer.from(iv, 'base64');
        const authTag = encryptedBuf.subarray(-16);
        const ciphertext = encryptedBuf.subarray(0, -16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
        console.error('Vault decryption error:', err);
        return null;
    }
}
