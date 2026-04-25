# Story 3.1: Realm List View

Status: done

## Story

As a **registered user**,
I want to see all my Realms when I log in,
So that I can quickly access my existing work or start something new.

## Acceptance Criteria

1. **Given** I am authenticated and navigate to `/projects`
   **When** the page loads
   **Then** all my Realms are listed, each showing the Realm name and creation date
   **And** if I have no Realms, an empty state is shown: "Your first Realm awaits." with a primary CTA to create one
   **And** Realm cards link to `/projects/[projectId]/workspace`
   **And** the list is scoped to my user ID only — no other users' Realms are visible (RLS enforced server-side)

2. **Given** I have more than one Realm
   **When** the list renders
   **Then** Realms are ordered by most recently updated first

## Tasks / Subtasks

- [x] Task 1 — Create `app/(app)/` route group and layout (prerequisite for all tasks)
  - [x] 1.1 Create `app/(app)/layout.tsx` — AppNav (46px sticky, `bg-mg-background border-b border-mg-border`); Midgard wordmark left (`font-mono text-xs uppercase tracking-widest text-mg-foreground`); logout form using `signOut` from `@/actions/auth` right (Ghost tier button); export `metadata: { robots: { index: false, follow: false } }` — this is the authenticated SPA shell for all Epic 3–7 routes
  - [x] 1.2 DO NOT include `ThemeSwitcher` or any dark/light toggle in the layout — `forcedTheme="dark"` in root layout makes it non-functional (deferred cleanup from Story 2.1 code review)
  - [x] 1.3 Update `app/robots.ts`: confirm `/projects/` and `/account/` are in the `disallow` array — resolves the deferred item from Story 2.2 code review: "update the disallow list when Epic 3 creates the authenticated app shell"

- [x] Task 2 — Create `actions/projects.ts` with `listProjects`
  - [x] 2.1 `'use server'` at top; import `createServerClient` from `@/lib/supabase/server`, `ActionResult` from `@/types/actions`, `Tables` from `@/lib/supabase/types`
  - [x] 2.2 Export `type Project = Tables<'projects'>` — use the generated type, do NOT hand-write the shape
  - [x] 2.3 Implement `listProjects(): Promise<ActionResult<Project[]>>` — query `projects` ordered by `updated_at DESC`; RLS on the server client scopes results to the authenticated user automatically; always destructure `{ data, error }` and return `{ success: false, error: error.message }` before using `data`
  - [x] 2.4 Add stub comments `// TODO Story 3.2: createProject` and `// TODO Story 3.4: deleteProject` to pre-establish the module structure for future stories

- [x] Task 3 — Create `app/(app)/projects/page.tsx`
  - [x] 3.1 Server Component (no `'use client'`). Call `listProjects()` server-side; if `!result.success`, render a simple error line (`<p className="font-mono text-xs text-mg-destructive">Failed to load Realms.</p>`) — `AttentionRegion` component does not exist yet (built in Story 4.1)
  - [x] 3.2 Export `metadata: Metadata = { title: 'Realms — Midgard', robots: { index: false, follow: false } }`
  - [x] 3.3 Page shell: `<main className="px-6 py-8 max-w-4xl mx-auto">`. Heading row: `font-mono text-xs uppercase tracking-widest text-mg-foreground-muted` label "Realms" + "New Realm" Primary button (disabled, `aria-disabled="true"`, `aria-label="New Realm — available in next update"`). One Primary per view maximum — if empty state renders, do NOT also show the header Primary button (see 3.4)
  - [x] 3.4 Empty state (when `result.data.length === 0`): hide the "New Realm" header button; show centered `"Your first Realm awaits."` in `font-sans text-mg-foreground-muted` + a Primary CTA button "Create your first Realm" (disabled stub). Text only — no illustrations, no icons.
  - [x] 3.5 Realm list (when `result.data.length > 0`): `<ul className="space-y-2 mt-6">` of Realm cards — each card is a full-card `<Link>` wrapping a `<div className="border border-mg-border bg-mg-surface hover:bg-mg-surface-elevated p-4 transition-colors">`. Realm name in `font-sans text-mg-foreground font-medium`; creation date in `font-mono text-xs text-mg-foreground-subtle`
  - [x] 3.6 Date formatting: `new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(r.created_at))` — no external date library required

