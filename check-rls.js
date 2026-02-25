import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log("Checking RLS for isp_contacts_jj...");

    // Just try inserting a dummy row
    const { data, error } = await supabase
        .from('isp_contacts_jj')
        .insert([{ provider_id: 1, level: 'Nivel 1', method: 'Correo', value: 'test@test.com', contact_name: 'Test' }])
        .select();

    if (error) {
        console.error("Insert Error:", error.message);
    } else {
        console.log("Insert Success:", data);
        // clean up
        await supabase.from('isp_contacts_jj').delete().eq('id', data[0].id);
    }
}

checkRLS();
