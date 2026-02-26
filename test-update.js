import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xellkrtqohbyrdlcnuux.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // I need to get the key from .env

import * as fs from 'fs';
import * as path from 'path';

// Read .env.local
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
let key = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim();
        break;
    }
}

const supabase = createClient(supabaseUrl, key);

async function testUpdate() {
    console.log("Testing update...");
    const { data, error } = await supabase
        .from('devices_inventory_jj')
        .update({ observaciones: 'Test update from script' })
        .eq('network_id', 'L_688463836171801265')
        .select();

    console.log("Result data:", data);
    console.log("Result error:", error);
}

testUpdate();
