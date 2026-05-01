# Story 3.2: Create a Realm

Status: done

## Story

As a **registered user**,
I want to create a new Realm for each product brief I'm working on,
So that I can keep my projects organized.

## Acceptance Criteria

1. **Given** I am a Free tier user below the project cap
   **When** I click "New Realm" and provide a name
   **Then** a `projects` row is created in Supabase with my `user_id`
   **And** I am redirected to `/projects/[projectId]/workspace`
   **And** the `createProject` Server Action returns `ActionResult<Project>` — on failure returns `{ success: false, error: '...' }` without creating a partial record

2. **Given** I am a Free tier user at the project cap (read from `config.free_tier_project_cap` at runtime)
   **When** I attempt to create a new Realm
   **Then** the `createProject` Server Action returns an error without inserting a record
   **And** an upgrade prompt is shown inline (C64 model Info variant): what the user has accomplished, what Pro unlocks, and a CTA to upgrade

3. **Given** I am a Pro tier user
   **When** I create a new Realm
   **Then** no project cap is checked and the Realm is created successfully

## Tasks / Subtasks

- [x] Task 1 — Implement `createProject` in `actions/projects.ts`
  - [x] 1.1 Read `actions/projects.ts` before modifying — replace the `// TODO Story 3.2: createProject` stub with the full implementation (template in Dev Notes)
  - [x] 1.2 Get the authenticated user via `supabase.auth.getUser()` — return `{ success: false, error: 'Not authenticated' }` if user is null
  - [x] 1.3 Read `profiles.subscription_tier` for `user.id` using `.single()` — return `{ success: false, error: profileError.message }` on DB error
  - [x] 1.4 Free-tier cap gate (only when `subscription_tier === 'free'`):
    - Read `config.free_tier_project_cap` from config table (fresh on every call, no caching)
    - Count existing `projects` rows — RLS auto-scopes count to the authenticated user, no manual `.eq('user_id', ...)` filter needed
    - If `count >= cap`, return `{ success: false, error: 'PROJECT_CAP_REACHED' }` without inserting
  - [x] 1.5 Insert project: `{ name: name.trim(), user_id: user.id, updated_at: new Date().toISOString() }` — set `updated_at` explicitly (no DB auto-update trigger); `created_at` uses the DB default
  - [x] 1.6 Chain `.select().single()` on the insert; return `{ success: true, data }` or `{ success: false, error: error.message }` — never throw

- [x] Task 2 — Create `components/projects/NewRealmForm.tsx` (Client Component)
  - [x] 2.1 `'use client'` at top; import `useState` from `react`, `useRouter` from `next/navigation`, `createProject` from `@/actions/projects`
  - [x] 2.2 Props: `variant: 'header' | 'empty-state'` — determines closed-state button label
  - [x] 2.3 State: `isOpen: boolean`, `name: string`, `isLoading: boolean`, `error: string | null`, `isCapReached: boolean`
  - [x] 2.4 Closed state (isOpen=false, isCapReached=false): Primary button — `buttonLabel` is `'New Realm'` for header variant, `'Create your first Realm'` for empty-state variant; `onClick` sets `isOpen=true`
  - [x] 2.5 Open state (isOpen=true): render inline form — label ("Realm name"), `<input>` with `autoFocus` and `maxLength={100}`, error line, row with Primary "Create Realm" submit (disabled when loading or name is empty after trim) + Ghost "Cancel" button
  - [x] 2.6 `handleSubmit`: call `createProject(name)`; on `'PROJECT_CAP_REACHED'` error → `setIsCapReached(true), setIsOpen(false), setIsLoading(false)`; on other error → `setError(result.error), setIsLoading(false)`; on success → `router.push('/projects/' + result.data.id + '/workspace')`
  - [x] 2.7 `handleCancel`: `setIsOpen(false), setName(''), setError(null)`
  - [x] 2.8 Cap reached state (isCapReached=true): render inline upgrade prompt (see Upgrade Prompt section in Dev Notes)

