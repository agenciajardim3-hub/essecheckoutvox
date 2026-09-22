-- Depoimentos opcionais exibidos no checkout.
-- Seguro para executar mais de uma vez.
ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]'::jsonb;
