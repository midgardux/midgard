# Story 5.3: ArtifactContent & ArtifactSection Components

Status: done

## Story

As a **solo designer**,
I want my generated artifacts rendered as structured, figure-numbered documents in the content panel,
so that the output looks and feels like a professional tool rather than chat output.

## Acceptance Criteria

1. **Given** an artifact type is active in Zustand
   **When** `ArtifactContent` renders
   **Then** a sticky `ContentHeader` shows the slash-prefixed artifact type tag (Geist Mono), artifact title, and generated-at timestamp
   **And** the artifact body is divided into `ArtifactSection` components, each with a figure number (Geist Mono, accent color), section title, and body content
   **And** figure numbers follow the pattern `1.0`, `2.0`, `3.0` etc. (use `section.figureNumber` as stored in DB — do not generate from index)

2. **Given** I hover over an artifact section
   **When** the cursor enters the section
   **Then** `SectionRegenerateControl` becomes visible (opacity 0→1, 150ms transition) right-aligned in the section header row
   **And** moving the cursor off the section hides the control again

3. **Given** the artifact has no content yet (section-pending state)
   **When** the section renders
   **Then** a Geist Mono label reads "Not yet written." and a `SectionRegenerateControl` is persistently visible (not hover-only)

## Tasks / Subtasks

