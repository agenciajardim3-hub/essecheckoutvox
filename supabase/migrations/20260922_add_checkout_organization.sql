-- Campos usados para organizar checkouts por cidade, bairro e pasta.
ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS folder TEXT;
