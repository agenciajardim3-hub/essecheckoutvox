-- ============================================
-- TABELA LEADS - Estrutura completa
-- ============================================
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
  source TEXT DEFAULT 'checkout',
  ticket_generated BOOLEAN DEFAULT FALSE,
  group_link TEXT,
  coupon_code TEXT,
  emitted_by TEXT,
  emission_date TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on leads" ON leads;
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABELA CHECKOUTS - Campos de evento
-- ============================================
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_start_time TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_end_time TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_location TEXT;

-- ============================================
-- TABELA FORM_REQUESTS - Solicitações de certificado
-- ============================================
ALTER TABLE form_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE form_requests ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE form_requests ADD COLUMN IF NOT EXISTS course_name TEXT;

-- ============================================
-- TABELA EXPENSES - Despesas
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'material',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on expenses" ON expenses;
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABELA COUPONS - Cupons de desconto
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  product_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on coupons" ON coupons;
CREATE POLICY "Allow all on coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- Verificar tabelas criadas
SELECT 'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL  
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'checkouts', COUNT(*) FROM checkouts
UNION ALL
SELECT 'form_requests', COUNT(*) FROM form_requests;