- [x] Task 4 — Validation
  - [x] 4.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 4.2 `pnpm lint` — zero ESLint errors
  - [x] 4.3 `pnpm dev` — starts without errors; `/projects` renders when authenticated
  - [x] 4.4 Manual: unauthenticated visit to `/projects` → redirects to `/login` (middleware handles this — verify it works)
  - [x] 4.5 Manual: authenticated visit with no Realms → empty state renders with "Your first Realm awaits."
  - [x] 4.6 Manual: authenticated visit with Realms → Realm cards render ordered by most recently updated first
  - [x] 4.7 Manual: Realm card click → navigates to `/projects/[id]/workspace` (404 expected — workspace built in Stories 5.x)
  - [x] 4.8 Manual: view-source on `/projects` → confirm `noindex` meta tag present

## Dev Notes

### Critical: Flat Directory Structure — No `src/`

The architecture document shows `src/app/` etc., but this project is **flat — no `src/` prefix**:
- `app/` (not `src/app/`)
- `components/` (not `src/components/`)
- `lib/` (not `src/lib/`)
- `actions/` (not `src/actions/`)
- `types/` (not `src/types/`)

All imports use `@/` alias which resolves to the project root. Confirmed from existing files.

### `(app)/` Route Group — Creating the Authenticated Shell

`app/(app)/` does NOT exist yet — this story creates it. It is the authenticated SPA shell for Epic 3 through Epic 7. The `app/protected/` folder is the untouched Supabase starter placeholder — leave it alone.

```
app/
  (app)/                     ← CREATE (this story)
    layout.tsx               ← AppNav shell + noindex metadata
    projects/
      page.tsx               ← Realm list (this story)
      [projectId]/
        workspace/
          page.tsx           ← Built in Story 5.1
  (marketing)/               ← Already exists
  protected/                 ← Supabase starter — do NOT touch
```

The route `/projects` maps to `app/(app)/projects/page.tsx`. The `(app)` prefix is invisible in the URL.

### Auth Protection — Middleware is Authoritative

`lib/supabase/proxy.ts` uses opt-out logic: any path NOT in `isPublicPath` redirects unauthenticated users to `/login`. `/projects` is not in the list → already protected. The `(app)/layout.tsx` does NOT need to duplicate redirect logic. Middleware is the authority.

### Server Actions Pattern — Exact Template

```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/actions'
import type { Tables } from '@/lib/supabase/types'

export type Project = Tables<'projects'>

export async function listProjects(): Promise<ActionResult<Project[]>> {
  const supabase = await createServerClient()  // MUST await — it's async
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}
```

Rules enforced by architecture:
- Never throw from a Server Action — always return `ActionResult`
- Always check `error` before using `data`
- `createServerClient()` is async — always `await` it
- RLS automatically scopes query to the authenticated user via the server client

### AppNav (46px) — Implementation Template

```tsx
<header className="sticky top-0 z-10 border-b border-mg-border bg-mg-background h-[46px] flex items-center">
  <div className="w-full px-4 flex items-center justify-between">
    <span className="font-mono text-xs uppercase tracking-widest text-mg-foreground">
      Midgard
    </span>
    <form action={signOut}>
      <button
        type="submit"
        className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1 hover:text-mg-foreground transition-colors"
      >
        Log out
      </button>
    </form>
  </div>
</header>
```

`signOut` is already implemented in `actions/auth.ts`. Import directly — do not re-implement.

### Button Hierarchy — One Primary Per View

From the design system:
- **Primary**: `bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity`
- **Ghost**: `border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors`

**Critical rule: one Primary button per view maximum.** The "New Realm" header button and the empty-state CTA are the same action — they must never appear simultaneously. When `realms.length === 0`, show only the empty-state Primary CTA and hide the header button. When `realms.length > 0`, show only the header "New Realm" Primary button.

Both buttons are disabled stubs in this story — Story 3.2 wires the create action.

### Design Tokens — mg-* Prefix Only

