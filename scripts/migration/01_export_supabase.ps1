# ==============================================================================
# VOX CONTROL: SCRIPT 01 (WINDOWS POWERSHELL) - EXPORTAÇÃO DO SUPABASE
# ==============================================================================
param (
    [string]$Host = "db.emdsgvuqrhpjdgrgaslo.supabase.co",
    [int]$Port = 5432,
    [string]$User = "postgres",
    [string]$Database = "postgres"
)

$ErrorActionPreference = "Stop"
Write-Host "=== [1/3] Iniciando Exportação Zero Data Loss do Supabase ===" -ForegroundColor Cyan

$dumpDir = ".\backup_dumps"
if (-not (Test-Path $dumpDir)) { New-Item -ItemType Directory -Path $dumpDir | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = "$dumpDir\vox_supabase_backup_$timestamp.dump"
$sqlFile = "$dumpDir\vox_supabase_backup_$timestamp.sql"

Write-Host "Conectando em $Host : $Port..." -ForegroundColor Yellow

# pg_dump binário
pg_dump -h $Host -p $Port -U $User -d $Database --no-owner --no-acl -F c -b -v -f $dumpFile

# pg_dump texto SQL
pg_dump -h $Host -p $Port -U $User -d $Database --no-owner --no-acl -F p -b -v -f $sqlFile

Write-Host "=== ✅ Exportação concluída com sucesso! ===" -ForegroundColor Green
Write-Host "Arquivo Binário: $dumpFile"
Write-Host "Arquivo SQL: $sqlFile"