- [x] Task 3 — Update `app/(app)/projects/page.tsx`
  - [x] 3.1 Read `app/(app)/projects/page.tsx` before modifying — do NOT recreate from scratch
  - [x] 3.2 Import `NewRealmForm` from `@/components/projects/NewRealmForm`
  - [x] 3.3 Replace the disabled "New Realm" header button stub with `<NewRealmForm variant="header" />` — only rendered when `result.data.length > 0`
  - [x] 3.4 Replace the disabled "Create your first Realm" empty state button stub with `<NewRealmForm variant="empty-state" />` — only rendered when `result.data.length === 0`
  - [x] 3.5 Confirm one Primary button per view rule: header variant renders only when `length > 0`; empty-state variant renders only when `length === 0` — never both simultaneously

- [x] Task 4 — Validation
  - [x] 4.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 4.2 `pnpm lint` — zero ESLint errors
  - [x] 4.3 `pnpm dev` — starts without errors; `/projects` renders with a working "New Realm" button
  - [x] 4.4 Manual: free-tier user below cap → click New Realm → name input appears → submit → redirect to `/projects/[id]/workspace` (404 is expected; workspace built in Stories 5.x)
  - [x] 4.5 Manual: free-tier user at cap (set `free_tier_project_cap = '1'` in Supabase `config` table temporarily, then ensure user has 1 realm) → attempt create → upgrade prompt appears inline, no new row in `projects`
  - [x] 4.6 Manual: cancel from open form → form closes, button reappears, no DB write
  - [x] 4.7 Manual: submit with empty name (whitespace only) → submit button is disabled, cannot be triggered
  - [x] 4.8 Manual: Pro tier user (set `subscription_tier = 'pro'` in Supabase `profiles` for test user) → cap is never checked; Realm created regardless of existing project count

### Review Findings

- [x] [Review][Defer] TOCTOU race — count check and insert are non-atomic; correct fix requires a DB migration (atomic count+insert Postgres function); deferred to Story 7.2 (cap enforcement infrastructure) — mark as required, not optional
- [x] [Review][Patch] isCapReached is a one-way state transition — add "Try again" link to UpgradePrompt that resets isCapReached to false [components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] Header variant layout breaks when form opens — form constrained to `w-64` in header variant; page header changed to `items-start` so form expands naturally below label [app/(app)/projects/page.tsx, components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] UpgradePrompt omits accomplishment count — action returns `PROJECT_CAP_REACHED:${count}`; count parsed client-side and displayed as "You've built N Realm(s)" [actions/projects.ts, components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] parseInt NaN: cap silently bypassed when `config.free_tier_project_cap` value is non-numeric — added `isNaN(cap)` guard returning an error [actions/projects.ts]
- [x] [Review][Patch] isLoading never reset on the success path — added `setIsLoading(false)` before `router.push` [components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] profile null dereference — added `if (!profile)` null check after `.single()` query [actions/projects.ts]
- [x] [Review][Patch] label missing `htmlFor` / input missing `id` — added `id="realm-name"` and `htmlFor="realm-name"` [components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] No server-side name validation — added server-side `trimmedName` empty check and 100-char max length guard [actions/projects.ts]
- [x] [Review][Patch] `configRow` null guard missing — `configRow.value` accessed without a null check after the `configError` guard; `.single()` returns PGRST116 on missing row so this is safe in practice, but add `if (!configRow)` as defense-in-depth [actions/projects.ts]
- [x] [Review][Patch] `handleSubmit` not wrapped in try/catch — a thrown server action (network failure or unhandled exception) leaves `isLoading` stuck at `true` with no error shown to the user [components/projects/NewRealmForm.tsx]
- [x] [Review][Patch] `auth.getUser()` error discarded in destructure — `error` from `getUser()` is silently swallowed; auth service failures return the misleading `'Not authenticated'` message [actions/projects.ts]
- [x] [Review][Patch] `handleCancel` doesn't reset `isLoading` — cancelling during an in-flight request leaves `isLoading=true`; if the user reopens the form before the request resolves, the submit button is stuck disabled [components/projects/NewRealmForm.tsx]
- [x] [Review][Defer] `PROJECT_CAP_REACHED` sentinel string protocol — count embedded in error string as `PROJECT_CAP_REACHED:N` is fragile to parse and exposes internal count via the error field; correct fix requires typed error variants in `ActionResult<T>`; deferred until ActionResult is extended
- [x] [Review][Defer] `subscription_tier` untyped string — any profile value not exactly `'free'` silently skips the cap check; pre-existing schema typing concern not actionable in this story
- [x] [Review][Defer] count=0 upgrade prompt copy — "You've built 0 Realms" is nonsensical when `cap=0` blocks all creation; Story 7.2 should handle this edge case with appropriate copy

