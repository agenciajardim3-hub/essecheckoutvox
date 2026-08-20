-- Organização explícita dos checkouts por Cidade → Bairro/Região → Grupo/Pasta.
-- Seguro para rodar: não apaga nem altera dados existentes.

alter table public.checkouts
add column if not exists city text default '';

alter table public.checkouts
add column if not exists neighborhood text default '';

alter table public.checkouts
add column if not exists folder text default '';

create index if not exists idx_checkouts_city
  on public.checkouts (city);

create index if not exists idx_checkouts_neighborhood
  on public.checkouts (neighborhood);

create index if not exists idx_checkouts_folder
  on public.checkouts (folder);
