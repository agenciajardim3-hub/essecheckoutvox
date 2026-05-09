-- Corrige/garante a estrutura necessária para salvar o valor pago manualmente.
-- Rode este SQL no Supabase caso a migration não seja aplicada automaticamente.

alter table public.leads
  add column if not exists paid_amount numeric(10,2) default 0;

alter table public.leads
  add column if not exists payment_method text;

alter table public.leads
  add column if not exists paid_at timestamptz;

alter table public.leads
  add column if not exists payment_status text;

alter table public.leads
  add column if not exists updated_at timestamptz default now();

-- Garante que registros antigos não fiquem nulos no cálculo financeiro.
update public.leads
set paid_amount = 0
where paid_amount is null;

-- Ajuda a carregar relatórios e somatórios por status/produto.
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_product_id on public.leads(product_id);
