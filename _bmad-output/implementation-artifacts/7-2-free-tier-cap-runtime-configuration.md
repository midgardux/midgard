# Story 7.2: Free-Tier Cap Runtime Configuration

Status: done

## Story

As the **operator**,
I want to change the maximum number of projects a free-tier user can create without deploying code,
so that I can adjust capacity limits in response to growth or abuse patterns.

## Acceptance Criteria

1. **Given** a free-tier user attempts to create a project
   **When** the `createProject` Server Action runs
   **Then** it reads `config.free_tier_project_cap` from Supabase fresh on every request — no cached value

2. **Given** a free-tier user has reached or exceeded the cap
   **When** `createProject` runs
   **Then** project creation is blocked server-side and the user sees an inline `AttentionRegion` (Info variant) with the current realm count and an upgrade CTA

3. **Given** the operator updates `config.free_tier_project_cap` in Supabase Dashboard
   **When** the next project creation attempt runs
   **Then** the new cap takes effect immediately — no deployment required

4. **Given** `config.free_tier_project_cap` is set to `0`
   **When** a free-tier user attempts to create any project
   **Then** all creation is blocked regardless of existing project count, and the upgrade prompt uses context-accurate copy (not "You've built 0 Realms")

5. **Given** a Pro tier user creates a project
   **When** the `createProject` Server Action runs
   **Then** no cap check is performed and the project is created successfully

6. **Given** any cap enforcement logic
   **When** the cap check triggers
   **Then** it runs entirely server-side in the Server Action — no client-side cap logic

## Tasks / Subtasks

- [x] Task 1 — Create Postgres RPC `create_project_if_cap_allows` to fix TOCTOU race (AC: 1, 2, 4, 6)
  - [x] 1.1 Create `supabase/migrations/006_create_project_rpc.sql`
  - [x] 1.2 Function signature: `(p_name text, p_cap integer) RETURNS SETOF projects LANGUAGE plpgsql SECURITY INVOKER`
  - [x] 1.3 Acquire per-user advisory lock to prevent concurrent same-user requests from both passing the cap guard before either insert commits: `PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text)::bigint);`
  - [x] 1.4 Count existing projects for the authenticated user inside the lock, check `count >= p_cap`, raise `RAISE EXCEPTION 'CAP_REACHED:%', v_count` when blocked
  - [x] 1.5 Insert new project and `RETURN NEXT v_project` when below cap
  - [x] 1.6 Use `CREATE FUNCTION` (not `CREATE OR REPLACE`) — avoid the anti-pattern called out in `005_delete_project_rpc.sql` deferred work
  - [x] 1.7 Run `supabase db push` to apply the migration

- [x] Task 2 — Update `createProject` Server Action to use RPC for free-tier users (AC: 1, 2, 4, 5, 6)
  - [x] 2.1 In `actions/projects.ts`, for free-tier users, replace the two-round-trip pattern (separate count `.select('*', { count: 'exact', head: true })` + `.insert()`) with a single `supabase.rpc('create_project_if_cap_allows', { p_name: trimmedName, p_cap: cap })` call
  - [x] 2.2 Parse the RPC error: if `rpcError.code === 'P0001'` and message starts with `'CAP_REACHED:'`, extract the count from the message and return `{ success: false, error: \`PROJECT_CAP_REACHED:${count}\` }` — other errors return a generic failure
  - [x] 2.3 On RPC success, the client returns an array (SETOF); return `{ success: true, data: rows[0] }`
  - [x] 2.4 Pro-tier path is unchanged — keep the direct `.insert()` call (no RPC, no cap check)
  - [x] 2.5 Keep the config read (`config.free_tier_project_cap`) outside the RPC in the Server Action — the cap value is passed into the RPC as `p_cap`; config is still read fresh on every call (AC1, AC3)

- [x] Task 3 — Replace custom `UpgradePrompt` div with `AttentionRegion` component (AC: 2)
  - [x] 3.1 In `components/projects/NewRealmForm.tsx`, import `AttentionRegion` from `@/components/workspace/AttentionRegion`
  - [x] 3.2 Replace the outer `<div className="border border-mg-border px-7 py-6 mt-2">` wrapper with `<AttentionRegion variant="info" aria-label="Realm limit reached">` — `AttentionRegion` already applies identical border/padding/surface-background tokens; no visual regression expected
  - [x] 3.3 Keep all `UpgradePrompt` children (title paragraph, body copy, CTA buttons, error display) as-is inside the `AttentionRegion` — behavior and layout are preserved

