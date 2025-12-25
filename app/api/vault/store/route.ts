/**
 * Account Vault - Store Personal Data
 * 
 * POST - Store encrypted personal data in user's vault
 * ONE vault per WALLET - shared across all agents
 * Uses VAULT_SYSTEM_KEY for encryption
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getSystemKey, encryptVaultData } from '@/utils/vault_crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { wallet, signature, data } = body;

        // Validation
        if (!wallet || !signature || !data) {
            return NextResponse.json(
                { error: 'Missing required fields: wallet, signature, data' },
                { status: 400 }
            );
        }

        // Verify wallet signature (for authorization)
        const message = `Store vault data for wallet ${wallet}`;
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

        // Get SYSTEM encryption key (not wallet-based)
        const encryptionKey = getSystemKey();

        // Encrypt the data with system key
        const { encrypted, iv, hash } = encryptVaultData(data, encryptionKey);

        // Convert Buffer to Hex string for Postgres bytea
        // This prevents JSON serialization issues with Supabase client
        const hexData = '\\x' + encrypted.toString('hex');

        // Store in database (upsert by wallet)
        const { error } = await supabase
            .from('account_vaults')
            .upsert({
                owner_wallet: wallet,
                encrypted_data: hexData,
                encryption_iv: iv,
                data_hash: hash,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'owner_wallet'
            });

        if (error) {
            console.error('Vault store error:', error);
            return NextResponse.json(
                { error: 'Failed to store vault data' },
                { status: 500 }
            );
        }

        console.log(`🔐 [VAULT] Stored data for wallet ${wallet.substring(0, 8)}... (system key)`);

        return NextResponse.json({
            success: true,
            wallet: wallet.substring(0, 8) + '...',
            fields_stored: Object.keys(data),
            message: 'Vault data encrypted and stored successfully. This data is shared across all your agents.'
        });

    } catch (err) {
        console.error('Vault store error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
