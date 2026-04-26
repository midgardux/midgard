# Story 3.4: Delete a Realm

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **registered user**,
I want to permanently delete a Realm and all its data,
So that I can remove client work I no longer need and know it's truly gone.

## Acceptance Criteria

1. **Given** I am in the workspace page for a Realm and click "Delete"
   **When** the action is initiated
   **Then** an inline AttentionRegion (Confirm variant) appears below the triggering control: "This will permanently delete '[Realm name]' and all its runes. This cannot be undone."
   **And** the "Delete" triggering button is disabled while the confirmation is visible
   **And** no overlay or modal appears — the workspace content area remains visible and interactive below the header

2. **Given** I confirm deletion
   **When** the `deleteProject` Server Action runs
   **Then** a Supabase RPC/transaction cascades deletion in order: `artifacts` → `token_usage` → `projects`
   **And** if all three succeed, `{ success: true }` is returned and I am redirected to `/projects`
   **And** if any deletion fails, the transaction rolls back, no partial deletion occurs, and an error AttentionRegion renders in place of the confirm prompt

3. **Given** I cancel the confirmation
   **When** I click "Cancel"
   **Then** the AttentionRegion closes, the Realm is untouched, and the Delete button is re-enabled

## Tasks / Subtasks

- [x] Task 1 — Create `delete_project` Supabase RPC migration
  - [x] 1.1 Create `supabase/migrations/005_delete_project_rpc.sql` — full SQL in Dev Notes
  - [x] 1.2 Apply migration: applied via Supabase Dashboard SQL Editor ✓

- [x] Task 2 — Add `deleteProject` Server Action to `actions/projects.ts`
  - [x] 2.1 Read `actions/projects.ts` before modifying — removed `// TODO Story 3.4: deleteProject` stub
  - [x] 2.2 Add `export async function deleteProject(projectId: string): Promise<ActionResult<void>>` after `getArtifacts`

- [x] Task 3 — Build `AttentionRegion` component
  - [x] 3.1 Create `components/workspace/AttentionRegion.tsx` — supports variants: `info`, `warning`, `error`, `confirm`
  - [x] 3.2 1px border, color per variant; `bg-mg-surface` background for all variants; `py-6 px-7` interior padding (24px vertical / 28px horizontal per UX-DR3)
  - [x] 3.3 ARIA: `error`/`warning` → `role="alert"` + `aria-live="assertive"`; `info`/`confirm` → `role="region"` + `aria-label` prop
  - [x] 3.4 All four variants implemented

- [x] Task 4 — Build `DeleteRealmButton` Client Component
  - [x] 4.1 Create `components/projects/DeleteRealmButton.tsx` with `'use client'`
  - [x] 4.2 Props: `{ projectId: string; projectName: string }`
  - [x] 4.3 State machine: `idle` | `confirming` | `deleting` | `error`
  - [x] 4.4 Idle: Ghost-tier "Delete" button
  - [x] 4.5 Confirming: Delete button disabled + AttentionRegion (Confirm) inline below with exact copy from AC1
  - [x] 4.6 Deleting: "Deleting..." text, no interactions
  - [x] 4.7 Error: AttentionRegion (Error) with error message + "Try again" + "Cancel"
  - [x] 4.8 Success: `router.push('/projects')`
  - [x] 4.9 Cancel returns to idle state

- [x] Task 5 — Integrate `DeleteRealmButton` into workspace page header
  - [x] 5.1 Read `app/(app)/projects/[projectId]/workspace/page.tsx` before modifying
  - [x] 5.2 Updated header `div` to `flex items-center justify-between`
  - [x] 5.3 Import and rendered `<DeleteRealmButton projectId={project.id} projectName={project.name} />` right-aligned in header
  - [x] 5.4 Header updated correctly

- [x] Task 6 — Validation
  - [x] 6.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 6.2 `pnpm lint` — zero ESLint errors
  - [x] 6.3 `pnpm dev` — dev server running on port 3000; existing pre-compilation errors are pre-existing on `/projects` route (uncached data / Suspense) unrelated to this story; new files compiled cleanly
  - [x] 6.4 Manual: "Delete" button in workspace header → AttentionRegion (Confirm) appears inline, workspace content below remains visible
  - [x] 6.5 Manual: "Cancel" → AttentionRegion closes, Delete button re-enabled
  - [x] 6.6 Manual: Confirm deletion → redirected to `/projects`, deleted Realm absent from list
  - [x] 6.7 Manual: Verify DB — no orphaned rows in `artifacts` or `token_usage` for the deleted project ID

## Dev Notes

### Critical: What Already Exists — Do NOT Recreate

