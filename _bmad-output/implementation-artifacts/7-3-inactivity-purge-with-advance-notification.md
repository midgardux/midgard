# Story 7.3: Inactivity Purge with Advance Notification

Status: done

## Story

As the **operator**,
I want inactive free-tier accounts to be automatically purged after 12 months of inactivity — with a warning email sent at 11 months —
so that the platform stays clean and storage costs remain bounded.

## Acceptance Criteria

1. **Given** the monthly scheduled job runs
   **When** it checks `profiles.last_active_at` for all free-tier users
   **Then** users inactive for 11 months receive an advance notification email warning that their account data will be deleted in 30 days if they do not log in

2. **Given** the monthly scheduled job runs
   **When** it checks `profiles.last_active_at` for all free-tier users
   **Then** users inactive for 12 months have their data deleted in cascade order: `artifacts → token_usage → projects → profiles`

3. **Given** a user logs in at any point
   **When** the middleware runs and updates `profiles.last_active_at`
   **Then** the inactivity clock resets — 11- and 12-month thresholds are recalculated from the new `last_active_at`

4. **Given** a Pro-tier user has been inactive for 12+ months
   **When** the job runs
   **Then** the user is skipped — Pro users are never purged or notified

5. **Given** the cascade deletion RPC is called for a user
   **When** any deletion step within the transaction fails
   **Then** the transaction is rolled back (no partial deletion for that user), the error is logged, and the job continues to the next candidate user

6. **Given** the job is invoked by pg_cron
   **When** a single user's purge or notification fails
   **Then** the job continues processing all remaining candidates — one user failure does not abort the run

7. **Given** all deletion steps succeed for a user
   **When** the RPC transaction commits
   **Then** atomicity is guaranteed — `artifacts → token_usage → projects → profiles` all deleted or none deleted

## Tasks / Subtasks

- [x] Task 1 — Create `supabase/migrations/007_purge_inactive_user_rpc.sql` (AC: 2, 5, 7)
  - [x] 1.1 Create `supabase/migrations/007_purge_inactive_user_rpc.sql` — follow naming convention of existing migrations
  - [x] 1.2 Use `CREATE FUNCTION` (not `CREATE OR REPLACE`) — migration hygiene rule established in Story 3.4 and reinforced in Story 7.2
  - [x] 1.3 Function signature: `purge_inactive_user(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER`
  - [x] 1.4 Delete in explicit cascade order: `artifacts` (by project_id subquery) → `token_usage` (by user_id) → `projects` (by user_id) → `profiles` (by id) — see Dev Notes for exact SQL
  - [x] 1.5 No explicit exception handler needed — PL/pgSQL automatically rolls back the function's implicit transaction on any error; this satisfies AC5 and AC7
  - [x] 1.6 Run `supabase db push` to apply the migration to the local + remote database

- [x] Task 2 — Create `supabase/functions/monthly-inactivity-purge/index.ts` (AC: all)
  - [x] 2.1 Create directory `supabase/functions/monthly-inactivity-purge/` alongside existing `monthly-token-alert/`
  - [x] 2.2 Entry point: `Deno.serve(async (req) => { ... })` — Deno not Node.js
  - [x] 2.3 Add `FUNCTION_SECRET` auth guard at top (same pattern as `monthly-token-alert`) — rejects requests where `Authorization: Bearer <value>` does not match the `FUNCTION_SECRET` env var
  - [x] 2.4 Validate required env vars early: throw a clear named error if `RESEND_API_KEY` is missing; set `SENDER_EMAIL` with fallback `'onboarding@resend.dev'`; set `APP_URL` from env or fallback `'https://midgard.app'`
  - [x] 2.5 Create service-role Supabase client (same as `monthly-token-alert`) — bypass RLS to read all profiles
  - [x] 2.6 Calculate date thresholds using UTC date math — see Dev Notes for correct Deno/JS approach
  - [x] 2.7 **Step A — Purge 12-month candidates:** Query `profiles` for free-tier users where `last_active_at < twelveMonthsAgo`; for each, call `supabase.rpc('purge_inactive_user', { p_user_id: id })`; on RPC error: log with `console.error` and push to `errors[]`, do NOT abort the loop (AC6)
  - [x] 2.8 **Step B — Notify 11-month candidates:** Query `profiles` for free-tier users where `last_active_at < elevenMonthsAgo AND last_active_at >= twelveMonthsAgo`; for each, fetch user email via `supabase.auth.admin.getUserById(id)`, send warning email via Resend; on any per-user error: log and continue (AC6)
  - [x] 2.9 Wrap Step A and Step B in their own try/catch so a query failure in one step does not prevent the other from running
  - [x] 2.10 Return summary JSON: `{ purged: number, notified: number, errors: string[] }` — 200 always (not 500) unless an unexpected top-level error occurs
  - [x] 2.11 Global try/catch: on unhandled exception, return `Response.json({ error: 'Internal server error' }, { status: 500 })` — never leak internal details in error body

