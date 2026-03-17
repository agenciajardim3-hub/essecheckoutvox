-- Script para criar/atualizar tabela de leads
-- Execute no SQL Editor do Supabase

-- Criar tabela leads se não existir
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  cpf TEXT,
  date TEXT,
  product_id TEXT,
  product_name TEXT,
  turma TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Novo',
  paid_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  payer_name TEXT,
  payer_email TEXT,
  payer_phone TEXT,
  payer_document TEXT,
  source TEXT,
  ticket_generated BOOLEAN DEFAULT FALSE,
  group_link TEXT,
  coupon_code TEXT
);

-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações
DROP POLICY IF EXISTS "Allow all operations on leads" ON leads;
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Verificar se os campos foram criados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads'
ORDER BY ordinal_position;
