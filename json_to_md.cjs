const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database_analysis.json'), 'utf8'));

let md = '# Análisis Completo de la Base de Datos (Tablas _jj)\n\n';
md += '> [!NOTE]\n> A continuación se presenta el mapeo de todas las columnas, vistas, triggers y funciones remotas extraídas desde el entorno de producción `xellkrtqohbyrdlcnuux`.\n\n';

md += '## 1. Esquema de Tablas y Triggers\n\n';
const tables = {};
for (const col of data.schemas) {
    if (!tables[col.table_name]) tables[col.table_name] = [];
    tables[col.table_name].push(col);
}

for (const tableName of Object.keys(tables)) {
    md += `### Tabla: \`${tableName}\`\n`;
    md += '| Columna | Tipo de Dato | Nulo | Por Defecto |\n';
    md += '| :--- | :--- | :--- | :--- |\n';
    for (const col of tables[tableName]) {
        let def = col.column_default ? col.column_default.substring(0, 40) : 'n/a';
        if (def.length === 40) def += '...';

        let type = col.data_type;
        if (col.character_maximum_length) type += `(${col.character_maximum_length})`;

        md += `| \`${col.column_name}\` | ${type} | ${col.is_nullable} | \`${def}\` |\n`;
    }

    // Check triggers for this table
    const tableTriggers = data.triggers.filter(t => t.table_name === tableName);
    if (tableTriggers.length > 0) {
        md += `\n**Triggers Activos:**\n`;
        for (const trig of tableTriggers) {
            md += `- **${trig.trigger_name}** (\`${trig.timing} ${trig.event}\`): Ejecuta \`${trig.definition.substring(0, 120)}${trig.definition.length > 120 ? '...' : ''}\`\n`;
        }
    }
    md += '\n---\n\n';
}

md += '## 2. Vistas (Views)\n\n';
if (data.views.length === 0) {
    md += '*No se encontraron vistas que terminen en `_jj` en el esquema público.*\n\n';
} else {
    for (const view of data.views) {
        md += `### Vista: \`${view.view_name}\`\n`;
        md += '```sql\n' + view.view_definition + '\n```\n\n';
    }
    md += '---\n\n';
}

md += '## 3. Funciones Relevantes (RPCs)\n\n';
if (data.functions.length === 0) {
    md += '*No se encontraron funciones almacenadas (Stored Procedures) que terminen en `_jj`.*\n\n';
} else {
    for (const func of data.functions) {
        md += `### \`${func.function_name}\`\n`;
        md += '<details><summary>Ver Lógica de la Función (SQL)</summary>\n\n';
        md += '```sql\n' + (func.function_def || 'Definición no disponible') + '\n```\n\n';
        md += '</details>\n\n';
    }
}

fs.writeFileSync('c:/Users/Jhan-PC/.gemini/antigravity/brain/3af118dd-c51e-4692-9f32-82ea559a03d0/database_schema_analysis.md', md);
console.log('Markdown generated.');
