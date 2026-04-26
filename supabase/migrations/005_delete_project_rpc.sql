-- delete_project: explicit cascade order for atomicity and auditability
-- Order: artifacts → token_usage → projects (architecture spec FR23)
-- security invoker: RLS applies; auth.uid() must own the project
create or replace function public.delete_project(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_exists boolean;
begin
  -- Ownership check: RLS filters silently; explicit check surfaces a clear error
  select exists(
    select 1 from public.projects where id = p_project_id
  ) into v_exists;

  if not v_exists then
    raise exception 'Project not found or access denied';
  end if;

  delete from public.artifacts   where project_id = p_project_id;
  delete from public.token_usage where project_id = p_project_id;
  delete from public.projects    where id = p_project_id;
exception when others then
  raise;
end;
$$;
