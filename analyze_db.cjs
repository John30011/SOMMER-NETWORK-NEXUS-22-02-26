const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'sbp_83b72b1fd67ae6c366e357d8f2578035da402973';
const PROJECT_REF = 'xellkrtqohbyrdlcnuux';

async function runQuery(query) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query });
        const options = {
            hostname: 'api.supabase.com',
            port: 443,
            path: `/v1/projects/${PROJECT_REF}/database/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`API Error: ${res.statusCode} - ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    try {
        const schemas = await runQuery("SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE '%_jj' ORDER BY table_name, ordinal_position;");
        const functions = await runQuery("SELECT proname AS function_name, pg_get_functiondef(oid) AS function_def FROM pg_proc WHERE proname LIKE '%_jj' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');");
        const triggers = await runQuery("SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_timing AS timing, action_statement AS definition FROM information_schema.triggers WHERE event_object_table LIKE '%_jj' AND trigger_schema = 'public';");
        const views = await runQuery("SELECT table_name AS view_name, view_definition FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%_jj';");

        const output = { schemas, functions, triggers, views };
        fs.writeFileSync(path.join(process.cwd(), 'database_analysis.json'), JSON.stringify(output, null, 2));
        console.log("Analysis saved to database_analysis.json");
    } catch (err) {
        console.error("Script failed:", err.message);
    }
}

main();
