
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function runTest() {
    console.log('🚀 Starting Automated Escrow Test...');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean up ALL previous runs (Nuclear option for dev)
    const { error: cleanError } = await supabase.from('escrow_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (cleanError) console.log('Cleanup warning:', cleanError.message);

    const testId = crypto.randomUUID();

    // Create Dummy Escrow
    const { data: escrow, error } = await supabase
        .from('escrow_transactions')
        .insert({
            id: testId,
            buyer_wallet: 'Wallet_Buyer_123',
            seller_agent: 'agent://airline',
            seller_wallet: 'Wallet_Seller_456',
            amount: 0.1,
            fee: 0.00005,
            status: 'confirmed', // Already locked
            service_details: { type: 'flight_booking', carrier: 'AirIndia' }
        })
        .select()
        .single();

    if (error || !escrow) {
        console.error('Failed to seed DB:', error);
        return;
    }

    console.log(`📦 Seeded Escrow: ${escrow.id}`);

    // 2. Try to release WITHOUT proof (Should fail if not buyer)
    console.log('\n--- Test 1: Release without Proof (Third Party) ---');
    const res1 = await fetch(`${BASE_URL}/api/escrow/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrow.id,
            buyer_wallet: 'Wallet_Hacker_999' // Wrong wallet
        })
    });

    if (res1.status === 403) {
        console.log('✅ Correctly Rejected (403)');
    } else {
        console.error('❌ Failed: Should have been rejected', await res1.json());
    }

    // 3. Try to release WITH proof (Automated Oracle)
    console.log('\n--- Test 2: Release WITH Proof (Oracle) ---');
    const proof = 'FLT-1234567890'; // Valid format

    const res2 = await fetch(`${BASE_URL}/api/escrow/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            escrow_id: escrow.id,
            // No buyer_wallet needed if proof is valid!
            proof: proof
        })
    });

    const body2 = await res2.json();
    if (res2.ok && body2.status === 'released') {
        console.log('✅ Automated Release SUCCESS!');
        console.log('Proof:', body2.proof_of_delivery);
        console.log('Tx Signature:', body2.tx_signature);
    } else {
        console.error('❌ Automated Release Failed:', body2);
    }

    // Cleanup
    await supabase.from('escrow_transactions').delete().eq('id', escrow.id);
}

runTest().catch(console.error);