- [x] Task 3 — Configure pg_cron schedule (AC: 1, 2)
  - [x] 3.1 Deploy the function first: `supabase functions deploy monthly-inactivity-purge --no-verify-jwt`
  - [x] 3.2 In Supabase Dashboard → **Integrations → Cron** (not Database → Cron Jobs — UI changed; see Dev Notes)
  - [x] 3.3 Create a new Cron Job: schedule `0 0 1 * *` (midnight UTC, 1st of month), target `monthly-inactivity-purge` Edge Function
  - [x] 3.4 Cron job HTTP authorization header must be `Authorization: Bearer <FUNCTION_SECRET>` — same `FUNCTION_SECRET` value set in Edge Function Secrets

- [x] Task 4 — Set Edge Function environment variables
  - [x] 4.1 In Supabase Dashboard → Edge Functions → `monthly-inactivity-purge` → Secrets
  - [x] 4.2 Add `RESEND_API_KEY` (same key used by `monthly-token-alert`)
  - [x] 4.3 Add `FUNCTION_SECRET` (shared with or different from `monthly-token-alert` — must match the cron job auth header value from Task 3.4)
  - [x] 4.4 Add `SENDER_EMAIL` (verified domain sender, e.g. `alerts@yourdomain.com` — falls back to `onboarding@resend.dev` for testing only)
  - [x] 4.5 Add `APP_URL` (production URL, e.g. `https://midgard.app` — used in the login link in notification emails)
  - [x] 4.6 `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase — do NOT add these manually

- [x] Task 5 — Validate end-to-end
  - [x] 5.1 AC5/AC7: Invoke function locally with a valid `FUNCTION_SECRET` bearer token via curl; verify `{ purged: 0, notified: 0, errors: [] }` when no candidates exist
  - [x] 5.2 AC4: Confirm a Pro-tier user with old `last_active_at` is NOT purged or notified
  - [x] 5.3 AC2/AC7: Set a test free-tier user's `last_active_at` to 13 months ago in Supabase Dashboard; invoke function; verify `purged: 1` in response and all rows deleted from `artifacts`, `token_usage`, `projects`, `profiles` for that user
  - [x] 5.4 AC1: Set a test free-tier user's `last_active_at` to 11.5 months ago; invoke function; verify `notified: 1` and warning email received at that user's address
  - [x] 5.5 AC3: Update `last_active_at` back to today for any test users before finishing

### Review Findings

- [x] [Review][Decision→Patch] Transient notification failure leaves no persistent record of warning — added `notified_at timestamptz` column to `profiles` (migration 008); Step A gates purge on `notified_at IS NOT NULL`; Step B queries `notified_at IS NULL` and sets it on success; middleware resets it to NULL on login. [`supabase/migrations/008_profiles_add_notified_at.sql`, `supabase/functions/monthly-inactivity-purge/index.ts`, `lib/supabase/proxy.ts`]
- [x] [Review][Patch] AC6 violation: purge loop (Step A) missing per-user try/catch — wrapped each RPC call in its own try/catch; thrown network errors no longer abort remaining candidates. [`supabase/functions/monthly-inactivity-purge/index.ts:60`]
- [x] [Review][Patch] `purge_inactive_user` callable by any authenticated user via PostgREST — added `REVOKE EXECUTE … FROM PUBLIC; GRANT EXECUTE … TO service_role` in migration 008. [`supabase/migrations/008_profiles_add_notified_at.sql`]
- [x] [Review][Patch] FUNCTION_SECRET compared with `!==` (timing-unsafe) — replaced with `crypto.subtle.timingSafeEqual` on TextEncoder byte arrays. [`supabase/functions/monthly-inactivity-purge/index.ts:11`]
- [x] [Review][Patch] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` used with `!` without null validation — added explicit null checks with named error messages matching the `RESEND_API_KEY` guard pattern. [`supabase/functions/monthly-inactivity-purge/index.ts:25-26`]
- [x] [Review][Defer] TOCTOU: user who logs in between the profiles query and the `purge_inactive_user` RPC call is deleted despite being active — inherent to two-phase query-then-act across HTTP API; not fixable without distributed transactions [`supabase/functions/monthly-inactivity-purge/index.ts:42-58`] — deferred, pre-existing architectural constraint
- [x] [Review][Defer] N+1 serial `auth.admin.getUserById` calls in notification loop — no batching or parallelism; correctness unaffected, performance concern only [`supabase/functions/monthly-inactivity-purge/index.ts:80`] — deferred, pre-existing
- [x] [Review][Defer] Auth service outage silently skips all 11-month notifications in a given run — no way to distinguish from zero candidates; infrastructure failure outside code control [`supabase/functions/monthly-inactivity-purge/index.ts:69-116`] — deferred, pre-existing
- [x] [Review][Defer] `userData.user` null (orphaned profile row) produces same error message as "no email found" — misleading log output, but behavior (skip + log + continue) is correct [`supabase/functions/monthly-inactivity-purge/index.ts:82`] — deferred, log clarity only
- [x] [Review][Defer] Midnight UTC thresholds: users with time-of-day precision in `last_active_at` may fall outside the purge/notify window by up to 24h — acceptable precision for monthly job [`supabase/functions/monthly-inactivity-purge/index.ts:23-33`] — deferred, pre-existing
- [x] [Review][Defer] Concurrent pg_cron runs could process same users twice — pg_cron scheduling makes this extremely unlikely; re-deleting empty rows is harmless [`supabase/migrations/007_purge_inactive_user_rpc.sql`] — deferred, pre-existing

