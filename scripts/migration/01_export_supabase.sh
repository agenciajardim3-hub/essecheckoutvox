#!/usr/bin/env bash
# ==============================================================================
# VOX CONTROL: SCRIPT 01 - EXPORTAÇÃO COMPLETA DO SUPABASE ANTIGO
# ==============================================================================
set -e

echo "=== [1/3] Iniciando Exportação Zero Data Loss do Supabase ==="

# Preencha a senha ou defina a variável PGPASSWORD antes de rodar
# No Supabase: Host: db.emdsgvuqrhpjdgrgaslo.supabase.co (ou connection pooler porta 6543 / 5432)
SUPABASE_HOST="${SUPABASE_HOST:-db.emdsgvuqrhpjdgrgaslo.supabase.co}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
DUMP_DIR="./backup_dumps"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${DUMP_DIR}/vox_supabase_backup_${TIMESTAMP}.dump"
SQL_FILE="${DUMP_DIR}/vox_supabase_backup_${TIMESTAMP}.sql"

mkdir -p "$DUMP_DIR"

echo "Conectando em $SUPABASE_HOST:$SUPABASE_PORT..."

# 1. Export binário comprimido com pg_dump (formato Custom, suporta pg_restore com threads)
pg_dump -h "$SUPABASE_HOST" \
        -p "$SUPABASE_PORT" \
        -U "$SUPABASE_USER" \
        -d "$SUPABASE_DB" \
        --no-owner \
        --no-acl \
        -F c \
        -b \
        -v \
        -f "$DUMP_FILE"

# 2. Export em texto plano SQL para auditoria humana
pg_dump -h "$SUPABASE_HOST" \
        -p "$SUPABASE_PORT" \
        -U "$SUPABASE_USER" \
        -d "$SUPABASE_DB" \
        --no-owner \
        --no-acl \
        -F p \
        -b \
        -v \
        -f "$SQL_FILE"

echo "=== ✅ Exportação concluída com sucesso! ==="
echo "Arquivo binário gerado: $DUMP_FILE"
echo "Arquivo SQL legível: $SQL_FILE"
