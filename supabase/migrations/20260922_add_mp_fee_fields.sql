-- Registra as taxas e o valor líquido retornados pelo Mercado Pago.
-- O campo paid_amount continua representando o valor bruto da compra.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mp_net_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mp_fee_details JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_leads_mp_payment_id
  ON public.leads(mp_payment_id);