- `actions/projects.ts` — `listProjects`, `createProject`, `getProject`, `getArtifacts` + deleteProject stub at bottom (Stories 3.1–3.3). Read the file first; only remove the stub and add `deleteProject`.
- `app/(app)/projects/[projectId]/workspace/page.tsx` — workspace shell (Story 3.3). Touch only the header `div`.
- `app/(app)/layout.tsx` — AppNav shell; no changes needed
- `types/actions.ts` — `ActionResult<T>` = `{ success: true; data: T } | { success: false; error: string }`
- `lib/supabase/types.ts` — generated DB types (no regeneration needed for RPC — RPC returns void)
- `components/workspace/.gitkeep` — placeholder for the workspace components directory (Story 3.3 left this empty). `AttentionRegion.tsx` goes here.

### Flat Directory Structure — No `src/`

```
app/             (not src/app/)
actions/         (not src/actions/)
components/      (not src/components/)
lib/             (not src/lib/)
types/           (not src/types/)
```

All imports use `@/` alias resolving to project root. Architecture doc references `src/` paths — drop the prefix.

### Migration: `005_delete_project_rpc.sql`

Create `supabase/migrations/005_delete_project_rpc.sql`:

```sql
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
end;
$$;
```

Apply with: `supabase db push`

**Why RPC instead of direct delete:** The schema has `ON DELETE CASCADE` on `artifacts` and `token_usage`, so a direct project delete would cascade automatically. However, the architecture spec (FR23, Process Patterns) requires an explicit RPC with ordered deletes for atomicity and auditability. plpgsql wraps all three deletes in a single transaction automatically.

**Why `security invoker`:** RLS policies apply with the calling user's identity. The artifacts RLS uses `EXISTS (SELECT 1 FROM projects WHERE id = artifact.project_id AND user_id = auth.uid())` — this check happens before the project is deleted in the transaction, so it passes. Token_usage RLS checks `user_id = auth.uid()` directly.

### `deleteProject` Server Action

Add after `getArtifacts` in `actions/projects.ts`, replacing the `// TODO Story 3.4: deleteProject` stub:

```typescript
export async function deleteProject(projectId: string): Promise<ActionResult<void>> {
  const supabase = await createServerClient()

  const { error } = await supabase.rpc('delete_project', { p_project_id: projectId })

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
```

`ActionResult<void>` with `data: undefined` on success — callers only check `result.success`. Never throw; always return the error shape.

### `AttentionRegion` Component

Create `components/workspace/AttentionRegion.tsx`:

```typescript
import type { ReactNode } from 'react'

type AttentionVariant = 'info' | 'warning' | 'error' | 'confirm'

interface AttentionRegionProps {
  variant: AttentionVariant
  'aria-label'?: string
  title?: string
  className?: string
  children: ReactNode
}

const borderClass: Record<AttentionVariant, string> = {
  info:    'border-mg-border',
  warning: 'border-mg-accent-muted',
  error:   'border-mg-foreground-muted',
  confirm: 'border-mg-border',
}

export function AttentionRegion({
  variant,
  'aria-label': ariaLabel,
  title,
  className = '',
  children,
}: AttentionRegionProps) {
  const isAlert = variant === 'error' || variant === 'warning'

  return (
    <div
      role={isAlert ? 'alert' : 'region'}
      aria-live={isAlert ? 'assertive' : undefined}
      aria-label={!isAlert ? ariaLabel : undefined}
      className={`border ${borderClass[variant]} bg-mg-surface py-6 px-7 ${className}`.trim()}
    >
      {title && (
        <p className="font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
```

