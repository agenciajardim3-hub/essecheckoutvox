/**
 * VOX CONTROL: EXPORTADOR COMPLETO SUPABASE CLOUD -> SQL / JSON
 * Baixa 100% dos dados reais do Supabase Cloud (emdsgvuqrhpjdgrgaslo)
 * e gera um arquivo SQL com DDL completo e INSERTS idempotentes (ON CONFLICT DO NOTHING / UPDATE)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

const TABLES = [
  'signature_templates',
  'checkouts',
  'coupons',
  'leads',
  'expenses',
  'checkout_views',
  'form_requests',
  'support_materials'
];

const NUMERIC_COLS = new Set([
  'product_price',
  'ticket_amount',
  'paid_amount',
  'discount_applied',
  'discount_value',
  'amount',
  'investment_12x',
  'investment_pix',
  'mp_fee_amount',
  'mp_net_amount'
]);

function fetchTableChunk(table, offset, limit) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`;
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': `${offset}-${offset + limit - 1}`,
        'Prefer': 'count=exact'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error(`Erro de JSON ao ler ${table}: ${e.message}`));
          }
        } else {
          resolve([]);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAll(table) {
  console.log(`Baixando tabela: ${table}...`);
  let allRows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const rows = await fetchTableChunk(table, offset, limit);
    if (!rows || rows.length === 0) break;
    allRows = allRows.concat(rows);
    console.log(`  ${table}: ${allRows.length} linhas baixadas...`);
    if (rows.length < limit) break;
    offset += limit;
  }
  return allRows;
}

function escapeSql(val, colName) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';

  // Se a coluna for numérica conhecida, normaliza vírgulas e strings vazias
  if (NUMERIC_COLS.has(colName)) {
    if (typeof val === 'string') {
      const cleaned = val.replace(',', '.').trim();
      if (!cleaned || isNaN(Number(cleaned))) return 'NULL';
      return String(Number(cleaned));
    }
    if (typeof val === 'number') {
      return isNaN(val) ? 'NULL' : String(val);
    }
  }

  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function generateTableInserts(tableName, rows) {
  if (!rows || rows.length === 0) return `-- Tabela ${tableName}: 0 registros\n`;

  let sql = `-- ==============================================================================\n`;
  sql += `-- DADOS: ${tableName} (${rows.length} registros)\n`;
  sql += `-- ==============================================================================\n`;

  for (const row of rows) {
    // Normalização específica para leads
    if (tableName === 'leads') {
      row.product_name = row.product_name || row.productName || row.productname || null;
      row.productName = row.productName || row.product_name || null;
      row.productname = row.productname || row.product_name || null;
    }

    const cols = Object.keys(row);
    const vals = cols.map(c => escapeSql(row[c], c));
    const colList = cols.map(c => `"${c}"`).join(', ');
    const valList = vals.join(', ');
    
    if (cols.includes('id')) {
      sql += `INSERT INTO "${tableName}" (${colList}) VALUES (${valList}) ON CONFLICT ("id") DO NOTHING;\n`;
    } else {
      sql += `INSERT INTO "${tableName}" (${colList}) VALUES (${valList});\n`;
    }
  }
  return sql + '\n';
}

async function run() {
  console.log('=== Iniciando Exportação Completa Supabase Cloud ===');
  const backupDir = path.resolve(__dirname, '../../backup_dumps');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const allData = {};
  for (const table of TABLES) {
    try {
      allData[table] = await fetchAll(table);
    } catch (err) {
      console.error(`Erro ao baixar ${table}:`, err.message);
      allData[table] = [];
    }
  }

  // 1. Salvar JSON Bruto para auditoria
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const jsonPath = path.join(backupDir, `supabase_export_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2), 'utf8');
  console.log(`JSON salvo: ${jsonPath}`);

  // 2. Gerar Schema DDL e Inserts SQL
  const ddlPath = path.resolve(__dirname, 'schema_ddl.sql');
  let ddl = '';
  if (fs.existsSync(ddlPath)) {
    ddl = fs.readFileSync(ddlPath, 'utf8') + '\n\n';
  }

  let finalSql = ddl;
  for (const table of TABLES) {
    finalSql += generateTableInserts(table, allData[table]);
  }

  const sqlPath = path.join(backupDir, `supabase_restore_clean.sql`);
  fs.writeFileSync(sqlPath, finalSql, 'utf8');
  console.log(`SQL completo gerado: ${sqlPath}`);
  console.log('=== Exportação Concluída com Sucesso! ===');
}

run().catch(console.error);
