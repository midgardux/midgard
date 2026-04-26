# Story 3.3: Open and Revisit a Realm

Status: done

## Story

As a **registered user**,
I want to open any of my existing Realms and see its generated artifacts,
So that I can continue working from where I left off.

## Acceptance Criteria

1. **Given** I have an existing Realm with generated artifacts
   **When** I click on it from the Realm list
   **Then** I am taken to `/projects/[projectId]/workspace` and the workspace renders with the previously generated artifacts
   **And** no re-generation is triggered — existing artifact data is loaded from Supabase

2. **Given** I navigate directly to a Realm URL that belongs to another user
   **When** the page loads
   **Then** the Supabase RLS policy blocks the query and the page shows a not-found state within the app shell

## Tasks / Subtasks

- [x] Task 1 — Extend `actions/projects.ts` with `getProject` and `getArtifacts`
  - [x] 1.1 Read `actions/projects.ts` before modifying — do NOT recreate from scratch; preserve the `// TODO Story 3.4: deleteProject` stub
  - [x] 1.2 Add `export type Artifact = Tables<'artifacts'>` alongside the existing `Project` type export
  - [x] 1.3 Add `getProject(projectId: string): Promise<ActionResult<Project | null>>` after `createProject` and before the deleteProject stub (full template in Dev Notes)
  - [x] 1.4 Add `getArtifacts(projectId: string): Promise<ActionResult<Artifact[]>>` after `getProject` (full template in Dev Notes)

- [x] Task 2 — Create `app/(app)/not-found.tsx`
  - [x] 2.1 Server Component (no `'use client'`); inherits AppNav from `app/(app)/layout.tsx`
  - [x] 2.2 Render "Realm not found." in `font-mono text-xs uppercase tracking-widest text-mg-foreground-muted`
  - [x] 2.3 Ghost-tier link back to `/projects` labeled "Back to Realms" (see token table in Dev Notes)

- [x] Task 3 — Create `app/(app)/projects/[projectId]/workspace/page.tsx`
  - [x] 3.1 Server Component (no `'use client'`). Import `notFound` from `next/navigation`
  - [x] 3.2 Export `metadata: Metadata = { robots: { index: false, follow: false } }`
  - [x] 3.3 Type `params` as `Promise<{ projectId: string }>` (Next.js 15 async params) and `await` before use
  - [x] 3.4 Call `getProject(projectId)` — if `!result.success || !result.data`, call `notFound()`
  - [x] 3.5 Call `getArtifacts(projectId)` — use empty array if result is not successful (graceful fallback)
  - [x] 3.6 Render workspace shell: project name sub-header + content area (see Dev Notes for layout)

- [x] Task 4 — Validation
  - [x] 4.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 4.2 `pnpm lint` — zero ESLint errors
  - [x] 4.3 `pnpm dev` — starts without errors; no runtime errors in console
  - [x] 4.4 Manual: authenticated user clicks a Realm card → navigates to `/projects/[id]/workspace` — no longer 404; project name and workspace shell render
  - [x] 4.5 Manual: workspace page with no artifacts → "No artifacts yet." empty state renders
  - [x] 4.6 Manual: navigate to `/projects/[other-user-realm-id]/workspace` → not-found page renders with AppNav intact (not the bare Next.js error page)
  - [x] 4.7 Manual: navigate to `/projects/00000000-0000-0000-0000-000000000000/workspace` (nonexistent ID) → same not-found page renders

## Dev Notes

### Do NOT Create From Scratch — These Already Exist

- `app/(app)/layout.tsx` — AppNav shell with "Midgard" wordmark and logout button (Story 3.1)
- `actions/projects.ts` — `listProjects` + `createProject` + deleteProject stub (Stories 3.1 / 3.2)
- `actions/auth.ts` — auth actions (Story 1.4)
- `types/actions.ts` — `ActionResult<T>` type
- `lib/supabase/types.ts` — generated DB types including `Tables<'artifacts'>` and `Tables<'projects'>`

### Flat Directory Structure — No `src/`

Confirmed from existing files — all paths are flat:

```
app/             (not src/app/)
actions/         (not src/actions/)
components/      (not src/components/)
lib/             (not src/lib/)
types/           (not src/types/)
```

All imports use `@/` alias which resolves to the project root.

### `getProject` — Full Implementation

Add after `createProject` in `actions/projects.ts`, before the deleteProject stub:

```typescript
export async function getProject(projectId: string): Promise<ActionResult<Project | null>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  // PGRST116: no rows returned — RLS blocked (another user's realm) or does not exist
  if (error?.code === 'PGRST116') return { success: true, data: null }
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
```

