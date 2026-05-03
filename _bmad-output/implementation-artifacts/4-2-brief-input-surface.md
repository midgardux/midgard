# Story 4.2: Brief Input Surface

Status: done

## Story

As a **solo designer**,
I want to submit my product brief by typing or pasting into a clean input area,
So that I can start the analysis process without any configuration or prompt engineering.

## Acceptance Criteria

1. **Given** I am on the workspace page for a new Realm (no artifacts yet)
   **When** the page loads
   **Then** the `BriefInputSurface` component is displayed — centered layout, max-width 580px, dominant on the page
   **And** the Textarea uses Geist Mono 13px with placeholder: "Describe your product to the Allfather."
   **And** a primary submit button is labeled "Invoke the Allfather"
   **And** a secondary file upload affordance is available (click or drag-drop) accepting `.docx`, `.pdf`, `.md`, `.txt`

2. **Given** the story is being implemented
   **When** `stores/workspace.ts` is created
   **Then** it exports `useWorkspaceStore` with initial state: `{ phase: 'input', activeArtifact: 'flows', activeRole: null, regeneratingSection: null }` typed as `WorkspaceStore` per the architecture doc
   **And** it exposes a `setPhase` action on the store

3. **Given** I type or paste a brief and click submit
   **When** the form is submitted
   **Then** the textarea and submit button are disabled (submitting state via `useTransition` `isPending`)
   **And** on success, the Zustand workspace store sets `phase = 'loading'`
   **And** the `submitBrief` Server Action is called with the brief text

4. **Given** I upload a `.docx` file
   **When** the file is processed server-side
   **Then** `mammoth` extracts plain text from the Word document via `lib/parsers/docx.ts`
   **And** the extracted text is passed as the brief — the file itself is never stored in Supabase

5. **Given** I upload a `.pdf` file
   **When** the file is processed server-side
   **Then** `pdf-parse` extracts plain text via `lib/parsers/pdf.ts`
   **And** the extracted text is passed as the brief

6. **Given** the workspace page renders with `artifacts.length === 0`
   **When** `WorkspaceShell` mounts
   **Then** `BriefInputSurface` is rendered in the input phase
   **And** for `phase = 'loading'`, a minimal loading placeholder renders (Story 4.4 replaces this with `AllFatherLoadingState`)
   **And** for `phase = 'workspace'`, a minimal artifact placeholder renders (Story 5.1 replaces with `ArtifactWorkspace`)

7. **Given** the workspace page renders with `artifacts.length > 0`
   **When** `WorkspaceShell` mounts
   **Then** `useEffect` sets Zustand `phase = 'workspace'` on first render
   **And** the artifact placeholder renders (Story 5.1 replaces)

## Tasks / Subtasks

