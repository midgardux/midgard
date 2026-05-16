# Story 7.1: Token Spend Alerting

Status: done

## Story

As the **operator**,
I want to receive an automated email alert when monthly token spend exceeds a configurable threshold,
so that I can monitor costs and act before they become a problem.

## Acceptance Criteria

1. **Given** the monthly scheduled job runs
   **When** it aggregates `token_usage` records for the current calendar month
   **Then** the total input and output tokens across all users are summed

2. **Given** the aggregated token counts
   **When** they are converted to USD
   **Then** the estimate uses cost-per-token constants (overridable via env vars)

3. **Given** the estimated spend exceeds `config.token_alert_threshold_usd`
   **When** the Edge Function completes the check
   **Then** an alert email is sent to `OPERATOR_ALERT_EMAIL` with spend, threshold, and billing period

4. **Given** `config.token_alert_threshold_usd` is updated in Supabase Dashboard
   **When** the scheduled job runs next
   **Then** the new threshold takes effect — no deployment required

5. **Given** estimated spend is at or below the threshold
   **When** the Edge Function completes
   **Then** no email is sent and no error is logged

6. **Given** an alert email is sent
   **When** the operator receives it
   **Then** it includes: estimated spend (USD), threshold, and the billing period (month + year)

## Tasks / Subtasks

- [x] Task 1 — Create `supabase/functions/monthly-token-alert/index.ts` (AC: all)
  - [x] 1.1 Use `Deno.serve()` as the entry point — this is a Deno Edge Function, not Node.js
  - [x] 1.2 Compute billing period: first day of current month to first day of next month (UTC)
  - [x] 1.3 Query `token_usage` via Supabase service-role client: `SELECT SUM(input_tokens), SUM(output_tokens)` for `created_at >= periodStart AND created_at < periodEnd`
  - [x] 1.4 Calculate `estimatedUSD = (totalInput / 1_000_000 * INPUT_COST) + (totalOutput / 1_000_000 * OUTPUT_COST)` using `INPUT_COST_PER_MILLION_TOKENS` and `OUTPUT_COST_PER_MILLION_TOKENS` env vars (defaults: `3.00` and `15.00`)
  - [x] 1.5 Read `config.token_alert_threshold_usd` via service-role client; parse as float
  - [x] 1.6 If `estimatedUSD <= threshold`: return 200 JSON `{ sent: false, estimatedUSD, threshold }` — no email, no error
  - [x] 1.7 If `estimatedUSD > threshold`: send alert email via Resend SDK, return 200 JSON `{ sent: true, estimatedUSD, threshold }`
  - [x] 1.8 Email fields: `from` = verified sender (see Dev Notes), `to` = `OPERATOR_ALERT_EMAIL`, `subject` = `[Midgard] Token spend alert: $X.XX — {Month Year}`, HTML body includes spend, threshold, period
  - [x] 1.9 Wrap everything in try/catch; on error return 500 with `{ error: message }` — log the error via `console.error`

- [x] Task 2 — Configure pg_cron schedule
  - [x] 2.1 Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard → Database → Extensions (if not already enabled)
  - [x] 2.2 Create a Supabase Cron Job in Dashboard → Database → Cron Jobs: schedule `0 0 1 * *` (first day of month, midnight UTC), targeting the Edge Function URL via HTTP POST
  - [x] 2.3 The cron job HTTP call must include the `Authorization: Bearer <SUPABASE_ANON_KEY>` header (or a service-role secret — see Dev Notes)

