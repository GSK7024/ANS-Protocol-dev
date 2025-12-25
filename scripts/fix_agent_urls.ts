
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Port to use - defaults to 3000
const PORT = process.env.PORT || '3000';

async function fixUrls() {
    console.log(`Fixing Agent URLs (using port ${PORT})...`);

    const agents = ['airindia-test', 'skyjet-test', 'scamair-test'];

    for (const name of agents) {
        // Fetch current config
        const { data } = await supabase.from('domains').select('api_config').eq('name', name).single();

        if (data?.api_config) {
            let configStr = JSON.stringify(data.api_config);
            // Replace any localhost with 127.0.0.1 and normalize port
            configStr = configStr.replace(/localhost/g, '127.0.0.1');
            configStr = configStr.replace(/:(3000|3001|3002)/g, `:${PORT}`);
            const newConfig = JSON.parse(configStr);

            const { error } = await supabase
                .from('domains')
                .update({ api_config: newConfig })
                .eq('name', name);

            if (error) console.error(`❌ Failed to update ${name}:`, error.message);
            else console.log(`✅ Updated ${name} to port ${PORT}`);
        }
    }
}

fixUrls();
