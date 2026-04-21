-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- profiles: one row per auth user, created by trigger
create table public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  subscription_tier   text        not null default 'free' check (subscription_tier in ('free', 'pro')),
  has_seen_disclosure boolean     not null default false,
  stripe_customer_id  text        unique,
  last_active_at      timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- projects: user's Realms
create table public.projects (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);

-- artifacts: generated UX outputs per project
create table public.artifacts (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  artifact_type text        not null check (artifact_type in ('flows', 'personas', 'ia', 'synthesis')),
  content       jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index artifacts_project_id_idx on public.artifacts(project_id);

-- token_usage: every Claude API call writes here
create table public.token_usage (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  project_id    uuid        not null references public.projects(id) on delete cascade,
  input_tokens  integer     not null check (input_tokens >= 0),
  output_tokens integer     not null check (output_tokens >= 0),
  created_at    timestamptz not null default now()
);

create index token_usage_user_id_created_at_idx on public.token_usage(user_id, created_at);

-- Trigger: auto-create profiles row on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, subscription_tier, has_seen_disclosure)
  values (new.id, 'free', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
