-- Permite marcar manualmente um checkout como esgotado sem desativar a página.
ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN checkouts.is_sold_out IS 'Quando true, mantém a página acessível e bloqueia novas compras mostrando ESGOTADO.';