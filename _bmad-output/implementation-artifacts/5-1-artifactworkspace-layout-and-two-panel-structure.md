# Story 5.1: ArtifactWorkspace Layout & Two-Panel Structure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **solo designer**,
I want a persistent two-panel workspace to appear when my artifacts are ready,
So that I always know what artifacts exist and can navigate between them without losing my place.

## Acceptance Criteria

1. **Given** the Zustand workspace `phase` is `'workspace'`
   **When** `ArtifactWorkspace` renders
   **Then** a sticky workspace AppNav (46px) spans the full width showing the Realm name and account menu
   **And** below the nav, `ArtifactIndexPanel` (258px fixed) and `ArtifactContent` (flex:1) render side by side
   **And** the content panel scrolls independently; the index panel and workspace nav remain sticky

2. **Given** the viewport is between 768px and 1023px (tablet)
   **When** the layout renders
   **Then** the index panel collapses to a 56px icon strip
   **And** tapping an icon opens the index as an overlay tray scoped to that artifact — the only permitted overlay in the workspace
   **And** the content panel expands to fill the remaining width
   **And** `Escape` key dismisses the tray

3. **Given** the viewport is below 768px (mobile)
   **When** the layout renders
   **Then** the workspace renders as a single column with a collapsible disclosure for artifact navigation below the workspace nav bar

4. **Given** the workspace `phase` transitions from `'loading'` to `'workspace'`
   **When** `ArtifactWorkspace` first renders
   **Then** the existing crossfade mechanism in `WorkspaceShell` handles the AllFatherLoadingState → workspace transition
   **And** `activeArtifact` defaults to `'flows'` (already set in Zustand store initial state)

## Tasks / Subtasks

