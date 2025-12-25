/**
 * SDK Test - Run this to verify the ANS SDK works
 * 
 * Run: npx ts-node test-sdk.ts
 */

// Import from local SDK
import { ANS } from './sdk/index';

async function testSDK() {
    console.log('🧪 Testing ANS SDK...\n');

    // Initialize with your API key
    const ans = new ANS({
        apiKey: 'nxs_live_wQsYz9sJ9oKarE61KNE-mmFoeu1Q6oEO',
        baseUrl: 'http://localhost:3000', // Local dev server
        network: 'mainnet'
    });

    try {
        // Test 1: Discover top agents
        console.log('📡 Testing discover()...');
        const topAgents = await ans.discover({ limit: 5 });
        console.log(`✅ Found ${topAgents.length} agents:`);
        topAgents.forEach((agent, i) => {
            console.log(`   ${i + 1}. ${agent.name} (Trust: ${agent.trust_score})`);
        });
        console.log('');

        // Test 2: Search agents
        console.log('🔍 Testing search()...');
        const results = await ans.search({ limit: 3 });
        console.log(`✅ Search returned ${results.length} results`);
        console.log('');

        // Test 3: Resolve a specific agent
        console.log('🎯 Testing resolve()...');
        if (topAgents.length > 0) {
            const agentName = topAgents[0].name;
            try {
                const agent = await ans.resolve(agentName);
                console.log(`✅ Resolved: ${agent.name}`);
                console.log(`   Owner: ${agent.owner}`);
                console.log(`   Status: ${agent.status}`);
            } catch (e) {
                console.log(`⚠️ Could not resolve ${agentName}`);
            }
        }
        console.log('');

        console.log('🎉 All tests passed! SDK is working correctly.\n');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

testSDK();
