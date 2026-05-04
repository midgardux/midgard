# Story 4.3: Input Quality Gate

Status: done

## Story

As a **solo designer**,
I want the Allfather to ask me targeted follow-up questions if my brief is too thin,
So that I don't waste a generation on garbage output.

## Acceptance Criteria

1. **Given** I submit a brief missing one or more of: a target user role, a primary problem or goal, a product context
   **When** `quality-gate.ts` assesses the brief
   **Then** an AttentionRegion (Info variant) appears inline below the BriefInputSurface: "The Allfather needs more context." followed by up to two targeted questions specific to what is missing
   **And** the AttentionRegion contains an inline textarea for my answers
   **And** the original textarea remains visible and editable above — I am never forced to start over
   **And** the quality gate asks at most two questions before allowing analysis to proceed regardless

2. **Given** I answer the follow-up questions and resubmit
   **When** the enriched brief meets the quality threshold
   **Then** the AttentionRegion closes and the analysis pipeline proceeds
   **And** my answers are appended to the original brief before being sent to Claude

3. **Given** I submit a brief that already meets the quality threshold
   **When** `quality-gate.ts` assesses it
   **Then** no AttentionRegion appears and the analysis pipeline runs immediately

## Tasks / Subtasks

- [x] Task 1 — Create `lib/claude/client.ts` (AC: all)
  - [x] 1.1 Create `lib/claude/client.ts` — export `getClaudeClient()` as a singleton `Anthropic` instance
  - [x] 1.2 Read `ANTHROPIC_API_KEY` from `process.env` — throw at startup if missing (server-side only)
  - [x] 1.3 Use `import Anthropic from '@anthropic-ai/sdk'` (default import — `esModuleInterop` is true in tsconfig)
  - [x] 1.4 Lazy singleton pattern: create once on first call, reuse thereafter