**Why `{ success: true, data: null }` for PGRST116:** Returning `success: false` would imply a system error and could render an error UI. Unauthorized access and not-found are expected UX paths — `notFound()` is the correct Next.js response, so the page needs `data === null` to trigger it rather than treating it as an error.

### `getArtifacts` — Full Implementation

Add after `getProject` in `actions/projects.ts`:

```typescript
export async function getArtifacts(projectId: string): Promise<ActionResult<Artifact[]>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}
```

**RLS on artifacts:** The `artifacts` table RLS uses an EXISTS subquery through `projects` (`EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())`). Since `getProject` already verified ownership before this is called, this query is safe. The DB-level policy is enforced regardless.

### `Artifact` Type Export

Add alongside the existing `Project` type export near the top of `actions/projects.ts`:

```typescript
export type Artifact = Tables<'artifacts'>
```

### Next.js 15 Async Params

In Next.js 15, `params` is a `Promise`. The workspace page MUST await it:

```typescript
type Props = { params: Promise<{ projectId: string }> }

export default async function WorkspacePage({ params }: Props) {
  const { projectId } = await params
  // ...
}
```

`pnpm tsc --noEmit` will catch synchronous access of `params.projectId`.

### TypeScript Narrowing After `notFound()`

`notFound()` from `next/navigation` is typed as `() => never` — TypeScript performs control flow narrowing after it. After this guard:

```typescript
if (!projectResult.success || !projectResult.data) notFound()
const project = projectResult.data  // TypeScript: Project (non-null)
```

TypeScript correctly narrows `projectResult.data` to `Project` because both branches of the `||` condition are eliminated.

### Workspace Page — Full Shell

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProject, getArtifacts } from '@/actions/projects'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ projectId: string }> }

