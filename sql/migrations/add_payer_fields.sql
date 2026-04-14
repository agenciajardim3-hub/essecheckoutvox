-- Migration: Add payer fields to leads table
-- Execute no SQL Editor do Supabase para adicionar os campos de "Pago por" e "Onde foi pago"

-- Adicionar campo payer_name se não existir
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS payer_name TEXT;

-- Adicionar campo payment_location se não existir
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS payment_location TEXT;

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads' AND (column_name = 'payer_name' OR column_name = 'payment_location')
ORDER BY column_name;
