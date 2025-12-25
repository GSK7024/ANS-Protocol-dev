
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function seed() {
    console.log('Seeding test agents...');

    const agents = [
        {
            name: 'airindia-test',
            owner_wallet: '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv', // Use dev wallet as placeholder
            status: 'active',
            category: 'travel',
            trust_score: 0.95,
            api_config: {
                quote_url: "http://localhost:3000/api/testing/flights",
                verify_url: "http://localhost:3000/api/testing/airlines/backend",
                api_key: "backend-key-secret",
                webhook_url: "internal://airindia-agent",
                supported_actions: ["search", "book"],
                response_time_avg_ms: 2000
            }
        },
        {
            name: 'skyjet-test',
            owner_wallet: '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
            status: 'active',
            category: 'travel',
            trust_score: 0.88,
            api_config: {
                quote_url: "http://localhost:3000/api/testing/flights",
                webhook_url: "internal://skyjet-agent",
                supported_actions: ["search", "book"],
                response_time_avg_ms: 3000
            }
        },
        {
            name: 'scamair-test',
            owner_wallet: '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
            status: 'active',
            category: 'travel',
            trust_score: 0.12,
            api_config: {
                quote_url: "http://localhost:3000/api/testing/flights",
                webhook_url: "internal://scamair-agent",
                supported_actions: ["search", "book"],
                response_time_avg_ms: 9999
            }
        }
    ];

    for (const agent of agents) {
        const { error } = await supabase
            .from('domains')
            .upsert(agent, { onConflict: 'name' });

        if (error) console.error(`Failed to seed ${agent.name}:`, error.message);
        else console.log(`✅ Seeded ${agent.name}`);
    }
}

seed();
