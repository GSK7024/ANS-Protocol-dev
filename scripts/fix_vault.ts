/**
 * Fix Vault Encryption
 * 
 * Overwrites the vault data for the specific wallet with
 * data encrypted using the VAULT_SYSTEM_KEY.
 * 
 * This fixes the issue where old data was encrypted with wallet signature.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

import { createClient } from '@supabase/supabase-js';
import { getSystemKey, encryptVaultData } from '../utils/vault_crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WALLET = '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv';

const TEST_DATA = {
    full_name: 'Test User',
    email: 'test@example.com',
    phone: '+1 555 123 4567',
    nationality: 'American',
    passport_number: 'P1234567',
    passport_expiry: '2030-01-01',
    address: '123 Test St, Crypto City'
};

async function fixVault() {
    console.log('🔧 Fixing Vault Data for:', WALLET);

    try {
        // 1. Encrypt with System Key
        console.log('🔐 Encrypting valid test data with VAULT_SYSTEM_KEY...');
        const systemKey = getSystemKey();
        const { encrypted, iv, hash } = encryptVaultData(TEST_DATA, systemKey);

        // 2. Update Database directly (bypassing API/Signature check)
        // Convert Buffer to Hex string for Postgres bytea
        const hexData = '\\x' + encrypted.toString('hex');

        const { error } = await supabase
            .from('account_vaults')
            .upsert({
                owner_wallet: WALLET,
                encrypted_data: hexData, // Store as Hex String
                encryption_iv: iv,
                data_hash: hash,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'owner_wallet'
            });

        if (error) {
            throw new Error(`DB Update failed: ${error.message}`);
        }

        console.log('✅ Vault successfully updated with system-key encrypted data!');
        console.log('   Now the booking endpoint should be able to decrypt it.');

    } catch (e: any) {
        console.error('❌ Failed to fix vault:', e.message);
    }
}

fixVault();
