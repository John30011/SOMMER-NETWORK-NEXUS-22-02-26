import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xellkrtqohbyrdlcnuux.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
let key = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim();
        break;
    }
}

const supabase = createClient(supabaseUrl, key);

async function testUpdateAll() {
    console.log("Fetching device...");
    const { data: fetchRes, error: fetchErr } = await supabase
        .from('devices_inventory_jj')
        .select(`
            *,
            wan1_provider:isp_providers_jj!wan1_provider_id(name),
            wan2_provider:isp_providers_jj!wan2_provider_id(name)
        `)
        .limit(1)
        .single();

    if (fetchErr) return console.error("Fetch err:", fetchErr);

    let formData = { ...fetchRes };
    formData.observaciones = 'Testing full save object ' + Date.now();
    formData.es_tienda_top = !formData.es_tienda_top;

    const { wan1_provider, wan2_provider, ...dataToUpdate } = formData as any;

    console.log("Updating with full object...");
    const { data, error } = await supabase
        .from('devices_inventory_jj')
        .update(dataToUpdate)
        .eq('network_id', formData.network_id);

    console.log("Update Error:", error);
    console.log("Update Success if no error.");
}

testUpdateAll();