- [x] Task 3 — Set Edge Function environment variables (AC: #3, #6)
  - [x] 3.1 In Supabase Dashboard → Edge Functions → `monthly-token-alert` → Secrets, add: `RESEND_API_KEY`, `OPERATOR_ALERT_EMAIL`
  - [x] 3.2 Optionally add `INPUT_COST_PER_MILLION_TOKENS` and `OUTPUT_COST_PER_MILLION_TOKENS` if overriding defaults

- [x] Task 4 — Validation
  - [x] 4.1 Deploy function: `supabase functions deploy monthly-token-alert --no-verify-jwt`
  - [x] 4.2 Invoke manually via curl: `curl -X POST https://<project-ref>.supabase.co/functions/v1/monthly-token-alert`
  - [x] 4.3 Verify response JSON: when spend < threshold, `sent: false`; when spend > threshold (set threshold to `0` in config to force trigger), `sent: true` and email received
  - [x] 4.4 Reset `token_alert_threshold_usd` back to `50` after testing

### Review Findings

- [x] [Review][Decision] No idempotency guard — alert fires on every invocation when spend exceeds threshold; no "already alerted this period" state prevents duplicate emails on retry or manual re-invocation
- [x] [Review][Decision] Hardcoded `onboarding@resend.dev` sender — Resend sandbox domain does not deliver in production; needs a verified custom domain sender (or an env var override)
- [x] [Review][Decision] No authentication on HTTP endpoint — `--no-verify-jwt` was required due to Supabase's new `sb_publishable_` key format; any caller knowing the URL can invoke the function and learn estimated spend/threshold
- [x] [Review][Patch] NaN threshold causes unconditional alerting — `parseFloat(configRow.value)` returns `NaN` for non-numeric config; `estimatedUSD <= NaN` is always `false`, email fires on every run [supabase/functions/monthly-token-alert/index.ts:37]
- [x] [Review][Patch] `configRow` null crash when config row is missing — `.single()` returns `{ data: null, error: null }` for zero rows; the `as { value: string }` cast on `null` throws a TypeError [supabase/functions/monthly-token-alert/index.ts:37]
- [x] [Review][Patch] Resend send error silently discarded — `resend.emails.send()` result not checked; a failed send returns `{ sent: true }` (false positive, violates AC3) [supabase/functions/monthly-token-alert/index.ts:48]
- [x] [Review][Patch] Missing env var guard for `RESEND_API_KEY` / `OPERATOR_ALERT_EMAIL` — non-null assertions pass `undefined` to Resend; produces an opaque Resend validation error instead of a clear missing-secret message [supabase/functions/monthly-token-alert/index.ts:49]
- [x] [Review][Patch] NaN `INPUT_COST` / `OUTPUT_COST` produces `$NaN` in alert email — if either cost env var is set to a non-numeric string, `estimatedUSD` is `NaN`, threshold check always fails, email fires with `"$NaN"` in subject and body [supabase/functions/monthly-token-alert/index.ts:4-5]
- [x] [Review][Patch] Error response leaks internal details — raw exception message (table names, PostgREST codes) returned to unauthenticated callers in 500 body [supabase/functions/monthly-token-alert/index.ts:59]
- [x] [Review][Defer] No pagination — PostgREST 1,000-row default may truncate monthly rows [supabase/functions/monthly-token-alert/index.ts:20-23] — deferred, pre-existing; spec explicitly accepts in-memory aggregation at V1 scale
- [x] [Review][Defer] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` non-null assertions outside `try/catch` [supabase/functions/monthly-token-alert/index.ts:9-11] — deferred, pre-existing; Supabase platform auto-injects these in all deployed Edge Functions
- [x] [Review][Defer] `parseFloat` financial precision for cost calculation [supabase/functions/monthly-token-alert/index.ts:30] — deferred, pre-existing; V1 alerting does not need sub-cent precision
- [x] [Review][Defer] Cost defaults hardcoded to one model tier [supabase/functions/monthly-token-alert/index.ts:4-5] — deferred, pre-existing; spec defines `INPUT_COST_PER_MILLION_TOKENS` / `OUTPUT_COST_PER_MILLION_TOKENS` env var overrides for this exact purpose

## Dev Notes

### This Story Is Entirely Infrastructure — No Next.js Code

No files in `app/`, `components/`, `actions/`, or `lib/` are modified. The only deliverable is a Supabase Edge Function. This story does not touch the Next.js app.

### First Edge Function in the Project

No `supabase/functions/` directory exists yet. Create it:

```
supabase/
  functions/
    monthly-token-alert/
      index.ts        ← the only file needed
```

The Supabase CLI co-locates Edge Functions under `supabase/functions/`. Each function is a directory with an `index.ts` entry point.

### Deno Runtime — Critical Differences from Node.js

Edge Functions run on Deno, not Node.js. These rules are absolute:

| Node.js | Deno |
|---------|------|
| `process.env.X` | `Deno.env.get('X')` |
| `module.exports` / `require()` | ESM only |
| `import pkg from 'pkg'` | `import pkg from 'npm:pkg'` |
| Express / `http.createServer()` | `Deno.serve(handler)` |
| `import { createClient } from '@supabase/supabase-js'` | `import { createClient } from 'npm:@supabase/supabase-js@2'` |
| `import { Resend } from 'resend'` | `import { Resend } from 'npm:resend'` |

Never use `process.env` — it does not exist in Deno. Always use `Deno.env.get()`.

### Auto-Injected Environment Variables

Inside a deployed Edge Function, Supabase automatically provides:

- `SUPABASE_URL` — the project's API URL
- `SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — admin key (bypasses all RLS)

Do NOT add these as manual secrets — they are always present. Use `SUPABASE_SERVICE_ROLE_KEY` for the Supabase client because this function needs to read across all users' token_usage rows.

### Supabase Client in Edge Function

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
```

Using the service-role key means RLS is bypassed — the function can:
- Read `token_usage` across all users
- Read `config` (even though it has authenticated-only RLS)

Do NOT use the anon key. The anon key cannot read `token_usage` for other users.

### Resend SDK Usage Pattern

```typescript
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

await resend.emails.send({
  from: 'Midgard Alerts <onboarding@resend.dev>',  // use onboarding@resend.dev for testing; switch to verified domain for production
  to: Deno.env.get('OPERATOR_ALERT_EMAIL')!,
  subject: `[Midgard] Token spend alert: $${estimatedUSD.toFixed(2)} — ${period}`,
  html: `<p>Monthly token spend has exceeded the alert threshold.</p>
         <p><strong>Estimated spend:</strong> $${estimatedUSD.toFixed(2)}</p>
         <p><strong>Threshold:</strong> $${threshold.toFixed(2)}</p>
         <p><strong>Billing period:</strong> ${period}</p>
         <p>Review usage in your Supabase Dashboard → Table Editor → token_usage.</p>`,
})
```

For testing, `onboarding@resend.dev` works without domain verification. For production, a verified domain sender must be configured in the Resend dashboard.

### Token Cost Constants

Claude Sonnet 4.6 pricing (current as of May 2026):
- Input: **$3.00 per 1M tokens**
- Output: **$15.00 per 1M tokens**

These are the default values. Override via Edge Function secrets `INPUT_COST_PER_MILLION_TOKENS` and `OUTPUT_COST_PER_MILLION_TOKENS` when pricing changes — no redeploy required.

```typescript
const INPUT_COST = parseFloat(Deno.env.get('INPUT_COST_PER_MILLION_TOKENS') ?? '3.00')
const OUTPUT_COST = parseFloat(Deno.env.get('OUTPUT_COST_PER_MILLION_TOKENS') ?? '15.00')

const estimatedUSD =
  (totalInput / 1_000_000) * INPUT_COST +
  (totalOutput / 1_000_000) * OUTPUT_COST
```

### token_usage Table Schema

```sql
create table public.token_usage (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  project_id    uuid        not null references public.projects(id) on delete cascade,
  input_tokens  integer     not null check (input_tokens >= 0),
  output_tokens integer     not null check (output_tokens >= 0),
  created_at    timestamptz not null default now()
);

create index token_usage_user_id_created_at_idx on token_usage(user_id, created_at);
```

For the monthly aggregate, the most efficient query is:

```typescript
const { data: rows, error } = await supabase
  .from('token_usage')
  .select('input_tokens, output_tokens')
  .gte('created_at', periodStart.toISOString())
  .lt('created_at', periodEnd.toISOString())
```

Then sum in TypeScript. Alternatively use a raw RPC if the row count is very large — at V1 scale this in-memory approach is fine.

### config Table Schema

```sql
create table public.config (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);
```

Seeded rows:
- `free_tier_project_cap = '3'`
- `token_alert_threshold_usd = '50'`

All config values are stored as `text` — always parse to the required type (`parseFloat`, `parseInt`) before use. Never assume numeric type.

### pg_cron Scheduling — Two Options

**Option A: Supabase Dashboard Cron Jobs (preferred)**
1. Dashboard → Database → Cron Jobs → New Cron Job
2. Schedule: `0 0 1 * *` (monthly, midnight UTC on the 1st)
3. Type: Edge Function
4. Select `monthly-token-alert`

**Option B: pg_cron SQL migration**
```sql
-- Enable extensions first (if not already)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the Edge Function call
select cron.schedule(
  'monthly-token-alert',
  '0 0 1 * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/monthly-token-alert',
      headers := '{"Authorization": "Bearer " || current_setting("app.service_role_key"), "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
```

Option A is simpler and doesn't require embedding secrets in SQL. Use Option A unless the Dashboard UI is unavailable.

### Local Development

```bash
# Serve the function locally (for testing)
supabase functions serve monthly-token-alert --no-verify-jwt

# In a separate terminal, invoke it
curl -X POST http://localhost:54321/functions/v1/monthly-token-alert

# Deploy to production
supabase functions deploy monthly-token-alert
```

For local testing, the function uses the local Supabase instance's service role key. The local database may have no `token_usage` rows — insert a test row or set `token_alert_threshold_usd = '0'` temporarily to force the email branch.

### Anti-Patterns to Avoid

- **Do not** use `process.env` — Deno uses `Deno.env.get()`
- **Do not** import npm packages without the `npm:` specifier
- **Do not** use the anon key — the service-role key is required to read all users' token data
- **Do not** hardcode the operator email — read from `OPERATOR_ALERT_EMAIL` env var
- **Do not** hardcode cost constants — use env vars with sensible defaults
- **Do not** throw errors from the handler — catch and return 500 JSON response
- **Do not** send an email on every run regardless of threshold — check threshold first (AC5)
- **Do not** log secrets — `console.error` is fine for error messages, never log env var values

### No Changes to Existing Migrations

The `config` table already has `token_alert_threshold_usd = '50'` seeded in `003_config_table.sql`. No new migrations are required for this story.

### References

- [Source: epics.md#Story 7.1] — User story, acceptance criteria, technical notes
- [Source: epics.md#Epic 7] — Epic goal: runtime visibility without deployment overhead
- [Source: architecture.md#Platform Operations] — FR36: token spend alerting; FR38: operator dashboards
- [Source: architecture.md#Database Schema] — `token_usage` table shape; `config` table with key/value rows
- [Source: supabase/migrations/001_initial_schema.sql] — token_usage schema, indexes
- [Source: supabase/migrations/003_config_table.sql] — config table, RLS policy, seeded values
- [Source: project-context.md] — pnpm only; no Next.js changes for this story; `resend` 6.12.0 already in package.json
- [Source: .env.example] — `RESEND_API_KEY` and `OPERATOR_ALERT_EMAIL` already documented

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `supabase/functions/monthly-token-alert/index.ts` — Deno Edge Function using service-role client to aggregate monthly `token_usage`, compare against `config.token_alert_threshold_usd`, and send alert via Resend SDK when threshold exceeded.
- Deployed with `--no-verify-jwt` flag because Supabase has migrated to `sb_publishable_` key format which is not a valid JWT; the anon JWT key no longer exists in newer projects.
- Cron job configured in Dashboard → Integrations → Cron (not Database → Cron Jobs as documented — UI changed).
- End-to-end validated: threshold set to 0, function invoked, `sent: true` response with `estimatedUSD: ~$0.30`, alert email received. Threshold reset to 50.

### File List

- `supabase/functions/monthly-token-alert/index.ts` (new) — Deno Edge Function for monthly token spend alerting

## Change Log

- 2026-05-15: Story created for Story 7.1 — Token Spend Alerting
- 2026-05-15: Implemented and validated — Edge Function deployed, cron scheduled, email alert confirmed
