# Story 5.2: ArtifactIndexPanel & Navigation

Status: done

## Story

As a **solo designer**,
I want a persistent panel showing all four artifact types that I can click to switch between,
So that I can navigate the workspace instantly without losing context of what exists.

## Acceptance Criteria

1. **Given** the artifact workspace is in `phase = 'workspace'`
   **When** `ArtifactIndexPanel` renders
   **Then** four entries are listed with slash-prefixed Geist Mono labels: `/flows`, `/personas`, `/ia`, `/synthesis`
   **And** the active entry has a 2px left border in accent color and `fg-default` text
   **And** inactive entries have `fg-muted` text and no left border (transparent, not absent — prevents layout shift)
   **And** `RoleFilterToggle` renders at the top of the panel above the artifact entries
   **And** the panel uses `role="navigation"` with `aria-label="Artifact sections"` and `aria-current="page"` on the active entry

2. **Given** I click a non-active artifact entry
   **When** the click is registered
   **Then** `setActiveArtifact(type)` updates Zustand `activeArtifact` immediately
   **And** `onSelect?.()` is called after the artifact update (closes tray on tablet, collapses mobile nav)
   **And** the active indicator (border + text color) updates to the clicked entry without any loading state
   **And** the transition completes in under 100ms — no spinner, no skeleton, no fade

3. **Given** I use a keyboard to navigate the index panel
   **When** focus is inside the panel
   **Then** pressing `ArrowDown` moves focus to the next entry (wraps from last to first)
   **And** pressing `ArrowUp` moves focus to the previous entry (wraps from first to last)
   **And** pressing `Enter` on a focused entry activates it (native button behavior)
   **And** the focused item receives a visible focus ring: `outline: 2px solid` using `fg-subtle` token

---

## Tasks / Subtasks