- [x] Task 1 — Create `ArtifactIndexPanel.tsx` stub (AC: #1, #2, #3)
  - [x] 1.1 Create `components/workspace/ArtifactIndexPanel.tsx` as `'use client'` component; props: `{ artifacts: Artifact[]; onSelect?: () => void; className?: string }` — Story 5.2 populates the panel contents; do NOT destructure `artifacts` in function params (unused in stub, no ESLint warning)
  - [x] 1.2 Render a `<nav role="navigation" aria-label="Artifact navigation">` wrapper with `cn('py-2', className)` classes; include a stub placeholder: `<p className="px-4 font-mono text-[11px] text-mg-foreground-subtle py-2">/flows /personas /ia /synthesis</p>`
  - [x] 1.3 Import `Artifact` type from `@/actions/projects` and `cn` from `@/lib/utils`

- [x] Task 2 — Create `ArtifactContent.tsx` stub (AC: #1)
  - [x] 2.1 Create `components/workspace/ArtifactContent.tsx` as `'use client'` component; props: `{ artifacts: Artifact[] }` — Story 5.3 populates the panel; do NOT destructure `artifacts` in function params (unused in stub)
  - [x] 2.2 Render `<div className="px-6 py-6">` with stub placeholder: `<p className="font-mono text-[11px] text-mg-foreground-subtle">Artifact content (Story 5.3)</p>`
  - [x] 2.3 Import `Artifact` type from `@/actions/projects`

- [x] Task 3 — Create `ArtifactWorkspace.tsx` (AC: #1, #2, #3, #4)
  - [x] 3.1 Create `components/workspace/ArtifactWorkspace.tsx` as `'use client'`; props: `{ artifacts: Artifact[] }` — NOT projectId/projectName (those stay in page.tsx's sticky workspace AppNav)
  - [x] 3.2 Import: `useState`, `useEffect` from `react`; `useWorkspaceStore` from `@/stores/workspace`; `ArtifactIndexPanel`, `ArtifactContent`, `AttentionRegion`, `MidgardButton` from respective workspace components; `cn` from `@/lib/utils`; `Artifact` type from `@/actions/projects`; `ArtifactType` type from `@/types/artifacts`
  - [x] 3.3 Read from Zustand: `showDisclosure`, `setShowDisclosure`, `activeArtifact`, `setActiveArtifact`
  - [x] 3.4 Declare local state: `const [trayOpen, setTrayOpen] = useState(false)` and `const [mobileNavOpen, setMobileNavOpen] = useState(false)`
  - [x] 3.5 Add Escape key handler for tray: `useEffect(() => { if (!trayOpen) return; const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setTrayOpen(false) }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler) }, [trayOpen])`
  - [x] 3.6 Render outer container: `<div className="flex flex-row h-[calc(100vh-92px)] overflow-hidden">` — 92px = 46px global nav + 46px workspace AppNav (in page.tsx)
  - [x] 3.7 Desktop index panel: `<div className="flex-shrink-0 border-r border-mg-border overflow-y-auto tablet:hidden" style={{ width: 'var(--index-panel-width)' }}>` containing `<ArtifactIndexPanel artifacts={artifacts} />`
  - [x] 3.8 Tablet icon strip: `<div className="hidden tablet:flex mobile:hidden flex-col flex-shrink-0 border-r border-mg-border" style={{ width: 'var(--index-panel-collapsed)' }}>` — iterate `ARTIFACT_TYPES` (typed `ArtifactType[]`, defined in Task 3.14); each button: `onClick={() => { setActiveArtifact(type); setTrayOpen(true) }}`, `aria-label={ARTIFACT_LABELS[type]}`, `aria-current={activeArtifact === type ? 'true' : undefined}`, accent color when active (`activeArtifact === type` → `text-mg-accent` else `text-mg-foreground-muted hover:text-mg-foreground`), `truncate`, `focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-foreground-subtle`, font-mono text-[11px], h-11, full-width — using `ARTIFACT_TYPES` (not an inline array literal) ensures TypeScript infers `type` as `ArtifactType`, not `string`, satisfying `setActiveArtifact`'s parameter type
  - [x] 3.9 Tablet overlay tray (conditional on `trayOpen`): backdrop `<div className="hidden tablet:block mobile:hidden fixed inset-0 z-20" onClick={() => setTrayOpen(false)} />`; tray panel `<div className="hidden tablet:block mobile:hidden fixed z-30 overflow-y-auto bg-mg-surface border-r border-mg-border" style={{ top: '92px', left: 'var(--index-panel-collapsed)', bottom: 0, width: 'var(--index-panel-width)' }}>` containing `<ArtifactIndexPanel artifacts={artifacts} onSelect={() => setTrayOpen(false)} />`
  - [x] 3.10 Content panel: `<div className="flex flex-col flex-1 min-h-0 overflow-hidden">` containing: (a) mobile nav disclosure at top, (b) scrollable content area
  - [x] 3.11 Mobile nav disclosure (inside content panel, before scroll area): `<div className="hidden mobile:block border-b border-mg-border flex-shrink-0">` with a toggle button (`aria-expanded={mobileNavOpen}`, `aria-controls="mobile-artifact-nav"`, shows current artifact label from `ARTIFACT_LABELS[activeArtifact]`) and conditional `<div id="mobile-artifact-nav"><ArtifactIndexPanel artifacts={artifacts} onSelect={() => setMobileNavOpen(false)} /></div>`
  - [x] 3.12 Scrollable content area: `<div className="flex-1 overflow-y-auto">` containing: disclosure AttentionRegion (conditional on `showDisclosure`) then `<ArtifactContent artifacts={artifacts} />`
  - [x] 3.13 Disclosure AttentionRegion (moved from WorkspaceShell): same markup as Story 4.5's WorkspaceShell implementation — variant `"info"`, title `"A note about your data"`, body text and Ghost dismiss button calling `setShowDisclosure(false)`
  - [x] 3.14 Define module-level constants at the top of the file (before the component function): `const ARTIFACT_TYPES: ArtifactType[] = ['flows', 'personas', 'ia', 'synthesis']` and `const ARTIFACT_LABELS: Record<ArtifactType, string> = { flows: '/flows', personas: '/personas', ia: '/ia', synthesis: '/synthesis' }` — using `ArtifactType` as the key type catches future typos at compile time; placing both together makes them findable as a unit

- [x] Task 4 — Update `WorkspaceShell.tsx` (AC: #1, #4)
  - [x] 4.1 Update `WorkspaceShellProps` interface: replace `hasArtifacts: boolean` with `artifacts: Artifact[]`; keep `projectId: string` and `projectName: string`
  - [x] 4.2 In function body: add `const hasArtifacts = artifacts.length > 0` derived locally; remove `hasArtifacts` from destructuring
  - [x] 4.3 Remove disclosure handling: delete `showDisclosure`, `setShowDisclosure` Zustand reads; remove `AttentionRegion` and `MidgardButton` imports
  - [x] 4.4 In the `phase === 'workspace'` branch: replace the disclosure+placeholder div with `<ArtifactWorkspace artifacts={artifacts} />`
  - [x] 4.5 Add import for `ArtifactWorkspace` from `@/components/workspace/ArtifactWorkspace`
  - [x] 4.6 Add import for `Artifact` type from `@/actions/projects`
  - [x] 4.7 Verify the existing crossfade logic (`prevPhaseRef`, `isFading`, `setTimeout(300)`) is untouched — Story 5.1 does not modify the loading → workspace transition mechanism

- [x] Task 5 — Update `workspace/page.tsx` (AC: #1)
  - [x] 5.1 Pass `artifacts` array to `WorkspaceShell`: change `hasArtifacts={artifacts.length > 0}` to `artifacts={artifacts}`
  - [x] 5.2 Make the realm-name header sticky at `top-[46px]`: change the existing `<div className="border-b border-mg-border px-6 py-3 flex items-center justify-between">` to `<div className="sticky top-[46px] z-10 bg-mg-background h-[46px] border-b border-mg-border px-4 flex items-center justify-between flex-shrink-0">` — exact 46px height, sticky below global nav, no top/bottom padding (height enforced)
  - [x] 5.3 Update the `<h1>` in the realm-name header to use `font-mono text-xs text-mg-foreground` to match workspace AppNav spec
  - [x] 5.4 Remove the outer `<main>` wrapper — `WorkspaceShell` in workspace phase renders `ArtifactWorkspace` which fills `h-[calc(100vh-92px)]`; the `<main>` wrapper breaks the height calculation since it adds layout context. Replace: render the sticky header + WorkspaceShell directly without a wrapping `<main>`

- [x] Task 6 — Create `app/(app)/not-found.tsx` (deferred from Story 3.1)
  - [x] 6.1 Create `app/(app)/not-found.tsx` — a simple not-found page that renders with the `(app)` AppNav chrome intact (since it sits inside the `(app)` route group layout)
  - [x] 6.2 Body: `<main className="flex flex-col items-center justify-center gap-4 px-6 py-12">` with a mono `"Not found."` paragraph and a `Link` to `/projects` reading `"← Back to Realms"`; use `text-mg-foreground-muted` and `text-mg-foreground-subtle hover:text-mg-foreground transition-colors` respectively
  - [x] 6.3 Import `Link` from `next/link`; no additional dependencies

- [x] Task 7 — Validation (AC: all)
  - [x] 7.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 7.2 `pnpm lint` — zero ESLint errors
  - [x] 7.3 `pnpm dev` — dev server starts clean; no console errors
  - [x] 7.4 Manual (Jason verifies): navigate to a Realm with generated artifacts → workspace loads with sticky workspace AppNav showing realm name + delete button, 258px index panel on left showing stub label, flex:1 content panel on right showing stub text; index panel and workspace AppNav remain sticky as content scrolls
  - [x] 7.5 Manual (Jason verifies): resize browser to tablet (768–1023px) → index panel collapses to 56px icon strip; tapping an icon opens overlay tray with stub index panel content; tapping outside or pressing Escape closes tray; content panel fills remaining width
  - [x] 7.6 Manual (Jason verifies): resize browser to mobile (<768px) → single column layout; collapsible disclosure below workspace AppNav toggles the stub index panel; content panel below
  - [x] 7.7 Manual (Jason verifies): disclosure AttentionRegion ("A note about your data") renders in content panel area when present; Ghost Dismiss button clears it; no change to the crossfade from loading → workspace

## Dev Notes

### What This Story Builds

Story 4.5 left `WorkspaceShell` rendering a placeholder `"Artifacts ready. (Story 5.1)"` when `phase === 'workspace'`. This story replaces that placeholder with the real two-panel workspace layout. It creates three new components (`ArtifactWorkspace`, `ArtifactIndexPanel` stub, `ArtifactContent` stub) and wires them into the existing `WorkspaceShell` → `workspace/page.tsx` chain.

Stories 5.2 and 5.3 fill in the actual artifact navigation and section rendering. Story 5.1's stubs establish the structural contract those stories depend on.

### Layout Architecture — Critical Height Calculation

The ArtifactWorkspace uses a fixed-height two-column layout to achieve independent panel scrolling without document scroll in workspace phase:

```
Global AppNav (from (app)/layout.tsx):  46px  sticky top-0
Workspace AppNav (from page.tsx):        46px  sticky top-[46px]
ArtifactWorkspace body:           calc(100vh - 92px)  overflow-hidden
  ├── ArtifactIndexPanel:  var(--index-panel-width)   overflow-y-auto
  └── ArtifactContent:     flex:1                     overflow-y-auto
```

Both `--index-panel-width: 258px` and `--index-panel-collapsed: 56px` are already defined in `app/globals.css` `:root` block — do NOT add them again.

The `h-[calc(100vh-92px)]` on ArtifactWorkspace's outer div is the key constraint. If `page.tsx` is wrapped in `<main>` that has margin/padding, the calculation breaks. Remove the `<main>` wrapper from page.tsx (see Task 5.4).

### Responsive Strategy — Tailwind Breakpoints

Tailwind `max-width` breakpoints configured in `tailwind.config.ts`:
```typescript
screens: {
  tablet: { max: '1023px' },  // 768px–1023px (includes mobile)
  mobile: { max: '767px' },   // <768px
}
```

Since both are `max-width`, `tablet:*` applies at 1023px AND below (includes mobile). To target tablet only (not mobile): `hidden tablet:flex mobile:hidden`.

Pattern for each layout element:
| Element | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) |
|---|---|---|---|
| Full index panel | visible | `tablet:hidden` | hidden |
| Icon strip | hidden | `hidden tablet:flex mobile:hidden` | hidden |
| Overlay tray | hidden | `hidden tablet:block mobile:hidden` | hidden |
| Mobile nav disclosure | hidden | hidden | `hidden mobile:block` |

### WorkspaceShell — Disclosure Moves to ArtifactWorkspace

Story 4.5 added the disclosure `AttentionRegion` to `WorkspaceShell`'s workspace phase branch. Story 5.1 moves it INTO `ArtifactWorkspace` (inside the content panel's scrollable area). This keeps all workspace-phase UI within `ArtifactWorkspace` and removes the coupling in `WorkspaceShell`.

After Task 4, `WorkspaceShell` in workspace phase simply renders:
```tsx
if (phase === 'workspace') {
  return <ArtifactWorkspace artifacts={artifacts} />
}
```

No disclosure logic, no AttentionRegion, no MidgardButton imports in WorkspaceShell.

### ArtifactWorkspace — Does NOT Receive projectId/projectName

The workspace AppNav (realm name + DeleteRealmButton) stays in `page.tsx` as a sticky header. `ArtifactWorkspace` only manages the two-panel body. Its only prop is `artifacts: Artifact[]`. This keeps `ArtifactWorkspace` pure to its layout concern and avoids prop-threading `projectId`/`projectName` through WorkspaceShell.

### Tablet Overlay Tray — Positioning

The tray uses `fixed` positioning relative to the viewport:
```typescript
style={{
  top: '92px',           // below global nav (46px) + workspace AppNav (46px)
  left: 'var(--index-panel-collapsed)',  // right of the icon strip (56px)
  bottom: 0,
  width: 'var(--index-panel-width)',     // 258px
}}
```

The backdrop (`fixed inset-0 z-20`) captures clicks outside the tray. The tray itself is `z-30`. Both use `hidden tablet:block mobile:hidden` to only render at tablet width.

### Escape Key Handler Pattern

The `useEffect` for Escape key is conditional on `trayOpen`:
```typescript
useEffect(() => {
  if (!trayOpen) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setTrayOpen(false)
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [trayOpen])
```

Only registers the listener when the tray is open. No listener leak.

### ArtifactIndexPanel — onSelect Prop

The `onSelect?: () => void` prop is called when the user selects an artifact entry. In Story 5.1's stub, it's accepted but not called (no clickable entries yet). Story 5.2 will use it to close the tray (on tablet) or collapse the mobile nav after navigation. The prop must be in the interface now so WorkspaceShell can pass it.

### Zustand Store — Already Has Everything Needed

Story 4.5 added `showDisclosure`/`setShowDisclosure`. The store already has `activeArtifact`/`setActiveArtifact`. No Zustand changes required for Story 5.1.

Full current store shape (from `stores/workspace.ts`):
```typescript
type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
  analysisError: string | null
  showDisclosure: boolean
  // + all setters
}
```

`activeArtifact` defaults to `'flows'` — matches UX-DR15 (workspace reveals with /flows active). No change needed.

### Artifact Data Shape — What Gets Passed Down

`getArtifacts()` in `actions/projects.ts` returns `Artifact[]` where `Artifact = Tables<'artifacts'>`:
```typescript
type Artifact = {
  id: string
  project_id: string
  artifact_type: string   // 'flows' | 'personas' | 'ia' | 'synthesis'
  content: Json           // ArtifactContent shape — cast when consuming
  created_at: string
  updated_at: string
}
```

The `content` field is `Json` (Supabase type). Story 5.3 (`ArtifactContent`) will cast it to `ArtifactContent` when rendering sections. Story 5.1's stubs receive `Artifact[]` but don't inspect the content.

### Design Token Reminder

- `mg-*` Tailwind prefix for Midgard tokens: `bg-mg-background`, `text-mg-foreground`, `border-mg-border`
- `var(--mg-*)` for CSS custom properties
- `var(--index-panel-width)` and `var(--index-panel-collapsed)` for layout tokens (unprefixed)
- Story specs may reference `var(--accent)` or `--foreground-muted` — translate to `var(--mg-accent)`, `var(--mg-foreground-muted)` in this codebase

### Deferred Item from Story 3.1

`deferred-work.md` (Story 3-1 section) requires: "No `not-found.tsx` or error boundary under `app/(app)/` — Create `app/(app)/not-found.tsx` when building Story 5.1 workspace routes." Task 6 addresses this.

### Anti-Patterns to Avoid

- **Do not** add a workspace AppNav inside `ArtifactWorkspace` — the realm name header lives in `page.tsx` as a sticky element; `ArtifactWorkspace` is only the two-panel body
- **Do not** use `useState` for `activeArtifact` or `activeRole` — these belong in `useWorkspaceStore`; only `trayOpen` and `mobileNavOpen` are local state
- **Do not** use relative imports — always `@/` alias
- **Do not** reinvent scrolling — use `overflow-y-auto` on both panels inside `overflow-hidden` parent; never use `ScrollArea` from shadcn for the main workspace panels (UX spec: `ArtifactWorkspace uses ScrollArea from shadcn for the content panel overflow` — this is aspirational; `overflow-y-auto` is the correct implementation without introducing scroll area's virtual rendering complexity at this stage)
- **Do not** add `--index-panel-width` or `--index-panel-collapsed` to globals.css — they already exist in `:root`
- **Do not** keep `<main>` wrapper in `page.tsx` — it breaks the `h-[calc(100vh-92px)]` constraint
- **Do not** modify the crossfade logic in `WorkspaceShell` — it stays exactly as implemented in Story 4.4/4.5
- **Do not** use an inline array literal `['flows', 'personas', 'ia', 'synthesis']` for the icon strip — TypeScript infers it as `string[]` and `setActiveArtifact(type)` will fail type-check; use the typed `ARTIFACT_TYPES: ArtifactType[]` constant instead
- **Story 5.3 name-collision warning:** `ArtifactContent` is both the component in `components/workspace/ArtifactContent.tsx` AND a type exported from `@/types/artifacts`. When Story 5.3 implements the component body, it must import the content type with an alias to avoid the identifier collision: `import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'`

### File Structure

```
components/workspace/
  ArtifactWorkspace.tsx       ← CREATE (Story 5.1)
  ArtifactIndexPanel.tsx      ← CREATE stub (Story 5.2 fills)
  ArtifactContent.tsx         ← CREATE stub (Story 5.3 fills)
  WorkspaceShell.tsx          ← MODIFY (wire ArtifactWorkspace, drop disclosure)
  AllFatherLoadingState.tsx   (unchanged)
  AttentionRegion.tsx         (unchanged)
  BriefInputSurface.tsx       (unchanged)
  MidgardButton.tsx           (unchanged)

app/(app)/
  projects/[projectId]/workspace/page.tsx  ← MODIFY (sticky header, pass artifacts)
  not-found.tsx               ← CREATE (deferred from Story 3.1)
```

No new Supabase migrations, no new Zustand store changes, no new Server Actions.

### References

- [Source: epics.md#Story 5.1] — Acceptance criteria, responsive breakpoints (desktop/tablet/mobile)
- [Source: epics.md#Epic 5] — Epic objectives, UX-DRs covered (UX-DR6, UX-DR7, UX-DR15, UX-DR16, UX-DR17)
- [Source: architecture.md#Frontend Architecture] — Zustand store shape, `useWorkspaceStore`
- [Source: architecture.md#Complete Project Directory Structure] — flat `components/workspace/` location (no `src/` prefix)
- [Source: ux-design-specification.md#ArtifactWorkspace] — Anatomy: AppNav + WorkspaceBody; responsive states
- [Source: ux-design-specification.md#Responsive Design] — Breakpoints: tablet `{ max: '1023px' }`, mobile `{ max: '767px' }`; CSS custom properties for panel widths
- [Source: project-context.md#Framework-Specific Rules] — `mg-*` token prefix; flat directory structure; Tailwind responsive prefix usage; `ArtifactWorkspace` owns all layout breakpoint logic
- [Source: project-context.md#Design tokens] — `var(--index-panel-width)`, `var(--index-panel-collapsed)` as safe layout tokens
- [Source: 4-5-ai-analysis-pipeline-four-artifact-generation.md#Dev Notes] — WorkspaceShell workspace phase branch (the placeholder being replaced); disclosure AttentionRegion markup to replicate in ArtifactWorkspace
- [Source: implementation-artifacts/deferred-work.md — Story 3-1] — `app/(app)/not-found.tsx` deferred to Story 5.1

### Project Structure Notes

- Architecture spec references `src/` paths — drop the prefix: `src/components/workspace/ArtifactWorkspace.tsx` → `components/workspace/ArtifactWorkspace.tsx`
- `tailwind.config.ts` already has `tablet: { max: '1023px' }` and `mobile: { max: '767px' }` — do not add breakpoints
- `app/globals.css` already has `--index-panel-width: 258px` and `--index-panel-collapsed: 56px` in `:root` — do not add

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `ArtifactIndexPanel.tsx` stub — `<nav>` wrapper with stub label; accepts `artifacts`/`onSelect`/`className` props; only `className` destructured to satisfy ESLint (stubs don't use `artifacts` or `onSelect`)
- Created `ArtifactContent.tsx` stub — empty-destructure `{}` pattern to accept typed props without introducing an unused variable; renders placeholder text
- Created `ArtifactWorkspace.tsx` — full two-panel layout with `ARTIFACT_TYPES`/`ARTIFACT_LABELS` module-level typed constants; desktop panel (258px), tablet icon strip (56px) + overlay tray (fixed, z-30), mobile disclosure, scrollable content area; Escape key handler conditional on `trayOpen`; disclosure `AttentionRegion` moved in from `WorkspaceShell`
- Updated `WorkspaceShell.tsx` — replaced `hasArtifacts: boolean` prop with `artifacts: Artifact[]`; removed disclosure imports/logic; workspace phase now renders `<ArtifactWorkspace artifacts={artifacts} />`; crossfade logic untouched
- Updated `workspace/page.tsx` — removed `<main>` wrapper; sticky workspace AppNav at `top-[46px]` with exact 46px height; `<h1>` uses `font-mono text-xs text-mg-foreground`; passes `artifacts={artifacts}` to `WorkspaceShell`
- Updated `app/(app)/not-found.tsx` — deferred task from Story 3.1; centered layout with "Not found." and "← Back to Realms" link

### File List

- `components/workspace/ArtifactIndexPanel.tsx` (created)
- `components/workspace/ArtifactContent.tsx` (created)
- `components/workspace/ArtifactWorkspace.tsx` (created)
- `components/workspace/WorkspaceShell.tsx` (modified)
- `app/(app)/projects/[projectId]/workspace/page.tsx` (modified)
- `app/(app)/not-found.tsx` (modified)

### Review Findings

- [x] [Review][Patch] Not-found link hit target too small — `← Back to Realms` text link has no padding after removing bordered button styling; add `py-1 inline-block` to the Link className to meet WCAG 2.5.8 minimum touch target [app/(app)/not-found.tsx]
- [x] [Review][Defer] `<main>` landmark removed from workspace page — per spec (Task 5.4); `h-[calc(100vh-92px)]` requires no wrapping block element; no `<main>` landmark for assistive technology; consider `dvh` units in a future polish pass [app/(app)/projects/[projectId]/workspace/page.tsx] — deferred, pre-existing
- [x] [Review][Defer] Tablet tray focus not trapped — backdrop captures mouse clicks via `onClick`; keyboard focus can Tab behind overlay when tray is open; no interactive content in stub so risk deferred to Story 5.2 when panel items are added [components/workspace/ArtifactWorkspace.tsx] — deferred, pre-existing
- [x] [Review][Defer] `mobileNavOpen` state not reset on viewport resize — if user opens mobile nav then widens to tablet/desktop, state persists; `aria-controls` relationship on now-hidden button orphaned [components/workspace/ArtifactWorkspace.tsx] — deferred, pre-existing
- [x] [Review][Defer] Stale Zustand `phase` on cross-project navigation — navigating from a workspace-phase project to a new project may briefly render `ArtifactWorkspace` with empty artifacts before the mount effect resets phase to `'input'` [components/workspace/WorkspaceShell.tsx] — deferred, pre-existing
- [x] [Review][Defer] `h-[calc(100vh-92px)]` and `top: 92px` clip content on mobile browsers with dynamic toolbars — `100vh` does not account for browser chrome on iOS Safari / Chrome Android; consider `dvh` in a responsive polish pass [components/workspace/ArtifactWorkspace.tsx] — deferred, pre-existing

## Change Log

- 2026-05-05: Story 5.1 implemented — ArtifactWorkspace two-panel layout, ArtifactIndexPanel/ArtifactContent stubs, WorkspaceShell wired to ArtifactWorkspace, workspace page.tsx sticky AppNav + `<main>` removed, not-found.tsx updated (deferred from Story 3.1)