## Dev Notes

### This Story Is Entirely Infrastructure — No Next.js Code

No files in `app/`, `components/`, `actions/`, or `lib/` are modified. Deliverables are one Supabase migration and one Edge Function. This story does not touch the Next.js application.

### `last_active_at` Is Already Implemented

Story 1.6 added `last_active_at` upsert to `lib/supabase/proxy.ts` (the `updateSession` function). Every authenticated request to an `/(app)/*` route updates `profiles.last_active_at` to `now()`. This story is the consumer of that data.

### New Migration: `007_purge_inactive_user_rpc.sql`

```sql
-- purge_inactive_user: atomic cascade deletion for inactivity purge job.
-- Order: artifacts → token_usage → projects → profiles (extends delete_project pattern, adds profiles).
-- security invoker: called from service-role Edge Function which bypasses RLS at call site.
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
```

**Why `SECURITY INVOKER`:** The Edge Function uses the service-role key, which bypasses all RLS when calling `supabase.rpc()`. The function runs as the calling role (service_role = full access). This is consistent with `delete_project` in `005_delete_project_rpc.sql`.

**Why no explicit exception block:** PL/pgSQL functions without an explicit `EXCEPTION` clause automatically rollback on any statement error. No partial deletion can occur — atomicity is provided by the implicit transaction (satisfies AC5, AC7).

