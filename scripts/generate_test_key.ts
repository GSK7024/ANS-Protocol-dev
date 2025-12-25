/**
 * Generate a test API key (for development only!)
 * 
 * Run: npx ts-node scripts/generate_test_key.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
    console.log('🔑 Generating Test API Key...\n');

    // Generate key
    const randomBytes = crypto.randomBytes(24);
    const randomPart = randomBytes.toString('base64url');
    const key = `nxs_live_${randomPart}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12) + '...';

    // Insert into DB
    const { data, error } = await supabase
        .from('api_keys')
        .insert({
            key_hash: hash,
            key_prefix: prefix,
            name: 'Development Test Key',
            owner_wallet: process.env.NEXT_PUBLIC_DEV_WALLET || 'dev-wallet'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Make sure you ran db/api_keys.sql in Supabase first!');
        process.exit(1);
    }

    console.log('✅ API Key Generated!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔐 YOUR API KEY (save this!):`);
    console.log(`\n   ${key}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage:');
    console.log(`   curl -H "Authorization: Bearer ${key}" \\`);
    console.log(`        http://localhost:3000/api/search?category=travel`);
    console.log('\n⚠️  This key is shown ONCE. Save it now!');
}

main().catch(console.error);
