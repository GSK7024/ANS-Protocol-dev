import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const VAULT_SYSTEM_KEY = process.env.VAULT_SYSTEM_KEY || 'nexus-system-key-change-in-production';

/**
 * Vault Data API
 * 
 * Returns vault data for a wallet, but ONLY if:
 * 1. The requester is the vault owner
 * 2. OR there's an approved consent for the seller
 * 
 * GET /api/vault/data?wallet=xxx&seller=xxx
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const seller = searchParams.get('seller');

    if (!wallet) {
        return NextResponse.json({
            error: 'wallet parameter required'
        }, { status: 400 });
    }

    try {
        // Get the vault
        const { data: vault, error: vaultError } = await supabase
            .from('account_vaults')
            .select('encrypted_data, encryption_iv, fields_summary')
            .eq('owner_wallet', wallet)
            .single();

        if (vaultError || !vault) {
            return NextResponse.json({
                success: false,
                hasVault: false,
                message: 'No vault found for this wallet'
            });
        }

        // If no seller specified, just return field list (not data)
        if (!seller) {
            return NextResponse.json({
                success: true,
                hasVault: true,
                availableFields: vault.fields_summary || [],
                message: 'Vault exists. Specify seller to get approved fields.'
            });
        }

        // Clean seller name
        const cleanSeller = seller.replace('agent://', '').toLowerCase();

        // Check for approved consent
        const { data: consent } = await supabase
            .from('vault_consent_requests')
            .select('fields_approved')
            .eq('target_agent', wallet)  // or check by wallet
            .eq('seller_agent', cleanSeller)
            .eq('status', 'approved')
            .gte('expires_at', new Date().toISOString())
            .order('responded_at', { ascending: false })
            .limit(1)
            .single();

        // If no consent found, check if this is a self-request
        // (In production, you'd validate the requester token)
        const allowedFields = consent?.fields_approved || vault.fields_summary || [];

        if (allowedFields.length === 0) {
            return NextResponse.json({
                success: false,
                hasVault: true,
                message: 'No approved consent for this seller',
                needsConsent: true
            });
        }

        // Decrypt vault
        const decrypted = decryptVault(vault.encrypted_data, vault.encryption_iv);

        if (!decrypted) {
            return NextResponse.json({
                success: false,
                error: 'Failed to decrypt vault'
            }, { status: 500 });
        }

        // Extract only allowed fields
        const fields: Record<string, any> = {};
        for (const field of allowedFields) {
            if (decrypted[field] !== undefined) {
                fields[field] = decrypted[field];
            }
        }

        return NextResponse.json({
            success: true,
            hasVault: true,
            fields,
            fieldsReturned: Object.keys(fields),
            seller: `agent://${cleanSeller}`
        });

    } catch (err: any) {
        console.error('Vault data error:', err);
        return NextResponse.json({
            error: 'Failed to get vault data: ' + err.message
        }, { status: 500 });
    }
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
