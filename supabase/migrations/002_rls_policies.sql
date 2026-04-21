-- Enable RLS on all tables
alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.artifacts  enable row level security;
alter table public.token_usage enable row level security;

-- profiles: users access only their own row
create policy "profiles: owner access"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- projects: users access only their own projects
create policy "projects: owner access"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- artifacts: access through project ownership (no user_id directly on artifacts)
create policy "artifacts: owner access"
  on public.artifacts for all
  using (
    exists (
      select 1 from public.projects
      where public.projects.id = artifacts.project_id
        and public.projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where public.projects.id = artifacts.project_id
        and public.projects.user_id = auth.uid()
    )
  );

-- token_usage: users access only their own records
create policy "token_usage: owner access"
  on public.token_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
