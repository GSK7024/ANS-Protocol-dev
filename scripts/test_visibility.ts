
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: `.env.local` });

const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'visibility_result.txt');
let logs = '';

function log(msg: string) {
    console.log(msg);
    logs += msg + '\n';
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    log(`Missing Env Vars: URL=${!!SUPABASE_URL}, ANON=${!!ANON_KEY}, SERVICE=${!!SERVICE_KEY}`);
    fs.writeFileSync(OUTPUT_FILE, logs);
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
    log(`--- Searching for names like '%pay%' ---`);

    // 1. Admin Listing
    const { data: adminList, error: adminError } = await adminClient
        .from('domains')
        .select('*')
        .ilike('name', '%pay%');
    
    if (adminList && adminList.length > 0) {
        log(`✅ [ADMIN] Found ${adminList.length} matches:`);
        adminList.forEach(d => log(` - ID: ${d.id} | Name: '${d.name}' | Status: ${d.status}`)); 
    } else {
        log(`❌ [ADMIN] Not found. Error: ${adminError?.message}`);
    }

    // 2. Anon Listing
    const { data: anonList, error: anonError } = await anonClient
        .from('domains')
        .select('*')
        .ilike('name', '%pay%');
    
    if (anonList && anonList.length > 0) {
        log(`✅ [ANON] Found ${anonList.length} matches:`);
        anonList.forEach(d => log(` - ID: ${d.id} | Name: '${d.name}' | Status: ${d.status}`)); 
    } else {
        log(`❌ [ANON] Not found. (RLS might hide specific rows)`);
        if (anonError) log(`Error: ${anonError.message}`);
    }

    fs.writeFileSync(OUTPUT_FILE, logs);
}

run();
