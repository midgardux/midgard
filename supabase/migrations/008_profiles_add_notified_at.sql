-- notified_at: tracks when the 11-month inactivity warning email was sent.
-- NULL = not yet notified. Set by monthly-inactivity-purge on successful email delivery.
-- Reset to NULL by middleware on login so a returning user who goes inactive again
-- receives a fresh warning before the next purge cycle.
-- The purge step gates on notified_at IS NOT NULL, so a transient Resend failure
-- cannot cause silent deletion without prior warning.
alter table public.profiles
  add column notified_at timestamptz;

-- Restrict purge_inactive_user to service_role only.
-- Without this, any authenticated user can invoke the RPC via PostgREST and delete
-- their own data outside the intended operator-controlled purge flow.
revoke execute on function public.purge_inactive_user(uuid) from public;
grant execute on function public.purge_inactive_user(uuid) to service_role;
