-- Atomically checks free-tier cap and inserts a project for the authenticated user.
-- Per-user advisory lock prevents TOCTOU race between count check and insert.
-- Cap is read from the config table inside the lock — callers cannot supply or manipulate it.
-- security invoker: RLS applies; auth.uid() scopes all operations to the caller.
create function public.create_project_if_cap_allows(
  p_name text
)
returns setof projects
language plpgsql
security invoker
as $$
declare
  v_user_id uuid    := auth.uid();
  v_count   integer;
  v_cap     integer;
  v_project projects;
begin
  -- Lock prevents concurrent same-user requests from both passing the cap guard before
  -- either insert commits. Different users get different keys and do not block each other.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint);

  -- Read cap inside the lock — callers cannot supply or manipulate the cap value.
  select value::integer into v_cap
  from public.config
  where key = 'free_tier_project_cap';

  if v_cap is null then
    raise exception 'CAP_CONFIG_MISSING';
  end if;

  select count(*) into v_count
  from public.projects
  where user_id = v_user_id;

  if v_count >= v_cap then
    raise exception 'CAP_REACHED:%', v_count;
  end if;

  insert into public.projects (name, user_id, updated_at)
  values (p_name, v_user_id, now())
  returning * into v_project;

  return next v_project;
end;
$$;
