-- Patch: handle_new_user trigger — add ON CONFLICT to prevent failure on duplicate profiles row
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

-- Patch: token_usage — add non-negative constraints on token counts
alter table public.token_usage
  add constraint token_usage_input_tokens_non_negative  check (input_tokens >= 0),
  add constraint token_usage_output_tokens_non_negative check (output_tokens >= 0);

-- Patch: config RLS — replace auth.role() check with idiomatic auth.uid() IS NOT NULL
drop policy if exists "config: authenticated read" on public.config;

create policy "config: authenticated read"
  on public.config for select
  using (auth.uid() is not null);