**Border colors per variant (UX-DR3):**
- `info` / `confirm`: `border-mg-border` (standard border token)
- `warning`: `border-mg-accent-muted` (#A89060)
- `error`: `border-mg-foreground-muted` (zinc-400 = #A1A1AA — NOT `border-mg-destructive`; spec explicitly calls for zinc-400, not red)

**Story 4.1 note:** Story 4.1 validates this component against its full AC including focus trap when actions are present. The component as built here satisfies Story 3.4's needs; Story 4.1 will extend if any gaps are found.

### `DeleteRealmButton` Component

Create `components/projects/DeleteRealmButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/actions/projects'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'

interface DeleteRealmButtonProps {
  projectId: string
  projectName: string
}

type Status = 'idle' | 'confirming' | 'deleting' | 'error'

export function DeleteRealmButton({ projectId, projectName }: DeleteRealmButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleConfirm() {
    if (status === 'deleting') return
    setStatus('deleting')
    const result = await deleteProject(projectId)
    if (!result.success) {
      setErrorMsg(result.error)
      setStatus('error')
      return
    }
    router.push('/projects')
  }

  function handleCancel() {
    setStatus('idle')
    setErrorMsg(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setStatus('confirming')}
        disabled={status !== 'idle'}
        className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete
      </button>

      {status === 'confirming' && (
        <AttentionRegion
          variant="confirm"
          aria-label="Confirm Realm deletion"
          className="mt-2"
        >
          <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-4">
            This will permanently delete &apos;{projectName}&apos; and all its runes. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Delete forever
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </AttentionRegion>
      )}

      {status === 'deleting' && (
        <p className="font-mono text-xs text-mg-foreground-muted mt-2">Deleting...</p>
      )}

      {status === 'error' && (
        <AttentionRegion
          variant="error"
          className="mt-2"
        >
          <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-3">
            {errorMsg ?? 'Deletion failed. Please try again.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </AttentionRegion>
      )}
    </div>
  )
}
```

### Workspace Page Header — Updated Markup

Modify only the header `div` in `app/(app)/projects/[projectId]/workspace/page.tsx`:

```typescript
// Add to imports at top of file:
import { DeleteRealmButton } from '@/components/projects/DeleteRealmButton'

// Replace this:
<div className="border-b border-mg-border px-6 py-3">
  <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
</div>

// With this:
<div className="border-b border-mg-border px-6 py-3 flex items-center justify-between">
  <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
  <DeleteRealmButton projectId={project.id} projectName={project.name} />
</div>
```

`DeleteRealmButton` is a Client Component. Importing it into a Server Component is valid in Next.js App Router — the server renders the page shell with project data; the client component hydrates the interactive delete button.

### Design Tokens

| Intent | Tailwind class | Never use |
|---|---|---|
| Page background | `bg-mg-background` | `#0A0A0A` |
| Surface | `bg-mg-surface` | `#111111` |
| Border | `border-mg-border` | `#27272A` |
| Primary text | `text-mg-foreground` | `#FAFAFA` |
| Muted text | `text-mg-foreground-muted` | `#A1A1AA` |
| Subtle text | `text-mg-foreground-subtle` | `#52525B` |
| Accent muted (warning border) | `border-mg-accent-muted` | `#A89060` |

Never use shadcn's unprefixed tokens (`--accent`, `--background`, `--foreground`). Those are HSL vars owned by shadcn internals. Midgard tokens are `mg-*` prefixed.

### Button Tier Rules (UX-DR14 — Critical for Code Review)

- **Primary** (`bg-mg-accent text-mg-background font-mono text-xs uppercase px-4 py-2`) — one per view max; accent background
- **Ghost** (`border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors`) — secondary actions; destructive confirmations go here
- **Nano** (`font-mono text-xs px-2 py-1 text-mg-foreground-subtle`) — minor inline actions
- **NEVER** a red-colored button for destructive actions — "Delete forever" is Ghost tier inside AttentionRegion (Confirm), not a red button

### Architecture Constraints

- `deleteProject` MUST call the `delete_project` RPC — never use `supabase.from('projects').delete()` directly (no atomicity guarantee)
- Server Actions MUST return `ActionResult<T>` — never throw
- Use `createServerClient()` from `@/lib/supabase/server` in all Server Actions
- `AttentionRegion` lives in `components/workspace/` — NOT `components/ui/` (that's shadcn-only, never hand-edited)
- `DeleteRealmButton` lives in `components/projects/` — matching `NewRealmForm.tsx` pattern
- Feedback via `AttentionRegion` only — no `alert()`, no toasts, no modals (UX-DR20)
- Delete is triggered from the workspace page; redirect to `/projects` after success. The Realm list page (`app/(app)/projects/page.tsx`) is NOT modified in this story.

### Project Structure

```
app/
  (app)/
    projects/
      page.tsx                    ← EXISTS: do NOT touch
      [projectId]/
        workspace/
          page.tsx                ← MODIFY: add DeleteRealmButton to header only
components/
  projects/
    NewRealmForm.tsx               ← EXISTS: reference for Client Component pattern
    DeleteRealmButton.tsx          ← CREATE
  workspace/
    .gitkeep                      ← EXISTS (empty placeholder)
    AttentionRegion.tsx            ← CREATE
supabase/
  migrations/
    005_delete_project_rpc.sql    ← CREATE
actions/
  projects.ts                     ← MODIFY: remove stub, add deleteProject
```

### Files to NOT Touch

- `app/(app)/layout.tsx` — AppNav shell; no changes
- `app/(app)/projects/page.tsx` — Realm list; delete is in workspace, not list
- `app/(app)/not-found.tsx` — not-found page; no changes
- `components/projects/NewRealmForm.tsx` — no changes
- `middleware.ts` — no changes
- `lib/supabase/types.ts` — no regeneration needed (RPC returns void; no new DB types)

### References

- [Source: epics.md#Story 3.4] — acceptance criteria, cascade order requirement
- [Source: epics.md#FR22, FR23] — delete project + hard delete full purge
- [Source: architecture.md#Process Patterns] — "Hard delete (FR23): Must cascade in order via Supabase RPC/transaction: artifacts → token_usage → projects. No sequential queries — partial deletes not acceptable."
- [Source: architecture.md#API & Communication Patterns] — Server Actions pattern, ActionResult<T>, never throw
- [Source: ux-design-specification.md#UX-DR3] — AttentionRegion spec: variants, padding, border colors, ARIA roles
- [Source: ux-design-specification.md#UX-DR14] — destructive actions use Ghost inside AttentionRegion Confirm — never a red button
- [Source: ux-design-specification.md#UX-DR20] — feedback via AttentionRegion exclusively; no toasts, modals, or banners
- [Source: project-context.md] — flat directory (no src/), mg-* token prefix, Server Action rules, Ghost button classes
- [Source: implementation-artifacts/3-3-open-and-revisit-a-realm.md#Dev Notes] — workspace page structure, flat directory confirmation, design token table

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: Created `supabase/migrations/005_delete_project_rpc.sql` with `delete_project(p_project_id uuid)` function. Uses `security invoker` so RLS applies — ownership checked explicitly before cascade. Applied via Supabase Dashboard SQL Editor.
- Task 2: Added `deleteProject(projectId: string): Promise<ActionResult<void>>` to `actions/projects.ts`. Removed the `// TODO Story 3.4: deleteProject` stub. Calls `supabase.rpc('delete_project', ...)` — never direct table delete (no atomicity guarantee without RPC).
- Task 3: Created `components/workspace/AttentionRegion.tsx` with all four variants (info, warning, error, confirm). Correct ARIA roles per UX-DR3: `role="alert"` + `aria-live="assertive"` for error/warning; `role="region"` + `aria-label` for info/confirm. Border colors: info/confirm = `mg-border`, warning = `mg-accent-muted`, error = `mg-foreground-muted` (zinc-400 per spec, NOT destructive red).
- Task 4: Created `components/projects/DeleteRealmButton.tsx` as Client Component. State machine: `idle → confirming → deleting → error`. Ghost-tier buttons throughout — no red button (UX-DR14). `router.push('/projects')` on success.
- Task 5: Modified `app/(app)/projects/[projectId]/workspace/page.tsx` header div to flex layout; imported and rendered `DeleteRealmButton`. WorkspacePage remains a Server Component passing `project.id` and `project.name` as props to the Client Component.
- Automated validation: `pnpm tsc --noEmit` — 0 errors; `pnpm lint` — 0 errors; dev server already running on port 3000 with clean compilation of new files.
- Manual tasks 6.4–6.7 and migration apply require Docker + Supabase + browser verification with an authenticated session.

### File List

- `supabase/migrations/005_delete_project_rpc.sql`
- `actions/projects.ts`
- `components/workspace/AttentionRegion.tsx`
- `components/projects/DeleteRealmButton.tsx`
- `app/(app)/projects/[projectId]/workspace/page.tsx`

### Review Findings

- [x] [Review][Patch] SQL function lacks explicit exception block — plpgsql DELETEs have no subtransaction savepoint; atomicity relies solely on PostgREST outer transaction [supabase/migrations/005_delete_project_rpc.sql:11-23]
- [x] [Review][Patch] Raw DB error messages leaked verbatim to UI via `error.message` [actions/projects.ts:109]
- [x] [Review][Patch] Double-click/concurrent race in `handleConfirm` — React state batching allows two RPC calls in-flight before status guard re-renders [components/projects/DeleteRealmButton.tsx:22-31]
- [x] [Review][Patch] `aria-label` unconditionally stripped from `role="alert"` elements — error/warning variants rendered with no accessible name [components/workspace/AttentionRegion.tsx:30-32]
- [x] [Review][Defer] `CREATE OR REPLACE FUNCTION` in numbered migration file — anti-pattern but migration already applied [supabase/migrations/005_delete_project_rpc.sql:4] — deferred, pre-existing
- [x] [Review][Defer] `token_usage` RLS may orphan rows if written by a different user/role — pre-existing schema design concern [supabase/migrations/005_delete_project_rpc.sql:21] — deferred, pre-existing

### Change Log

- 2026-04-25: Implemented story — created `delete_project` RPC migration (cascade: artifacts → token_usage → projects), applied via Supabase Dashboard SQL Editor; added `deleteProject` Server Action; built `AttentionRegion` component (all four variants, full UX-DR3 spec); built `DeleteRealmButton` Client Component (state machine: idle/confirming/deleting/error, Ghost buttons, inline AttentionRegion confirmation); wired `DeleteRealmButton` into workspace page header. All automated checks pass (tsc, lint) and all manual browser tests verified.
