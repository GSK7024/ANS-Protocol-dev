
const BASE_URL = 'http://localhost:3000';

async function testAgent(name: string, endpoint: string, searchPayload: any, bookPayload: any) {
    console.log(`\n🤖 TESTING AGENT: ${name}`);
    console.log(`   Source: ${endpoint}`);

    // 1. Test Search
    try {
        console.log(`   🔍 Searching...`);
        const searchRes = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(searchPayload)
        });
        const searchData = await searchRes.json();

        if (searchData.success) {
            console.log(`   ✅ Search Success! Found ${searchData.total_results || searchData.products?.length || 0} results.`);
            // console.log('   Sample:', JSON.stringify(searchData, null, 2));
        } else {
            console.error(`   ❌ Search Failed:`, searchData);
        }

    } catch (err) {
        console.error(`   ❌ Connection Error:`, err);
    }

    // 2. Test Booking
    try {
        console.log(`   🛒 Booking...`);
        const bookRes = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(bookPayload)
        });
        const bookData = await bookRes.json();

        if (bookData.success) {
            console.log(`   ✅ Booking Success! ID: ${bookData.booking?.pnr || bookData.reservation?.confirmation_number || bookData.order?.order_id}`);
            console.log(`   🎉 ${name} verified.`);
        } else {
            console.error(`   ❌ Booking Failed:`, bookData);
        }
    } catch (err) {
        console.error(`   ❌ Connection Error:`, err);
    }
}

async function runAllTests() {
    console.log("🚀 STARTING ANS AGENT VERIFICATION 🚀");

    // 1. AIR INDIA (Travel)
    await testAgent(
        "Air India",
        "/api/sellers/airindia",
        { action: 'search', from: 'DEL', to: 'BOM' },
        { action: 'book', flight_no: 'AI-855', passenger: { full_name: 'Test User' } }
    );

    // 2. MARRIOTT (Hotel)
    await testAgent(
        "Marriott Hotels",
        "/api/sellers/marriott",
        { action: 'search', city: 'Mumbai' },
        { action: 'book', property_id: 'MHMUM001', guest: { full_name: 'Test User' } }
    );

    // 3. AMAZON (Shopping)
    await testAgent(
        "Amazon",
        "/api/sellers/amazon",
        { action: 'search', query: 'sony', category: 'electronics' },
        { action: 'buy', product_id: 'AMZ-E001', shipping_address: '123 Test St' }
    );

    console.log("\n✅ All agent tests completed.");
}

runAllTests();