## Dev Notes

### Dependency on Story 3.1

**Story 3.1 must be implemented first.** Story 3.1 creates:
- `app/(app)/layout.tsx` — authenticated app shell with AppNav
- `app/(app)/projects/page.tsx` — Realm list with disabled "New Realm" stub buttons
- `actions/projects.ts` — `listProjects` + stub comment `// TODO Story 3.2: createProject`

Story 3.2 modifies both `actions/projects.ts` and `app/(app)/projects/page.tsx`. Read both files before editing — never recreate from scratch.

### Flat Directory Structure — No `src/`

```
app/               (not src/app/)
actions/           (not src/actions/)
components/        (not src/components/)
types/             (not src/types/)
lib/               (not src/lib/)
```

All imports use the `@/` alias which resolves to the project root.

### `createProject` — Full Implementation Template

Add this after `listProjects` in `actions/projects.ts`, before the `// TODO Story 3.4: deleteProject` stub:

```typescript
export async function createProject(name: string): Promise<ActionResult<Project>> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()
  if (profileError) return { success: false, error: profileError.message }

  if (profile.subscription_tier === 'free') {
    // Read config fresh on every call — no caching (FR37, Story 7.2 AC1/AC3)
    const { data: configRow, error: configError } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'free_tier_project_cap')
      .single()
    if (configError) return { success: false, error: configError.message }

    const cap = parseInt(configRow.value, 10)

    // RLS auto-scopes this count to the authenticated user — no manual user_id filter needed
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
    if (countError) return { success: false, error: countError.message }

    if ((count ?? 0) >= cap) {
      return { success: false, error: 'PROJECT_CAP_REACHED' }
    }
  }
  // Pro users skip the cap check entirely — no else branch needed

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      user_id: user.id,
      updated_at: new Date().toISOString(),
      // created_at uses DB default (timestamptz default now())
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
```

**Rules enforced by architecture:**
- Never throw from a Server Action — always return `ActionResult`
- Check `error` before using `data` at every Supabase call
- `createServerClient()` is async — always `await` it
- Subscription tier is read server-side; never trust client state for gating
- Config table row is read fresh on each call — `free_tier_project_cap` must not be cached
- `cap = 0` blocks all free-tier creation because `0 >= 0` is true (Story 7.2 AC4)

### `updated_at` Must Be Set Explicitly

