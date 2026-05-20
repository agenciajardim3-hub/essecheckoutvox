-- ============================================
-- CRIAR TABELAS E COLUNAS QUE FALTAM
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar checkout_id em expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS checkout_id TEXT DEFAULT 'global';

-- ============================================
-- 2. TABELA SUPPORT_MATERIALS - Materiais de apoio para eventos
-- ============================================
CREATE TABLE IF NOT EXISTS support_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT NOT NULL,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  location_url TEXT,
  link_oficial TEXT,
  link_pagamento TEXT,
  investment_12x TEXT,
  investment_pix TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE support_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on support_materials" ON support_materials;
CREATE POLICY "Allow all on support_materials" ON support_materials FOR ALL USING (true) WITH CHECK (true);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_support_materials_checkout ON support_materials(checkout_id);
CREATE INDEX IF NOT EXISTS idx_support_materials_date ON support_materials(created_at);

-- ============================================
-- 3. TABELA SAVED_ARTS - Artes salvas para campanhas
-- ============================================
CREATE TABLE IF NOT EXISTS saved_arts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE saved_arts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on saved_arts" ON saved_arts;
CREATE POLICY "Allow all on saved_arts" ON saved_arts FOR ALL USING (true) WITH CHECK (true);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_saved_arts_checkout ON saved_arts(checkout_id);
CREATE INDEX IF NOT EXISTS idx_saved_arts_created ON saved_arts(created_at);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'support_materials' as table_name, COUNT(*) as row_count FROM support_materials
UNION ALL
SELECT 'saved_arts', COUNT(*) FROM saved_arts
UNION ALL
SELECT 'expenses (com checkout_id)', COUNT(*) FROM expenses;
