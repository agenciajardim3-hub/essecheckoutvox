-- Perguntas frequentes personalizadas por checkout.
ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN checkouts.faq_items IS 'Lista JSON de perguntas e respostas exibidas no checkout.';
