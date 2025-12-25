
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardFlow() {
    console.log("🚀 Starting Dashboard Configuration Test...");

    const testAgentName = `test-agent-${Date.now()}`;
    const testWallet = "TestWalletAddress123456789";

    // 1. Simulate Minting/Registering a Domain
    console.log(`\n1. Registering domain: agent://${testAgentName}...`);
    const { data: domain, error: mintError } = await supabase
        .from('domains')
        .insert({
            name: testAgentName,
            owner_wallet: testWallet,
            status: 'active',
            category: 'uncategorized',
            is_verified: false
        })
        .select()
        .single();

    if (mintError) {
        console.error("❌ Minting failed:", mintError.message);
        return;
    }
    console.log("✅ Domain Registered:", domain.id);

    // 2. Simulate User Saving Configuration (Dashboard 'Save Config' button)
    console.log("\n2. Simulating Dashboard Save (Updating api_config)...");

    const dashboardUpdate = {
        api_config: {
            quote_url: "https://api.test-agent.com/quote",
            book_url: "https://api.test-agent.com/book",
            api_key: "sk-test-key-123",
            configured_at: new Date().toISOString()
        },
        payment_config: {
            solana_address: testWallet
        },
        category: "Technology",
        tags: ["ai", "test", "automation"]
    };

    const { error: updateError } = await supabase
        .from('domains')
        .update({
            api_config: dashboardUpdate.api_config,
            payment_config: dashboardUpdate.payment_config,
            category: dashboardUpdate.category,
            tags: dashboardUpdate.tags
        })
        .eq('id', domain.id);

    if (updateError) {
        console.error("❌ Dashboard Save failed:", updateError.message);
        return;
    }
    console.log("✅ Configuration Saved.");

    // 3. Verify Persistence (Read back)
    console.log("\n3. Verifying Persistence...");
    const { data: verifiedDomain, error: readError } = await supabase
        .from('domains')
        .select('*')
        .eq('id', domain.id)
        .single();

    if (readError) {
        console.error("❌ Verification read failed:", readError.message);
        return;
    }

    const config = verifiedDomain.api_config;
    console.log("--- Fetched Config ---");
    console.log(JSON.stringify(config, null, 2));

    if (
        config.quote_url === dashboardUpdate.api_config.quote_url &&
        config.book_url === dashboardUpdate.api_config.book_url &&
        verifiedDomain.category === "Technology"
    ) {
        console.log("\n🎉 SUCCESS! Dashboard persistence is working correctly.");
        console.log("   The 'Store Sellers API' feature is functional.");
    } else {
        console.error("\n❌ FAILURE! Data mismatch.");
    }

    // Cleanup
    console.log("\n4. Cleaning up test data...");
    await supabase.from('domains').delete().eq('id', domain.id);
    console.log("✅ Cleanup complete.");
}

testDashboardFlow();
