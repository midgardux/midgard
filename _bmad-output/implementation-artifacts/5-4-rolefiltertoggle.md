# Story 5.4: RoleFilterToggle

Status: done

## Story

As a **solo designer**,
I want to filter the artifact workspace by user role,
so that I can see which content is relevant to a specific role without re-running analysis.

## Acceptance Criteria

1. **Given** the artifact workspace is active
   **When** `RoleFilterToggle` renders at the top of the index panel
   **Then** role chips are shown for "All roles" plus each role extracted from the artifact data
   **And** "All roles" is active by default (accent border + accent-surface bg + accent text)
   **And** inactive chips show `border` token border and `fg-subtle` text

2. **Given** I click a role chip
   **When** the chip is activated
   **Then** artifact sections not tagged for that role are hidden in `ArtifactContent` — no network request, no loading state
   **And** the filter state persists as I navigate between artifact types in the same session
   **And** each chip uses `role="checkbox"` + `aria-checked` for screen reader compatibility

3. **Given** the active role filter produces no visible sections
   **When** `ArtifactContent` renders
   **Then** an empty state shows: "No sections match this role." with a Ghost button to clear the filter

## Tasks / Subtasks

- [x] Task 1 — Implement `RoleFilterToggle` (AC: #1, #2)
  - [x] 1.1 Add imports: `useMemo`, `useEffect` from `'react'`; `useWorkspaceStore` from `'@/stores/workspace'`; `type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'`; keep existing `import type { Artifact } from '@/actions/projects'` and `import { cn } from '@/lib/utils'`
  - [x] 1.2 In component body, read from store:
    ```typescript
    const activeRole = useWorkspaceStore((s) => s.activeRole)
    const setActiveRole = useWorkspaceStore((s) => s.setActiveRole)
    ```
  - [x] 1.3 Extract unique roles with `useMemo` — aggregate across ALL artifacts so chips are stable during navigation:
    ```typescript
    const allRoles = useMemo(() => {
      const roleSet = new Set<string>()
      artifacts.forEach((artifact) => {
        const content = artifact.content as ArtifactContentData | undefined
        content?.sections?.forEach((section) => {
          section.roles?.forEach((role) => roleSet.add(role))
        })
      })
      return Array.from(roleSet).sort()
    }, [artifacts])
    ```
  - [x] 1.4 Reset filter on realm change — fires when `artifacts` reference changes (TanStack Query returns fresh array on new `projectId`):
    ```typescript
    useEffect(() => { setActiveRole(null) }, [artifacts, setActiveRole])
    ```
  - [x] 1.5 Return JSX wrapper: `<div className={cn('px-3 py-2 flex flex-wrap gap-1.5', className)}>`
  - [x] 1.6 Render "All roles" chip inside wrapper:
    ```tsx
    <button
      type="button"
      role="checkbox"
      aria-checked={activeRole === null}
      onClick={() => setActiveRole(null)}
      className={cn(
        'font-mono text-[11px] px-2 py-0.5 border rounded cursor-pointer transition-colors',
        activeRole === null
          ? 'border-mg-accent bg-mg-accent-surface text-mg-accent'
          : 'border-mg-border text-mg-foreground-subtle hover:border-mg-muted hover:text-mg-foreground-muted'
      )}
    >
      All roles
    </button>
    ```
  - [x] 1.7 Render one chip per entry in `allRoles` — clicking an already-active chip deactivates it (returns to "All roles"):
    ```tsx
    {allRoles.map((role) => (
      <button
        key={role}
        type="button"
        role="checkbox"
        aria-checked={activeRole === role}
        onClick={() => setActiveRole(activeRole === role ? null : role)}
        className={cn(
          'font-mono text-[11px] px-2 py-0.5 border rounded cursor-pointer transition-colors',
          activeRole === role
            ? 'border-mg-accent bg-mg-accent-surface text-mg-accent'
            : 'border-mg-border text-mg-foreground-subtle hover:border-mg-muted hover:text-mg-foreground-muted'
        )}
      >
        {role}
      </button>
    ))}
    ```
  - [x] 1.8 When `allRoles` is empty (no roles in artifact data), only the "All roles" chip renders — no special empty/null state needed

- [x] Task 2 — Add role filtering to `ArtifactContent.tsx` (AC: #2, #3)
  - [x] 2.1 Add `setActiveRole` selector alongside the existing `activeRole` read (Story 5.3 left both for this story):
    ```typescript
    const activeRole = useWorkspaceStore((s) => s.activeRole)
    const setActiveRole = useWorkspaceStore((s) => s.setActiveRole)
    ```
  - [x] 2.2 Add import: `MidgardButton` from `'@/components/workspace/MidgardButton'`
  - [x] 2.3 After deriving `artifactData`, compute `visibleSections`:
    ```typescript
    const visibleSections = activeRole
      ? artifactData.sections.filter((s) => s.roles.includes(activeRole))
      : artifactData.sections
    ```
    Place this after the early-return null guard (after the `if (!artifact || !artifactData)` block).
  - [x] 2.4 Replace `artifactData.sections.map(...)` with `visibleSections.map(...)` in the existing section list
  - [x] 2.5 Wrap the section area in a conditional — when `visibleSections.length === 0`, show empty state instead of the section list:
    ```tsx
    {visibleSections.length === 0 ? (
      <div className="px-[28px] py-[22px] flex flex-col gap-3">
        <p className="font-mono text-[11px] text-mg-foreground-subtle">No sections match this role.</p>
        <MidgardButton tier="ghost" onClick={() => setActiveRole(null)}>Clear filter</MidgardButton>
      </div>
    ) : (
      <div>
        {visibleSections.map((section) => (
          <ArtifactSection
            key={section.id}
            section={section}
            pending={!section.body}
          />
        ))}
      </div>
    )}
    ```
  - [x] 2.6 ContentHeader is unchanged — it stays sticky and visible even when empty state is shown

- [x] Task 3 — Validation (AC: all)
  - [x] 3.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 3.2 `pnpm lint` — zero ESLint errors
  - [ ] 3.3 Manual (Jason verifies): Role chips render above artifact entries; "All roles" chip shows accent border + accent-surface bg + accent text; inactive chips show border + fg-subtle text
  - [ ] 3.4 Manual (Jason verifies): Click a role chip → only sections tagged for that role appear; switch artifact type (e.g. /flows → /personas) → same role filter is still active
  - [ ] 3.5 Manual (Jason verifies): Click "All roles" → all sections reappear; click an active role chip → deactivates (returns to All roles state)
  - [ ] 3.6 Manual (Jason verifies): Select a role that no section is tagged for → empty state "No sections match this role." shows with Ghost "Clear filter" button; clicking it restores all sections

## Dev Notes

### What This Story Builds

`RoleFilterToggle.tsx` at `components/workspace/RoleFilterToggle.tsx` is a placeholder stub from Story 5.2. This story replaces it with the full implementation. It also wires role-filtering into `ArtifactContent.tsx` — Story 5.3 explicitly deferred all `activeRole` reads and filtering logic to this story.

No Zustand store changes needed. `activeRole: string | null` and `setActiveRole` already exist in `useWorkspaceStore`.

### activeRole Is Single-Select (string | null)

The store uses `activeRole: string | null`. This story implements **single-role selection**: one role active at a time, or `null` for "All roles". The UX spec mentions additive/multiple-role filtering as a future direction — V1 is single-select per the existing store shape. Do NOT change the store to `string[]`.

### Role Extraction — Aggregate Across All Artifacts

Extract roles from ALL artifacts (not just the active one) so the chip set stays stable when the user navigates between artifact types. Use the same `Json` → `ArtifactContentData` cast pattern established in Story 5.3:
```typescript
const content = artifact.content as ArtifactContentData | undefined
```
Optional chaining (`?.`) on `sections` and `roles` is defensive against malformed content — the actual DB values are always well-formed, but the cast leaves them as `unknown` shape.

### Reset on Realm Change

TanStack Query keys include `projectId` (`['artifacts', projectId]`). When the user opens a different Realm, the query key changes and a fresh `artifacts` array is returned — new object reference. The `useEffect` dependency on `artifacts` fires and calls `setActiveRole(null)`. `setActiveRole` is a stable Zustand action reference; including it in deps satisfies ESLint without causing loops.

### Chip Toggle Behavior

Clicking an already-active role chip deactivates it (returns to "All roles"):
```typescript
onClick={() => setActiveRole(activeRole === role ? null : role)}
```
"All roles" chip always calls `setActiveRole(null)` — no toggle needed since it IS the null state.

### Empty State Location in ArtifactContent

The empty state renders AFTER the sticky ContentHeader so the header stays visible. The component return structure:
```tsx
<div>
  <div className="sticky top-0 z-10 ...">ContentHeader</div>
  {visibleSections.length === 0 ? <EmptyState /> : <SectionList />}
</div>
```

### MidgardButton Tiers

`MidgardButton` (`components/workspace/MidgardButton.tsx`) has three tiers:
- `ghost` — `border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5` → **use for "Clear filter"**
- `nano` — borderless 11px mono (used by `SectionRegenerateControl`)
- `primary` — accent bg (for primary CTAs)

Use `<MidgardButton tier="ghost" onClick={() => setActiveRole(null)}>Clear filter</MidgardButton>` for the empty state button.

### Role Chips Are NOT MidgardButton

Role chips need `role="checkbox"` + `aria-checked` and custom active/inactive/hover styling. MidgardButton does not expose these ARIA attributes. Build chips as plain `<button>` elements.

### Design Token Reference

| Element | Tailwind classes |
|---------|----------------|
| Chip active | `border-mg-accent bg-mg-accent-surface text-mg-accent` |
| Chip inactive | `border-mg-border text-mg-foreground-subtle` |
| Chip hover (inactive only) | `hover:border-mg-muted hover:text-mg-foreground-muted` |
| Chip typography | `font-mono text-[11px]` |
| Chip padding | `px-2 py-0.5` |
| Chip shape | `border rounded` |
| Empty state text | `font-mono text-[11px] text-mg-foreground-subtle` |

### Import Alias — ArtifactContent Type

In `RoleFilterToggle.tsx`, import the type with alias to avoid future collisions if the component is ever co-located with the type:
```typescript
import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'
```
In `ArtifactContent.tsx` this alias already exists from Story 5.3 — do not change it.

### Files Changed

- `components/workspace/RoleFilterToggle.tsx` — REPLACE stub (Task 1)
- `components/workspace/ArtifactContent.tsx` — ADD role filtering (Task 2)

### No Other Files Changed

- `ArtifactIndexPanel.tsx` — already renders `<RoleFilterToggle artifacts={artifacts} />`; do not touch
- `stores/workspace.ts` — `activeRole` and `setActiveRole` already exist; do not touch
- `types/artifacts.ts` — `ArtifactSection.roles: string[]` already defined; do not touch
- No Server Actions, no Supabase migrations, no new DB queries

### Anti-Patterns to Avoid

- **Do not** change `activeRole` store type to `string[]` — V1 is single-select, store is `string | null`
- **Do not** use `MidgardButton` for role chips — they need custom ARIA attributes not available in MidgardButton
- **Do not** make a network request on role change — purely client-side filter, no loading state
- **Do not** add role filtering logic to `ArtifactSection.tsx` — filtering happens in `ArtifactContent.tsx`
- **Do not** render the empty state inside `ArtifactSection` — it belongs in `ArtifactContent`
- **Do not** skip ContentHeader when sections are empty — header stays sticky and visible always
- **Do not** use relative imports — always `@/` alias
- **Do not** use `require()` — ESM only
- **Do not** import `ArtifactContent` type without aliasing in `ArtifactContent.tsx`

### Project Structure Notes

- `components/workspace/` — flat structure; all workspace components at the same level, no subdirectories
- `stores/workspace.ts` — all UI state lives here; do not create additional stores

### References

- [Source: epics.md#Story 5.4] — User story, acceptance criteria, role chip ARIA requirements, empty state copy
- [Source: ux-design-specification.md#RoleFilterToggle] — Chip anatomy, chip states (active/inactive/hover), reset behavior, custom build (no shadcn)
- [Source: ux-design-specification.md#Scope-1-Role-Filtering] — Additive filter semantics, session-local state (not persisted)
- [Source: types/artifacts.ts#ArtifactSection] — `roles: string[]` field per section
- [Source: stores/workspace.ts] — `activeRole: string | null` and `setActiveRole` already exist
- [Source: components/workspace/MidgardButton.tsx] — `ghost` tier confirmed for "Clear filter" button; role chips must be raw `<button>` not MidgardButton
- [Source: components/workspace/ArtifactContent.tsx] — Story 5.3 deferred `activeRole` reads explicitly to this story; `ArtifactContent as ArtifactContentData` alias already in use
- [Source: components/workspace/ArtifactIndexPanel.tsx] — Already renders `<RoleFilterToggle artifacts={artifacts} />`; no changes needed
- [Source: 5-3-artifactcontent-and-artifactsection-components.md#Dev Notes] — `artifact.content as ArtifactContentData | undefined` cast pattern; `'use client'` on all hook-using components; `@/` alias only; do not read `activeRole` in Story 5.3 (this story owns it)
- [Source: project-context.md#Framework-Specific-Rules] — `mg-*` token prefix, flat `components/workspace/`, `@/` alias, pnpm only

### Review Findings

- [x] [Review][Decision] Filter resets on parent re-renders, violating AC2 persistence — fixed: added `projectId: string` prop to `RoleFilterToggle`, `ArtifactIndexPanel`, and `ArtifactWorkspace`; effect dep changed from `artifacts` to `projectId`; threaded through `WorkspaceShell`
- [x] [Review][Patch] `artifactData.sections` accessed without undefined guard before `visibleSections` [components/workspace/ArtifactContent.tsx:36]
- [x] [Review][Patch] `s.roles.includes(activeRole)` throws if `roles` is undefined on a section [components/workspace/ArtifactContent.tsx:37]
- [x] [Review][Patch] No accessible label on filter chip container — added `role="group"` + `aria-label="Filter by role"` to wrapper div [components/workspace/RoleFilterToggle.tsx]
- [x] [Review][Defer] Role string case inconsistency produces duplicate chips with broken filtering [components/workspace/RoleFilterToggle.tsx] — deferred, depends on AI data quality

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. `pnpm tsc --noEmit` and `pnpm lint` both passed clean on first attempt.

### Completion Notes List

- Replaced `RoleFilterToggle.tsx` stub: imports `useMemo`/`useEffect`; aggregates unique roles from all artifacts via `useMemo` with `ArtifactContentData` cast (same Json→type cast pattern as Story 5.3); resets `activeRole` to null on `artifacts` reference change via `useEffect`; renders "All roles" chip + sorted role chips as plain `<button>` elements with `role="checkbox"` + `aria-checked`; active chip gets accent border/surface/text, inactive gets border + fg-subtle; clicking an active role chip deactivates it back to null.
- Updated `ArtifactContent.tsx`: added `activeRole` and `setActiveRole` selectors from `useWorkspaceStore`; imported `MidgardButton`; computes `visibleSections` filtered by `activeRole` (or all sections when null); renders filtered sections; shows empty state "No sections match this role." + `MidgardButton tier="ghost"` "Clear filter" when `visibleSections.length === 0`; ContentHeader remains sticky and visible regardless of empty state.
- `pnpm tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors.
- Manual validation tasks (3.3–3.6) left for Jason to verify in browser.

### File List

- `components/workspace/RoleFilterToggle.tsx` — replaced stub (Task 1)
- `components/workspace/ArtifactContent.tsx` — added role filtering (Task 2)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story status
- `_bmad-output/implementation-artifacts/5-4-rolefiltertoggle.md` — story file updated

## Change Log

- 2026-05-06: Story 5.4 implemented — RoleFilterToggle stub replaced with full chip-based role filter; ArtifactContent updated with visibleSections filtering and empty state