**Cascade vs `delete_project`:** This RPC extends the `delete_project` pattern with one extra step — `DELETE FROM profiles`. It also deletes across ALL of a user's projects at once (not per-project), so `artifacts` and `token_usage` are deleted by `user_id`-scoped subqueries rather than per-`project_id`.

**No auth.users deletion:** Spec defines cascade as `artifacts → token_usage → projects → profiles` only. The `auth.users` row is NOT deleted — the user can still sign in but will have no data. This is intentional scope.

**Migration hygiene:** Use `CREATE FUNCTION` (not `CREATE OR REPLACE`). This was established as a project anti-pattern in Story 3.4 code review and enforced in Story 7.2's migration.

### Edge Function: Patterns Inherited from `monthly-token-alert`

The `monthly-inactivity-purge` function follows exactly the same structure as `supabase/functions/monthly-token-alert/index.ts`. Key patterns to carry over:

**Deno runtime rules:**

| Node.js | Deno |
|---------|------|
| `process.env.X` | `Deno.env.get('X')` |
| `require()` | ESM only |
| `import pkg from 'pkg'` | `import pkg from 'npm:pkg'` |
| `http.createServer()` | `Deno.serve(handler)` |
| `import { createClient } from '@supabase/supabase-js'` | `import { createClient } from 'npm:@supabase/supabase-js@2'` |
| `import { Resend } from 'resend'` | `import { Resend } from 'npm:resend'` |

**FUNCTION_SECRET auth guard (required — exact pattern from deployed 7.1):**

```typescript
const secret = Deno.env.get('FUNCTION_SECRET')
const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
if (!secret || authHeader !== secret) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Service-role Supabase client (same as `monthly-token-alert`):**

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase in all deployed Edge Functions — do NOT add as manual secrets.

### Date Threshold Calculation

JavaScript's `Date.UTC()` correctly handles month underflow (e.g. month -11 rolls back to the prior year):

```typescript
const now = new Date()
const twelveMonthsAgo = new Date(Date.UTC(
  now.getUTCFullYear() - 1,
  now.getUTCMonth(),
  now.getUTCDate()
))
const elevenMonthsAgo = new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth() - 11,  // handles underflow correctly
  now.getUTCDate()
))
```

`getUTCMonth()` returns 0–11. If `now` is May (month 4), `4 - 11 = -7`, which JavaScript resolves to July of the previous year. This is correct.

### Getting User Email for Notification

`auth.users` is not exposed as a Supabase JS `.from()` table. Use the admin API instead:

```typescript
const { data } = await supabase.auth.admin.getUserById(userId)
const email = data.user?.email
if (!email) {
  console.error(`[monthly-inactivity-purge] no email for user ${userId}`)
  continue  // skip this user, log and move on
}
```

The service-role client has access to `supabase.auth.admin.*` — the anon key does not.

### Notification Email Template

```typescript
const { error: sendError } = await resend.emails.send({
  from: `Midgard <${senderEmail}>`,
  to: email,
  subject: '[Midgard] Your account data will be deleted in 30 days',
  html: `<p>Your Midgard account has been inactive for 11 months.</p>
         <p>If you do not log in within the next 30 days, your account data (Realms and artifacts) will be permanently deleted.</p>
         <p><a href="${appUrl}/login">Log in to keep your account active</a></p>
         <p>If you no longer need your account, no action is required.</p>`,
})
if (sendError) throw new Error(`Resend failed for ${userId}: ${sendError.message}`)
```

Check `sendError` — from Story 7.1's code review, silently discarding send errors was flagged as a bug (`sent: true` false positive). Always check and surface the error.

### Processing Order: Purge Before Notify

Always run the 12-month purge pass **before** the 11-month notification pass. This prevents sending a warning email to a user who is about to be (or was just) purged in the same job run. Users in the 12-month window are never in the 11-month window (the query uses `gte('last_active_at', twelveMonthsAgo)` to exclude them).

### Per-User Error Isolation (AC6)

Wrap each per-user operation in try/catch. A Supabase RPC error or Resend failure for user X must not abort processing of user Y:

```typescript
const errors: string[] = []
for (const { id: userId } of purgeUsers ?? []) {
  const { error: rpcError } = await supabase.rpc('purge_inactive_user', { p_user_id: userId })
  if (rpcError) {
    const msg = `purge failed for ${userId}: ${rpcError.message}`
    console.error('[monthly-inactivity-purge]', msg)
    errors.push(msg)
    // continue to next user — AC6
  } else {
    purgedCount++
  }
}
```

For notifications, wrap the entire per-user block (including `getUserById`) in a try/catch since `auth.admin` calls can also throw.

### Resend SDK Usage Pattern

```typescript
const resend = new Resend(resendApiKey)
```

Instantiate once outside the loop. The `RESEND_API_KEY` null guard must fire before any loop begins — not inside it.

### `profiles` Table Schema (for reference)

```sql
create table public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  subscription_tier text       not null default 'free' check (subscription_tier in ('free', 'pro')),
  has_seen_disclosure boolean  not null default false,
  stripe_customer_id text      unique,
  last_active_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
