import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env for anon key
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
let key = '';
let url = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_URL=')) {
        url = line.split('=')[1].trim();
    }
}

const SUPABASE_URL = url || 'https://xellkrtqohbyrdlcnuux.supabase.co';
const SUPABASE_ANON_KEY = key;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdateWithAnonKey() {
    console.log("Testing update with anon key...");

    // First let's get a valid network_id
    const { data: devices, error: err1 } = await supabase
        .from('devices_inventory_jj')
        .select('network_id, observaciones')
        .limit(1);

    if (err1) {
        console.error("Select error:", err1.message);
        return;
    }
    if (!devices || devices.length === 0) {
        console.log("No devices found");
        return;
    }

    const targetId = devices[0].network_id;
    console.log(`Trying to update device ${targetId} Current:`, devices[0].observaciones);

    const { data, error } = await supabase
        .from('devices_inventory_jj')
        .update({ observaciones: 'Testing anon key RLS ' + Date.now() })
        .eq('network_id', targetId)
        .select();

    console.log("Update Data:", data, "(If empty, RLS blocked it securely and silently)");
    console.log("Update Error:", error);
}

testUpdateWithAnonKey();
