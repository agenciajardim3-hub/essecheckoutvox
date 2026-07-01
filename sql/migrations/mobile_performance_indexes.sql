-- Índices seguros para acelerar relatórios, filtros e buscas no mobile.
-- Não altera dados, telas, fluxos, checkout, certificados ou e-mails.

create index if not exists idx_leads_created_at_desc
  on public.leads (created_at desc);

create index if not exists idx_leads_product_id
  on public.leads (product_id);

create index if not exists idx_leads_status
  on public.leads (status);

create index if not exists idx_leads_turma
  on public.leads (turma);

create index if not exists idx_leads_email
  on public.leads (email);

create index if not exists idx_leads_cpf
  on public.leads (cpf);

create index if not exists idx_checkouts_slug
  on public.checkouts (slug);

create index if not exists idx_checkouts_is_active
  on public.checkouts (is_active);

create index if not exists idx_turma_marketing_metrics_turma
  on public.turma_marketing_metrics (turma);
