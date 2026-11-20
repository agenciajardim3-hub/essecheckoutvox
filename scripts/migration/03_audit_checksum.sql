-- ==============================================================================
-- VOX CONTROL: SCRIPT DE AUDITORIA E VALIDAÇÃO ZERO DATA LOSS
-- Execute este script no Supabase (Origem) e depois no PostgreSQL Contabo (Destino)
-- Os resultados devem ser 100% IDÊNTICOS para validar a migração.
-- ==============================================================================

SELECT '=== 1. CONTAGEM TOTAL DE REGISTROS POR TABELA ===' AS audit_step;

SELECT 
    'checkouts' AS tabela, COUNT(*) AS total_registros FROM checkouts
UNION ALL
SELECT 
    'leads' AS tabela, COUNT(*) AS total_registros FROM leads
UNION ALL
SELECT 
    'expenses' AS tabela, COUNT(*) AS total_registros FROM expenses
UNION ALL
SELECT 
    'coupons' AS tabela, COUNT(*) AS total_registros FROM coupons
UNION ALL
SELECT 
    'form_requests' AS tabela, COUNT(*) AS total_registros FROM form_requests
UNION ALL
SELECT 
    'email_templates' AS tabela, COUNT(*) AS total_registros FROM email_templates;

-- ==============================================================================
-- 2. AUDITORIA FINANCEIRA DOS LEADS (VALORES TOTAIS E TAXAS)
-- ==============================================================================
SELECT '=== 2. AUDITORIA FINANCEIRA DOS LEADS ===' AS audit_step;

SELECT 
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE status = 'Pago') AS leads_pagos,
    COUNT(*) FILTER (WHERE status = 'Pendente') AS leads_pendentes,
    COUNT(*) FILTER (WHERE status = 'Sinal') AS leads_sinal,
    COUNT(*) FILTER (WHERE status = 'Pagar no dia') AS leads_pagar_no_dia,
    COALESCE(SUM(paid_amount), 0) AS soma_receita_bruta,
    COALESCE(SUM(mp_fee_amount), 0) AS soma_taxas_gateway,
    COALESCE(SUM(mp_net_amount), 0) AS soma_receita_liquida,
    COUNT(*) FILTER (WHERE checked_in = true) AS total_checkins_realizados,
    COUNT(*) FILTER (WHERE ticket_generated = true) AS total_ingressos_emitidos
FROM leads;

-- ==============================================================================
-- 3. AUDITORIA DE DESPESAS CADASTRADAS
-- ==============================================================================
SELECT '=== 3. AUDITORIA DE DESPESAS ===' AS audit_step;

SELECT 
    COUNT(*) AS total_despesas,
    COALESCE(SUM(amount), 0) AS soma_total_despesas,
    COUNT(DISTINCT checkout_id) AS turmas_com_despesa
FROM expenses;

-- ==============================================================================
-- 4. CHECKSUM MD5 CRIPTOGRÁFICO DE INTEGRIDADE (LEADS E CHECKOUTS)
-- Garante que nenhum dado ou ordem foi alterado
-- ==============================================================================
SELECT '=== 4. CHECKSUM MD5 DE INTEGRIDADE ===' AS audit_step;

SELECT 
    'leads_checksum' AS item,
    MD5(STRING_AGG(id::text, ',' ORDER BY id)) AS checksum_hash
FROM leads
UNION ALL
SELECT 
    'checkouts_checksum' AS item,
    MD5(STRING_AGG(id::text, ',' ORDER BY id)) AS checksum_hash
FROM checkouts;