- [x] Task 2 — Create `lib/claude/quality-gate.ts` (AC: #1, #2, #3)
  - [x] 2.1 Create `lib/claude/quality-gate.ts`
  - [x] 2.2 Export `QualityGateAssessment` type: `{ passes: boolean; questions: string[] }`
  - [x] 2.3 Export `assessBriefQuality(briefText: string): Promise<ActionResult<QualityGateAssessment>>`
  - [x] 2.4 Use `getClaudeClient()` — never call `new Anthropic()` directly
  - [x] 2.5 Model: `claude-haiku-4-5-20251001` (fast, cheap — classification task only)
  - [x] 2.6 System prompt: instruct Claude to assess whether the brief contains all three: (a) target user role, (b) primary problem or goal, (c) product context. Respond with valid JSON only matching `{ passes: boolean; questions: string[] }`. `questions` must be empty when `passes` is true; max 2 items when false; questions must be targeted to what is specifically missing.
  - [x] 2.7 Call `client.messages.create({ model, max_tokens: 300, system, messages: [{ role: 'user', content: briefText }] })`
  - [x] 2.8 Extract text from response: `response.content[0].type === 'text' ? response.content[0].text : ''`
  - [x] 2.9 Parse JSON — wrap in try/catch; on parse failure return `{ success: false, error: 'Quality assessment failed.' }`
  - [x] 2.10 Validate parsed shape: if `passes` not boolean or `questions` not string[], return failure
  - [x] 2.11 Clamp questions to max 2: `questions.slice(0, 2)`
  - [x] 2.12 On network/API error: catch and return `{ success: false, error: 'Quality assessment failed.' }`
  - [x] 2.13 Never throw — always return `ActionResult<QualityGateAssessment>`

- [x] Task 3 — Export `QualityGateChallenge` type and update `submitBrief` return type (AC: #1, #2, #3)
  - [x] 3.1 In `actions/analysis.ts`, define and export `QualityGateChallenge`: `{ questions: string[]; attempt: number }`
  - [x] 3.2 Change `submitBrief` return type to `Promise<ActionResult<{ briefText: string; qualityGate?: QualityGateChallenge }>>` — the optional field is the only signature change; callers that ignore it remain valid
  - [x] 3.3 Read `attempt` from `formData`: `const attempt = parseInt((formData.get('attempt') as string | null) ?? '0', 10)`
  - [x] 3.4 After `briefText` is resolved and validated, add quality gate logic block:
    - If `attempt >= 1`: skip quality gate, proceed (fall through to existing stub return)
    - Else: call `assessBriefQuality(briefText)` — if call fails, return the error result; if assessment returns `passes: false`, return `{ success: true, data: { briefText, qualityGate: { questions: assessment.questions, attempt: 0 } } }`
  - [x] 3.5 Keep the existing stub comment intact: `// Story 4.5 adds: AI analysis pipeline, artifact storage, token tracking`
  - [x] 3.6 Gate bypass path and passing gate path both fall through to: `return { success: true, data: { briefText } }` (no `qualityGate` field)

- [x] Task 4 — Update `BriefInputSurface.tsx` to handle quality gate response (AC: #1, #2)
  - [x] 4.1 Import `QualityGateChallenge` type from `@/actions/analysis`
  - [x] 4.2 Add local state: `qualityGateState: { questions: string[]; answers: string; attempt: number } | null` — init `null`
  - [x] 4.3 When `handleSubmit` receives `result.data.qualityGate` (truthy): set `qualityGateState({ questions, answers: '', attempt: result.data.qualityGate.attempt })` — do NOT call `setPhase('loading')`
  - [x] 4.4 When `handleSubmit` receives `result.success === true` and no `qualityGate`: call `setPhase('loading')` — same as before
  - [x] 4.5 Add `handleQualityGateSubmit()`: builds enriched brief (`briefText + '\n\n' + qualityGateState.answers`), appends to new `FormData` along with `attempt: '1'`, re-calls `submitBrief` inside `startTransition`; on success call `setPhase('loading')`; on failure set `error`; always clear `qualityGateState` before re-submit
  - [x] 4.6 Original `handleSubmit`: clear `qualityGateState` and `error` at the top (reset on fresh submit)
  - [x] 4.7 Add `formData.append('attempt', '0')` to the existing `handleSubmit` (marks first attempt explicitly — optional but consistent)
  - [x] 4.8 Render quality gate AttentionRegion BELOW the existing form, OUTSIDE `<form>` tag — so it doesn't interfere with the original form's submit
  - [x] 4.9 The original textarea must NOT be `disabled` when `qualityGateState` is active — the user must be able to edit their original brief
  - [x] 4.10 The original "INVOKE THE ALLFATHER" submit button IS disabled when `qualityGateState` is active and isPending is true — but must also be disabled while quality gate is visible? No — per AC the textarea remains editable. User may abandon the gate and re-submit the original. Keep original submit enabled.
  - [x] 4.11 Use `setQualityGateState` (functional update) for the answers onChange — never stale closure

- [x] Task 5 — Validation
  - [x] 5.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 5.2 `pnpm lint` — zero ESLint errors
  - [x] 5.3 `pnpm dev` — dev server starts; navigate to a new Realm workspace
  - [x] 5.4 Manual (Jason verifies): submit one-word brief → AttentionRegion appears with 1-2 targeted questions
  - [x] 5.5 Manual (Jason verifies): answer questions → click CONTINUE → loading placeholder appears
  - [x] 5.6 Manual (Jason verifies): submit a brief with clear user role + problem + context → no AttentionRegion; goes straight to loading placeholder
  - [x] 5.7 Manual (Jason verifies): submit brief → quality gate fires → edit original textarea while gate visible → re-submit original form → quality gate clears and runs fresh assessment

### Review Findings

- [x] [Review][Decision] Client-controlled attempt bypass — dismissed; quality gate is a UX guardrail, not a security control. Revisit when rate limiting is added (Story 7).
- [x] [Review][Patch] attempt NaN bypass — `parseInt` of a non-numeric string returns NaN; `NaN < 1` is `false`, silently skipping the gate on malformed input [actions/analysis.ts:31]
- [x] [Review][Patch] Empty questions array when passes:false — if all elements of `questions` fail the string type filter, the gate renders with no questions displayed [lib/claude/quality-gate.ts:63-65]
- [x] [Review][Patch] Textarea disabled incorrectly when qualityGateState active — Task 4.9 violation; `disabled={isPending}` should be `disabled={isPending && !qualityGateState}` [components/workspace/BriefInputSurface.tsx]
- [x] [Review][Patch] handleQualityGateSubmit does not clear error state — stale error from a prior submission remains visible when user hits CONTINUE; add `setError(null)` at top of handler [components/workspace/BriefInputSurface.tsx]
- [x] [Review][Patch] Quality gate textarea lacks aria-label — not programmatically associated with the questions above it; screen readers receive no context [components/workspace/BriefInputSurface.tsx]
- [x] [Review][Defer] Singleton client untestable; module-level state bleeds between tests [lib/claude/client.ts] — deferred, pre-existing
- [x] [Review][Defer] API key read once at construction; stale client if key rotates at runtime [lib/claude/client.ts] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded model string `claude-haiku-4-5-20251001` [lib/claude/quality-gate.ts] — deferred, pre-existing
- [x] [Review][Defer] Answers appended to brief without label or delimiter; model receives unlabeled context block [actions/analysis.ts] — deferred, Story 4.5 concern
- [x] [Review][Defer] Mid-string code fences not stripped by fence-removal regex [lib/claude/quality-gate.ts:44] — deferred, low probability with current model/prompt
- [x] [Review][Defer] QualityGateChallenge.attempt always returned as 0 from server; stored in component state but never read back [actions/analysis.ts, components/workspace/BriefInputSurface.tsx] — deferred, dead data

## Dev Notes

### Architecture: Where Quality Gate Lives

Per architecture doc, the analysis data flow is:
```
BriefInputSurface → submitBrief (Server Action)
  → parsers/ (if file upload)
  → claude/quality-gate.ts       ← THIS STORY
  → [AttentionRegion if thin brief]
  → claude/analyze.ts → 4 artifacts   ← Story 4.5
  → supabase: insert artifacts + token_usage
  → ActionResult<Artifacts>
```

`quality-gate.ts` is a Claude API call inside `lib/claude/` — never called directly from a component. All Claude calls go through `lib/claude/` wrapper. `actions/analysis.ts` is the only caller of `assessBriefQuality`.

### `lib/claude/client.ts`

The `lib/claude/` directory exists but is empty — this is the first file created in it.

```typescript
// lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}
```

**This is a Server-only module.** It will throw if imported in a Client Component because `process.env.ANTHROPIC_API_KEY` is not exposed to the browser. It is only ever imported from `lib/claude/quality-gate.ts` and later `lib/claude/analyze.ts` — both server-side only. Do NOT add `'use client'` to any file that imports this.

### `lib/claude/quality-gate.ts`

```typescript
// lib/claude/quality-gate.ts
import { getClaudeClient } from '@/lib/claude/client'
import type { ActionResult } from '@/types/actions'

export type QualityGateAssessment = {
  passes: boolean
  questions: string[]
}

const SYSTEM_PROMPT = `You are assessing whether a product brief contains enough information to generate meaningful UX artifacts.

A brief is SUFFICIENT if it includes all three:
1. A target user role (who will use this product, e.g. "freelance designer", "small business owner")
2. A primary problem or goal (what they need to accomplish or what pain they have)
3. A product context (what type of product or domain this is, e.g. "mobile invoicing app", "B2B SaaS dashboard")

Respond with valid JSON only — no prose, no markdown, no code fences. Schema:
{
  "passes": boolean,
  "questions": string[]
}

Rules:
- "passes": true if all three elements are present; false otherwise
- "questions": empty array when passes is true; 1-2 targeted questions when false
- Questions must be specific to what is missing — do not ask generically
- Each question must be answerable in 1-2 sentences
- Do not ask about things already mentioned in the brief`

export async function assessBriefQuality(
  briefText: string
): Promise<ActionResult<QualityGateAssessment>> {
  try {
    const client = getClaudeClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: briefText }],
    })

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return { success: false, error: 'Quality assessment failed.' }
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).passes !== 'boolean' ||
      !Array.isArray((parsed as Record<string, unknown>).questions)
    ) {
      return { success: false, error: 'Quality assessment failed.' }
    }

    const assessment = parsed as { passes: boolean; questions: unknown[] }
    const questions = assessment.questions
      .filter((q): q is string => typeof q === 'string')
      .slice(0, 2)

    return { success: true, data: { passes: assessment.passes, questions } }
  } catch {
    return { success: false, error: 'Quality assessment failed.' }
  }
}
```

**Model choice:** `claude-haiku-4-5-20251001` — this is a classification task (does the brief contain X, Y, Z?). Haiku is fast (<1s typically) and cheap. Story 4.5's `analyze.ts` will use Sonnet for the full artifact generation.

**Do not add `export default`** — named export only, consistent with all other lib modules in this project.

### `actions/analysis.ts` — Updated `submitBrief`

```typescript
'use server'

import type { ActionResult } from '@/types/actions'
import { parseDocx } from '@/lib/parsers/docx'
import { parsePdf } from '@/lib/parsers/pdf'
import { assessBriefQuality } from '@/lib/claude/quality-gate'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/markdown',
  'text/plain',
  'text/x-markdown',
]

export type QualityGateChallenge = {
  questions: string[]
  attempt: number
}

export async function submitBrief(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ briefText: string; qualityGate?: QualityGateChallenge }>> {
  if (!projectId?.trim()) return { success: false, error: 'Invalid project.' }

  const text = ((formData.get('text') as string | null) ?? '').trim()
  const file = formData.get('file') as File | null
  const attempt = parseInt((formData.get('attempt') as string | null) ?? '0', 10)

  let briefText: string

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) return { success: false, error: 'File must be under 5 MB.' }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Unsupported file type. Use .docx, .pdf, .md, or .txt.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    let fileText: string

    if (ext === 'docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parseDocx(buffer)
      if (!parsed.success) return parsed
      fileText = parsed.data
    } else if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parsePdf(buffer)
      if (!parsed.success) return parsed
      fileText = parsed.data
    } else {
      fileText = (await file.text()).trim()
    }

    briefText = text ? `${fileText}\n\n---\n\n${text}` : fileText
  } else {
    briefText = text
  }

  if (!briefText) return { success: false, error: 'Brief text is required.' }

  if (attempt < 1) {
    const gateResult = await assessBriefQuality(briefText)
    if (!gateResult.success) return gateResult
    if (!gateResult.data.passes) {
      return {
        success: true,
        data: { briefText, qualityGate: { questions: gateResult.data.questions, attempt: 0 } },
      }
    }
  }

  // Story 4.5 adds: AI analysis pipeline, artifact storage, token tracking
  return { success: true, data: { briefText } }
}
```

**Key invariant:** `attempt >= 1` bypasses the gate entirely — the user answered (or could have been asked twice). Story 4.5 replaces the final stub return without changing the function signature.

### `BriefInputSurface.tsx` — Quality Gate State

The component needs one new state variable and one new handler:

```typescript
// New state
const [qualityGateState, setQualityGateState] = useState<{
  questions: string[]
  answers: string
  attempt: number
} | null>(null)

// handleSubmit — changes
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (isPending) return
  setError(null)
  setQualityGateState(null)  // reset gate on fresh submit

  const formData = new FormData()
  formData.append('text', briefText.trim())
  formData.append('attempt', '0')
  if (selectedFile) formData.append('file', selectedFile)

  startTransition(async () => {
    try {
      const result = await submitBrief(projectId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (result.data.qualityGate) {
        setQualityGateState({
          questions: result.data.qualityGate.questions,
          answers: '',
          attempt: result.data.qualityGate.attempt,
        })
        return
      }
      setPhase('loading')
    } catch {
      setError('Something went wrong. Please try again.')
    }
  })
}

// NEW handler for quality gate continuation
function handleQualityGateSubmit() {
  if (isPending || !qualityGateState) return
  const enrichedText = `${briefText.trim()}\n\n${qualityGateState.answers.trim()}`

  const formData = new FormData()
  formData.append('text', enrichedText)
  formData.append('attempt', '1')  // bypasses gate on server
  if (selectedFile) formData.append('file', selectedFile)

  setQualityGateState(null)

  startTransition(async () => {
    try {
      const result = await submitBrief(projectId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setPhase('loading')
    } catch {
      setError('Something went wrong. Please try again.')
    }
  })
}
```

**Why `setQualityGateState(null)` before `startTransition`:** The gate closes immediately when the user clicks Continue, giving instant feedback before the server round-trip completes. If the server returns an error, `setError` fires and the gate is already gone — the error AttentionRegion replaces it.

**Why the quality gate is OUTSIDE `<form>`:** The `AttentionRegion` with its own submit logic must not be wrapped by the original `<form onSubmit={handleSubmit}>`, or pressing Enter in its textarea would trigger the parent form's submit. Place the gate `div` after `</form>`.

### `AttentionRegion` — `trapFocus` usage

From Story 4.1, `AttentionRegion` supports `trapFocus={true}` — when set, focus moves to the title on mount and Tab cycles within the region. Use it for the quality gate because it has interactive controls (textarea + button). This is correct per the spec: "focus is trapped within the region and moves to the title on render" when actions are present.

The `aria-label` prop passes through to the region's `role="region"` attribute:
```tsx
<AttentionRegion
  variant="info"
  title="The Allfather needs more context."
  trapFocus={true}
  aria-label="Quality gate — additional context required"
>
```

### Handling `setQualityGateState` as Functional Update

The `onChange` for the answers textarea must use the functional form to avoid stale closure:
```tsx
onChange={(e) =>
  setQualityGateState((s) => (s ? { ...s, answers: e.target.value } : null))
}
```

Never write `setQualityGateState({ ...qualityGateState, answers: ... })` inside an async context — `qualityGateState` would be stale.

### Original Submit Still Works While Gate Is Visible

The original form's textarea stays enabled. If the user edits their brief and re-clicks "Invoke the Allfather", `handleSubmit` fires with the updated `briefText`, `setQualityGateState(null)` runs immediately (clearing the old gate), and a fresh quality assessment runs. This is exactly what the user expects — edit the brief to meet the threshold and re-submit.

The "INVOKE THE ALLFATHER" button's disabled state does NOT change when `qualityGateState` is active. It stays controlled by `isPending || (!briefText.trim() && !selectedFile)` — same as before.

### `types/artifacts.ts`

The file currently exists but is empty (1 line). Do NOT populate it in this story — artifact types belong to Story 4.5 when the actual pipeline is built. This story only needs `QualityGateChallenge` (exported from `actions/analysis.ts`, not `types/`).

### File Structure

```
lib/
  claude/
    client.ts              ← CREATE: Anthropic singleton
    quality-gate.ts        ← CREATE: assessBriefQuality()

actions/
  analysis.ts              ← MODIFY: add QualityGateChallenge type, attempt param, gate logic

components/
  workspace/
    BriefInputSurface.tsx  ← MODIFY: qualityGateState, handleQualityGateSubmit, gate UI
```

### What Downstream Stories Depend On

| Dependency | Used by | How |
|---|---|---|
| `getClaudeClient()` in `lib/claude/client.ts` | Story 4.5 | `analyze.ts` imports the same client |
| `assessBriefQuality` return shape | Story 4.5 | Confirms gate passes before full pipeline runs (already handled in `submitBrief`) |
| `submitBrief` signature (unchanged) | Story 4.5 | Replaces stub body with analysis pipeline; signature is stable |
| `qualityGate` optional field in return type | Story 4.5 | 4.5 won't return `qualityGate` (gate passes before analysis runs) — no consumer changes needed |
| `handleQualityGateSubmit` enrichment pattern | Story 4.5 | Enriched `briefText` (original + answers) is what gets sent to Claude for analysis |

### Anti-Patterns to Avoid

- **Do not** call `new Anthropic()` in `quality-gate.ts` — use `getClaudeClient()` always
- **Do not** call `assessBriefQuality` in a Client Component — it's a server-only function (uses API key)
- **Do not** put the quality gate `AttentionRegion` inside `<form>` — it has its own submit path
- **Do not** use `qualityGateState` directly (non-functional) in setState inside event handlers — use functional update
- **Do not** use `useState` for `phase` — that belongs in Zustand (`setPhase`)
- **Do not** use `src/` prefix — flat directory, `@/` alias maps to project root
- **Do not** use `next/font/google` — Geist fonts come from `geist/font/sans` and `geist/font/mono`
- **Do not** add `'use client'` to `lib/claude/client.ts` or `lib/claude/quality-gate.ts`

### Token Reference

| Intent | Tailwind class |
|---|---|
| Quality gate textarea bg | `bg-mg-surface` |
| Quality gate textarea border | `border-mg-border` |
| Quality gate textarea focus | `focus:border-mg-foreground-subtle` |
| Question text | `text-mg-foreground` |
| Placeholder in gate textarea | `placeholder:text-mg-foreground-subtle` |

### References

- [Source: epics.md#Story 4.3] — acceptance criteria, FR3/FR4/FR5 coverage
- [Source: ux-design-specification.md#BriefInputSurface] — states: idle, focused, quality-gate-active, submitting, error
- [Source: ux-design-specification.md#Form Patterns] — quality gate anatomy, "BriefInputSurface textarea — editable" stays above gate
- [Source: ux-design-specification.md#Feedback Patterns] — Info variant for quality gate questions
- [Source: architecture.md#API & Communication Patterns] — `lib/claude/` isolation; `lib/claude/quality-gate.ts` in directory listing
- [Source: architecture.md#Data flows] — analysis pipeline: parsers → quality-gate → analyze
- [Source: project-context.md] — `@anthropic-ai/sdk 0.90.0`, flat directory, `mg-*` tokens, ActionResult, pnpm only
- [Source: implementation-artifacts/4-2-brief-input-surface.md#Tasks] — `submitBrief` stub comment: "Story 4.3 adds: quality gate check"
- [Source: implementation-artifacts/4-2-brief-input-surface.md#Dev Notes] — `useTransition` pattern, MidgardButton usage, AttentionRegion error pattern, form anti-patterns
- [Source: implementation-artifacts/4-1-attentionregion-and-button-hierarchy-components.md] — AttentionRegion `trapFocus` prop usage

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `lib/claude/client.ts`: lazy singleton `getClaudeClient()` — throws on missing `ANTHROPIC_API_KEY`, no `'use client'`, named export only.
- Created `lib/claude/quality-gate.ts`: `assessBriefQuality()` calls `claude-haiku-4-5-20251001` with structured JSON prompt. Validates response shape, clamps questions to 2, never throws — always returns `ActionResult<QualityGateAssessment>`.
- Updated `actions/analysis.ts`: added `QualityGateChallenge` export, `attempt` param, quality gate bypass logic (`attempt >= 1`), and gate challenge return path. Preserved existing stub comment for Story 4.5.
- Updated `BriefInputSurface.tsx`: added `qualityGateState`, `handleQualityGateSubmit`, quality gate `AttentionRegion` rendered outside `<form>` with `trapFocus`, functional `setQualityGateState` updates, and gate cleared on fresh submit. Original textarea and submit button remain enabled when gate is active.
- Removed unused `QualityGateChallenge` type import in component (ESLint `no-unused-vars` — type inferred through `result.data`).
- `pnpm tsc --noEmit`: zero errors. `pnpm lint`: zero errors. Dev server: 200 OK on existing instance.
- Tasks 5.4–5.7 require manual browser verification by Jason.

### File List

- `lib/claude/client.ts` (created)
- `lib/claude/quality-gate.ts` (created)
- `actions/analysis.ts` (modified)
- `components/workspace/BriefInputSurface.tsx` (modified)

## Change Log

- 2026-05-03: Story 4.3 implemented — Anthropic client singleton, quality gate assessment via Claude Haiku, `submitBrief` updated with attempt-based bypass, `BriefInputSurface` updated with inline gate UI and continuation flow.