- [x] Task 1 — Create `RoleFilterToggle.tsx` stub (AC: #1)
  - [x] 1.1 Create `components/workspace/RoleFilterToggle.tsx` as `'use client'`; props interface: `{ artifacts: Artifact[]; className?: string }` — do NOT destructure `artifacts` in function params (unused in stub, ESLint warning prevention); destructure only `className`
  - [x] 1.2 Render `<div className={cn('px-4 py-2', className)}>` with placeholder: `<p className="font-mono text-[11px] text-mg-foreground-subtle">role filter (Story 5.4)</p>`
  - [x] 1.3 Import `Artifact` type from `@/actions/projects` and `cn` from `@/lib/utils`

- [x] Task 2 — Implement `ArtifactIndexPanel.tsx` (replaces stub) (AC: #1, #2, #3)
  - [x] 2.1 Replace stub entirely — new imports: `useRef`, `useCallback` from `react`; `useWorkspaceStore` from `@/stores/workspace`; `RoleFilterToggle` from `@/components/workspace/RoleFilterToggle`; `cn` from `@/lib/utils`; `Artifact` type from `@/actions/projects`; `ArtifactType` type from `@/types/artifacts`
  - [x] 2.2 Define module-level constants (same pattern as `ArtifactWorkspace.tsx`): `const ARTIFACT_TYPES: ArtifactType[] = ['flows', 'personas', 'ia', 'synthesis']` and `const ARTIFACT_LABELS: Record<ArtifactType, string> = { flows: '/flows', personas: '/personas', ia: '/ia', synthesis: '/synthesis' }` — typed `ArtifactType[]` (not `string[]`) so TypeScript infers `type` as `ArtifactType` when calling `setActiveArtifact(type)`
  - [x] 2.3 Props interface: `{ artifacts: Artifact[]; onSelect?: () => void; className?: string }` — same interface as the stub; all three props used in the full implementation
  - [x] 2.4 Read from Zustand: `const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)` and `const setActiveArtifact = useWorkspaceStore((s) => s.setActiveArtifact)` — do NOT read or set `activeRole` here (Story 5.4)
  - [x] 2.5 Declare ref array: `const itemRefs = useRef<(HTMLButtonElement | null)[]>([])` — used to focus specific items via arrow-key navigation
  - [x] 2.6 Implement `handleKeyDown` with `useCallback`:
    ```typescript
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          itemRefs.current[(index + 1) % ARTIFACT_TYPES.length]?.focus()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          itemRefs.current[(index - 1 + ARTIFACT_TYPES.length) % ARTIFACT_TYPES.length]?.focus()
        }
      },
      []
    )
    ```
  - [x] 2.7 Implement `handleSelect` with `useCallback`:
    ```typescript
    const handleSelect = useCallback(
      (type: ArtifactType) => {
        setActiveArtifact(type)
        onSelect?.()
      },
      [setActiveArtifact, onSelect]
    )
    ```
  - [x] 2.8 Render outer `<nav role="navigation" aria-label="Artifact sections" className={cn('flex flex-col', className)}>`
  - [x] 2.9 Panel header inside nav: `<div className="px-4 py-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-mg-foreground-subtle">Artifacts</span><span className="font-mono text-[10px] text-mg-foreground-subtle">{artifacts.length}</span></div>`
  - [x] 2.10 Below header: `<RoleFilterToggle artifacts={artifacts} />`
  - [x] 2.11 Below RoleFilterToggle: a `<ul role="list">` mapping `ARTIFACT_TYPES`; each `<li key={type}>` contains a `<button>` with:
    - `ref={(el) => { itemRefs.current[index] = el }}`
    - `onClick={() => handleSelect(type)}`
    - `onKeyDown={(e) => handleKeyDown(e, index)}`
    - `aria-current={activeArtifact === type ? 'page' : undefined}`
    - `tabIndex={activeArtifact === type ? 0 : -1}` — roving tabindex; active entry is the tab stop
    - `className={cn('w-full text-left px-4 h-10 font-mono text-[12px] flex items-center border-l-2 cursor-pointer hover:bg-mg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-mg-foreground-subtle transition-colors', activeArtifact === type ? 'border-l-mg-accent text-mg-foreground' : 'border-l-transparent text-mg-foreground-muted')}`
    - Text: `{ARTIFACT_LABELS[type]}`

- [x] Task 3 — Update `ArtifactContent.tsx` stub to reflect active artifact (AC: #2)
  - [x] 3.1 Add `useWorkspaceStore` import from `@/stores/workspace`
  - [x] 3.2 In function body: `const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)` — needed so developers can visually verify AC #2 (transition < 100ms, content panel reflects active artifact); Story 5.3 replaces the full render
  - [x] 3.3 Update placeholder text: `<p className="font-mono text-[11px] text-mg-foreground-subtle">/{activeArtifact} (Story 5.3)</p>` — shows current artifact type so navigation is verifiable without Story 5.3

- [x] Task 4 — Validation (AC: all)
  - [x] 4.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 4.2 `pnpm lint` — zero ESLint errors
  - [ ] 4.3 `pnpm dev` — dev server starts clean; no console errors (manual)
  - [ ] 4.4 Manual (Jason verifies): Realm with artifacts → workspace shows; clicking `/personas`, `/ia`, `/synthesis`, `/flows` in index panel → active indicator (2px accent border + fg-default text) moves immediately, content area updates to show `/{type} (Story 5.3)`; no loading state visible
  - [ ] 4.5 Manual (Jason verifies): Tab to index panel → focused entry has visible outline; ArrowDown moves focus through all four entries (wraps bottom→top); ArrowUp wraps top→bottom; Enter on a non-active entry activates it
  - [ ] 4.6 Manual (Jason verifies): Tablet viewport (768–1023px) → tap icon strip icon → tray opens with real ArtifactIndexPanel; click an entry → tray closes (onSelect fires); active indicator reflects clicked entry
  - [ ] 4.7 Manual (Jason verifies): Mobile viewport (<768px) → expand mobile nav disclosure → ArtifactIndexPanel with four entries; click entry → disclosure collapses (onSelect fires); active indicator updates

---

## Dev Notes

### What This Story Builds

Story 5.1 created stub versions of `ArtifactIndexPanel` (renders a plain-text placeholder) and `ArtifactContent` (renders static placeholder text). This story replaces the `ArtifactIndexPanel` stub with a fully functional navigation component, creates a `RoleFilterToggle` stub (Story 5.4 fills it), and updates the `ArtifactContent` stub to reflect the active artifact so navigation can be visually verified.

`ArtifactWorkspace.tsx` does NOT change in this story. The three mount points it already provides (desktop panel, tablet tray, mobile disclosure) all call `<ArtifactIndexPanel artifacts={artifacts} onSelect={...} />` — those call sites already have the correct props and will just work once the stub is replaced.

### ARTIFACT_TYPES / ARTIFACT_LABELS — Module-Level Constants (Required)

`ArtifactWorkspace.tsx` already defines `ARTIFACT_TYPES: ArtifactType[]` and `ARTIFACT_LABELS` at module level. `ArtifactIndexPanel` must define its own identical set — do NOT import them from `ArtifactWorkspace` (circular concern) and do NOT use inline string arrays.

The reason this matters: `ARTIFACT_TYPES.map((type) => ...)` — if `ARTIFACT_TYPES` is typed as `string[]` (what you get from `['flows', 'personas', 'ia', 'synthesis']` without annotation), then `setActiveArtifact(type)` fails TypeScript because `string` is not assignable to `ArtifactType`. The typed constant is the fix. Same lesson as Story 5.1 Task 3.8.

### Roving Tabindex Pattern

All four index entries use a roving tabindex: the active artifact entry has `tabIndex={0}` (included in Tab order), all others have `tabIndex={-1}` (reachable by arrow keys only, skipped by Tab). When the user Tabs into the nav, they land directly on the active entry. Arrow keys then move DOM focus without changing `activeArtifact` in Zustand — only a click (or Enter) changes the active artifact.

The `tabIndex` value is derived from `activeArtifact === type`, not from a separate "focused index" state. After arrow-navigating and then Tabbing away, Tab-back will return focus to the current `activeArtifact` entry (not where arrow focus was left). This matches standard ARIA widget roving tabindex behavior.

### onSelect Call Order Matters

In `handleSelect`, call `setActiveArtifact(type)` BEFORE `onSelect?.()`. The `onSelect` callback in tablet/mobile contexts calls `setTrayOpen(false)` or `setMobileNavOpen(false)` — these cause the overlay/disclosure to close. If `setActiveArtifact` were called after a render triggered by closing the tray, it could be a no-op in a stale closure. Calling it first ensures the state update is queued before the panel unmounts.

### border-l-2 on All Entries (Not Just Active)

Every index entry must have `border-l-2` — including inactive entries with `border-l-transparent`. This reserves the 2px left-border space at all times. Without this, activating an entry would cause a 2px layout shift as the border appears, violating NFR-PERF-1 (artifact navigation transitions < 100ms; any layout reflow makes this visually jarring).

### ArtifactIndexPanel aria-label — Spec Difference from Stub

Story 5.1's stub used `aria-label="Artifact navigation"`. The UX spec (section 1396) specifies `aria-label="Artifact sections"`. Use `"Artifact sections"` in the full implementation.

### RoleFilterToggle Stub — Props Interface Must Match Story 5.4

Story 5.4 will implement `RoleFilterToggle` fully, extracting role names from `artifacts[].content`. The stub must accept `artifacts: Artifact[]` so Story 5.4 can replace the body without changing the props interface. Do NOT stub it with an empty props interface.

ESLint no-unused-vars: follow the Story 5.1 pattern — destructure only `className` in the function params, not `artifacts`. The unused prop is received but not destructured, avoiding the ESLint error:
```typescript
export function RoleFilterToggle({ className }: RoleFilterToggleProps) { ... }
```

### ArtifactContent Stub Update — Minimal and Intentional

The ArtifactContent update (Task 3) is intentionally minimal. Its only purpose is to make Story 5.2's AC #2 verifiable: the dev and Jason can see `/{activeArtifact}` change in the content area when navigating. Story 5.3 replaces the entire render body with real content. Do NOT implement any content logic in this story.

### Design Token Quick Reference

| Intent | Tailwind class | CSS var |
|--------|---------------|---------|
| Active border | `border-l-mg-accent` | `var(--mg-accent)` |
| Inactive border | `border-l-transparent` | — |
| Active text | `text-mg-foreground` | `var(--mg-foreground)` |
| Inactive text | `text-mg-foreground-muted` | `var(--mg-foreground-muted)` |
| Hover bg | `hover:bg-mg-surface-elevated` | `var(--mg-surface-elevated)` |
| Focus ring | `focus-visible:outline-mg-foreground-subtle` | `var(--mg-foreground-subtle)` |
| Header labels | `text-mg-foreground-subtle` | `var(--mg-foreground-subtle)` |

### No New Files Outside workspace/

- No Zustand store changes (activeArtifact/setActiveArtifact already exist)
- No Server Actions
- No Supabase migrations
- No changes to `ArtifactWorkspace.tsx`, `WorkspaceShell.tsx`, or `workspace/page.tsx`

### Anti-Patterns to Avoid

- **Do not** use an inline array literal `['flows', 'personas', 'ia', 'synthesis']` — TypeScript infers `string[]`, breaking `setActiveArtifact(type)`; use `ARTIFACT_TYPES: ArtifactType[]`
- **Do not** import `ARTIFACT_TYPES` or `ARTIFACT_LABELS` from `ArtifactWorkspace.tsx` — these are presentation concerns, not shared library code; define locally in each consumer
- **Do not** manage tab focus with `useState` for a "focused index" — derive `tabIndex` directly from `activeArtifact === type`
- **Do not** call `onSelect?.()` before `setActiveArtifact(type)` — see "onSelect Call Order Matters" above
- **Do not** add `border-l-2` only on the active entry — all entries need it to prevent layout shift
- **Do not** import RoleFilterToggle from a path other than `@/components/workspace/RoleFilterToggle`
- **Do not** skip `role="list"` on the `<ul>` — VoiceOver on Safari strips list semantics from unstyled lists; explicit `role="list"` re-adds them
- **Do not** use relative imports — always `@/` alias
- **Do not** change `ArtifactWorkspace.tsx` — the three `<ArtifactIndexPanel>` call sites are already correct; only the component body was a stub

### File Structure

```
components/workspace/
  ArtifactIndexPanel.tsx     ← REPLACE stub (Story 5.2)
  RoleFilterToggle.tsx       ← CREATE stub (Story 5.4 fills)
  ArtifactContent.tsx        ← MODIFY stub (add activeArtifact display)
  ArtifactWorkspace.tsx      (unchanged)
  ArtifactSection.tsx        (not yet created — Story 5.3)
  WorkspaceShell.tsx         (unchanged)
  AllFatherLoadingState.tsx  (unchanged)
  AttentionRegion.tsx        (unchanged)
  BriefInputSurface.tsx      (unchanged)
  MidgardButton.tsx          (unchanged)
```

No changes outside `components/workspace/`.

### References

- [Source: epics.md#Story 5.2] — Acceptance criteria, slash-prefixed labels, active/inactive states, RoleFilterToggle placement, keyboard nav spec
- [Source: ux-design-specification.md#ArtifactIndexPanel] — Panel anatomy: header, RoleFilterToggle, IndexItem states (active border, fg-muted, hover surface-elevated), keyboard arrow nav
- [Source: ux-design-specification.md#Accessibility] — `aria-label="Artifact sections"`, roving tabindex, focus ring token, `role="list"` on `<ul>`
- [Source: project-context.md#Framework-Specific Rules] — mg-* token prefix, flat directory structure, @/ alias, ArtifactType from types/artifacts
- [Source: 5-1-artifactworkspace-layout-and-two-panel-structure.md#Dev Notes] — ARTIFACT_TYPES/ARTIFACT_LABELS pattern (typed constant prevents TypeScript string[] inference), onSelect prop purpose, tablet tray/mobile nav integration points
- [Source: 5-1-artifactworkspace-layout-and-two-panel-structure.md#File List] — ArtifactIndexPanel/ArtifactContent stub signatures to update from

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, zero TypeScript errors, zero ESLint errors.

### Completion Notes List

- Created `RoleFilterToggle.tsx` stub: accepts `Artifact[]` + `className?`; destructures only `className` to avoid ESLint unused-var; renders placeholder for Story 5.4.
- Replaced `ArtifactIndexPanel.tsx` stub with full implementation: module-level `ARTIFACT_TYPES: ArtifactType[]` typed constant prevents `string[]` inference issue; `handleKeyDown` implements roving tabindex arrow navigation with wrap-around; `handleSelect` calls `setActiveArtifact` before `onSelect?.()` per spec; all entries carry `border-l-2` (transparent on inactive) to prevent layout shift; `aria-label="Artifact sections"` per UX spec (not "Artifact navigation" from stub).
- Updated `ArtifactContent.tsx` stub: reads `activeArtifact` from Zustand and renders `/{activeArtifact} (Story 5.3)` so navigation can be visually verified without Story 5.3.
- Automated validation: `pnpm tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors.
- Manual validation tasks (4.3–4.7) left for Jason to verify in browser.

### File List

- `components/workspace/RoleFilterToggle.tsx` — created (Task 1)
- `components/workspace/ArtifactIndexPanel.tsx` — replaced stub (Task 2)
- `components/workspace/ArtifactContent.tsx` — updated stub (Task 3)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story status to in-progress → review
- `_bmad-output/implementation-artifacts/5-2-artifactindexpanel-and-navigation.md` — story file updated

### Review Findings

- [x] [Review][Defer] `itemRefs.current` stale ref accumulation if `ARTIFACT_TYPES` ever shrinks [`components/workspace/ArtifactIndexPanel.tsx`] — deferred, theoretical; `ARTIFACT_TYPES` is a fixed module-level constant with 4 entries; only applies if the list becomes dynamic in a future story
- [x] [Review][Defer] `artifact_type` DB column is an untyped `string` — `ArtifactType` union enforced only at app layer; a legacy or misspelled row produces an invisible missing entry in the index panel without error [`lib/supabase/types.ts`] — deferred, pre-existing; not introduced by this story
- [x] [Review][Defer] `ArtifactContent` renders `/{activeArtifact}` even when no matching artifact exists in `artifacts` array — stub behavior; upstream `phase = 'workspace'` guard makes this unreachable in practice; Story 5.3 replaces the body entirely [`components/workspace/ArtifactContent.tsx`] — deferred, stub only

## Change Log

- 2026-05-06: Story 5.2 created — ArtifactIndexPanel full implementation, RoleFilterToggle stub, ArtifactContent stub updated
- 2026-05-06: Story 5.2 implemented — RoleFilterToggle stub created, ArtifactIndexPanel stub replaced with full navigation component, ArtifactContent stub updated to show active artifact; tsc and lint pass clean
