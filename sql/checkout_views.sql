-- Tabela de visualizações de checkouts
CREATE TABLE IF NOT EXISTS checkout_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT NOT NULL,
  checkout_slug TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device_type TEXT
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_checkout_views_checkout ON checkout_views(checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkout_views_date ON checkout_views(viewed_at);
