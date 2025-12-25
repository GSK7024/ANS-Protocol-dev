/**
 * Account Vault - Retrieve Personal Data
 * 
 * POST - Retrieve and decrypt user's vault data
 * ONE vault per WALLET - shared across all agents
 * Uses VAULT_SYSTEM_KEY for decryption
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getSystemKey, decryptVaultData, verifyDataIntegrity } from '@/utils/vault_crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { wallet, signature } = body;

        // Validation
        if (!wallet || !signature) {
            return NextResponse.json(
                { error: 'Missing required fields: wallet, signature' },
                { status: 400 }
            );
        }

        // Verify wallet signature (for authorization)
        const message = `Retrieve vault data for wallet ${wallet}`;
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

        // Get vault data by wallet
        const { data: vault, error } = await supabase
            .from('account_vaults')
            .select('*')
            .eq('owner_wallet', wallet)
            .single();

        if (error || !vault) {
            return NextResponse.json(
                { error: 'Vault not found' },
                { status: 404 }
            );
        }

        // Get SYSTEM decryption key
        const encryptionKey = getSystemKey();

        // Decrypt the data
        try {
            // Handle Postgres Hex Format (\x...)
            let encryptedBuf: Buffer;
            if (typeof vault.encrypted_data === 'string') {
                const hexString = vault.encrypted_data.startsWith('\\x')
                    ? vault.encrypted_data.substring(2)
                    : vault.encrypted_data;
                encryptedBuf = Buffer.from(hexString, 'hex');
            } else {
                encryptedBuf = Buffer.from(vault.encrypted_data);
            }

            const decrypted = decryptVaultData(
                encryptedBuf,
                vault.encryption_iv,
                encryptionKey
            );

            // Verify integrity
            if (!verifyDataIntegrity(decrypted, vault.data_hash)) {
                return NextResponse.json(
                    { error: 'Data integrity check failed' },
                    { status: 500 }
                );
            }

            console.log(`🔓 [VAULT] Retrieved data for wallet ${wallet.substring(0, 8)}...`);

            return NextResponse.json({
                success: true,
                data: decrypted,
                updated_at: vault.updated_at
            });

        } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            return NextResponse.json(
                { error: 'Decryption failed' },
                { status: 500 }
            );
        }

    } catch (err) {
        console.error('Vault retrieve error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
