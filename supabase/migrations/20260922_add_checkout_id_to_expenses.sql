-- Vincula despesas a um checkout/turma para cálculo de resultado por evento.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS checkout_id TEXT DEFAULT 'global';

CREATE INDEX IF NOT EXISTS idx_expenses_checkout_id
  ON expenses (checkout_id);

COMMENT ON COLUMN expenses.checkout_id IS 'ID do checkout relacionado; global para despesas gerais.';