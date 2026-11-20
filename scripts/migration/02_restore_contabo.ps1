# ==============================================================================
# VOX CONTROL: SCRIPT 02 (WINDOWS POWERSHELL) - RESTAURAÇÃO CONTABO
# ==============================================================================
param (
    [Parameter(Mandatory=$true)]
    [string]$DumpFile,
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$User = "vox_user",
    [string]$Database = "vox_control"
)

$ErrorActionPreference = "Stop"
Write-Host "=== [2/3] Restaurando dados no PostgreSQL da Contabo ($Host:$Port/$Database) ===" -ForegroundColor Cyan

# 1. pg_restore
pg_restore -h $Host -p $Port -U $User -d $Database --no-owner --no-acl --clean --if-exists -v $DumpFile

Write-Host "=== [3/3] Aplicando migração do Notion e Webhooks ===" -ForegroundColor Yellow
$migrationFile = "..\..\sql\migrations\20261120_notion_webhooks_schema.sql"
psql -h $Host -p $Port -U $User -d $Database -f $migrationFile

Write-Host "=== ✅ Restauração e migrações concluídas com sucesso! ===" -ForegroundColor Green
Write-Host "Execute o script '03_audit_checksum.sql' para auditar a paridade de registros e checksums."
