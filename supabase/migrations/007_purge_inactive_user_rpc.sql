-- purge_inactive_user: atomic cascade deletion of all data for an inactive free-tier user.
-- Order: artifacts → token_usage → projects → profiles (architecture spec FR23 + FR25).
-- Called from the monthly-inactivity-purge Edge Function using the service-role key,
-- which bypasses RLS at the call site — security invoker is sufficient.
create function public.purge_inactive_user(p_user_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.artifacts
    where project_id in (select id from public.projects where user_id = p_user_id);
  delete from public.token_usage where user_id = p_user_id;
  delete from public.projects    where user_id = p_user_id;
  delete from public.profiles    where id = p_user_id;
end;
$$;
