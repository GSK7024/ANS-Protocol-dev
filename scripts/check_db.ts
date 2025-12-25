
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
    console.log('Checking domains...');
    const { data, error } = await supabase
        .from('domains')
        .select('*')
        .like('name', '%-test');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found agents:', data?.length);
        data?.forEach(d => {
            console.log(`- ${d.name}: api_config=${JSON.stringify(d.api_config).slice(0, 50)}...`);
        });
    }
}

check();