- [x] Task 4 — Fix cap=0 upgrade prompt copy (AC: 4)
  - [x] 4.1 In the `UpgradePrompt` component inside `NewRealmForm.tsx`, handle `realmCount === 0` separately: replace the string `"You've built 0 Realms."` (misleading when cap is administratively set to 0) with `"Free tier Realm creation is currently paused."` — use a ternary on `realmCount > 0` vs `realmCount === 0`

- [x] Task 5 — Validate all ACs end-to-end
  - [x] 5.1 AC1/AC3: set cap to 2 in Supabase Dashboard → create 2 projects → attempt 3rd (blocked, prompt shows) → change cap to 5 in Dashboard → attempt again (succeeds) — no redeploy at any step
  - [x] 5.2 AC2: confirm `AttentionRegion` (Info variant) renders with correct copy and upgrade CTA on cap breach
  - [x] 5.3 AC4: set cap to 0 in Supabase Dashboard → attempt project creation → upgrade prompt shows "currently paused" copy, not "You've built 0 Realms"
  - [x] 5.4 AC5: as a Pro tier user (or simulate by setting `subscription_tier = 'pro'` in the DB), verify project creation succeeds regardless of cap value
  - [x] 5.5 AC6: confirm no cap-related logic exists in client-side components — all enforcement is in the Server Action

### Review Findings

- [x] [Review][Patch] `p_cap` is caller-supplied — authenticated users can call the RPC directly with `p_cap = 999999` to bypass the free-tier cap [`supabase/migrations/006_create_project_rpc.sql:25`]
- [x] [Review][Defer] `hashtext()` advisory lock key uses 32-bit hash space — two distinct users sharing the same key cause unnecessary request serialization (not a correctness failure) [`supabase/migrations/006_create_project_rpc.sql:19`] — deferred, pre-existing security model limitation; performance impact only at scale
- [x] [Review][Patch] `value::integer` cast surfaces raw Postgres `22P02` error on non-numeric config — regression from old `'Invalid cap configuration'` message [`supabase/migrations/006_create_project_rpc.sql:27`, `actions/projects.ts:57`]
- [x] [Review][Patch] `CAP_CONFIG_MISSING` exception not caught in TypeScript — raw sentinel string reaches the UI instead of `'Cap configuration not found'` [`actions/projects.ts:57`]
- [x] [Review][Defer] Race window / idempotency — RPC transaction commits but network failure causes caller to retry, potentially creating duplicate projects; no client-supplied idempotency key [`actions/projects.ts:54`] — deferred, pre-existing network-level concern not introduced by this change

## Dev Notes

### Context: Most of This Story Is Already Implemented

**The core cap enforcement from Story 3.2 is already in place:**
- `actions/projects.ts` → `createProject` already reads `config.free_tier_project_cap` fresh on each call, checks free-tier count, and returns `PROJECT_CAP_REACHED:N` when blocked
- `components/projects/NewRealmForm.tsx` → already parses `PROJECT_CAP_REACHED` and renders an upgrade prompt
- `supabase/migrations/003_config_table.sql` → config table seeded with `free_tier_project_cap = '3'`, readable by authenticated users via RLS

**This story has three specific gaps to close:**
1. TOCTOU race (required, from Story 3.2 code review — "do not mark optional")
2. cap=0 upgrade prompt copy (deferred from Story 3.2 to Story 7.2 explicitly)
3. `AttentionRegion` component usage for the upgrade prompt (UX spec AC2 requires Info variant)

### TOCTOU Race — Required Fix

**The problem:** `createProject` currently does two separate Supabase round-trips for free-tier users:
1. `SELECT COUNT(*)` from `projects`
2. `INSERT INTO projects`

Two concurrent requests from the same user can both pass the count check before either insert completes, allowing them to exceed the cap. This is a race condition, not a theoretical concern.

**The fix:** Wrap count + insert in a Postgres function that acquires a per-user advisory lock before doing either operation. `pg_advisory_xact_lock` is transaction-scoped — the lock releases automatically when the transaction ends.

**Advisory lock key:** `hashtext(auth.uid()::text)::bigint` — produces a stable per-user integer key. Two concurrent transactions for the same user will block on this lock; different users get different keys and do not block each other.

**Complete migration:**

