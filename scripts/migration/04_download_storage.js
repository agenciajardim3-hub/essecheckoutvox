/**
 * VOX CONTROL: SCRIPT 04 - DOWNLOAD COMPLETO DO STORAGE DO SUPABASE
 * Baixa todos os arquivos dos buckets e salva na pasta local do novo Backend Fastify
 * Execução: node scripts/migration/04_download_storage.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

const BUCKETS = ['product-images', 'images', 'certificates', 'signatures'];
const DEST_BASE_DIR = path.resolve(__dirname, '../../backend/uploads');

async function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                return resolve(false);
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(true));
            });
        }).on('error', (err) => {
            file.close();
            try { fs.unlinkSync(destPath); } catch {}
            reject(err);
        });
    });
}

async function main() {
    console.log('=== [1/2] Iniciando Download Completo dos Buckets do Supabase ===');
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    console.log(`Destino Local: ${DEST_BASE_DIR}`);

    if (!fs.existsSync(DEST_BASE_DIR)) {
        fs.mkdirSync(DEST_BASE_DIR, { recursive: true });
    }

    for (const bucket of BUCKETS) {
        console.log(`\nVerificando bucket: "${bucket}"...`);
        const bucketDestDir = path.join(DEST_BASE_DIR, bucket);
        if (!fs.existsSync(bucketDestDir)) {
            fs.mkdirSync(bucketDestDir, { recursive: true });
        }

        try {
            // Lista arquivos no bucket via API de Storage do Supabase
            const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${bucket}`;
            const res = await fetchJSON(listUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prefix: '', limit: 500, sortBy: { column: 'name', order: 'asc' } })
            });

            const files = Array.isArray(res.body) ? res.body : [];
            console.log(`Encontrados ${files.length} arquivos no bucket "${bucket}".`);

            for (const file of files) {
                if (!file.name) continue;
                const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${file.name}`;
                const destFile = path.join(bucketDestDir, file.name);

                // Se tiver subpastas
                const subDir = path.dirname(destFile);
                if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

                process.stdout.write(`  Baixando ${file.name}... `);
                const success = await downloadFile(fileUrl, destFile);
                if (success) {
                    console.log('✅ OK');
                } else {
                    console.log('⚠️ Falha ao obter');
                }
            }
        } catch (err) {
            console.error(`Erro ao listar bucket ${bucket}:`, err.message);
        }
    }

    console.log('\n=== ✅ Migração de arquivos de Storage concluída! ===');
    console.log(`Todos os arquivos foram salvos em: ${DEST_BASE_DIR}`);
}

main().catch(console.error);
