import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const outputFile = 'cambios_registro.md';

const dirsToScan = [
    'components',
    'hooks',
    'utils',
    'types.ts',
    'n8n_workflows'
];

async function scanFiles() {
    let output = '\n\n### --- CÓDIGO FUENTE (SNAPSHOT) ---\n\n';

    for (const item of dirsToScan) {
        const fullPath = path.join(process.cwd(), item);
        if (!fs.existsSync(fullPath)) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            output += `#### Archivo: \`${item}\`\n\`\`\`javascript\n${fs.readFileSync(fullPath, 'utf8')}\n\`\`\`\n\n`;
        } else {
            const files = getAllFiles(fullPath);
            for (const file of files) {
                const ext = path.extname(file);
                if (['.tsx', '.ts', '.js', '.json'].includes(ext)) {
                    const relativePath = path.relative(process.cwd(), file);
                    output += `#### Archivo: \`${relativePath}\`\n\`\`\`${ext.replace('.', '')}\n${fs.readFileSync(file, 'utf8')}\n\`\`\`\n\n`;
                }
            }
        }
    }
    return output;
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

async function getDBSchema() {
    let output = '\n\n### --- BASE DE DATOS (SNAPSHOT) ---\n\n';

    // Extract table schema
    const { data: cols, error } = await supabase.rpc('get_schema_info') // If custom rpc doesn't exist, we will use another way
        .catch(() => ({ data: null, error: true }));

    if (error) {
        // Manual fetch from information_schema (Postgres via Edge function or directly if we have proper permissions)
        // Since the script runs with anon/service key via PostgREST, information_schema might be restricted.
        output += "Nota: No se puede extraer el esquema completo vía API REST de Supabase directamente sin una función RPC (information_schema está bloqueado por el proxy API).\n";
        output += "Revisar `database_schema_analysis.md` para el esquema extraído previamente.\n\n";
    }

    return output;
}

async function main() {
    console.log("Generando Snapshot del Código...");
    const codeSnapshot = await scanFiles();

    console.log("Generando Snapshot de DB...");
    const dbSnapshot = await getDBSchema();

    fs.appendFileSync(outputFile, codeSnapshot + dbSnapshot);
    console.log("Snapshot guardado exitosamente en " + outputFile);
}

main();
