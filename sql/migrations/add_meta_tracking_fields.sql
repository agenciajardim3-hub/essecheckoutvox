-- Rastreamento Meta (Pixel + Conversions API)
-- Rode este arquivo no SQL Editor do Supabase antes de publicar as mudanças de tracking.

-- 1. Campos de atribuição no lead.
-- fb_event_id: gerado no checkout e reusado pelo mp-webhook para o Meta deduplicar
--              o Purchase do Pixel com o Purchase da CAPI (senão a venda conta duas vezes).
-- fbp / fbc:   cookies do Meta capturados no navegador do comprador. São o que permite
--              a CAPI casar a venda com o clique no anúncio quando o Pixel não dispara.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_event_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbc TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_fb_event_id ON leads(fb_event_id);

-- 2. Configuração global de Pixel/GA4.
-- Antes ficava em localStorage, ou seja, existia apenas no navegador do admin e nunca
-- chegava ao visitante do checkout. Agora fica no banco e é lida por qualquer visitante.
CREATE TABLE IF NOT EXISTS global_tracking_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  global_pixel_id TEXT DEFAULT '',
  global_ga4_id TEXT DEFAULT '',
  pixel_enabled BOOLEAN DEFAULT TRUE,
  ga4_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO global_tracking_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
