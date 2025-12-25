import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local explicitly
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    console.log('📄 Loading .env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.log('⚠️ .env.local not found');
}

import { createClient } from '@supabase/supabase-js';
import { getSystemKey, decryptVaultData } from '../utils/vault_crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WALLET = '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv';

async function debugVault() {
    console.log('🔍 Debugging Vault for wallet:', WALLET);

    // 1. Fetch Vault
    const { data: vault, error } = await supabase
        .from('account_vaults')
        .select('*')
        .eq('owner_wallet', WALLET)
        .single();

    if (error) {
        console.error('❌ Vault not found or error:', error.message);
        return;
    }

    console.log('✅ Vault found!');
    console.log('   ID:', vault.id);
    console.log('   Updated At:', vault.updated_at);
    console.log('   Encrypted Data Type:', typeof vault.encrypted_data);
    if (typeof vault.encrypted_data === 'string') {
        console.log('   Encrypted Data Preview:', vault.encrypted_data.substring(0, 20));
    }

    // 2. Try Decrypting with System Key
    try {
        console.log('\n🔐 Attempting decryption with VAULT_SYSTEM_KEY...');
        const systemKey = getSystemKey();

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
            systemKey
        );

        console.log('✅ Decryption SUCCESS!');
        console.log('   Data structure:', JSON.stringify(decrypted, null, 2));

    } catch (e: any) {
        console.error('❌ Decryption FAILED:', e.message);
        console.log('   Cause: Key mismatch? (Data might still be encrypted with wallet signature)');
    }
}

debugVault();
