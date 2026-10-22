-- Executar uma vez no SQL Editor do Supabase.
-- Sem políticas públicas: apenas o backend autenticado pela service role acessa.
begin;
create table if not exists public.app_state (
  id text primary key check (id = 'main'),
  version bigint not null default 0 check (version >= 0),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
revoke all on public.app_state from anon, authenticated;
grant select, insert, update on public.app_state to service_role;
commit;