| Intent | Tailwind class | Never use |
|---|---|---|
| Page background | `bg-mg-background` | `#0A0A0A` |
| Card / surface | `bg-mg-surface` | `#111111` |
| Card hover | `bg-mg-surface-elevated` | `#1C1C1E` |
| Border | `border-mg-border` | `#27272A` |
| Primary text | `text-mg-foreground` | `#FAFAFA` |
| Muted text | `text-mg-foreground-muted` | `#A1A1AA` |
| Subtle text (dates) | `text-mg-foreground-subtle` | `#52525B` |
| Accent bg (Primary btn) | `bg-mg-accent` | `#E8D5A3` |
| Accent text (on accent) | `text-mg-background` | `#0A0A0A` |
| Error text | `text-mg-destructive` | `#EF4444` |

### Fonts — Tailwind Utilities Only

```
font-sans  → Geist Sans (loaded in app/layout.tsx via GeistSans.variable)
font-mono  → Geist Mono (loaded in app/layout.tsx via GeistMono.variable)
```

Never import fonts directly in page or layout files. Never use `font-family` inline styles.

### No `AttentionRegion` Component Yet

`AttentionRegion` is built in Story 4.1. For error states in this story, use a plain paragraph:
```tsx
<p className="font-mono text-xs text-mg-destructive mt-4">Failed to load Realms.</p>
```

### `updated_at` Has No Auto-Update Trigger

Noted in deferred work from Story 1.2: `updated_at` columns have no database-level auto-update trigger — application writes must set it explicitly. This story is read-only (`listProjects`), so no action needed here. Story 3.2 (`createProject`) and Story 3.4 (`deleteProject`) must set `updated_at: new Date().toISOString()` explicitly in their insert/upsert payloads.

### Empty State — From UX Spec

From `ux-design-specification.md` Empty States section:
- Context: `realm-empty`
- Content: `"Your first Realm awaits."` + Primary CTA

Text only. No illustrations, no icons, no decorative graphics. This is the MacCamp register — density, no ornament.

### `app/robots.ts` — Confirm Disallow List

Read `app/robots.ts` before modifying. The deferred item from Story 2.2 says to add authenticated routes to the disallow list. Current file likely already has `/projects/` and `/account/` — verify and add if missing. Do not recreate the file from scratch.

### What Story 3.2 Builds Next

Story 3.2 (`Create a Realm`) will:
1. Add `createProject(name: string): Promise<ActionResult<Project>>` to `actions/projects.ts`
2. Build the "New Realm" create flow (inline AttentionRegion or modal — TBD in that story)
3. Wire the disabled "New Realm" button from this story

Pre-stub these in `actions/projects.ts` with TODO comments so Story 3.2 knows exactly where to fill in.

### Project Structure Notes

**New files (create):**
- `app/(app)/layout.tsx` — authenticated shell, AppNav + noindex metadata
- `app/(app)/projects/page.tsx` — Realm list view
- `actions/projects.ts` — `listProjects` + stub comments

**Modified files:**
- `app/robots.ts` — confirm `/projects/` and `/account/` in disallow list (read first)

**Files to NOT touch:**
- `app/protected/` — Supabase starter; leave as-is
- `lib/supabase/proxy.ts` — auth protection already covers `/projects`
- `middleware.ts` — no changes needed
- `app/layout.tsx` — root layout is correct as-is

### References

