# Story 5.5: Section Regeneration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **solo designer**,
I want to regenerate a single artifact section without re-running the full analysis,
so that I can refine a specific output while keeping everything else intact.

## Acceptance Criteria

1. **Given** I hover an artifact section in the workspace
   **When** `SectionRegenerateControl` renders
   **Then** the "↺ regenerate" button is visible (opacity: 1) during hover; hidden (opacity: 0) otherwise, with 150ms transition

2. **Given** I click the `SectionRegenerateControl` on an artifact section
   **When** the action is triggered
   **Then** Zustand sets `regeneratingSection = sectionId`
   **And** that section's body is replaced with a local loading indicator: `regenerating...` (11px Geist Mono, `fg-muted`)
   **And** all other sections remain fully readable and interactive — no panel-level loading state
   **And** the `SectionRegenerateControl` button is disabled for ALL sections while any section is regenerating

3. **Given** the `regenerateSection` Server Action completes successfully
   **When** the response is received
   **Then** the section body updates in place with the new content (via `router.refresh()`)
   **And** Zustand sets `regeneratingSection = null`
   **And** `input_tokens` and `output_tokens` are written to `token_usage`

4. **Given** the regeneration Claude API call fails
   **When** the error is caught
   **Then** the section body is replaced with an AttentionRegion (error variant): "Regeneration failed. Try again." with a Ghost retry button
   **And** no `artifacts` or `token_usage` rows are written
   **And** the surrounding sections remain untouched
   **And** Zustand sets `regeneratingSection = null`

## Tasks / Subtasks