```sql
-- 006_create_project_rpc.sql
-- Atomically checks cap and inserts project for free-tier users.
-- Per-user advisory lock prevents TOCTOU race between count check and insert.
create function public.create_project_if_cap_allows(
  p_name text,
  p_cap  integer
)
returns setof projects
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_project projects;
begin
  -- Lock prevents concurrent same-user requests from both passing the cap guard.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint);

  select count(*) into v_count
  from public.projects
  where user_id = v_user_id;

  if v_count >= p_cap then
    raise exception 'CAP_REACHED:%', v_count;
  end if;

  insert into public.projects (name, user_id, updated_at)
  values (p_name, v_user_id, now())
  returning * into v_project;

  return next v_project;
end;
$$;
```

### Updated `createProject` for Free-Tier Path

Replace the existing two-step free-tier block (lines 41–62 in `actions/projects.ts`) with:

```typescript
if (profile.subscription_tier === 'free') {
  const { data: configRow, error: configError } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'free_tier_project_cap')
    .single()
  if (configError) return { success: false, error: configError.message }
  if (!configRow) return { success: false, error: 'Cap configuration not found' }

  const cap = parseInt(configRow.value, 10)
  if (isNaN(cap)) return { success: false, error: 'Invalid cap configuration' }

  const { data: rows, error: rpcError } = await supabase
    .rpc('create_project_if_cap_allows', { p_name: trimmedName, p_cap: cap })

  if (rpcError) {
    if (rpcError.code === 'P0001' && rpcError.message.startsWith('CAP_REACHED:')) {
      const count = parseInt(rpcError.message.split(':')[1] ?? '0', 10)
      return { success: false, error: `PROJECT_CAP_REACHED:${isNaN(count) ? 0 : count}` }
    }
    return { success: false, error: rpcError.message }
  }

  if (!rows || rows.length === 0) return { success: false, error: 'Project creation failed' }
  return { success: true, data: rows[0] }
}
```

The Pro-tier path (`INSERT` directly) at the end of the function is unchanged.

### Supabase RPC Error Format

When a PL/pgSQL function raises an exception with `RAISE EXCEPTION 'CAP_REACHED:%', v_count`, PostgREST returns HTTP 400, and the Supabase JS client exposes:
- `rpcError.code` = `'P0001'` (PostgreSQL sqlstate for `raise_exception`)
- `rpcError.message` = `'CAP_REACHED:3'` (the formatted exception message)

Checking both `code` and message prefix ensures we only intercept our own exception and let genuine DB errors propagate as generic failures.

### `AttentionRegion` Replacement

The existing `UpgradePrompt` wrapper in `NewRealmForm.tsx`:
```tsx
<div className="border border-mg-border px-7 py-6 mt-2">
```

Replace with:
```tsx
<AttentionRegion variant="info" aria-label="Realm limit reached" className="mt-2">
```

`AttentionRegion` applies `border border-mg-border bg-mg-surface py-6 px-7` — identical tokens. The `role="region"` + `aria-label` makes the boundary meaningful for screen readers (the existing `<div>` is invisible to assistive tech). No child markup changes required.

### cap=0 Upgrade Prompt Copy Fix

In `UpgradePrompt`, the body copy currently renders `"You've built {realmCount} Realms"` unconditionally. When `realmCount === 0` (cap is administratively 0), this is misleading — the user hasn't built anything.

```tsx
// Before
<p className="...">
  You&apos;ve built {realmCount} {realmCount === 1 ? 'Realm' : 'Realms'}.
  Upgrade to Pro for unlimited Realms, ...
</p>

// After
<p className="...">
  {realmCount > 0
    ? <>You&apos;ve built {realmCount} {realmCount === 1 ? 'Realm' : 'Realms'}. Upgrade to Pro for unlimited Realms, priority analysis, and no usage caps.</>
    : <>Free tier Realm creation is currently paused. Upgrade to Pro for unlimited Realms, priority analysis, and no usage caps.</>
  }
</p>
```

### `PROJECT_CAP_REACHED` Sentinel String — Deferred Again

The Story 3.2 code review flagged the `PROJECT_CAP_REACHED:N` sentinel as fragile and suggested a typed `ActionResult` variant. This story preserves the sentinel to minimize surface area — both the action and the component already handle it correctly. Extend `ActionResult<T>` in a dedicated refactor story if this pattern spreads.

### Files to Touch