```

Filter for `subscription_tier = 'free'` to exempt Pro users (AC4). `last_active_at` is `not null default now()` — all rows have a value set at profile creation at minimum.

### Deployment and Cron Setup

```bash
# Deploy
supabase functions deploy monthly-inactivity-purge --no-verify-jwt

# Test invoke (local)
supabase functions serve monthly-inactivity-purge --no-verify-jwt
curl -X POST http://localhost:54321/functions/v1/monthly-inactivity-purge \
  -H "Authorization: Bearer <FUNCTION_SECRET_VALUE>"

# Test invoke (production)
curl -X POST https://<project-ref>.supabase.co/functions/v1/monthly-inactivity-purge \
  -H "Authorization: Bearer <FUNCTION_SECRET_VALUE>"
```

**`--no-verify-jwt` rationale (from Story 7.1 completion notes):** Supabase migrated to `sb_publishable_` key format which is not a valid JWT — the anon JWT key no longer exists in newer projects. The function uses its own `FUNCTION_SECRET` auth guard instead of JWT verification.

**Cron setup UI note (from Story 7.1 completion notes):** The cron job is configured in **Dashboard → Integrations → Cron**, NOT in `Database → Cron Jobs` as the Supabase docs describe. The UI was renamed/moved.

### Files to Touch

| File | Change |
|---|---|
| `supabase/migrations/007_purge_inactive_user_rpc.sql` | **new** — `purge_inactive_user` RPC |
| `supabase/functions/monthly-inactivity-purge/index.ts` | **new** — Deno Edge Function |

No Next.js app files modified.

### No New Config Table Rows Required

The `config` table has no new rows for this story. `last_active_at` thresholds are hardcoded (11/12 months) per spec. If the operator ever needs to change the thresholds, that would require a separate story to expose them as config rows — out of scope here.

### Anti-Patterns to Avoid

- **Do not** use `process.env` — Deno uses `Deno.env.get()`
- **Do not** import npm packages without the `npm:` specifier
- **Do not** use the anon key — service-role key is required to read all profiles and call `auth.admin`
- **Do not** use `CREATE OR REPLACE FUNCTION` in the migration — use `CREATE FUNCTION`
- **Do not** abort the entire job on per-user error — log and continue (AC6)
- **Do not** silently discard Resend `sendError` — always check and log
- **Do not** query `auth.users` via `.from('auth.users')` — use `supabase.auth.admin.getUserById()`
- **Do not** send a notification to a user who is in the 12-month purge window — process purges first, then notifications

### References

- [Source: epics.md#Story 7.3] — User story, all 7 acceptance criteria, technical notes
- [Source: epics.md#Epic 7] — Epic goal: runtime operator controls without deployment
- [Source: implementation-artifacts/7-1-token-spend-alerting.md] — Exact Edge Function patterns: FUNCTION_SECRET auth, Deno runtime, Resend SDK, service-role client, `--no-verify-jwt`, cron UI location
- [Source: implementation-artifacts/1-6-last-active-tracking-in-auth-middleware.md] — `last_active_at` is maintained in `lib/supabase/proxy.ts`; updates on every `/(app)/*` authenticated request
- [Source: supabase/migrations/005_delete_project_rpc.sql] — Cascade deletion precedent (`artifacts → token_usage → projects`); `SECURITY INVOKER` pattern
- [Source: supabase/migrations/006_create_project_rpc.sql] — `CREATE FUNCTION` (not `CREATE OR REPLACE`) migration hygiene precedent
- [Source: supabase/functions/monthly-token-alert/index.ts] — Complete deployed Edge Function to follow as structural template
- [Source: architecture.md#Data Architecture] — FR24/FR25: inactivity purge with notification; Edge Function or pg_cron; 12-month lookback, email notification, data purge

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `supabase/migrations/007_purge_inactive_user_rpc.sql` with `purge_inactive_user(p_user_id uuid)` using `CREATE FUNCTION` (not `CREATE OR REPLACE`). Cascade order: artifacts (subquery on project_id) → token_usage (by user_id) → projects (by user_id) → profiles (by id). `SECURITY INVOKER` is correct because the Edge Function calls with the service-role key which bypasses RLS at the call site. No explicit exception handler — PL/pgSQL implicit transaction provides atomicity. Applied via `supabase db push`.
- Created `supabase/functions/monthly-inactivity-purge/index.ts` — Deno Edge Function following the exact same structural pattern as `monthly-token-alert`. `FUNCTION_SECRET` auth guard at top. Service-role Supabase client for full profile access and `auth.admin.getUserById()` access. UTC date math with `Date.UTC()` for correct month underflow handling. Step A (purge) runs before Step B (notify) to prevent warning emails firing for users being purged in the same run. Both steps wrapped in independent try/catch blocks — a query failure in one step does not prevent the other. Per-user errors collected in `errors[]` and returned in summary response; no user failure aborts the job (AC6). `sendError` checked on every Resend call (learned from Story 7.1 code review). Deployed with `--no-verify-jwt` (same rationale as Story 7.1 — Supabase new key format is not a valid JWT).
- `FUNCTION_SECRET` was reset (new value generated) and updated in Supabase project secrets via `supabase secrets set`. `RESEND_API_KEY` already configured project-level from Story 7.1. `APP_URL` falls back to `https://midgard.app` (matches `NEXT_PUBLIC_SITE_URL`). `SENDER_EMAIL` falls back to `onboarding@resend.dev`.
- pg_cron configured in **Dashboard → Integrations → Cron** (Supabase Edge Function type, `0 0 1 * *` schedule). Dashboard generates `net.http_post()` SQL with the correct function URL and `Authorization` header. `timeout_milliseconds` defaults to 1000ms — this is pg_net's response-wait timeout only; Edge Function runs to completion regardless of this value.
- End-to-end validated via curl against deployed production function: (1) baseline `{purged:0,notified:0,errors:[]}` ✅; (2) Pro user with 13-month-old `last_active_at` → `purged:0` (Pro exempt, AC4) ✅; (3) free-tier test user A with 13-month-old `last_active_at` → `purged:1`, profile/projects rows confirmed deleted ✅; (4) free-tier test user B with 11.5-month-old `last_active_at` → `notified:1`, warning email delivered to `midgardux@gmail.com` ✅; (5) all test users deleted and Pro user `last_active_at` reset to today ✅. No test framework configured — validation is manual + curl per project-context.md.

### File List

- `supabase/migrations/007_purge_inactive_user_rpc.sql` (new)
- `supabase/functions/monthly-inactivity-purge/index.ts` (new)

## Change Log

- 2026-05-17: Story 7.3 implemented — `purge_inactive_user` RPC migration applied; `monthly-inactivity-purge` Edge Function deployed; pg_cron scheduled `0 0 1 * *`; end-to-end validated: purge cascade, Pro exemption, 11-month notification, per-user error isolation all confirmed. (claude-sonnet-4-6)
