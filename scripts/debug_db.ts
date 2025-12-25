import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking 'domains' table structure...");

    // Attempt to select specific columns to see if they error
    const { data, error } = await supabase
        .from('domains')
        .select('id, name, owner_wallet, marketplace_status')
        .limit(1);

    if (error) {
        console.error("Error querying columns:", error);
    } else {
        console.log("Query Successful. Data sample:", data);
        if (data && data.length > 0) {
            console.log("owner_wallet value:", data[0].owner_wallet);
        } else {
            console.log("No domains found to check.");
        }
    }
}

checkColumns();
