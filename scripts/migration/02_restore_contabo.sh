#!/usr/bin/env bash
# ==============================================================================
# VOX CONTROL: SCRIPT 02 - RESTAURAÇÃO NO POSTGRESQL 16 (CONTABO VPS)
# ==============================================================================
set -e

if [ -z "$1" ]; then
    echo "Uso: ./02_restore_contabo.sh <caminho_do_arquivo.dump>"
    exit 1
fi

DUMP_FILE="$1"
CONTABO_HOST="${CONTABO_HOST:-localhost}"
CONTABO_PORT="${CONTABO_PORT:-5432}"
CONTABO_USER="${CONTABO_USER:-vox_user}"
CONTABO_DB="${CONTABO_DB:-vox_control}"

echo "=== [2/3] Restaurando dados no PostgreSQL da Contabo ($CONTABO_HOST:$CONTABO_PORT/$CONTABO_DB) ==="

# 1. Restauração via pg_restore
pg_restore -h "$CONTABO_HOST" \
           -p "$CONTABO_PORT" \
           -U "$CONTABO_USER" \
           -d "$CONTABO_DB" \
           --no-owner \
           --no-acl \
           --clean \
           --if-exists \
           -v \
           "$DUMP_FILE"

echo "=== [3/3] Aplicando migração do Notion e Webhooks (20261120_notion_webhooks_schema.sql) ==="
psql -h "$CONTABO_HOST" \
     -p "$CONTABO_PORT" \
     -U "$CONTABO_USER" \
     -d "$CONTABO_DB" \
     -f "../../sql/migrations/20261120_notion_webhooks_schema.sql"

echo "=== ✅ Restauração e migrações concluídas com sucesso! ==="
echo "Execute agora o script '03_audit_checksum.sql' no Supabase e na Contabo para confirmar 100% de paridade."
