const fs = require('fs');
const path = require('path');

try {
    // 1. Read files
    const typesContent = fs.readFileSync('types.ts', 'utf8');
    const tablesOutput = fs.readFileSync('C:/Users/Jhan-PC/.gemini/antigravity/brain/b81d364d-cdc6-4c0f-8a95-24b7f4b50f5e/.system_generated/steps/352/output.txt', 'utf8');
    const funcsOutput = fs.readFileSync('C:/Users/Jhan-PC/.gemini/antigravity/brain/b81d364d-cdc6-4c0f-8a95-24b7f4b50f5e/.system_generated/steps/364/output.txt', 'utf8');

    // 2. Extract JSON
    const rx = /<untrusted-data-[^>]+>([\s\S]*?)<\/untrusted-data-[^>]+>/;
    const tablesMatch = tablesOutput.match(rx);
    const funcsMatch = funcsOutput.match(rx);

    const tablesData = JSON.parse(tablesMatch[1].trim());
    const funcsData = JSON.parse(funcsMatch[1].trim());

    // 3. Format Tables
    let groupedTables = {};
    tablesData.forEach(row => {
        if (!groupedTables[row.table_name]) groupedTables[row.table_name] = [];
        groupedTables[row.table_name].push(row);
    });

    let mdDB = '### 3. Snapshot Base de Datos (Tablas y Columnas)\n\n';
    mdDB += 'A continuación se lista la estructura exacta de todas las tablas en el esquema `public`.\n\n';
    for (const [tName, cols] of Object.entries(groupedTables)) {
        mdDB += '#### Tabla: `' + tName + '`\n| Columna | Tipo de Dato |\n|---|---|\n';
        cols.forEach(c => {
            mdDB += '| ' + c.column_name + ' | `' + c.data_type + '` |\n';
        });
        mdDB += '\n';
    }

    // 4. Format Functions
    let mdFuncs = '### 4. Snapshot Base de Datos (Funciones y Procedimientos Almacenados)\n\n';
    funcsData.forEach(f => {
        mdFuncs += '#### Función: `' + f.function_name + '`\n```sql\n' + f.function_definition + '\n```\n\n';
    });

    // 5. Build final markdown block
    let snapshotBlock = '### 3. Snapshot Frontend (Modelos Estructurales - `types.ts`)\n';
    snapshotBlock += 'Este archivo define la estructura y relación del frontend (React/TypeScript) con Supabase:\n';
    snapshotBlock += '```typescript\n' + typesContent + '\n```\n\n';
    snapshotBlock += mdDB;
    snapshotBlock += mdFuncs;
    snapshotBlock += '\n\n*(No hay cambios registrados posterior al Snapshot Oficial detallado).*';

    // 6. Append to cambios_registro.md
    let mdFile = fs.readFileSync('cambios_registro.md', 'utf8');
    mdFile = mdFile.replace('*(No hay cambios registrados posterior al Snapshot).*', snapshotBlock);

    fs.writeFileSync('cambios_registro.md', mdFile);
    console.log('Snapshot formateado e insertado exitosamente en cambios_registro.md');

} catch (err) {
    console.error('Error procesando el snapshot:', err);
}
