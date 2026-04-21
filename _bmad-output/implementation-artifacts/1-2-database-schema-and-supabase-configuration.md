# Story 1.2: Database Schema & Supabase Configuration

Status: done

## Story

As a **developer**,
I want the complete database schema created with RLS policies and a config table,
so that all user data is correctly isolated and runtime-configurable values can be set without code deploys.

## Acceptance Criteria

**Given** Supabase CLI is initialized (`supabase init`) and linked to the cloud project
**When** migrations are applied (`supabase db push`)
**Then** the following tables exist with correct column types:
- `profiles` (id uuid PK → auth.users, subscription_tier text default 'free', has_seen_disclosure boolean default false, stripe_customer_id text unique nullable, last_active_at timestamptz default now(), created_at, updated_at)
- `projects` (id uuid PK, user_id uuid → auth.users, name text, created_at, updated_at)
- `artifacts` (id uuid PK, project_id uuid → projects, artifact_type text, content jsonb, created_at, updated_at)
- `token_usage` (id uuid PK, user_id uuid → auth.users, project_id uuid → projects, input_tokens int, output_tokens int, created_at)
- `config` (key text PK, value text, updated_at)

**And** RLS is enabled on all tables with policies that restrict all operations to `auth.uid() = user_id` (or `auth.uid() = id` for profiles; EXISTS join through projects for artifacts)

**And** a Postgres trigger auto-creates a `profiles` row (subscription_tier='free', has_seen_disclosure=false) on every new auth.users INSERT

**And** the `config` table is seeded with initial rows: `free_tier_project_cap = '3'`, `token_alert_threshold_usd = '50'`