From `deferred-work.md` (Story 1.2 deferred): `updated_at` columns have **no auto-update trigger**. The DB default sets creation time only. For INSERT operations: include `updated_at: new Date().toISOString()` explicitly. For UPDATE operations (Story 3.4 `deleteProject` doesn't update, but any future update must include it).

### `NewRealmForm` Component — Implementation Template

Create `components/projects/NewRealmForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/actions/projects'

interface NewRealmFormProps {
  variant: 'header' | 'empty-state'
}

export function NewRealmForm({ variant }: NewRealmFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCapReached, setIsCapReached] = useState(false)

  const buttonLabel = variant === 'empty-state' ? 'Create your first Realm' : 'New Realm'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    const result = await createProject(name)
    if (!result.success) {
      setIsLoading(false)
      if (result.error === 'PROJECT_CAP_REACHED') {
        setIsCapReached(true)
        setIsOpen(false)
      } else {
        setError(result.error)
      }
      return
    }
    router.push(`/projects/${result.data.id}/workspace`)
  }

  function handleCancel() {
    setIsOpen(false)
    setName('')
    setError(null)
  }

  if (isCapReached) {
    return <UpgradePrompt />
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity"
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mt-2">
      <div>
        <label className="block font-mono text-xs text-mg-foreground-muted uppercase tracking-widest mb-1">
          Realm name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your Realm"
          autoFocus
          maxLength={100}
          className="w-full bg-mg-surface border border-mg-border font-mono text-xs text-mg-foreground px-3 py-2 focus:outline-none focus:border-mg-foreground-subtle"
        />
        {error && (
          <p className="font-mono text-xs text-mg-destructive mt-1">{error}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? 'Creating...' : 'Create Realm'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

### Upgrade Prompt Implementation

`AttentionRegion` is built in Story 4.1 and is not available yet. Implement the upgrade prompt as a private function inside `NewRealmForm.tsx` using a raw bordered div that follows the C64 model: border + space, same surface tokens, no elevation, no register change.

```tsx
function UpgradePrompt() {
  return (
    <div className="border border-mg-border px-7 py-6 mt-2">
      <p className="font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3">
        Realm limit reached
      </p>
      <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-4">
        You've used all your Free tier Realms. Upgrade to Pro for unlimited Realms,
        priority analysis, and no usage caps.
      </p>
      <a
        href="/pricing?plan=pro"
        className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity inline-block"
      >
        Upgrade to Pro
      </a>
    </div>
  )
}
```

**Why `px-7 py-6`:** 28px horizontal / 24px vertical matches the `AttentionRegion` interior padding from UX-DR3, so this div will slot cleanly into `AttentionRegion` when Story 4.1 refactors it.

**Why `/pricing?plan=pro`:** The `?plan=pro` param is currently ignored. Story 6.2 will read it after email verification to route users directly into Stripe Checkout (see `deferred-work.md`: "`?plan=pro` silently ignored until Story 6.2").

### Projects Page — One Primary Per View Invariant

Story 3.1 established the rule: the "New Realm" header button and the empty-state CTA are the same action and must never appear simultaneously. When replacing both with `NewRealmForm`:

```tsx
{/* When realms.length > 0 — header shows only this */}
<NewRealmForm variant="header" />

{/* When realms.length === 0 — only empty state CTA shows */}
<NewRealmForm variant="empty-state" />
```

Both render a single Primary button in their closed state. Only one renders at a time. When either is in the upgrade-prompt state, its `<a>` link is the only Primary-styled element on the page.

### Redirect Target Expected to 404

`router.push('/projects/[id]/workspace')` navigates to a 404 because the workspace page is built in Epic 5 (Stories 5.1+). This is correct and expected behavior. Do not attempt to create the workspace page in this story.

### Design Tokens — mg-* Prefix Only

| Intent | Tailwind class | Never use |
|---|---|---|
| Page background | `bg-mg-background` | `#0A0A0A` |
| Card / surface | `bg-mg-surface` | `#111111` |
| Card hover | `bg-mg-surface-elevated` | `#1C1C1E` |
| Border | `border-mg-border` | `#27272A` |
| Primary text | `text-mg-foreground` | `#FAFAFA` |
| Muted text | `text-mg-foreground-muted` | `#A1A1AA` |
| Subtle text | `text-mg-foreground-subtle` | `#52525B` |
| Accent bg (Primary btn) | `bg-mg-accent` | `#E8D5A3` |
| Accent text (on accent) | `text-mg-background` | `#0A0A0A` |
| Error text | `text-mg-destructive` | `#EF4444` |

### Fonts — Tailwind Utilities Only

```
font-sans  → Geist Sans (loaded in app/layout.tsx)
font-mono  → Geist Mono (loaded in app/layout.tsx)
```

Never import fonts directly in component files. Never use `font-family` inline styles.

### New Files

- `components/projects/NewRealmForm.tsx` — Client Component with create form and upgrade prompt

### Modified Files

- `actions/projects.ts` — Replace `// TODO Story 3.2: createProject` stub with full implementation
- `app/(app)/projects/page.tsx` — Replace disabled Primary button stubs with `<NewRealmForm>`

### Files to NOT Touch

- `app/(app)/layout.tsx` — AppNav shell; no changes needed
- `actions/auth.ts` — auth actions; no changes needed
- `lib/supabase/server.ts` — server client; no changes needed
- `lib/supabase/proxy.ts` — auth guard middleware; no changes needed
- `middleware.ts` — no changes needed
- The `// TODO Story 3.4: deleteProject` stub in `actions/projects.ts` — leave it for Story 3.4

### Story 3.3 and 3.4 Context

Story 3.3 (`Open and Revisit a Realm`) builds the `/projects/[projectId]/workspace` page — that's the redirect target for successful Realm creation. Story 3.4 (`Delete a Realm`) adds `deleteProject` to `actions/projects.ts`.

### References

- [Source: epics.md#Story 3.2] — Acceptance criteria
- [Source: epics.md#FR19, FR32, FR33, FR34] — Create project, free-tier cap enforcement, upgrade prompt, Pro tier no cap
- [Source: architecture.md#API & Communication Patterns] — Server Actions pattern, ActionResult<T>
- [Source: architecture.md#Implementation Patterns] — Subscription tier gating server-side, config table fresh-read pattern
- [Source: architecture.md#Process Patterns] — Hard cap check, never trust client state for tier
- [Source: ux-design-specification.md#Modal and Overlay Patterns] — No modals, C64 model for confirmations and upgrade prompts
- [Source: ux-design-specification.md#Button Hierarchy] — Primary/Ghost tiers, one Primary per view
- [Source: ux-design-specification.md#Feedback Patterns] — Info variant (standard border), upgrade prompt placement inline adjacent to triggering control
- [Source: ux-design-specification.md#Empty States and Loading States] — `realm-empty` content pattern
- [Source: implementation-artifacts/3-1-realm-list-view.md#Dev Notes] — mg-* token table, button styles, server action pattern, updated_at deferred note, flat directory structure
- [Source: implementation-artifacts/deferred-work.md] — `?plan=pro` ignored until Story 6.2, `updated_at` has no auto-update trigger

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Fixed `react/no-unescaped-entities` ESLint error in `UpgradePrompt` — escaped `You've` → `You&apos;ve`.

### Completion Notes List

- Implemented `createProject` Server Action in `actions/projects.ts` — auth check, profile tier read, free-tier cap gate (fresh config read, RLS-scoped count), insert with explicit `updated_at`, chained `.select().single()`
- Created `components/projects/NewRealmForm.tsx` — Client Component with `variant` prop, controlled form, double-submit guard, `PROJECT_CAP_REACHED` → inline `UpgradePrompt`, success → `router.push` to workspace
- `UpgradePrompt` implemented as private function inside the same file (not `AttentionRegion` — Story 4.1 deferred); uses `px-7 py-6` to match future `AttentionRegion` interior padding
- Updated `app/(app)/projects/page.tsx` — replaced both disabled button stubs with `<NewRealmForm>` variants; one-Primary-per-view invariant maintained
- `pnpm tsc --noEmit` and `pnpm lint` both pass with zero errors
- Manual validation tasks (4.3–4.8) left for Jason to verify in the running app

### File List

- `actions/projects.ts` — added `createProject` Server Action
- `components/projects/NewRealmForm.tsx` — new Client Component (create form + upgrade prompt)
- `app/(app)/projects/page.tsx` — replaced disabled stubs with `<NewRealmForm>` variants

## Change Log

- 2026-04-24: Story 3.2 implemented — `createProject` action, `NewRealmForm` component, projects page updated. TypeScript and ESLint pass. Ready for code review and manual validation.
- 2026-04-26: All manual browser checks (4.4–4.8) verified by Jason — all passed, including free-tier cap gate (4.5) and Pro tier bypass (4.8)