| File | Change |
|---|---|
| `supabase/migrations/006_create_project_rpc.sql` | **new** — `create_project_if_cap_allows` RPC |
| `actions/projects.ts` | Replace two-step free-tier path with RPC call (lines ~41–62) |
| `components/projects/NewRealmForm.tsx` | Use `AttentionRegion`; fix cap=0 copy |

No new components, no Next.js page changes, no other lib or store files touched.

### Migration Hygiene

Use `CREATE FUNCTION` (not `CREATE OR REPLACE`). The deferred work from 3.4's code review explicitly calls out `CREATE OR REPLACE` in migration files as an anti-pattern. Story 7.2's migration should not repeat it.

### config Table Schema Reference

```sql
create table public.config (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);
-- Seeded: free_tier_project_cap = '3', token_alert_threshold_usd = '50'
-- RLS: authenticated users can SELECT; writes via Supabase Dashboard only
```

All config values are `text` — always `parseInt(value, 10)` before numeric comparison. Never assume numeric type from the column.

### Anti-Patterns to Avoid

- **Do not** cache the config value — read it fresh on every `createProject` call (AC1, AC3)
- **Do not** do cap enforcement in client components — all logic must be in the Server Action (AC6)
- **Do not** use `CREATE OR REPLACE FUNCTION` in the migration (migration hygiene)
- **Do not** remove the Pro-tier fast path — only free-tier users go through the RPC

### References

- [Source: epics.md#Story 7.2] — User story, all 6 acceptance criteria, technical notes
- [Source: epics.md#Epic 7] — Epic goal: runtime operator controls without deployment
- [Source: deferred-work.md] — "TOCTOU cap race in createProject — Required fix in Story 7.2 — do not mark optional"
- [Source: deferred-work.md] — "count=0 upgrade prompt copy — Story 7.2 should address this edge case"
- [Source: deferred-work.md] — "PROJECT_CAP_REACHED sentinel string protocol — deferred until ActionResult is extended"
- [Source: implementation-artifacts/3-2-create-a-realm.md] — Original cap implementation context
- [Source: supabase/migrations/003_config_table.sql] — config table schema and seeded values
- [Source: supabase/migrations/005_delete_project_rpc.sql] — Precedent for SECURITY INVOKER RPC pattern
- [Source: actions/projects.ts] — Existing createProject implementation (lines 40–62 are the free-tier block to replace)
- [Source: components/projects/NewRealmForm.tsx] — UpgradePrompt and NewRealmForm to update
- [Source: components/workspace/AttentionRegion.tsx] — AttentionRegion component API

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `supabase/migrations/006_create_project_rpc.sql` with `create_project_if_cap_allows` RPC using `CREATE FUNCTION` (not `CREATE OR REPLACE`). Per-user advisory lock via `pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint)` makes the count+insert atomic. `RAISE EXCEPTION 'CAP_REACHED:%', v_count` surfaces count to caller. Applied via `supabase db push`.
- Replaced two-step free-tier path in `actions/projects.ts` (separate count query + insert) with single RPC call. Error handling distinguishes `P0001/CAP_REACHED:` from genuine DB errors. Pro-tier fast path (`INSERT` directly) is fully preserved and unchanged.
- Replaced plain `<div>` wrapper in `UpgradePrompt` with `<AttentionRegion variant="info" aria-label="Realm limit reached" className="mt-2">` — identical visual tokens, adds semantic `role="region"` for screen readers.
- Fixed cap=0 copy: ternary on `realmCount > 0` renders "You've built N Realms" for normal cap breach, "Free tier Realm creation is currently paused." when cap is administratively set to 0.
- TypeScript: zero errors on app code (pre-existing Deno Edge Function errors in `supabase/functions/` are unrelated and predate this story). ESLint: clean on all changed files.
- No test framework configured in this project — validation is TypeScript + ESLint + manual browser testing per Task 5 checklist.

### File List

- `supabase/migrations/006_create_project_rpc.sql` (new)
- `actions/projects.ts` (modified)
- `components/projects/NewRealmForm.tsx` (modified)

## Change Log

- 2026-05-15: Story 7.2 implemented — TOCTOU race fixed via `create_project_if_cap_allows` RPC with per-user advisory lock; free-tier Server Action migrated to single RPC call; `UpgradePrompt` wrapper upgraded to `AttentionRegion` Info variant; cap=0 copy fixed to "currently paused" message. (claude-sonnet-4-6)
