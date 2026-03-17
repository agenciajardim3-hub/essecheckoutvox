-- Adicionar colunas na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'checkout';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ticket_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS group_link TEXT;

-- Criar tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material', 'equipamento', 'marketing', 'infraestrutura', 'servico', 'outro')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de solicitações de formulário
CREATE TABLE IF NOT EXISTS form_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  participation_date DATE NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  certificate_url TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado_whatsapp', 'enviado_email', 'concluido')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de check-ins do dia (pagam no dia)
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT,
  product_id TEXT,
  product_name TEXT,
  turma TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de modelos de assinatura para certificados
CREATE TABLE IF NOT EXISTS signature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