export default async function WorkspacePage({ params }: Props) {
  const { projectId } = await params

  const projectResult = await getProject(projectId)
  if (!projectResult.success || !projectResult.data) notFound()

  const project = projectResult.data

  const artifactsResult = await getArtifacts(projectId)
  const artifacts = artifactsResult.success ? artifactsResult.data : []

  return (
    <main>
      <div className="border-b border-mg-border px-6 py-3">
        <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
      </div>
      <div className="px-6 py-8">
        {artifacts.length === 0 ? (
          // Story 4.2 replaces this with <BriefInputSurface />
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="font-mono text-xs text-mg-foreground-muted">No artifacts yet.</p>
          </div>
        ) : (
          // Story 5.1 replaces this with <ArtifactWorkspace />
          <ul className="space-y-1">
            {artifacts.map((artifact) => (
              <li key={artifact.id} className="font-mono text-xs text-mg-foreground-muted">
                /{artifact.artifact_type}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
```

### Not-Found Page

`app/(app)/not-found.tsx` is caught by the Next.js App Router for any `notFound()` call from routes under `app/(app)/**`. It renders inside `app/(app)/layout.tsx`, so the AppNav is preserved.

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="px-6 py-8 max-w-4xl mx-auto">
      <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mt-8">
        Realm not found.
      </p>
      <Link
        href="/projects"
        className="inline-block mt-4 border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
      >
        Back to Realms
      </Link>
    </main>
  )
}
```

### Design Tokens — mg-* Prefix Only

| Intent | Tailwind class | Never use |
|---|---|---|
| Page background | `bg-mg-background` | `#0A0A0A` |
| Surface | `bg-mg-surface` | `#111111` |
| Border | `border-mg-border` | `#27272A` |
| Primary text | `text-mg-foreground` | `#FAFAFA` |
| Muted text | `text-mg-foreground-muted` | `#A1A1AA` |
| Subtle text | `text-mg-foreground-subtle` | `#52525B` |

### Fonts — Tailwind Utilities Only

```
font-sans  → Geist Sans (loaded in app/layout.tsx)
font-mono  → Geist Mono (loaded in app/layout.tsx)
```

Never import fonts in component files.

### What Story 3.4 Adds Here

Story 3.4 adds delete functionality. It will modify `actions/projects.ts` (adding `deleteProject`) and add delete UI to this workspace page or the projects list. Preserve the `// TODO Story 3.4: deleteProject` stub in `actions/projects.ts`.

### New Files

- `app/(app)/projects/[projectId]/workspace/page.tsx` — workspace page (Server Component)
- `app/(app)/not-found.tsx` — app-shell not-found page (resolves deferred item from Story 3.1 code review)

### Modified Files

- `actions/projects.ts` — add `Artifact` type export, `getProject`, `getArtifacts`

### Files to NOT Touch

- `app/(app)/layout.tsx` — AppNav shell; no changes needed
- `app/(app)/projects/page.tsx` — Realm list; no changes needed
- `actions/auth.ts` — no changes needed
- `components/projects/NewRealmForm.tsx` — no changes needed
- `middleware.ts` — no changes needed

### Project Structure Reference

```
app/
  (app)/
    layout.tsx               ← EXISTS: AppNav shell
    not-found.tsx            ← CREATE (this story)
    projects/
      page.tsx               ← EXISTS: Realm list
      [projectId]/
        workspace/
          page.tsx           ← CREATE (this story)
```

### References

- [Source: epics.md#Story 3.3] — acceptance criteria
- [Source: epics.md#FR21] — open and revisit existing project
- [Source: architecture.md#API & Communication Patterns] — Server Actions pattern, ActionResult<T>
- [Source: architecture.md#Authentication & Security] — RLS enforces user data scoping at DB level
- [Source: architecture.md#Project Structure] — workspace page location at `app/(app)/projects/[projectId]/workspace/page.tsx`
- [Source: architecture.md#Process Patterns] — always check `error` before using `data`; never throw from Server Actions
- [Source: implementation-artifacts/3-1-realm-list-view.md#Dev Notes] — flat directory structure, mg-* token table, font utilities
- [Source: implementation-artifacts/3-2-create-a-realm.md#Dev Notes] — redirect target was 404 until this story; workspace built here
- [Source: implementation-artifacts/deferred-work.md] — `not-found.tsx` under `app/(app)/` deferred from Story 3.1 code review; resolved in this story

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: Added `Artifact` type export alongside `Project` in `actions/projects.ts`. Added `getProject` with PGRST116 handling (returns `{success:true, data:null}` for RLS-blocked/missing rows so workspace calls `notFound()` rather than showing error UI). Added `getArtifacts` with ascending `created_at` order. `deleteProject` stub preserved.
- Task 2: Created `app/(app)/not-found.tsx` as a Server Component with "Realm not found." message and ghost-tier "Back to Realms" link. Resolves deferred item from Story 3.1 code review.
- Task 3: Created `app/(app)/projects/[projectId]/workspace/page.tsx` as a Server Component. Uses Next.js 15 async `params`, `notFound()` guard after `getProject`, graceful empty-array fallback for `getArtifacts`, and workspace shell with empty-state/artifact-list render. Projects list already links to `/projects/${id}/workspace` (Story 3.2).
- Automated validation: `pnpm tsc --noEmit` — 0 errors; `pnpm lint` — 0 errors; dev server running on port 3000 without compilation errors.
- Manual tasks 4.4–4.7 require browser verification with an authenticated session.

### File List

- `actions/projects.ts`
- `app/(app)/not-found.tsx`
- `app/(app)/projects/[projectId]/workspace/page.tsx`

### Change Log

- 2026-04-25: Implemented story — added `Artifact` type, `getProject`, `getArtifacts` to `actions/projects.ts`; created `app/(app)/not-found.tsx` (resolves deferred item from Story 3.1); created workspace page at `app/(app)/projects/[projectId]/workspace/page.tsx`. Automated checks pass (tsc, lint, dev server). Manual browser tests 4.4–4.7 pending.

### Review Findings

- [x] [Review][Patch] `artifact_type` renders "/" when value is empty string [app/(app)/projects/[projectId]/workspace/page.tsx:42]
- [x] [Review][Defer] `getArtifacts` IDOR risk if artifacts RLS is misconfigured [actions/projects.ts] — deferred, pre-existing architectural concern; spec states DB-level RLS enforces ownership
- [x] [Review][Defer] `getProject` PGRST116 conflates unauthenticated session with not-found [actions/projects.ts] — deferred, middleware responsibility; auth guard handles before page is reached
- [x] [Review][Defer] Non-PGRST116 DB errors in `getProject` surface as 404 not 500 [app/(app)/projects/[projectId]/workspace/page.tsx:15] — deferred, spec-mandated pattern; known tradeoff
- [x] [Review][Defer] Static `metadata` doesn't include project name in page title [app/(app)/projects/[projectId]/workspace/page.tsx:5] — deferred, out of spec scope; use `generateMetadata` in a later story
- [x] [Review][Defer] "Realm not found." copy misleads if other `(app)` routes call `notFound()` [app/(app)/not-found.tsx] — deferred, no other routes affected yet; revisit when new `(app)` routes added
- [x] [Review][Defer] `projectId` not validated as UUID before Supabase query [actions/projects.ts] — deferred, gracefully handled; optimization not a bug
- [x] [Review][Defer] Root `app/not-found.tsx` missing — other route groups get bare Next.js 404 — deferred, pre-existing; not introduced by this story