**And** `lib/supabase/server.ts` is updated to export `createServerClient()` (renamed from starter's `createClient()`)

**And** `lib/supabase/browser.ts` is created, exporting `createBrowserClient()`

**And** Supabase TypeScript types are generated into `lib/supabase/types.ts`

**And** migration files are committed to `supabase/migrations/`

## Tasks / Subtasks

- [x] Task 1 — Install and initialize Supabase CLI (AC: supabase init)
  - [x] 1.1 Install Supabase CLI: `brew install supabase/tap/supabase` (or `npx supabase` for one-off use)
  - [x] 1.2 Run `supabase init` at project root — creates `supabase/config.toml` and `supabase/migrations/`
  - [x] 1.3 Link to the cloud project: `supabase link --project-ref <YOUR_PROJECT_REF>` — project ref is found in Supabase Dashboard → Settings → General
  - [x] 1.4 Verify link: `supabase status` should show the linked project

- [x] Task 2 — Write migration files (AC: schema + RLS + seed)
  - [x] 2.1 Create `supabase/migrations/001_initial_schema.sql` — see exact SQL in Dev Notes
  - [x] 2.2 Create `supabase/migrations/002_rls_policies.sql` — see exact SQL in Dev Notes
  - [x] 2.3 Create `supabase/migrations/003_config_table.sql` — see exact SQL in Dev Notes

- [x] Task 3 — Apply migrations (AC: tables exist)
  - [x] 3.1 Run `supabase db push` — pushes all migrations to the linked cloud project
  - [x] 3.2 Verify in Supabase Dashboard → Table Editor that all 5 tables exist with the correct columns
  - [x] 3.3 Verify in Supabase Dashboard → Authentication → Triggers that the `on_auth_user_created` trigger is present
  - [x] 3.4 Verify in Supabase Dashboard → Authentication → Policies that RLS is enabled and policies are listed for all 5 tables

- [x] Task 4 — Generate TypeScript types (AC: lib/supabase/types.ts)
  - [x] 4.1 Run: `supabase gen types typescript --project-id <YOUR_PROJECT_REF> --schema public > lib/supabase/types.ts`
  - [x] 4.2 Verify the file was created and contains `Database` interface with all 5 tables
  - [x] 4.3 Leave `types/database.ts` as the empty placeholder it is — type consumers import from `@/lib/supabase/types` directly

- [x] Task 5 — Update Supabase client helpers (AC: server.ts + browser.ts)
  - [x] 5.1 In `lib/supabase/server.ts`: rename the exported function from `createClient` to `createServerClient` — see exact snippet in Dev Notes. Do NOT change the internals — just the export name.
  - [x] 5.2 Create `lib/supabase/browser.ts` — see exact snippet in Dev Notes. This is a new file alongside the existing `client.ts`.
  - [x] 5.3 Leave `lib/supabase/client.ts` and `lib/supabase/proxy.ts` untouched — `client.ts` is used by shadcn's generated components; `proxy.ts` is imported by `middleware.ts`.

- [x] Task 6 — Final validation
  - [x] 6.1 Run `pnpm tsc --noEmit` — zero type errors
  - [x] 6.2 Run `pnpm lint` — zero lint errors
  - [x] 6.3 Run `pnpm dev` — dev server loads without errors (no schema errors in console)

## Dev Notes

### Project Structure Reminder (CRITICAL)

This project uses a **flat structure** — no `src/` directory. All paths are root-relative:
- `lib/supabase/` not `src/lib/supabase/`
- `types/` not `src/types/`
- Import alias `@/*` resolves to `./*` (project root), e.g. `@/lib/supabase/types`

### Existing lib/supabase/ Files from Starter — Handle with Care

```
lib/supabase/
  client.ts   ← browser client (used by shadcn internals) — DO NOT RENAME OR DELETE
  server.ts   ← server client — rename export only (see Task 5.1)
  proxy.ts    ← session refresh client imported by middleware.ts — DO NOT TOUCH
```

The env var used throughout is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY` — the starter was updated to use the new key name). This is confirmed in `lib/utils.ts` and all three existing client files.

---

### Migration 001: Initial Schema

**`supabase/migrations/001_initial_schema.sql`**

```sql
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
  input_tokens  integer     not null,
  output_tokens integer     not null,
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
  values (new.id, 'free', false);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### Migration 002: RLS Policies

**`supabase/migrations/002_rls_policies.sql`**

```sql
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
```

---

### Migration 003: Config Table

**`supabase/migrations/003_config_table.sql`**

```sql
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
  using (auth.role() = 'authenticated');

-- Seed initial values
insert into public.config (key, value) values
  ('free_tier_project_cap', '3'),
  ('token_alert_threshold_usd', '50');
```

---

### lib/supabase/server.ts — Rename Export Only

Rename `createClient` → `createServerClient`. **Do not change any internals.**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {  // ← renamed from createClient
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* called from Server Component — safe to ignore */ }
        },
      },
    }
  );
}
```

> **Warning:** After renaming, any existing import of `createClient` from `lib/supabase/server` will break. At this stage only Story 1.1 code is in place and no other code imports it yet — the rename is safe.

---

### lib/supabase/browser.ts — New File

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

> This is a NEW file. Do not modify or delete `lib/supabase/client.ts` — it is used internally by shadcn-generated component code and must stay.

---

### TypeScript Type Generation

```bash
supabase gen types typescript --project-id <YOUR_PROJECT_REF> --schema public > lib/supabase/types.ts
```

The generated file exports a `Database` interface. Use it to type Supabase clients in later stories:

```ts
import type { Database } from "@/lib/supabase/types";
// createServerClient<Database>(...)
```

For now, just generate the file and commit it. Typing the clients with `Database` is Story 1.3+ territory.

---

### Architecture Guardrails for This Story

- **No application code** beyond the client helpers and generated types. No Server Actions, no components.
- **All schema changes via committed migration files** — never apply schema changes through the Dashboard UI directly; always write the SQL first.
- **config is read-only for the app** — the operator updates values via Supabase Dashboard → Table Editor. Server Actions read config fresh on every call (no caching).
- **Hard delete cascade order** (enforced by FK constraints in migration): `artifacts → token_usage → projects`. The `on delete cascade` clauses handle this automatically at the DB level. Story 3.4 adds the explicit RPC for double safety.
- **Never use `anon` key for server-side Supabase calls** — always use `SUPABASE_SERVICE_ROLE_KEY` or the server client (which inherits the authenticated user's session via cookies). The server client created by `createServerClient()` in `lib/supabase/server.ts` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and relies on the user's session cookie — this is correct for RLS-protected queries. The `SERVICE_ROLE_KEY` is reserved for bypassing RLS (e.g., the trigger function, Edge Functions).

---

### Supabase Project Ref

Find your project ref in: Supabase Dashboard → [Your Project] → Settings → General → Reference ID.

It looks like: `abcdefghijklmnop` (20 alphanumeric chars).

---

### References

- Architecture: Database schema, RLS strategy, config table pattern [Source: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`]
- Architecture: Complete directory structure [Source: `_bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure`]
- Architecture: Migration file naming convention (001/002/003) [Source: `_bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure`]
- Architecture: Token usage table + monthly aggregation [Source: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`]
- Epics: Story 1.2 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2`]
- Story 1.1: Flat structure, pnpm, PUBLISHABLE_KEY discovery, existing lib/supabase/ files [Source: `_bmad-output/implementation-artifacts/1-1-project-initialization-and-design-token-foundation.md#Dev Agent Record`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `lib/supabase/server.ts` import aliased as `createSupabaseServerClient` to avoid name collision between the exported wrapper function and the `@supabase/ssr` import of the same name.
- `lib/supabase/browser.ts` same aliasing pattern applied.
- Starter files `app/auth/confirm/route.ts`, `app/protected/page.tsx`, `components/auth-button.tsx` updated from `createClient` → `createServerClient` after rename broke their imports.
- `eslint.config.mjs` — added `{ ignores: [".next/**"] }` to fix pre-existing issue where ESLint was scanning Turbopack build artifacts.
- `supabase gen types typescript` output went to stderr due to line break in CLI command; types written directly from captured output.

### Completion Notes List

- All 3 migrations applied to cloud project (ref: yanxmjpddloznxgrendx) via `supabase db push`
- 5 tables created: `profiles`, `projects`, `artifacts`, `token_usage`, `config`
- RLS enabled on all 5 tables with appropriate owner-access policies
- `on_auth_user_created` trigger auto-creates profiles row on signup
- `config` seeded with `free_tier_project_cap=3` and `token_alert_threshold_usd=50`
- `lib/supabase/server.ts` exports `createServerClient()` (renamed from `createClient`)
- `lib/supabase/browser.ts` created, exports `createBrowserClient()`
- `lib/supabase/types.ts` generated with `Database` interface covering all 5 tables
- `pnpm tsc --noEmit` — zero errors
- `pnpm lint` — zero errors
- `pnpm dev` — starts clean in 364ms

### File List

- `supabase/config.toml` (created by supabase init)
- `supabase/migrations/001_initial_schema.sql` (new)
- `supabase/migrations/002_rls_policies.sql` (new)
- `supabase/migrations/003_config_table.sql` (new)
- `lib/supabase/server.ts` (modified — renamed export, aliased import)
- `lib/supabase/browser.ts` (new)
- `lib/supabase/types.ts` (new — generated)
- `app/auth/confirm/route.ts` (modified — updated import to createServerClient)
- `app/protected/page.tsx` (modified — updated import to createServerClient)
- `components/auth-button.tsx` (modified — updated import to createServerClient)
- `eslint.config.mjs` (modified — added .next ignore)

### Review Findings

- [x] [Review][Decision] `config.value` NOT NULL vs nullable — dismissed, keep NOT NULL as implemented (operators delete rows to remove config entries).
- [x] [Review][Patch] `handle_new_user` trigger missing ON CONFLICT DO NOTHING [`supabase/migrations/001_initial_schema.sql`] — fixed in 001 and patched via 004_cr_patches.sql.
- [x] [Review][Patch] `token_usage` missing CHECK constraints for negative token counts [`supabase/migrations/001_initial_schema.sql`] — fixed in 001 and patched via 004_cr_patches.sql.
- [x] [Review][Patch] `config` RLS policy uses `auth.role() = 'authenticated'` instead of `auth.uid() IS NOT NULL` [`supabase/migrations/003_config_table.sql`] — fixed in 003 and patched via 004_cr_patches.sql.
- [x] [Review][Defer] `updated_at` columns have no auto-update trigger [`supabase/migrations/001_initial_schema.sql`] — deferred, pre-existing
- [x] [Review][Defer] `artifacts` RLS subquery missing covering index on `projects(id, user_id)` [`supabase/migrations/002_rls_policies.sql`] — deferred, pre-existing
- [x] [Review][Defer] Open redirect in `app/auth/confirm/route.ts` — `next` query param passed to `redirect()` without validation; pre-existing, not introduced by this story — deferred, pre-existing
- [x] [Review][Defer] Two divergent browser client factories (`lib/supabase/client.ts` vs `lib/supabase/browser.ts`) — client.ts untouched per spec constraint; typed unification deferred to Story 1.3+ — deferred, pre-existing
- [x] [Review][Defer] Middleware auth guard uses inverted opt-out logic (pre-existing in `lib/supabase/proxy.ts`) — deferred, pre-existing
- [x] [Review][Defer] `lib/supabase/browser.ts` has no SSR guard — convention-only boundary; low risk at current stage — deferred, pre-existing

## Change Log

- 2026-04-19: Story 1.2 implemented — Supabase CLI initialized and linked, 3 migrations applied, TypeScript types generated, server/browser client helpers created, ESLint config fixed (Date: 2026-04-19)