- [x] Task 1 — Create `SectionRegenerateControl.tsx` stub (AC: #2, #3)
  - [x] 1.1 Create `components/workspace/SectionRegenerateControl.tsx` as `'use client'`
  - [x] 1.2 Props interface: `{ sectionId: string; className?: string }` — `sectionId` is received but not used yet (Story 5.5 wires the Server Action); accept it now so Story 5.5 does not change the call sites
  - [x] 1.3 Render a single `<MidgardButton tier="nano" type="button" className={className}>↺ regenerate</MidgardButton>`; no `onClick` handler — Story 5.5 adds regeneration logic
  - [x] 1.4 Import `MidgardButton` from `@/components/workspace/MidgardButton`

- [x] Task 2 — Create `ArtifactSection.tsx` (AC: #1, #2, #3)
  - [x] 2.1 Create `components/workspace/ArtifactSection.tsx` as `'use client'`
  - [x] 2.2 Import type: `import type { ArtifactSection as ArtifactSectionData } from '@/types/artifacts'` — alias required because the component file is also named `ArtifactSection`
  - [x] 2.3 Import: `SectionRegenerateControl` from `@/components/workspace/SectionRegenerateControl`; `cn` from `@/lib/utils`
  - [x] 2.4 Props interface:
    ```typescript
    interface ArtifactSectionProps {
      section: ArtifactSectionData
      pending?: boolean
    }
    ```
    `pending` is `true` when `section.body` is empty/falsy — parent (ArtifactContent) determines and passes this down
  - [x] 2.5 Generate a unique heading `id` for `aria-labelledby`: `const headingId = \`section-heading-${section.id}\``
  - [x] 2.6 Outer container: `<div className="group py-[22px] px-[28px] border-b border-mg-border last:border-b-0" aria-labelledby={headingId}>`
    - `group` enables Tailwind group-hover for SectionRegenerateControl visibility
    - `py-[22px] px-[28px]` per UX spec ContentBody padding
    - `border-b border-mg-border last:border-b-0` separates sections
  - [x] 2.7 Section header row (flex, space-between):
    ```tsx
    <div className="flex items-center gap-3 mb-2">
      <span className="font-mono text-[12px] text-mg-accent flex-shrink-0">
        {section.figureNumber}
      </span>
      <h3 id={headingId} className="font-mono text-[12px] text-mg-foreground flex-1">
        {section.title}
      </h3>
      <SectionRegenerateControl
        sectionId={section.id}
        className={cn(
          'flex-shrink-0 transition-opacity duration-150',
          pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      />
    </div>
    ```
  - [x] 2.8 Section body — conditional on `pending`:
    ```tsx
    {pending ? (
      <p className="font-mono text-[11px] text-mg-foreground-subtle">Not yet written.</p>
    ) : (
      <p className="text-sm text-mg-foreground leading-relaxed whitespace-pre-wrap">
        {section.body}
      </p>
    )}
    ```
  - [x] 2.9 Do NOT read from Zustand in this component — `regeneratingSection` loading state is Story 5.5; `activeRole` filtering is Story 5.4

- [x] Task 3 — Replace `ArtifactContent.tsx` stub with full implementation (AC: #1, #2, #3)
  - [x] 3.1 Keep `'use client'` directive and `ArtifactContentProps` interface unchanged (`artifacts: Artifact[]`)
  - [x] 3.2 Add imports:
    - `import { useWorkspaceStore } from '@/stores/workspace'`
    - `import { ArtifactSection } from '@/components/workspace/ArtifactSection'`
    - `import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'` — alias required because the component export is also named `ArtifactContent`
    - Keep existing `import type { Artifact } from '@/actions/projects'`
  - [x] 3.3 In component body: read `const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)` — do NOT read `activeRole` (Story 5.4) or `regeneratingSection` (Story 5.5)
  - [x] 3.4 Derive active artifact data:
    ```typescript
    const artifact = artifacts.find((a) => a.artifact_type === activeArtifact)
    const artifactData = artifact?.content as ArtifactContentData | undefined
    ```
    The `as` cast is safe: `artifact.content` is typed `Json` (Supabase) but was written by `analyze.ts` which validates the `ArtifactContent` shape before inserting. No runtime validation needed here.
  - [x] 3.5 Handle missing artifact — `artifact` may be absent if artifacts array is empty (edge case; `phase = 'workspace'` means all 4 were generated, but defend against stale/missing data):
    ```tsx
    if (!artifact || !artifactData) {
      return (
        <div className="px-[28px] py-[22px]">
          <p className="font-mono text-[11px] text-mg-foreground-subtle">No content available.</p>
        </div>
      )
    }
    ```
  - [x] 3.6 Derive display values:
    ```typescript
    const typeLabel = `/${activeArtifact}`
    const generatedAt = new Date(artifact.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    ```
  - [x] 3.7 Render ContentHeader (sticky):
    ```tsx
    <div className="sticky top-0 z-10 bg-mg-background border-b border-mg-border px-[28px] py-4 flex items-baseline gap-4">
      <span className="font-mono text-[11px] text-mg-foreground-subtle">{typeLabel}</span>
      <h2 className="font-mono text-[13px] text-mg-foreground flex-1">{artifactData.title}</h2>
      <span className="font-mono text-[10px] text-mg-foreground-subtle flex-shrink-0">{generatedAt}</span>
    </div>
    ```
    ContentHeader must use `bg-mg-background` (not `bg-mg-surface`) so it covers scrolling content behind it. The scroll container is `flex-1 overflow-y-auto` in `ArtifactWorkspace.tsx` — `sticky top-0` positions relative to that scroll container.
  - [x] 3.8 Render section list below header:
    ```tsx
    <div>
      {artifactData.sections.map((section) => (
        <ArtifactSection
          key={section.id}
          section={section}
          pending={!section.body}
        />
      ))}
    </div>
    ```
  - [x] 3.9 Full component return: ContentHeader + section list wrapped in a single `<div>` — no extra outer wrapper needed; ArtifactWorkspace already provides the scrollable `flex-1 overflow-y-auto` container

- [x] Task 4 — Validation (AC: all)
  - [x] 4.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 4.2 `pnpm lint` — zero ESLint errors
  - [x] 4.3 `pnpm dev` — dev server starts clean; no console errors (manual)
  - [x] 4.4 Manual (Jason verifies): Realm with generated artifacts → workspace shows; switching artifact types in the index panel → ContentHeader updates (slash tag + title + date change); sections render with figure numbers, titles, and body text
  - [x] 4.5 Manual (Jason verifies): Hover over a section → "↺ regenerate" button fades in (150ms); move cursor off → fades out; button is right-aligned in the header row
  - [x] 4.6 Manual (Jason verifies): ContentHeader stays fixed at the top of the content panel as the section list scrolls underneath

## Dev Notes

### What This Story Builds

Story 5.2 left `ArtifactContent.tsx` as a stub showing `/{activeArtifact} (Story 5.3)`. This story replaces that stub with a real rendering component backed by artifact data from Supabase. It also creates `ArtifactSection.tsx` and a `SectionRegenerateControl.tsx` stub.

`ArtifactWorkspace.tsx` does NOT change. It already passes `artifacts` to `<ArtifactContent artifacts={artifacts} />` correctly.

### Critical: Name Collision Between Component and Type

`ArtifactContent` is both:
- The **component export** in `components/workspace/ArtifactContent.tsx`
- A **type** in `types/artifacts.ts` (`{ title: string; sections: ArtifactSection[] }`)

Similarly, `ArtifactSection` is both:
- The **component** in `components/workspace/ArtifactSection.tsx`
- A **type** in `types/artifacts.ts` (`{ id, figureNumber, title, body, roles }`)

Always alias type imports:
```typescript
// In ArtifactContent.tsx
import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'

// In ArtifactSection.tsx
import type { ArtifactSection as ArtifactSectionData } from '@/types/artifacts'
```

Failure to alias will cause a TypeScript error: "Cannot redeclare block-scoped variable" or "Duplicate identifier."

### Artifact.content Is `Json` — Type Assertion Required

`Artifact.content` is typed as `Json` by the Supabase type generator (`string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`). The actual runtime shape is `ArtifactContentData` (written by `analyze.ts` which validates before inserting). Cast with:

```typescript
const artifactData = artifact?.content as ArtifactContentData | undefined
```

Do NOT add runtime validation/guards on the shape here — the `analyzeBrief` function in `lib/claude/analyze.ts` already validates `title`, `sections`, `id`, `figureNumber`, `title`, `body`, `roles` before writing to DB. Adding duplicate validation adds noise.

### figure.figureNumber — Use Stored Value, Not Index

`ArtifactSection.figureNumber` is already stored in the DB as `"1.0"`, `"2.0"`, etc. (set by the Claude prompts in `lib/claude/prompts/`). Do NOT derive figure numbers from the array index (`index + 1 + '.0'`) — use `section.figureNumber` directly. This avoids drift if sections are ever reordered or a section is missing.

### Hover Reveal — Tailwind `group` + `group-hover`

ArtifactSection uses Tailwind's `group` utility on the container div:
```tsx
<div className="group ...">
  ...
  <SectionRegenerateControl
    sectionId={section.id}
    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
  />
```
`group-hover:opacity-100` fires when the cursor is anywhere inside the `group` div — including over the control itself. This is intentional and correct per UX spec.

For the `pending` state, `opacity-100` replaces the group-hover pattern so the control is always visible.

### Sticky ContentHeader — Background Token

The sticky ContentHeader must use `bg-mg-background` (#0A0A0A), not `bg-mg-surface`. The scroll container in `ArtifactWorkspace.tsx` (`<div className="flex-1 overflow-y-auto">`) has a `bg-mg-surface` or transparent background — sections scroll beneath the sticky header. Using `bg-mg-surface` for the header would still show content bleeding through because the section rows themselves may have `bg-mg-background`. Use `bg-mg-background` to guarantee the header masks all underlying content.

### SectionRegenerateControl Stub — Why sectionId Now

Story 5.5 (`regenerateSection` Server Action) needs `sectionId`, `projectId`, and `artifactType` to identify which section to regenerate. Introduce `sectionId` now (it's available from `section.id`) so Story 5.5 only needs to add `projectId` and `artifactType` — not change every `<SectionRegenerateControl>` call site.

Do NOT add `projectId` or `artifactType` yet — they'd require plumbing props down through `ArtifactContent → ArtifactSection → SectionRegenerateControl` before Story 5.5 establishes the prop flow. Stub with just `sectionId` to keep this story minimal.

### activeRole — Do Not Implement Yet

`useWorkspaceStore` has `activeRole: string | null`. Story 5.4 wires `RoleFilterToggle` to set this and Story 5.4 adds filtering logic to `ArtifactContent`. This story must NOT read `activeRole` or hide/filter sections by role — that is Story 5.4's responsibility. Implementing partial role filtering here would create a gap Story 5.4 has to undo.

### regeneratingSection — Do Not Implement Yet

`useWorkspaceStore` has `regeneratingSection: string | null`. Story 5.5 uses this to replace a section's body with a `regenerating...` inline indicator. This story must NOT read `regeneratingSection` — Story 5.5 will update `ArtifactSection.tsx` to add the loading state.

### Design Token Quick Reference

| Intent | Tailwind class |
|--------|---------------|
| Figure number | `font-mono text-[12px] text-mg-accent` |
| Section title (h3) | `font-mono text-[12px] text-mg-foreground` |
| Section body | `text-sm text-mg-foreground leading-relaxed` |
| ContentHeader type tag | `font-mono text-[11px] text-mg-foreground-subtle` |
| ContentHeader title | `font-mono text-[13px] text-mg-foreground` |
| ContentHeader generated-at | `font-mono text-[10px] text-mg-foreground-subtle` |
| Section-pending label | `font-mono text-[11px] text-mg-foreground-subtle` |
| ContentHeader background | `bg-mg-background` |
| Section divider | `border-b border-mg-border` |

### No New Files Outside `components/workspace/`

- No Zustand store changes
- No Server Actions
- No Supabase migrations
- No changes to `ArtifactWorkspace.tsx`, `ArtifactIndexPanel.tsx`, `RoleFilterToggle.tsx`, or `WorkspaceShell.tsx`

### Anti-Patterns to Avoid

- **Do not** generate figure numbers from array index — use `section.figureNumber` from the stored data
- **Do not** import `ArtifactContent` type without aliasing — TypeScript will error on the duplicate identifier
- **Do not** import `ArtifactSection` type without aliasing in `ArtifactSection.tsx`
- **Do not** use `useState` for the hover state — Tailwind `group`/`group-hover` handles it in CSS; no JS needed
- **Do not** use relative imports — always `@/` alias
- **Do not** add `onClick` to `SectionRegenerateControl` — Story 5.5 owns all click/action logic
- **Do not** filter sections by `activeRole` — Story 5.4 owns that
- **Do not** add a loading state for `regeneratingSection` — Story 5.5 owns that
- **Do not** use `require()` — ESM only
- **Do not** use `bg-mg-surface` on ContentHeader — use `bg-mg-background` to mask scrolling content

### File Structure

```
components/workspace/
  ArtifactContent.tsx        ← REPLACE stub (Story 5.3)
  ArtifactSection.tsx        ← CREATE (Story 5.3)
  SectionRegenerateControl.tsx ← CREATE stub (Story 5.5 fills)
  ArtifactIndexPanel.tsx     (unchanged)
  RoleFilterToggle.tsx       (unchanged — stub from Story 5.2)
  ArtifactWorkspace.tsx      (unchanged)
  WorkspaceShell.tsx         (unchanged)
  AllFatherLoadingState.tsx  (unchanged)
  AttentionRegion.tsx        (unchanged)
  BriefInputSurface.tsx      (unchanged)
  MidgardButton.tsx          (unchanged)
```

### References

- [Source: epics.md#Story 5.3] — Acceptance criteria, figure number pattern, ContentHeader anatomy, hover-reveal timing, section-pending state
- [Source: ux-design-specification.md#ArtifactContent] — ContentHeader anatomy (type tag + title + generated-at, sticky); ContentBody padding (22px/28px); section-local loading states
- [Source: ux-design-specification.md#ArtifactSection] — Section header row layout (figure number + title + SectionRegenerateControl); body structure; hover/loading/error states
- [Source: ux-design-specification.md#SectionRegenerateControl] — "↺ regenerate", 11px mono, fg-subtle, opacity 0→1, 150ms, right-aligned; disabled during regeneration (Story 5.5)
- [Source: ux-design-specification.md#Accessibility] — `aria-labelledby` on ArtifactSection pointing to section heading
- [Source: ux-design-specification.md#Empty States] — "Not yet written." label (Geist Mono) + always-visible SectionRegenerateControl for section-pending
- [Source: types/artifacts.ts] — `ArtifactContent`, `ArtifactSection`, `ArtifactType` shapes — note name collision requiring import aliases
- [Source: lib/claude/analyze.ts#parseArtifactResponse] — Validates `ArtifactContent` shape before DB insert; confirms `figureNumber` is stored as string
- [Source: project-context.md#Framework-Specific Rules] — `mg-*` token prefix, flat directory structure, `@/` alias, pnpm only
- [Source: project-context.md#Critical Don't-Miss Rules] — `bg-mg-background` vs `bg-mg-surface` distinction; design token prefix rules
- [Source: 5-2-artifactindexpanel-and-navigation.md#Dev Notes] — ARTIFACT_TYPES/ARTIFACT_LABELS typed constant pattern; `'use client'` on all hook-using components
- [Source: 5-1-artifactworkspace-layout-and-two-panel-structure.md#Dev Notes] — ArtifactWorkspace scroll container context for sticky positioning

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Lint error on first pass: `_sectionId` destructured with underscore prefix — still flagged by `@typescript-eslint/no-unused-vars`. Fixed by following the Story 5.2 `RoleFilterToggle` stub pattern: destructure only `className`, leave `sectionId` in the interface but not in the function params.

### Completion Notes List

- Created `SectionRegenerateControl.tsx` stub: accepts `{ sectionId: string; className?: string }`; destructures only `className` to avoid ESLint no-unused-vars; renders `<MidgardButton tier="nano">↺ regenerate</MidgardButton>` with className forwarded for opacity control; no onClick handler (Story 5.5).
- Created `ArtifactSection.tsx`: imports `ArtifactSection as ArtifactSectionData` from `@/types/artifacts` to avoid name collision; Tailwind `group` on container enables CSS-only hover reveal; `pending` prop drives `opacity-100` vs `opacity-0 group-hover:opacity-100` on `SectionRegenerateControl`; `aria-labelledby` pointing to section `<h3>` per UX spec accessibility requirement; `section.figureNumber` used directly from stored DB value.
- Replaced `ArtifactContent.tsx` stub: imports `ArtifactContent as ArtifactContentData` alias; finds active artifact by `artifact_type === activeArtifact`; casts `artifact.content as ArtifactContentData | undefined`; defensive null guard returns "No content available." for missing artifact; sticky `ContentHeader` uses `bg-mg-background` (not `bg-mg-surface`) to mask scroll content; generated-at formatted via `toLocaleDateString`; does not read `activeRole` or `regeneratingSection` (Stories 5.4/5.5).
- `pnpm tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors.
- Manual validation tasks (4.3–4.6) left for Jason to verify in browser.

### File List

- `components/workspace/SectionRegenerateControl.tsx` — created (Task 1)
- `components/workspace/ArtifactSection.tsx` — created (Task 2)
- `components/workspace/ArtifactContent.tsx` — replaced stub (Task 3)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story status to in-progress → review
- `_bmad-output/implementation-artifacts/5-3-artifactcontent-and-artifactsection-components.md` — story file updated

## Review Findings

- [x] [Review][Decision] `aria-labelledby` on `ArtifactSection <div>` lacks `role="region"` — resolved: added `role="region"` to `ArtifactSection.tsx:16`; sections are now proper ARIA landmark regions.
- [x] [Review][Defer] Whitespace-only `section.body` renders as non-pending blank content `[ArtifactContent.tsx:40]` — deferred, pre-existing
- [x] [Review][Defer] Empty `sections` array produces blank content panel with no feedback `[ArtifactContent.tsx]` — deferred, pre-existing
- [x] [Review][Defer] `section.figureNumber` null/undefined renders empty accent span `[ArtifactSection.tsx:22]` — deferred, pre-existing
- [x] [Review][Defer] `artifact.created_at` null/invalid renders "Invalid Date" in ContentHeader `[ArtifactContent.tsx]` — deferred, pre-existing
- [x] [Review][Defer] `section.id` empty/non-unique causes `headingId` collision and React `key` conflict `[ArtifactSection.tsx:13]` — deferred, pre-existing

## Change Log

- 2026-05-06: Story 5.3 created — ArtifactContent full implementation, ArtifactSection new component, SectionRegenerateControl stub
- 2026-05-06: Story 5.3 implemented — SectionRegenerateControl stub, ArtifactSection with group-hover reveal, ArtifactContent stub replaced with full ContentHeader + section list; tsc and lint pass clean
- 2026-05-06: Code review complete — 1 decision-needed, 5 deferred, 12 dismissed