- [x] Task 1 — Create `lib/claude/regenerate.ts` (AC: #2, #3, #4)
  - [x] 1.1 Define `REGENERATION_SYSTEM_PROMPT` — instructs Claude to return a single section object (same `id`, `figureNumber`, `title`, `roles`; fresh `body`)
  - [x] 1.2 Define `parseRegeneratedSection(raw: string, originalSection: ArtifactSection): ArtifactSection | null` — strips code fences, JSON.parse, validates shape: `id`, `figureNumber`, `title` must match original; `body` must be non-empty string; `roles` must be string[]
  - [x] 1.3 Export `regenerateSingleSection(artifactType: ArtifactType, currentContent: ArtifactContent, sectionId: string): Promise<ActionResult<{ section: ArtifactSection; inputTokens: number; outputTokens: number }>>`:
    - Find section by `sectionId` in `currentContent.sections`; return error if not found
    - Build user message: `"Artifact type: ${artifactType}\n\nFull artifact:\n${JSON.stringify(currentContent)}\n\nRegenerate section id \"${sectionId}\" (title: \"${section.title}\"). Keep the same id, figureNumber, title, and roles. Generate a fresh body."`
    - Call `client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: REGENERATION_SYSTEM_PROMPT, messages: [{ role: 'user', content: userMessage }] })`
    - Extract `raw` from `response.content[0]`; call `parseRegeneratedSection`; return error if null
    - Return `{ success: true, data: { section: parsed, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } }`
    - Wrap entire call in try/catch; return `{ success: false, error: 'Regeneration failed. Try again.' }` on any throw

- [x] Task 2 — Create `actions/regeneration.ts` Server Action (AC: #2, #3, #4)
  - [x] 2.1 Add `'use server'` directive at top; import: `revalidatePath` from `'next/cache'`; `createServerClient` from `'@/lib/supabase/server'`; `regenerateSingleSection` from `'@/lib/claude/regenerate'`; `type { ActionResult }` from `'@/types/actions'`; `type { ArtifactContent, ArtifactSection, ArtifactType }` from `'@/types/artifacts'`; `type { Json }` from `'@/lib/supabase/types'`
  - [x] 2.2 Define input validation constants: `UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`; `VALID_TYPES = ['flows', 'personas', 'ia', 'synthesis'] as const`
  - [x] 2.3 Export `async function regenerateSection(projectId: string, artifactType: ArtifactType, sectionId: string): Promise<ActionResult<ArtifactSection>>`:
    - Input guard: `if (!UUID_RE.test(projectId) || !VALID_TYPES.includes(artifactType) || !sectionId?.trim()) return { success: false, error: 'Invalid request.' }`
    - Auth: `const supabase = await createServerClient(); const { data: { user }, error: authError } = await supabase.auth.getUser(); if (authError || !user) return { success: false, error: 'Not authenticated.' }`
    - Project ownership: fetch `artifacts` row via `.from('artifacts').select('id, content').eq('project_id', projectId).eq('artifact_type', artifactType).single()`; check `.eq` with `user_id` via a join or verify project ownership first by fetching project row (`projects.user_id === user.id`)
    - **Project ownership pattern** (matches existing codebase): fetch project first — `.from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single()` — return error if not found
    - Then fetch artifact: `.from('artifacts').select('id, content').eq('project_id', projectId).eq('artifact_type', artifactType).single()` — return error if not found
    - Cast content: `const currentContent = artifact.content as ArtifactContent`; validate has sections array
    - Call `regenerateSingleSection(artifactType, currentContent, sectionId)`; return error if `!result.success`
    - Build updated content: shallow-clone `currentContent.sections`, replace matched section by `sectionId` index
    - Update artifact: `.from('artifacts').update({ content: updatedContent as unknown as Json, updated_at: new Date().toISOString() }).eq('id', artifact.id)` — return error if update fails
    - Insert token_usage: `.from('token_usage').insert({ project_id: projectId, user_id: user.id, input_tokens: result.data.inputTokens, output_tokens: result.data.outputTokens })` — log error but do NOT block success
    - Call `revalidatePath(\`/projects/${projectId}/workspace\`)`
    - Return `{ success: true, data: result.data.section }`


- [x] Task 3 — Update `SectionRegenerateControl.tsx` (AC: #1, #2)
  - [x] 3.1 Add `onClick: () => void` and `disabled?: boolean` props to the interface (keep `sectionId` and `className`)
  - [x] 3.2 Wire `onClick` and `disabled` to the `MidgardButton`:
    ```tsx
    <MidgardButton tier="nano" type="button" className={className} onClick={onClick} disabled={disabled}>
      ↺ regenerate
    </MidgardButton>
    ```
  - [x] 3.3 Component stays 'use client' (import from MidgardButton still needed); no hooks added — purely presentational

- [x] Task 4 — Update `ArtifactSection.tsx` (AC: #2, #3, #4)
  - [x] 4.1 Add imports: `useState, useTransition` from `'react'`; `useRouter` from `'next/navigation'`; `useWorkspaceStore` from `'@/stores/workspace'`; `regenerateSection` from `'@/actions/regeneration'`; `AttentionRegion` from `'@/components/workspace/AttentionRegion'`; `MidgardButton` from `'@/components/workspace/MidgardButton'`; `type { ArtifactType }` from `'@/types/artifacts'`
  - [x] 4.2 Add `projectId: string` and `artifactType: ArtifactType` to `ArtifactSectionProps` interface
  - [x] 4.3 In component body:
    ```typescript
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [regenError, setRegenError] = useState<string | null>(null)
    const regeneratingSection = useWorkspaceStore((s) => s.regeneratingSection)
    const setRegeneratingSection = useWorkspaceStore((s) => s.setRegeneratingSection)
    const isRegenerating = regeneratingSection === section.id
    const isAnyRegenerating = regeneratingSection !== null
    ```
  - [x] 4.4 Implement `handleRegenerate`:
    ```typescript
    function handleRegenerate() {
      setRegenError(null)
      setRegeneratingSection(section.id)
      startTransition(async () => {
        const result = await regenerateSection(projectId, artifactType, section.id)
        if (!result.success) {
          setRegeneratingSection(null)
          setRegenError(result.error)
          return
        }
        router.refresh()
        setRegeneratingSection(null)
      })
    }
    ```
  - [x] 4.5 Update section body rendering — replace the existing `pending ? ... : ...` block with three-way conditional:
    - `isRegenerating` → `<p className="font-mono text-[11px] text-mg-foreground-muted">regenerating...</p>`
    - `regenError` → AttentionRegion error + retry:
      ```tsx
      <div className="mt-2">
        <AttentionRegion variant="error" aria-label="Regeneration error">
          <p className="font-mono text-xs text-mg-foreground">{regenError}</p>
          <div className="mt-3">
            <MidgardButton tier="ghost" onClick={handleRegenerate} disabled={isPending}>
              Try again
            </MidgardButton>
          </div>
        </AttentionRegion>
      </div>
      ```
    - `pending` → `<p className="font-mono text-[11px] text-mg-foreground-subtle">Not yet written.</p>`
    - default → `<p className="text-sm text-mg-foreground leading-relaxed whitespace-pre-wrap">{section.body}</p>`
  - [x] 4.6 Update `SectionRegenerateControl` usage:
    ```tsx
    <SectionRegenerateControl
      sectionId={section.id}
      onClick={handleRegenerate}
      disabled={isAnyRegenerating || isPending}
      className={cn(
        'flex-shrink-0 transition-opacity duration-150',
        pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}
    />
    ```
  - [x] 4.7 SectionRegenerateControl visibility: keep `pending ? 'opacity-100'` logic unchanged — when section has no body it stays visible; otherwise hover-reveal

- [x] Task 5 — Update `ArtifactContent.tsx` (AC: #2, #3)
  - [x] 5.1 Add `projectId: string` to `ArtifactContentProps` interface
  - [x] 5.2 In `ArtifactContent({ artifacts, projectId })`, pass down to each `ArtifactSection`:
    ```tsx
    <ArtifactSection
      key={section.id}
      section={section}
      pending={!section.body}
      projectId={projectId}
      artifactType={activeArtifact}
    />
    ```

- [x] Task 6 — Update `ArtifactWorkspace.tsx` (AC: #2, #3)
  - [x] 6.1 Pass `projectId` to `ArtifactContent` — currently `<ArtifactContent artifacts={artifacts} />` becomes:
    ```tsx
    <ArtifactContent artifacts={artifacts} projectId={projectId} />
    ```

### Review Findings

- [x] [Review][Decision] Error message text: fixed spec string vs. dynamic server errors — resolved: hardcoded to "Regeneration failed. Try again." in ArtifactSection.tsx

- [x] [Review][Patch] `sectionId` not UUID-validated before prompt injection [actions/regeneration.ts:18, lib/claude/regenerate.ts:71]
- [x] [Review][Patch] `stop_reason` not checked — truncated Claude response silently written to DB [lib/claude/regenerate.ts:80]
- [x] [Review][Patch] `router.refresh()` called before `setRegeneratingSection(null)` — swap order to prevent stuck loading state if refresh throws [components/workspace/ArtifactSection.tsx:93-95]
- [x] [Review][Patch] `sectionId` prop declared but unused in SectionRegenerateControl interface [components/workspace/SectionRegenerateControl.tsx:5]
- [x] [Review][Patch] Retry button in error state not disabled when `isAnyRegenerating` [components/workspace/ArtifactSection.tsx:122]

- [x] [Review][Defer] `JSON.stringify(currentContent)` has no size cap before sending to Claude — large artifacts may silently exceed context window [lib/claude/regenerate.ts:71] — deferred, pre-existing pattern
- [x] [Review][Defer] Section-level shape validation missing for individual sections (roles could be undefined in DB) [actions/regeneration.ts:46] — deferred, pre-existing data integrity concern
- [x] [Review][Defer] `token_usage` insert is awaited — adds latency before client response though correctness is unaffected [actions/regeneration.ts:64] — deferred, performance optimization
- [x] [Review][Defer] `section.title` interpolated unescaped in LLM prompt — DB-origin data, low practical risk [lib/claude/regenerate.ts:71] — deferred, pre-existing

- [ ] Task 7 — Validation (AC: all)
  - [x] 7.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 7.2 `pnpm lint` — zero ESLint errors
  - [x] 7.3 Manual (Jason verifies): Hover an artifact section → "↺ regenerate" button fades in; move away → fades out (150ms transition)
  - [x] 7.4 Manual (Jason verifies): Click regenerate → section body replaced with "regenerating..." text; all other sections remain readable; regenerate button disabled on ALL sections while pending
  - [x] 7.5 Manual (Jason verifies): Successful regeneration → section body updates with new content; loading state clears; all other sections unchanged
  - [x] 7.6 Manual (Jason verifies): Failed regeneration → section body shows AttentionRegion error with "Try again" button; clicking retry re-runs regeneration; surrounding sections unchanged

## Dev Notes

### What This Story Builds

`SectionRegenerateControl.tsx` is a non-functional stub from Story 5.2. This story wires it end-to-end: new `lib/claude/regenerate.ts` + new `actions/regeneration.ts` Server Action + `ArtifactSection.tsx` upgraded to manage regeneration state. Two intermediate components (`ArtifactContent`, `ArtifactWorkspace`) receive `projectId` prop additions to thread data down.

### No Brief Text in DB — Regeneration Uses Artifact Content as Context

`projects` table has no `brief_text` column — the brief is NOT persisted after analysis. `regenerateSingleSection` must use the existing artifact sections as context. Send the full `ArtifactContent` JSON in the user message so Claude can generate a section consistent with the others.

### Data Refresh Pattern — revalidatePath + router.refresh() (Not TanStack Query)

TanStack Query is installed (`@tanstack/react-query@^5.99.2`) but no `QueryClientProvider` is wired up in this codebase yet. Follow the **existing Story 4.5 pattern**: Server Action calls `revalidatePath`; client calls `router.refresh()` after the action resolves. The Next.js router re-renders the Server Component at `WorkspacePage`, which passes fresh `artifacts` props down to `ArtifactWorkspace → ArtifactContent → ArtifactSection`. Zustand state (`activeArtifact`, `activeRole`, `phase`) is preserved across the refresh since it lives in the client store.

Architecture doc says "TanStack Query invalidates ['artifact', projectId, artifactType]" — this is the intended eventual state, not the current implementation. Do NOT attempt to set up TanStack Query in this story.

### Zustand Store — Already Complete

`useWorkspaceStore` already has `regeneratingSection: string | null` and `setRegeneratingSection: (id: string | null) => void`. No store changes needed.

### regeneratingSection Is Singular — Single Active Regeneration

Only one section can regenerate at a time. `isAnyRegenerating = regeneratingSection !== null` is the correct check for disabling ALL regenerate buttons while one is in flight. Do NOT allow parallel section regenerations.

### Component Responsibility Allocation

`ArtifactSection` owns the regeneration business logic (server action call, Zustand state management, router refresh, local error state). `SectionRegenerateControl` is purely presentational — receives `onClick` and `disabled` props, renders the button. This mirrors how `ArtifactContent` owns filter logic while `RoleFilterToggle` is the chip display.

### JSONB Section Update Pattern

The `artifacts.content` column stores the full `ArtifactContent` object as JSONB. To update one section:
```typescript
const updatedSections = currentContent.sections.map((s) =>
  s.id === sectionId ? result.data.section : s
)
const updatedContent: ArtifactContent = { ...currentContent, sections: updatedSections }
// then: .update({ content: updatedContent as unknown as Json })
```
Do NOT update individual section fields — always replace the entire `content` JSONB object.

### Project Ownership Verification Pattern

Match `actions/projects.ts` pattern — fetch project first with `user_id` filter, THEN fetch artifact. Never trust `projectId` without verifying ownership:
```typescript
const { data: project } = await supabase
  .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single()
if (!project) return { success: false, error: 'Project not found.' }
```

### token_usage Insert — Non-Blocking

Token insert failures should log but NOT block the success return. Pattern from `actions/analysis.ts`:
```typescript
const tokenResult = await supabase.from('token_usage').insert({ ... })
if (tokenResult.error) console.error('token_usage insert failed:', tokenResult.error)
// proceed to revalidatePath and return success regardless
```

### ArtifactSection Three-Way State Render Order

The conditional priority in `ArtifactSection` body rendering:
1. `isRegenerating` → "regenerating..." (loading indicator)
2. `regenError` → AttentionRegion error + retry button
3. `pending` → "Not yet written." (no body in DB yet)
4. default → `section.body` (normal content)

Order matters: `isRegenerating` check must come BEFORE `regenError` to show loading immediately when regeneration starts (before any error can be set).

### SectionRegenerateControl Visibility During Regeneration

When `isRegenerating === true` for a section, the section's header row (and thus `SectionRegenerateControl`) still renders — only the BODY is replaced with the loading indicator. The UX spec says "Section header remains visible" during regeneration. The button is disabled (`isAnyRegenerating === true`) but still rendered with opacity-0/group-hover-opacity-100 logic unchanged.

### Error State: AttentionRegion Variant

Use `variant="error"` for the regeneration error. `AttentionRegion` uses `role="alert"` for error/warning variants (see `AttentionRegion.tsx:77`). No `trapFocus` needed — the retry button is inline, not a modal. No `title` prop needed — body text "Regeneration failed. Try again." is sufficient.

Do NOT use `variant="warning"` — the architecture specifies Error variant for regeneration failures.

### Regeneration System Prompt — Keep Separate

Do NOT reuse the artifact system prompts (`FLOWS_SYSTEM_PROMPT`, etc.) for regeneration. They expect the user message to be the brief text and produce a FULL artifact. The regeneration call needs a purpose-built prompt that accepts the current artifact as context and produces a single section. Define `REGENERATION_SYSTEM_PROMPT` as a module-level constant in `lib/claude/regenerate.ts`.

### Files to Create

- `lib/claude/regenerate.ts` — new file (Task 1)
- `actions/regeneration.ts` — new file (Task 2)

### Files to Modify

- `components/workspace/SectionRegenerateControl.tsx` — add `onClick`, `disabled` props (Task 3)
- `components/workspace/ArtifactSection.tsx` — add regeneration logic + three-way state (Task 4)
- `components/workspace/ArtifactContent.tsx` — add `projectId` prop, pass to ArtifactSection (Task 5)
- `components/workspace/ArtifactWorkspace.tsx` — pass `projectId` to ArtifactContent (Task 6)

### Files NOT Changed

- `stores/workspace.ts` — `regeneratingSection` and `setRegeneratingSection` already exist; do not touch
- `types/artifacts.ts` — `ArtifactSection`, `ArtifactContent`, `ArtifactType` already defined; do not touch
- `lib/claude/analyze.ts` — original analysis pipeline; do not touch
- `lib/claude/client.ts` — shared Claude API client; import with `getClaudeClient()`, do not modify
- `components/workspace/RoleFilterToggle.tsx` — role filtering; do not touch
- Any Supabase migration files — schema is unchanged

### Anti-Patterns to Avoid

- **Do not** call `anthropic.messages.create()` directly — always use `getClaudeClient()` from `@/lib/claude/client`
- **Do not** throw from `regenerateSection` Server Action — always return `ActionResult<T>` shape
- **Do not** set up TanStack Query — use `revalidatePath` + `router.refresh()` (existing pattern)
- **Do not** change `regeneratingSection` store type to `string[]` — one active regeneration at a time
- **Do not** allow parallel regenerations — `isAnyRegenerating` check disables all buttons while one is pending
- **Do not** write partial state on failure — if `regenerateSingleSection` fails, return error immediately without writing to `artifacts` or `token_usage`
- **Do not** use relative imports — always `@/` alias
- **Do not** use `require()` — ESM only
- **Do not** replace the entire artifact content — only replace the one section in the sections array

### Design Token Reference

| Element | Tailwind classes |
|---------|-----------------|
| Loading indicator | `font-mono text-[11px] text-mg-foreground-muted` |
| "Not yet written" (existing) | `font-mono text-[11px] text-mg-foreground-subtle` |
| SectionRegenerateControl hidden | `opacity-0 group-hover:opacity-100` |
| SectionRegenerateControl pending-section | `opacity-100` |
| SectionRegenerateControl transition | `transition-opacity duration-150` |

### Project Structure Notes

- `components/workspace/` — flat; no subdirectories; new components at the same level
- `lib/claude/` — all Claude API wrappers here; `regenerate.ts` goes here
- `actions/` — all Server Actions here; `regeneration.ts` goes here
- `@/` alias maps to project root (confirmed by `tsconfig.json`)
- Use `pnpm` only — never `npm` or `yarn`

### References

- [Source: epics.md#Story 5.5] — User story, acceptance criteria, token_usage write requirement
- [Source: architecture.md#Communication Patterns] — Zustand store shape with `regeneratingSection: string | null`; TanStack Query key convention `['artifact', projectId, artifactType]`; `lib/claude/` isolation boundary; never throw from Server Actions
- [Source: architecture.md#Process Patterns] — Section regeneration loading mode: `regeneratingSection = sectionId`, section-local only
- [Source: architecture.md#Project Structure] — `lib/claude/regenerate.ts` and `actions/regeneration.ts` paths confirmed
- [Source: ux-design-specification.md#SectionRegenerateControl] — Hidden/visible states, 150ms opacity transition, nano button tier, right-aligned in header
- [Source: ux-design-specification.md#Mode 2: Section-Local] — Loading indicator: `regenerating...` lowercase mono fg-muted; header remains visible
- [Source: ux-design-specification.md#ArtifactSection states] — default, hover, loading, error states defined
- [Source: components/workspace/AttentionRegion.tsx] — `variant="error"` uses `border-mg-foreground-muted`; `role="alert"` set automatically for error/warning
- [Source: components/workspace/ArtifactSection.tsx] — Current pending state pattern; `group` class on wrapper div for hover-reveal
- [Source: components/workspace/SectionRegenerateControl.tsx] — Current stub; `sectionId` prop already defined
- [Source: components/workspace/ArtifactWorkspace.tsx] — `projectId` prop already in component; currently NOT passed to `ArtifactContent`
- [Source: actions/analysis.ts] — `revalidatePath` + `ActionResult<T>` pattern; project ownership check; token_usage non-blocking insert
- [Source: lib/claude/analyze.ts] — `getClaudeClient()` usage, `parseArtifactResponse` pattern, model constant `'claude-sonnet-4-6'`, `MAX_TOKENS = 4000`
- [Source: lib/claude/client.ts] — `getClaudeClient()` export
- [Source: 5-4-rolefiltertoggle.md#Dev Notes] — `'use client'` on all hook-using components; `@/` alias only; `ArtifactContent as ArtifactContentData` cast pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. `pnpm tsc --noEmit` and `pnpm lint` both passed clean on first attempt.

### Completion Notes List

- Created `lib/claude/regenerate.ts`: `REGENERATION_SYSTEM_PROMPT` instructs Claude to return a single section JSON; `parseRegeneratedSection` validates shape and hard-clamps `id`, `figureNumber`, `title`, `roles` to match the original (Claude cannot change identity fields); `regenerateSingleSection` calls Claude API with full artifact as context, returns section + token counts.
- Created `actions/regeneration.ts`: `'use server'` Server Action with UUID + artifact type input validation; auth check; project ownership check (matches `actions/projects.ts` pattern); artifact fetch; calls `regenerateSingleSection`; on success replaces the one section in `content.sections` array and updates the full JSONB; inserts `token_usage` (non-blocking on failure); calls `revalidatePath`; returns `ActionResult<ArtifactSection>`.
- Updated `SectionRegenerateControl.tsx`: stub replaced with `onClick: () => void` and `disabled?: boolean` props; purely presentational — no hooks.
- Updated `ArtifactSection.tsx`: added `projectId` + `artifactType` props; `useWorkspaceStore` reads `regeneratingSection`/`setRegeneratingSection`; `useTransition` + `useRouter` manage async flow; `handleRegenerate` sets Zustand state, calls server action, calls `router.refresh()` on success; four-way body render: regenerating → error → pending → normal.
- Updated `ArtifactContent.tsx`: added `projectId: string` prop; passes `projectId` and `artifactType={activeArtifact}` to each `ArtifactSection`.
- Updated `ArtifactWorkspace.tsx`: passes `projectId` to `ArtifactContent` (prop was already available but not forwarded).
- `pnpm tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors.
- Manual validation tasks (7.3–7.6) left for Jason to verify in browser.

### File List

- `lib/claude/regenerate.ts` — new file (Task 1)
- `actions/regeneration.ts` — new file (Task 2)
- `components/workspace/SectionRegenerateControl.tsx` — added onClick/disabled props (Task 3)
- `components/workspace/ArtifactSection.tsx` — added regeneration logic + three-way state (Task 4)
- `components/workspace/ArtifactContent.tsx` — added projectId prop, forwarded to ArtifactSection (Task 5)
- `components/workspace/ArtifactWorkspace.tsx` — passed projectId to ArtifactContent (Task 6)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story status
- `_bmad-output/implementation-artifacts/5-5-section-regeneration.md` — story file updated

## Change Log

- 2026-05-07: Story 5.5 implemented — section regeneration wired end-to-end: new Claude lib, new Server Action, SectionRegenerateControl stub replaced, ArtifactSection upgraded with four-state body rendering and regeneration business logic