- [x] Task 1 — Create Zustand workspace store (AC: #2)
  - [x] 1.1 Create `stores/workspace.ts`
  - [x] 1.2 Define `WorkspaceStore` type: `{ phase: 'input' | 'loading' | 'workspace'; activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'; activeRole: string | null; regeneratingSection: string | null }`
  - [x] 1.3 Add actions: `setPhase`, `setActiveArtifact`, `setActiveRole`, `setRegeneratingSection`
  - [x] 1.4 Export `useWorkspaceStore` — use Zustand `create()` with initial state matching AC #2
  - [x] 1.5 Do NOT use `create` with context/provider pattern — global singleton is correct for this workspace

- [x] Task 2 — Create file parser utilities (AC: #4, #5)
  - [x] 2.1 Create `lib/parsers/docx.ts`: export `parseDocx(buffer: Buffer): Promise<ActionResult<string>>` using `mammoth.extractRawText({ buffer })`
  - [x] 2.2 Create `lib/parsers/pdf.ts`: export `parsePdf(buffer: Buffer): Promise<ActionResult<string>>` using `pdfParse(buffer)`
  - [x] 2.3 Both parsers catch thrown errors and return `{ success: false, error: 'Could not read file.' }` — never let parser errors propagate
  - [x] 2.4 Both parsers trim the extracted text before returning

- [x] Task 3 — Create `submitBrief` Server Action stub (AC: #3)
  - [x] 3.1 Create `actions/analysis.ts` with `'use server'` directive
  - [x] 3.2 Export `submitBrief(projectId: string, formData: FormData): Promise<ActionResult<{ briefText: string }>>`
  - [x] 3.3 Extract `text` (string) and `file` (File | null) from `formData`
  - [x] 3.4 If file present and `file.size > 0`: determine extension, call appropriate parser; for `.md`/`.txt` use `file.text()`
  - [x] 3.5 Else: use trimmed `text` field
  - [x] 3.6 If `briefText` is empty after trimming: return `{ success: false, error: 'Brief text is required.' }`
  - [x] 3.7 Return `{ success: true, data: { briefText } }` — no AI call yet (Story 4.5 adds the pipeline)
  - [x] 3.8 Never throw — always return `ActionResult<T>`

- [x] Task 4 — Create `BriefInputSurface` component (AC: #1, #3, #4, #5)
  - [x] 4.1 Create `components/workspace/BriefInputSurface.tsx` with `'use client'` directive
  - [x] 4.2 Props: `{ projectId: string }`
  - [x] 4.3 Local state: `briefText: string`, `selectedFile: File | null`, `isDragOver: boolean`, `error: string | null`
  - [x] 4.4 Use `useTransition` — `isPending` drives disabled state on textarea and submit button
  - [x] 4.5 Double-submit guard: `if (isPending) return` as FIRST line of submit handler
  - [x] 4.6 Textarea: `className="font-mono text-[13px] bg-mg-surface text-mg-foreground placeholder:text-mg-foreground-subtle border border-mg-border w-full min-h-[160px] resize-y p-4 focus:outline-none focus:border-mg-foreground-subtle disabled:opacity-50"` placeholder `"Describe your product to the Allfather."`
  - [x] 4.7 Submit button: use `MidgardButton` (primary tier), label `"INVOKE THE ALLFATHER"`, disabled when `isPending || !briefText.trim() && !selectedFile`
  - [x] 4.8 File upload affordance: use `MidgardButton` (ghost tier) label `"Upload brief"` that triggers hidden `<input type="file" accept=".docx,.pdf,.md,.txt">` via ref click
  - [x] 4.9 Drag-drop: attach `onDragOver`, `onDragLeave`, `onDrop` to the outer container — `isDragOver` state adds `border-mg-foreground-subtle` highlight; `onDrop` sets `selectedFile` from `e.dataTransfer.files[0]` (validate extension)
  - [x] 4.10 When file is selected, show filename below the textarea using `text-mg-foreground-muted font-mono text-xs` — provide a clear/× button (Nano tier MidgardButton) to remove it
  - [x] 4.11 Error: render `AttentionRegion` (error variant) below the form when `error !== null` — clear on next submit attempt
  - [x] 4.12 On submit: build `FormData` with `text` and optional `file` fields → call `submitBrief(projectId, formData)` inside `startTransition` → on success call `setPhase('loading')` → on failure set `error` state
  - [x] 4.13 After calling `setPhase('loading')` on success, the `WorkspaceShell` takes over rendering — `BriefInputSurface` effectively hands off

- [x] Task 5 — Create `WorkspaceShell` Client Component (AC: #6, #7)
  - [x] 5.1 Create `components/workspace/WorkspaceShell.tsx` with `'use client'` directive
  - [x] 5.2 Props: `{ projectId: string; hasArtifacts: boolean; projectName: string }`
  - [x] 5.3 Read `phase` from `useWorkspaceStore()`
  - [x] 5.4 `useEffect([hasArtifacts])`: if `hasArtifacts`, call `setPhase('workspace')`; also reset to `'input'` on unmount if `!hasArtifacts`
  - [x] 5.5 Phase rendering:
    - `'input'` → `<BriefInputSurface projectId={projectId} />`
    - `'loading'` → `<div className="flex items-center justify-center min-h-[50vh]"><p className="font-mono text-xs text-mg-foreground-muted">The Allfather works…</p></div>` (Story 4.4 replaces)
    - `'workspace'` → `<div className="font-mono text-xs text-mg-foreground-muted p-6">Artifacts ready. (Story 5.1)</div>` (Story 5.1 replaces)

- [x] Task 6 — Update workspace page (AC: #6)
  - [x] 6.1 Read `app/(app)/projects/[projectId]/workspace/page.tsx` before modifying
  - [x] 6.2 Remove the `artifacts.length === 0` conditional rendering block and the stub artifact list
  - [x] 6.3 Pass `hasArtifacts={artifacts.length > 0}`, `projectId`, `projectName={project.name}` to `<WorkspaceShell />`
  - [x] 6.4 The nav bar with realm name + `DeleteRealmButton` stays — it renders above `WorkspaceShell`

- [x] Task 7 — Validation
  - [x] 7.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 7.2 `pnpm lint` — zero ESLint errors
  - [x] 7.3 `pnpm dev` — dev server starts; navigate to a new Realm workspace; `BriefInputSurface` renders
  - [ ] 7.4 Manual (Jason verifies): type in textarea → "Invoke the Allfather" button enabled; submit → textarea + button disabled during transition; page transitions to loading placeholder
  - [ ] 7.5 Manual (Jason verifies): drag a `.txt` file onto the surface → filename appears; click "Upload brief" → file picker opens for `.docx .pdf .md .txt`; remove file (×) works

## Dev Notes

### WorkspaceShell — Why It Exists

The `WorkspacePage` is a Server Component (data fetching). Zustand can only be read by Client Components. `WorkspaceShell` is the boundary: it receives server-fetched data as props and owns all Zustand-driven rendering. Stories 4.4 and 5.1 replace the placeholder divs in `WorkspaceShell` without touching the Server Component page.

**Do not** attempt to read `useWorkspaceStore` in the Server Component page or any Server Action — Zustand is browser-only.

### Zustand Store Implementation

```typescript
// stores/workspace.ts
import { create } from 'zustand'

type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
  setPhase: (phase: WorkspaceStore['phase']) => void
  setActiveArtifact: (artifact: WorkspaceStore['activeArtifact']) => void
  setActiveRole: (role: string | null) => void
  setRegeneratingSection: (sectionId: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  phase: 'input',
  activeArtifact: 'flows',
  activeRole: null,
  regeneratingSection: null,
  setPhase: (phase) => set({ phase }),
  setActiveArtifact: (activeArtifact) => set({ activeArtifact }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setRegeneratingSection: (regeneratingSection) => set({ regeneratingSection }),
}))
```

**No provider needed** — Zustand's global singleton is correct for a single workspace page. The store is scoped to the session naturally.

**Never use local `useState` for phase, activeArtifact, activeRole, or regeneratingSection** — these live in Zustand. This is enforced by the architecture. `useState` is only for component-local UI state (`briefText`, `selectedFile`, `isDragOver`, `error`, `isPending`).

### submitBrief Action Design

Story 4.2 creates a stub. Story 4.5 replaces the stub body with the full AI pipeline. The function signature must not change between stories.

```typescript
// actions/analysis.ts
'use server'

import type { ActionResult } from '@/types/actions'
import { parseDocx } from '@/lib/parsers/docx'
import { parsePdf } from '@/lib/parsers/pdf'

export async function submitBrief(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ briefText: string }>> {
  const text = ((formData.get('text') as string | null) ?? '').trim()
  const file = formData.get('file') as File | null

  let briefText: string

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parseDocx(buffer)
      if (!parsed.success) return parsed
      briefText = parsed.data.trim()
    } else if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parsePdf(buffer)
      if (!parsed.success) return parsed
      briefText = parsed.data.trim()
    } else {
      // .md or .txt
      briefText = (await file.text()).trim()
    }
  } else {
    briefText = text
  }

  if (!briefText) return { success: false, error: 'Brief text is required.' }

  // Story 4.3 adds: quality gate check
  // Story 4.5 adds: AI analysis pipeline, artifact storage, token tracking
  return { success: true, data: { briefText } }
}
```

### File Parser Implementations

```typescript
// lib/parsers/docx.ts
import mammoth from 'mammoth'
import type { ActionResult } from '@/types/actions'

export async function parseDocx(buffer: Buffer): Promise<ActionResult<string>> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return { success: true, data: result.value.trim() }
  } catch {
    return { success: false, error: 'Could not read file.' }
  }
}
```

```typescript
// lib/parsers/pdf.ts
import pdfParse from 'pdf-parse'
import type { ActionResult } from '@/types/actions'

export async function parsePdf(buffer: Buffer): Promise<ActionResult<string>> {
  try {
    const result = await pdfParse(buffer)
    return { success: true, data: result.text.trim() }
  } catch {
    return { success: false, error: 'Could not read file.' }
  }
}
```

**`pdf-parse` import note:** `pdf-parse` is a CommonJS module. TypeScript may flag the default import. If you see `Module has no default export`, add `"esModuleInterop": true` to tsconfig (likely already set by the starter). If the import fails at runtime on Vercel, the fallback is `import * as pdfParse from 'pdf-parse'` and calling `pdfParse.default(buffer)`.

**`mammoth` import note:** Same ESM situation — use the default import pattern. If TypeScript complains, try `import type` for the type and a dynamic import, or check if `@types/mammoth` resolves it correctly.

### BriefInputSurface Submission Pattern

Use `useTransition` from React — it handles the async Server Action call while keeping the UI responsive:

```typescript
'use client'
import { useTransition } from 'react'
import { submitBrief } from '@/actions/analysis'
import { useWorkspaceStore } from '@/stores/workspace'

export function BriefInputSurface({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition()
  const setPhase = useWorkspaceStore((s) => s.setPhase)
  // ... local state

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPending) return  // double-submit guard — FIRST line
    setError(null)

    const formData = new FormData()
    formData.append('text', briefText.trim())
    if (selectedFile) formData.append('file', selectedFile)

    startTransition(async () => {
      const result = await submitBrief(projectId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setPhase('loading')
    })
  }
}
```

**`isPending` vs local `isSubmitting`:** `isPending` from `useTransition` is `true` while the Server Action is running. Use it directly to disable the textarea and submit button. No separate `isSubmitting` state needed.

**`trim()` both paths:** Always trim text before appending to `FormData` and before validation. Whitespace-only input must not pass the empty check.

### Drag-and-Drop File Handling

Attach to the outer container div, not the textarea (so drops anywhere on the surface register):

```typescript
onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
onDragLeave={() => setIsDragOver(false)}
onDrop={(e) => {
  e.preventDefault()
  setIsDragOver(false)
  const file = e.dataTransfer.files[0]
  if (!file) return
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['docx', 'pdf', 'md', 'txt'].includes(ext)) {
    setError('Unsupported file type. Use .docx, .pdf, .md, or .txt.')
    return
  }
  setSelectedFile(file)
}}
```

When a file is selected (either via drop or click-to-upload), the textarea should not be disabled — the user may still edit text. The file takes precedence at submission time (if both are present, file wins).

### Component Using MidgardButton from Story 4.1

**Story 4.1 established:** `MidgardButton` at `components/workspace/MidgardButton.tsx`. `BriefInputSurface` is the **first consumer** of `MidgardButton`.

```tsx
// Primary submit button
<MidgardButton
  tier="primary"
  type="submit"
  disabled={isPending || (!briefText.trim() && !selectedFile)}
>
  INVOKE THE ALLFATHER
</MidgardButton>

// Ghost upload trigger
<MidgardButton
  tier="ghost"
  type="button"
  onClick={() => fileInputRef.current?.click()}
  disabled={isPending}
>
  Upload brief
</MidgardButton>

// Nano clear-file button
<MidgardButton
  tier="nano"
  type="button"
  onClick={() => setSelectedFile(null)}
  aria-label="Remove file"
>
  ×
</MidgardButton>
```

**Do NOT use `components/ui/button.tsx`** (shadcn `Button`) for any of these — that uses unprefixed shadcn tokens incompatible with Midgard's `mg-*` token system.

### AttentionRegion Error State

Use `AttentionRegion` from Story 4.1 for error display:

```tsx
{error && (
  <AttentionRegion variant="error" title="Something went wrong">
    <p className="font-mono text-xs text-mg-foreground">{error}</p>
  </AttentionRegion>
)}
```

**No toasts, no banners, no alerts** — per UX-DR20, all feedback goes through `AttentionRegion`. The error `AttentionRegion` does NOT use `trapFocus` in this component — focus remains in the form.

### Layout Spec (UX-DR5)

- Container: `max-w-[580px] mx-auto py-12 px-4` (centered, dominant on page)
- Optional label above textarea: `font-mono text-[10px] uppercase tracking-widest text-mg-foreground-subtle mb-2`
- Textarea: `font-mono text-[13px]` (not `text-sm` — spec is 13px Geist Mono, confirmed)
- Submit button row: `flex items-center gap-3 mt-4` with submit button left, upload trigger right
- File chip (when file selected): `flex items-center gap-1 font-mono text-xs text-mg-foreground-muted mt-2`

**No border-radius on textarea** — spec says `0 border-radius`. Use `rounded-none` or omit `rounded-*` entirely.

### Workspace Page After Modification

```tsx
// app/(app)/projects/[projectId]/workspace/page.tsx
export default async function WorkspacePage({ params }: Props) {
  const { projectId } = await params

  const projectResult = await getProject(projectId)
  if (!projectResult.success || !projectResult.data) notFound()
  const project = projectResult.data

  const artifactsResult = await getArtifacts(projectId)
  const artifacts = artifactsResult.success ? artifactsResult.data : []

  return (
    <main>
      <div className="border-b border-mg-border px-6 py-3 flex items-center justify-between">
        <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
        <DeleteRealmButton projectId={project.id} projectName={project.name} />
      </div>
      <WorkspaceShell
        projectId={project.id}
        projectName={project.name}
        hasArtifacts={artifacts.length > 0}
      />
    </main>
  )
}
```

The `WorkspaceShell` import is a Client Component — Next.js handles this correctly. The nav bar with `DeleteRealmButton` remains a Server Component and renders outside the shell.

### File Structure

```
stores/
  workspace.ts               ← CREATE: useWorkspaceStore

lib/
  parsers/
    docx.ts                  ← CREATE: mammoth wrapper
    pdf.ts                   ← CREATE: pdf-parse wrapper

actions/
  analysis.ts                ← CREATE: submitBrief stub

components/
  workspace/
    AttentionRegion.tsx      ← EXISTS (Story 4.1) — import for errors
    MidgardButton.tsx        ← EXISTS (Story 4.1) — import for buttons
    BriefInputSurface.tsx    ← CREATE
    WorkspaceShell.tsx       ← CREATE

app/(app)/projects/[projectId]/workspace/
  page.tsx                   ← MODIFY: render WorkspaceShell
```

### What Downstream Stories Depend On

| Dependency | Used by | How |
|---|---|---|
| `useWorkspaceStore` + `setPhase` | Story 4.3 | Quality gate sets errors; phase never enters 'loading' until quality passes |
| `useWorkspaceStore` + `setPhase` | Story 4.4 | `phase = 'loading'` triggers `AllFatherLoadingState`; Story 4.4 replaces the loading placeholder in WorkspaceShell |
| `submitBrief` signature | Story 4.3 | Quality gate wraps `submitBrief`; same `projectId + FormData` signature must be preserved |
| `submitBrief` signature | Story 4.5 | Replaces stub body with full AI pipeline |
| `WorkspaceShell` loading placeholder | Story 4.4 | Replace with `<AllFatherLoadingState />` |
| `WorkspaceShell` workspace placeholder | Story 5.1 | Replace with `<ArtifactWorkspace />` |

**Stories 4.1 → 4.2 → 4.3 → 4.4 → 4.5 must be implemented in sequence.** This story creates the Zustand store and `submitBrief` action signature that all subsequent Epic 4 stories depend on.

### Anti-Patterns to Avoid

- **Do not** use `components/ui/button.tsx` (shadcn) — use `MidgardButton`
- **Do not** use `useState` for `phase`, `activeArtifact`, `activeRole`, `regeneratingSection` — these belong in Zustand
- **Do not** store the uploaded file in Supabase — parse in-memory, discard the buffer
- **Do not** call `mammoth` or `pdf-parse` in a Client Component — parser runs in the Server Action only
- **Do not** use `src/` prefix in any import path — flat directory, `@/` alias only
- **Do not** use `next/font/google` for Geist fonts — use `geist/font/sans` and `geist/font/mono`
- **Do not** throw from `submitBrief` — return `ActionResult<T>` always
- **Do not** initialize `WorkspaceShell` with hardcoded phase — initial phase is always `'input'`; `useEffect` promotes to `'workspace'` when artifacts exist

### Token Reference

| Intent | Tailwind class |
|---|---|
| Textarea bg | `bg-mg-surface` |
| Textarea border | `border-mg-border` |
| Focused border | `focus:border-mg-foreground-subtle` |
| Placeholder text | `placeholder:text-mg-foreground-subtle` |
| Drag-over highlight | `border-mg-foreground-subtle` (conditional) |
| File name / metadata | `text-mg-foreground-muted` |
| Label above textarea | `text-mg-foreground-subtle` |

### References

- [Source: epics.md#Story 4.2] — acceptance criteria
- [Source: ux-design-specification.md#BriefInputSurface] — anatomy, states, layout
- [Source: ux-design-specification.md#UX-DR5] — BriefInputSurface spec (max-width 580px, Geist Mono 13px, states)
- [Source: architecture.md#Zustand workspace store shape] — `WorkspaceStore` type definition
- [Source: architecture.md#File parsing] — mammoth/pdf-parse server-side, no Supabase storage
- [Source: architecture.md#Directory Structure] — `stores/workspace.ts`, `lib/parsers/`, `actions/analysis.ts`
- [Source: project-context.md] — flat directory, mg-* tokens, pnpm only, ActionResult, form patterns
- [Source: implementation-artifacts/4-1-attentionregion-and-button-hierarchy-components.md#Dev Notes] — MidgardButton usage, AttentionRegion usage, token reference

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pdf-parse@2.4.5` has a completely new class-based API (`PDFParse` named export with `getText()` method); the old default-function pattern from v1 is gone. Updated `lib/parsers/pdf.ts` to use `new PDFParse({ data: buffer }).getText()`.
- Build error in `/projects` route (uncached data outside Suspense) is pre-existing; confirmed by stash/rebuild check — unrelated to this story.

### Completion Notes List

- Created `stores/workspace.ts` — global Zustand singleton with `phase`, `activeArtifact`, `activeRole`, `regeneratingSection` + setters. No provider needed.
- Created `lib/parsers/docx.ts` using `mammoth.extractRawText`. Created `lib/parsers/pdf.ts` using `new PDFParse({ data: buffer }).getText()` (v2 API).
- Created `actions/analysis.ts` — `submitBrief` stub returns `{ success: true, data: { briefText } }` without AI call; signature preserved for Stories 4.3 and 4.5.
- Created `components/workspace/BriefInputSurface.tsx` — `useTransition` for pending state, drag-drop with extension validation, file chip with × button, `AttentionRegion` error display, `MidgardButton` for all buttons.
- Created `components/workspace/WorkspaceShell.tsx` — `useEffect` promotes to `'workspace'` when artifacts exist; resets to `'input'` on unmount when no artifacts; renders three phase placeholders.
- Updated workspace page to replace inline conditionals with `<WorkspaceShell>`.
- `pnpm tsc --noEmit` and `pnpm lint` both pass with zero errors.

### File List

- `stores/workspace.ts` — CREATED
- `lib/parsers/docx.ts` — CREATED
- `lib/parsers/pdf.ts` — CREATED
- `actions/analysis.ts` — CREATED
- `components/workspace/BriefInputSurface.tsx` — CREATED
- `components/workspace/WorkspaceShell.tsx` — CREATED
- `app/(app)/projects/[projectId]/workspace/page.tsx` — MODIFIED

### Review Findings

#### Decision-Needed
- [x] [Review][Decision] File size cap — resolved: add 5 MB limit to submitBrief → converted to patch
- [x] [Review][Decision] MIME type validation beyond extension check — resolved: add MIME allowlist check server-side → converted to patch
- [x] [Review][Decision] aria-live / role="alert" for async error feedback — resolved: AttentionRegion already renders role="alert" for error variant (line 77); no patch needed → dismissed
- [x] [Review][Decision] Text + file both present — resolved: combine both with separator rather than file-wins; add UI hint when both present → converted to patch

#### Patches
- [x] [Review][Patch] `lib/parsers/pdf.ts` — CRITICAL: wrong API (false positive — pdf-parse v2.4.5 confirmed to export PDFParse class with getText(); current implementation is correct) → dismissed
- [x] [Review][Patch] `WorkspaceShell.tsx` — `useEffect` cleanup now unconditionally resets `phase` to `'input'` on unmount [components/workspace/WorkspaceShell.tsx:22]
- [x] [Review][Patch] `WorkspaceShell.tsx` — `projectName` interface correct per spec; ESLint blocks underscore-prefixed unused vars — interface enforces the prop contract via TypeScript; no destructuring change applied → dismissed
- [x] [Review][Patch] `BriefInputSurface.tsx` — Upload affordance replaced with `MidgardButton tier="ghost"` + hidden `<input ref={fileInputRef}>` triggered via ref click [components/workspace/BriefInputSurface.tsx:115-124]
- [x] [Review][Patch] `BriefInputSurface.tsx` — `handleFileSelect` and inline `onDrop` both call `setError(null)` before `setSelectedFile` on valid selection [components/workspace/BriefInputSurface.tsx:52, 86]
- [x] [Review][Patch] `BriefInputSurface.tsx` — Drag zone guards `onDragOver` and `onDrop` with `isPending` check [components/workspace/BriefInputSurface.tsx:67, 71]
- [x] [Review][Patch] `BriefInputSurface.tsx` — File input `onClick` resets `e.target.value` to `''` so same file can be re-selected after clear [components/workspace/BriefInputSurface.tsx:122]
- [x] [Review][Patch] `BriefInputSurface.tsx` — `startTransition` body wrapped in try/catch; catches unhandled exceptions and sets error state [components/workspace/BriefInputSurface.tsx:35-44]
- [x] [Review][Patch] `BriefInputSurface.tsx` — `onDragLeave` guards with `e.currentTarget.contains(e.relatedTarget)` to prevent child-element flicker [components/workspace/BriefInputSurface.tsx:68]
- [x] [Review][Patch] `BriefInputSurface.tsx` — `onDrop` rejects multi-file drops with explicit error [components/workspace/BriefInputSurface.tsx:72-75]
- [x] [Review][Patch] `lib/parsers/docx.ts` — Returns informative "no extractable text" error instead of empty success for image-only DOCX [lib/parsers/docx.ts:7-8]
- [x] [Review][Patch] `actions/analysis.ts` — `projectId` guard added; MIME allowlist check added; 5 MB size cap added; text + file content combined with separator [actions/analysis.ts:21-30, 43-50]

#### Deferred
- [x] [Review][Defer] Extension-only file type validation (no MIME/magic-byte check) [actions/analysis.ts:18] — deferred, security hardening; address before Story 4.5 ships
- [x] [Review][Defer] Global Zustand singleton state across multiple project tabs — deferred, requires context-provider refactor; out of scope for this story
- [x] [Review][Defer] `phase='loading'` + server revalidation race changing `hasArtifacts` mid-transition [components/workspace/WorkspaceShell.tsx:26-43] — deferred, not triggerable with stub action; revisit in Story 4.5
- [x] [Review][Defer] `×` close button character rendering inconsistency across monospace fonts — deferred, cosmetic

## Change Log

- 2026-05-02: Story 4.2 created — Brief Input Surface
- 2026-05-02: Story 4.2 implemented — BriefInputSurface, WorkspaceShell, Zustand store, submitBrief action stub, docx/pdf parsers
- 2026-05-02: Story 4.2 code review — 4 decision-needed, 12 patch, 4 deferred, 4 dismissed