- [Source: epics.md#Story 3.1] — Acceptance criteria
- [Source: epics.md#FR19, FR20] — Project list, scoped to user, sorted by updated_at desc
- [Source: architecture.md#Complete Project Directory Structure] — `app/(app)/projects/page.tsx` canonical path
- [Source: architecture.md#API & Communication Patterns] — Server Actions pattern, ActionResult<T>
- [Source: architecture.md#Implementation Patterns] — Naming conventions, ActionResult shape, Supabase query pattern
- [Source: ux-design-specification.md#Empty States and Loading States] — `realm-empty` content spec
- [Source: ux-design-specification.md#Button Hierarchy] — Primary/Ghost/Nano tiers, one Primary per view rule
- [Source: ux-design-specification.md#Design System Choice] — MacCamp register for authenticated workspace
- [Source: implementation-artifacts/2-2-pricing-page-and-public-route-seo.md#Dev Notes] — mg-* token table, font pattern, metadata API shape
- [Source: implementation-artifacts/deferred-work.md] — robots.ts disallow update, ThemeSwitcher removal

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers encountered._

### Completion Notes List

- Created `app/(app)/` route group — authenticated shell for all Epic 3–7 routes
- `app/(app)/layout.tsx`: AppNav with sticky 46px header, Midgard wordmark, Ghost logout button via `signOut` server action; noindex metadata exported; no ThemeSwitcher included
- `app/robots.ts`: Already had `/projects/` and `/account/` in disallow — no change needed
- `actions/projects.ts`: `listProjects()` queries `projects` ordered by `updated_at DESC`; RLS scopes to authenticated user; stubs for Story 3.2 and 3.4 added
- `app/(app)/projects/page.tsx`: Server Component; one-Primary-per-view rule enforced (header button hidden when empty state shown); error state uses plain `<p>` (no AttentionRegion yet); date formatted with `Intl.DateTimeFormat`; cards link to `/projects/[id]/workspace`
- 4.1 `pnpm tsc --noEmit` — passed, zero errors
- 4.2 `pnpm lint` — passed, zero errors
- 4.3 Dev server already running on port 3000 — no startup errors
- 4.4 Verified via curl: `GET /projects` unauthenticated → HTTP 307 → `/login`
- 4.5–4.8: Manual browser verification required — see notes below

**Manual verification needed (Jason):**
- 4.5: Log in with an account that has no Realms → confirm empty state "Your first Realm awaits." renders
- 4.6: Log in with an account that has Realms → confirm cards ordered by most recently updated first
- 4.7: Click a Realm card → confirm navigates to `/projects/[id]/workspace` (404 expected)
- 4.8: View page source on `/projects` → confirm `<meta name="robots" content="noindex">` present

### File List

- `app/(app)/layout.tsx` — created
- `app/(app)/projects/page.tsx` — created
- `actions/projects.ts` — created
- `app/robots.ts` — verified (no change needed)

## Change Log

- 2026-04-24: Implemented Story 3.1 — created `(app)/` route group, AppNav layout, `listProjects` server action, Realm list page with empty/populated states; TypeScript and lint pass; unauthenticated redirect verified; 4 manual browser checks pending Jason's sign-off

## Review Findings

- [x] [Review][Decision] Ghost logout button `py-1` vs `py-1.5` — fixed to `py-1.5`; canonical Ghost button spec wins over AppNav template [`app/(app)/layout.tsx`]
- [x] [Review][Patch] Empty-state "Create your first Realm" button missing `aria-label` — added `aria-label="Create your first Realm — available in next update"` [`app/(app)/projects/page.tsx`]
- [x] [Review][Patch] `Intl.DateTimeFormat` constructed inside `.map()` — hoisted to module-level `realmDateFormatter` constant [`app/(app)/projects/page.tsx`]
- [x] [Review][Defer] RLS-only user scoping — `listProjects` relies entirely on Postgres RLS with no application-layer auth check; intentional per spec [`actions/projects.ts`] — deferred, pre-existing architectural decision
- [x] [Review][Defer] `createServerClient` throws if Supabase env vars absent, bypassing middleware `hasEnvVars` guard [`lib/supabase/server.ts`] — deferred, pre-existing
- [x] [Review][Defer] `error.message` in `ActionResult` return could leak schema detail if called from a client component in future [`actions/projects.ts:16`] — deferred, pre-existing pattern; currently server-only and safe
- [x] [Review][Defer] `new Date(realm.created_at)` throws `RangeError` on malformed string — theoretical for Postgres timestamptz, not a realistic failure mode [`app/(app)/projects/page.tsx`] — deferred
- [x] [Review][Defer] No `not-found.tsx` or error boundary under `app/(app)/` — realm card clicks produce bare Next.js 404; workspace route expected 404 per Task 4.7 — deferred, Story 5.1 scope
- [x] [Review][Defer] Logout form has no loading/pending state — double-submit dispatches two concurrent `signOut` calls [`app/(app)/layout.tsx`] — deferred, pre-existing pattern
- [x] [Review][Defer] `(app)` layout has no server-side session guard — auth relies entirely on middleware with no defense-in-depth [`app/(app)/layout.tsx`] — deferred, pre-existing architectural decision
- [x] [Review][Defer] `select('*')` fetches all columns; only `id`, `name`, `created_at` rendered — column-specific select would break the exported `Project` type [`actions/projects.ts:12`] — deferred, out of scope
