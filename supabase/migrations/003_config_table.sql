-- config: runtime-configurable key/value pairs (no RLS — read-only for authenticated users)
create table public.config (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

-- Allow authenticated users to read config (operator writes via Supabase Dashboard)
alter table public.config enable row level security;

create policy "config: authenticated read"
  on public.config for select
  using (auth.uid() is not null);

-- Seed initial values
insert into public.config (key, value) values
  ('free_tier_project_cap', '3'),
  ('token_alert_threshold_usd', '50');
