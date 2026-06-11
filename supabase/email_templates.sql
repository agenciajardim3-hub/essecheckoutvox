create table if not exists public.email_templates (
  id text primary key,
  name text not null,
  description text default '',
  html text not null,
  color text default 'from-blue-500 to-indigo-600',
  is_custom boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.email_templates enable row level security;

create policy if not exists "Allow public read email templates"
  on public.email_templates
  for select
  using (true);

create policy if not exists "Allow public insert email templates"
  on public.email_templates
  for insert
  with check (true);

create policy if not exists "Allow public update email templates"
  on public.email_templates
  for update
  using (true)
  with check (true);

create policy if not exists "Allow public delete email templates"
  on public.email_templates
  for delete
  using (true);

create or replace function public.update_email_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_email_templates_updated_at on public.email_templates;

create trigger update_email_templates_updated_at
before update on public.email_templates
for each row
execute function public.update_email_templates_updated_at();
