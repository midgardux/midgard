# Story 4.5: AI Analysis Pipeline — Four Artifact Generation

Status: done

## Story

As a **solo designer**,
I want my brief to be analyzed and four UX artifacts generated — personas, user flows, IA, and synthesis,
So that I have a complete, structured UX foundation in under ten minutes.

## Acceptance Criteria

1. **Given** a brief has passed the quality gate
   **When** `analyze.ts` calls the Claude API via the `lib/claude/` wrapper
   **Then** the Claude API is called with structured prompts from `lib/claude/prompts/` (one per artifact type)
   **And** the response is parsed into four typed artifact objects: `ArtifactContent` (type: `'personas'`), `ArtifactContent` (type: `'flows'`), `ArtifactContent` (type: `'ia'`), `ArtifactContent` (type: `'synthesis'`)
   **And** all four artifacts are inserted into the `artifacts` table with the correct `project_id` and `artifact_type`
   **And** `input_tokens` and `output_tokens` from the API responses are aggregated and written to a single `token_usage` row

2. **Given** it is my first analysis on this account (`profiles.has_seen_disclosure = false`)
   **When** analysis completes
   **Then** a one-sentence disclosure is shown once: "Your input is processed by Anthropic's API and is not used to train models."
   **And** `profiles.has_seen_disclosure` is set to `true` — the disclosure never shows again

3. **Given** the Claude API call fails (network error, timeout, API error)
   **When** the error is caught in `analyze.ts`
   **Then** the Server Action returns `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }`
   **And** no `artifacts` or `token_usage` rows are written (no partial state)
   **And** the workspace `phase` returns to `'input'` and an AttentionRegion (Error variant) is shown with a retry option

4. **Given** the workspace `phase` is `'loading'` and analysis succeeds
   **When** `router.refresh()` causes the page to re-render with `hasArtifacts: true`
   **Then** `WorkspaceShell` transitions to `phase = 'workspace'` via the existing crossfade mechanism
   **And** the disclosure AttentionRegion renders above the workspace placeholder (if first analysis)

## Tasks / Subtasks

- [x] Task 1 — Define artifact types in `types/artifacts.ts` (AC: #1)
  - [x] 1.1 Define and export `ArtifactSection` type: `{ id: string; figureNumber: string; title: string; body: string; roles: string[] }` — `roles` is empty array for all-role content, populated for role-specific content (used by Epic 5 RoleFilterToggle)
  - [x] 1.2 Define and export `ArtifactContent` type: `{ title: string; sections: ArtifactSection[] }` — all four artifact types share this shape; the `artifact_type` column in Supabase distinguishes them
  - [x] 1.3 Define and export `ArtifactType` as: `type ArtifactType = 'personas' | 'flows' | 'ia' | 'synthesis'`
  - [x] 1.4 Define and export `AnalyzedArtifacts` type: `{ personas: ArtifactContent; flows: ArtifactContent; ia: ArtifactContent; synthesis: ArtifactContent; totalInputTokens: number; totalOutputTokens: number }`

- [x] Task 2 — Create Claude prompt files in `lib/claude/prompts/` (AC: #1)
  - [x] 2.1 Create `lib/claude/prompts/personas.ts` — export `PERSONAS_SYSTEM_PROMPT` constant; instruct Claude to analyze the brief and extract 3–5 distinct user personas; output MUST be valid JSON only (no prose, no markdown fences); schema: `{ "title": "User Personas", "sections": [{ "id": "persona-1", "figureNumber": "1.0", "title": "<Persona Name> — <Role>", "body": "<2-4 paragraphs covering needs, pain points, context, key behaviors>", "roles": ["<role name>"] }] }` — `roles` contains exactly one role name per persona
  - [x] 2.2 Create `lib/claude/prompts/flows.ts` — export `FLOWS_SYSTEM_PROMPT` constant; instruct Claude to generate a role-filtered user flow with 4–7 key journey stages; output: `{ "title": "User Flows", "sections": [{ "id": "flow-1", "figureNumber": "1.0", "title": "<Stage Name>", "body": "<Steps and touchpoints for this stage>", "roles": ["<role1>", "<role2>"] }] }` — `roles` lists which user roles participate in this stage; stages may have multiple roles or a single role
  - [x] 2.3 Create `lib/claude/prompts/ia.ts` — export `IA_SYSTEM_PROMPT` constant; instruct Claude to generate an information architecture with 4–6 primary areas; output: `{ "title": "Information Architecture", "sections": [{ "id": "ia-1", "figureNumber": "1.0", "title": "<IA Area Name>", "body": "<Navigation items, content types, and sub-sections in this area>", "roles": [] }] }` — IA sections always have empty `roles` (IA is role-agnostic)
  - [x] 2.4 Create `lib/claude/prompts/synthesis.ts` — export `SYNTHESIS_SYSTEM_PROMPT` constant; instruct Claude to generate 4–6 key synthesis insights or themes; output: `{ "title": "Synthesis Overview", "sections": [{ "id": "synthesis-1", "figureNumber": "1.0", "title": "<Insight Title>", "body": "<2-3 paragraphs explaining this theme and its implications>", "roles": [] }] }` — synthesis sections always have empty `roles`
  - [x] 2.5 All prompts MUST: specify "Respond with valid JSON only — no prose, no markdown, no code fences"; use `figureNumber` as "1.0", "2.0", "3.0" (not "1", "2", "3" — the decimal format is required for Epic 5 rendering); generate exactly the role names from the brief content (do not invent role names not implied by the brief)

- [x] Task 3 — Create `lib/claude/analyze.ts` (AC: #1, #3)
  - [x] 3.1 Import: `getClaudeClient` from `@/lib/claude/client`; `PERSONAS_SYSTEM_PROMPT` from `@/lib/claude/prompts/personas`; `FLOWS_SYSTEM_PROMPT` from `@/lib/claude/prompts/flows`; `IA_SYSTEM_PROMPT` from `@/lib/claude/prompts/ia`; `SYNTHESIS_SYSTEM_PROMPT` from `@/lib/claude/prompts/synthesis`; `ActionResult` from `@/types/actions`; `ArtifactContent`, `AnalyzedArtifacts` from `@/types/artifacts`
  - [x] 3.2 Define constants at module top: `const ANALYSIS_MODEL = 'claude-sonnet-4-6'` and `const MAX_TOKENS = 4000`
  - [x] 3.3 Define `parseArtifactResponse(raw: string): ArtifactContent | null` helper: strip markdown code fences using the same regex pattern as `quality-gate.ts`; parse JSON; validate `title` (string) + `sections` (array) + each section has `id` (string), `figureNumber` (string), `title` (string), `body` (string), `roles` (string[]); return null on any validation failure
  - [x] 3.4 Export `async function analyzeBrief(briefText: string): Promise<ActionResult<AnalyzedArtifacts>>` — wrap in try/catch; on any error return `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }`
  - [x] 3.5 Inside `analyzeBrief`: call all 4 Claude API calls in parallel using `Promise.all` — each call: `client.messages.create({ model: ANALYSIS_MODEL, max_tokens: MAX_TOKENS, system: <PROMPT>, messages: [{ role: 'user', content: briefText }] })`; if `Promise.all` rejects (any call fails), throw and let the outer catch return the error
  - [x] 3.6 After `Promise.all` resolves: extract text content from each response (`response.content[0]?.type === 'text' ? response.content[0].text : ''`); call `parseArtifactResponse` on each; if any parse result is null, return `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }` — no partial data
  - [x] 3.7 Aggregate token counts: `totalInputTokens = sum of all 4 response.usage.input_tokens`; `totalOutputTokens = sum of all 4 response.usage.output_tokens`
  - [x] 3.8 Return `{ success: true, data: { personas, flows, ia, synthesis, totalInputTokens, totalOutputTokens } }`

- [x] Task 4 — Add `runAnalysis` Server Action to `actions/analysis.ts` (AC: #1, #2, #3)
  - [x] 4.1 Add imports: `createServerClient` from `@/lib/supabase/server`; `analyzeBrief` from `@/lib/claude/analyze`; `revalidatePath` from `next/cache`
  - [x] 4.2 Export `async function runAnalysis(projectId: string, briefText: string): Promise<ActionResult<{ showDisclosure: boolean }>>` with `'use server'` directive at file top (already present)
  - [x] 4.3 Validate inputs: `if (!projectId?.trim() || !briefText?.trim()) return { success: false, error: 'Invalid request.' }`
  - [x] 4.4 Get authenticated user: `const supabase = await createServerClient(); const { data: { user }, error: authError } = await supabase.auth.getUser(); if (authError || !user) return { success: false, error: 'Not authenticated.' }`
  - [x] 4.5 Read `profiles.has_seen_disclosure` before analysis: `const { data: profile } = await supabase.from('profiles').select('has_seen_disclosure').eq('id', user.id).single()` — store `const hadSeenDisclosure = profile?.has_seen_disclosure ?? false`
  - [x] 4.6 Call `analyzeBrief(briefText)` — if result is not success, return the error directly without any DB writes
  - [x] 4.7 Delete any existing artifacts for this project before insert (idempotent retry support): `await supabase.from('artifacts').delete().eq('project_id', projectId)` — do NOT fail if this errors, just proceed
  - [x] 4.8 Insert all 4 artifacts in parallel: `await Promise.all(['personas', 'flows', 'ia', 'synthesis'].map((artifactType) => supabase.from('artifacts').insert({ project_id: projectId, artifact_type: artifactType, content: result.data[artifactType as keyof typeof result.data] as Json })))` — if any insert fails, return `{ success: false, error: 'Failed to save artifacts. Please try again.' }`
  - [x] 4.9 Insert token_usage row: `await supabase.from('token_usage').insert({ project_id: projectId, user_id: user.id, input_tokens: result.data.totalInputTokens, output_tokens: result.data.totalOutputTokens })` — if this fails, log but do NOT return an error (token tracking failure must not block the user)
  - [x] 4.10 If `!hadSeenDisclosure`: update `profiles.has_seen_disclosure = true`: `await supabase.from('profiles').update({ has_seen_disclosure: true }).eq('id', user.id)` — if fails, log but do not block
  - [x] 4.11 Call `revalidatePath('/projects/' + projectId + '/workspace')` — marks the page cache stale so `router.refresh()` fetches fresh artifacts
  - [x] 4.12 Return `{ success: true, data: { showDisclosure: !hadSeenDisclosure } }`

- [x] Task 5 — Update `stores/workspace.ts` (AC: #2, #3)
  - [x] 5.1 Add `analysisError: string | null` to `WorkspaceStore` type
  - [x] 5.2 Add `showDisclosure: boolean` to `WorkspaceStore` type
  - [x] 5.3 Add `setAnalysisError: (error: string | null) => void` to `WorkspaceStore` type
  - [x] 5.4 Add `setShowDisclosure: (show: boolean) => void` to `WorkspaceStore` type
  - [x] 5.5 Initialize both in the `create` call: `analysisError: null, showDisclosure: false`
  - [x] 5.6 Add the two setters in the `create` implementation: `setAnalysisError: (analysisError) => set({ analysisError })` and `setShowDisclosure: (showDisclosure) => set({ showDisclosure })`

- [x] Task 6 — Update `components/workspace/BriefInputSurface.tsx` (AC: #1, #3)
  - [x] 6.1 Add imports: `runAnalysis` from `@/actions/analysis`; `useRouter` from `next/navigation`; `useEffect` (already imported)
  - [x] 6.2 Read from Zustand store: `const analysisError = useWorkspaceStore((s) => s.analysisError)` and `const setAnalysisError = useWorkspaceStore((s) => s.setAnalysisError)` and `const setShowDisclosure = useWorkspaceStore((s) => s.setShowDisclosure)`
  - [x] 6.3 Initialize router: `const router = useRouter()`
  - [x] 6.4 Add `useEffect` to pull analysis error from Zustand into local state on mount: `useEffect(() => { if (analysisError) { setError(analysisError); setAnalysisError(null) } }, [])` — empty deps intentional: reads once on mount to recover from a prior failed analysis
  - [x] 6.5 In `handleSubmit`: after `setPhase('loading')`, continue in the same `startTransition` callback — do NOT await `setPhase('loading')` (it's synchronous) — add: `const analysisResult = await runAnalysis(projectId, result.data.briefText)` then handle result (see 6.6, 6.7)
  - [x] 6.6 On `runAnalysis` success: `if (analysisResult.data.showDisclosure) setShowDisclosure(true); router.refresh()` — `router.refresh()` causes the page to re-render with fresh `hasArtifacts: true`, triggering `WorkspaceShell.setPhase('workspace')`
  - [x] 6.7 On `runAnalysis` failure: `setAnalysisError(analysisResult.error); setPhase('input')` — Zustand carries the error across the remount; `BriefInputSurface` remounts via `setPhase('input')` and Task 6.4 picks up the stored error
  - [x] 6.8 In `handleQualityGateSubmit`: fix the enriched text format from deferred-work.md — change `const enrichedText = \`${briefText.trim()}\n\n${qualityGateState.answers.trim()}\`` to `const enrichedText = \`${briefText.trim()}\n\n---\nAdditional context:\n${qualityGateState.answers.trim()}\`` — labels the follow-up answers for Claude's prompt comprehension
  - [x] 6.9 In `handleQualityGateSubmit`: same pattern as `handleSubmit` — after `setPhase('loading')`, call `runAnalysis`, handle success/failure the same way using `result.data.briefText`
  - [x] 6.10 In `submitBrief` call within `handleQualityGateSubmit`: current code already calls `setPhase('loading')` on success (line ~82); add the same `runAnalysis` + `router.refresh()` logic here

- [x] Task 7 — Update `components/workspace/WorkspaceShell.tsx` (AC: #2, #4)
  - [x] 7.1 Add imports: `AttentionRegion` from `@/components/workspace/AttentionRegion`; `MidgardButton` from `@/components/workspace/MidgardButton`
  - [x] 7.2 Read from Zustand store: `const showDisclosure = useWorkspaceStore((s) => s.showDisclosure)` and `const setShowDisclosure = useWorkspaceStore((s) => s.setShowDisclosure)`
  - [x] 7.3 In the `phase === 'workspace'` branch, wrap the existing placeholder `<div>` with a wrapping `<div>` that conditionally renders the disclosure AttentionRegion first, then the placeholder (this is temporary — Story 5.1 replaces the placeholder with the actual workspace)
  - [x] 7.4 Disclosure AttentionRegion: `<AttentionRegion variant="info" title="A note about your data">` — body: `<p className="font-mono text-xs text-mg-foreground">Your input is processed by Anthropic's API and is not used to train models.</p>` — add a Ghost dismiss button below: `<div className="mt-3"><MidgardButton tier="ghost" type="button" onClick={() => setShowDisclosure(false)}>Dismiss</MidgardButton></div>` — wrap this in `{showDisclosure && (...)}` with a `className="px-6 pt-4"` container div
  - [x] 7.5 Ensure the workspace placeholder text remains unchanged: `"Artifacts ready. (Story 5.1)"` — Story 5.1 replaces this

- [x] Task 8 — Fix `submitBrief` input validation in `actions/analysis.ts` (deferred item from Story 4.2)
  - [x] 8.1 Harden the MIME type check: change `if (file.type && !ALLOWED_MIME_TYPES.includes(file.type))` to `if (!file.type || !ALLOWED_MIME_TYPES.includes(file.type))` — removes the bypass where missing `file.type` skips validation; now requires a known MIME type

- [x] Task 9 — Validation
  - [x] 9.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 9.2 `pnpm lint` — zero ESLint errors
  - [x] 9.3 `pnpm dev` — dev server starts clean
  - [x] 9.4 Manual (Jason verifies): submit a valid brief → loading state appears → ~30s later → workspace shows "Artifacts ready. (Story 5.1)" with disclosure AttentionRegion above it
  - [x] 9.5 Manual (Jason verifies): check Supabase → 4 artifact rows in `artifacts` table, 1 row in `token_usage`
  - [x] 9.6 Manual (Jason verifies): `profiles.has_seen_disclosure = true` after first analysis; disclosure does not appear on second analysis of a different Realm
  - [x] 9.7 Manual (Jason verifies): dismiss disclosure → it disappears; `phase` remains `'workspace'`
  - [x] 9.8 Manual (Jason verifies): simulate Claude API error (disconnect network during analysis) → loading state exits → brief input surface reappears → AttentionRegion Error variant shown with correct copy

### Review Findings

- [x] [Review][Patch] `useEffect` error-recovery stale closure — error may be silently dropped if component re-renders without a full unmount/remount cycle [`components/workspace/BriefInputSurface.tsx:34`]
- [x] [Review][Patch] `projectId` ownership not verified before artifact writes — any authenticated user can overwrite another project's artifacts [`actions/analysis.ts:83`]
- [x] [Review][Patch] Non-atomic delete+insert — partial artifact state left on insert failure; prior artifacts permanently lost [`actions/analysis.ts:107`]
- [x] [Review][Patch] `parseArtifactResponse` does not validate `roles` array element types as strings — `[null, 42]` passes validation [`lib/claude/analyze.ts:30`]
- [x] [Review][Patch] `briefText` length unbounded in `runAnalysis` — no max-length guard beyond `.trim()` check [`actions/analysis.ts:83`]
- [x] [Review][Patch] `revalidatePath` uses unsanitized string concatenation with `projectId` [`actions/analysis.ts:141`]
- [x] [Review][Patch] `analyzeBrief` `catch {}` swallows all errors with no `console.error` logging [`lib/claude/analyze.ts:68`]
- [x] [Review][Patch] `parseArtifactResponse` accepts empty `sections` array as valid — downstream renders silently show nothing [`lib/claude/analyze.ts:24`]
- [x] [Review][Patch] `parseArtifactResponse` fence-stripping regex fails when model prefixes JSON with prose text [`lib/claude/analyze.ts:14`]
- [x] [Review][Defer] No per-call timeout on `Promise.all` for Claude calls — hung call blocks entire analysis indefinitely [`lib/claude/analyze.ts:44`] — deferred, pre-existing
- [x] [Review][Defer] `router.refresh()` has no error callback — silent failure leaves user stuck on loading screen with no recovery path [`components/workspace/BriefInputSurface.tsx:75`] — deferred, pre-existing
- [x] [Review][Defer] Supabase `.single()` no-row for profiles — `has_seen_disclosure` flag never durably set for users with missing profile rows [`actions/analysis.ts:95`] — deferred, pre-existing
- [x] [Review][Defer] `hadSeenDisclosure` concurrent analysis race — two parallel submissions both see `false`, both show disclosure banner [`actions/analysis.ts:95`] — deferred, pre-existing
- [x] [Review][Defer] Role name consistency across prompts enforced only by prompt wording — no post-parse cross-validation [`lib/claude/analyze.ts`] — deferred, pre-existing
- [x] [Review][Defer] `stop_reason: 'max_tokens'` produces truncated JSON fragment with no logging — indistinguishable from malformed model output [`lib/claude/analyze.ts:62`] — deferred, pre-existing

#### Round 2 (2026-05-05)
- [x] [Review][Patch] Rollback `Promise.all` result unchecked — silent data loss if any rollback insert fails; project left with zero artifacts and no additional error surfaced [`actions/analysis.ts`]
- [x] [Review][Patch] `existingArtifacts` SELECT failure not guarded — if pre-delete query errors, `existingArtifacts` is `null`; delete still runs, inserts fail, rollback guard is falsy and skipped, project loses all artifacts [`actions/analysis.ts`]
- [x] [Review][Patch] Enriched text can silently exceed `MAX_BRIEF_LENGTH` — `handleQualityGateSubmit` builds `enrichedText = brief + answers` client-side before `runAnalysis`; combined length may exceed 50,000 chars, returning generic `'Invalid request.'` with no user-facing explanation [`components/workspace/BriefInputSurface.tsx:90`]
- [x] [Review][Patch] `catch` block after `runAnalysis` does not reset phase — if the Server Action throws, the workspace is permanently stuck on the loading screen with no recovery path [`components/workspace/BriefInputSurface.tsx`]
- [x] [Review][Defer] `WorkspaceShell` cleanup unconditionally resets `phase` to `'input'` on unmount — brief flash to input form when user navigates away and back; pre-existing, not in this story's diff [`components/workspace/WorkspaceShell.tsx:40-42`] — deferred, pre-existing
- [x] [Review][Defer] `has_seen_disclosure` DB update failure still returns `showDisclosure: true` — if the profiles update fails transiently, DB flag stays `false` and disclosure re-appears on every subsequent analysis [`actions/analysis.ts`] — deferred, pre-existing

## Dev Notes

### What This Story Builds and Why

Story 4.4 completed the loading state component. Story 4.5 is the core product: the AI pipeline that takes a quality-gated brief and produces four structured artifacts stored in Supabase. After this story, the workspace transition (loading → workspace) is a real event driven by actual data, not a placeholder.

The key architectural challenge: the loading state (`AllFatherLoadingState`) must be visible DURING analysis, not after. This requires:
1. `BriefInputSurface` calls `setPhase('loading')` (synchronous, immediate)
2. The loading component renders — user sees it
3. `BriefInputSurface` then calls `runAnalysis` (async, continues in background)
4. After `runAnalysis` completes, `router.refresh()` triggers a page re-render with `hasArtifacts: true`
5. `WorkspaceShell` detects `hasArtifacts: true` → `setPhase('workspace')` → crossfade plays

### Critical Architecture: Two-Step Client Flow

The `setPhase('loading')` call and the `runAnalysis` call are BOTH inside the same `startTransition` async callback. After `setPhase('loading')`, React/Zustand updates the UI (unmounting `BriefInputSurface` and showing `AllFatherLoadingState`). The `startTransition` callback continues executing even though `BriefInputSurface` has unmounted. This is safe in React 18.

```
startTransition(async () => {
  // Step 1: quality gate check
  const result = await submitBrief(projectId, formData)
  if (!result.success || result.data.qualityGate) { ... handle ... }

  // Step 2: set loading state IMMEDIATELY (synchronous Zustand update)
  setPhase('loading')

  // Step 3: run analysis AFTER loading state is visible
  // BriefInputSurface is now unmounted, but this callback continues
  const analysisResult = await runAnalysis(projectId, result.data.briefText)

  if (!analysisResult.success) {
    setAnalysisError(analysisResult.error)  // Zustand — safe after unmount
    setPhase('input')  // Zustand — BriefInputSurface remounts and reads error
    return
  }

  if (analysisResult.data.showDisclosure) setShowDisclosure(true)  // Zustand
  router.refresh()  // Triggers page re-render with hasArtifacts: true
})
```

### `lib/claude/analyze.ts` — Full Implementation Shape

```typescript
'use server' // NOT needed here — lib files are not Server Actions

import { getClaudeClient } from '@/lib/claude/client'
import { PERSONAS_SYSTEM_PROMPT } from '@/lib/claude/prompts/personas'
import { FLOWS_SYSTEM_PROMPT } from '@/lib/claude/prompts/flows'
import { IA_SYSTEM_PROMPT } from '@/lib/claude/prompts/ia'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/claude/prompts/synthesis'
import type { ActionResult } from '@/types/actions'
import type { ArtifactContent, AnalyzedArtifacts } from '@/types/artifacts'

const ANALYSIS_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4000
const ANALYSIS_ERROR = 'Generation failed. Your brief was saved. Try again.'

function parseArtifactResponse(raw: string): ArtifactContent | null {
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return null }
  if (typeof parsed !== 'object' || parsed === null) return null
  const p = parsed as Record<string, unknown>
  if (typeof p.title !== 'string' || !Array.isArray(p.sections)) return null
  const sections = p.sections as unknown[]
  for (const s of sections) {
    if (typeof s !== 'object' || s === null) return null
    const sec = s as Record<string, unknown>
    if (
      typeof sec.id !== 'string' ||
      typeof sec.figureNumber !== 'string' ||
      typeof sec.title !== 'string' ||
      typeof sec.body !== 'string' ||
      !Array.isArray(sec.roles)
    ) return null
  }
  return parsed as ArtifactContent
}

export async function analyzeBrief(briefText: string): Promise<ActionResult<AnalyzedArtifacts>> {
  try {
    const client = getClaudeClient()
    const prompts = [
      { type: 'personas' as const, system: PERSONAS_SYSTEM_PROMPT },
      { type: 'flows' as const, system: FLOWS_SYSTEM_PROMPT },
      { type: 'ia' as const, system: IA_SYSTEM_PROMPT },
      { type: 'synthesis' as const, system: SYNTHESIS_SYSTEM_PROMPT },
    ]

    const responses = await Promise.all(
      prompts.map(({ system }) =>
        client.messages.create({
          model: ANALYSIS_MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: briefText }],
        })
      )
    )

    const parsed = responses.map((r) => {
      const raw = r.content[0]?.type === 'text' ? r.content[0].text : ''
      return parseArtifactResponse(raw)
    })

    if (parsed.some((p) => p === null)) {
      return { success: false, error: ANALYSIS_ERROR }
    }

    const [personas, flows, ia, synthesis] = parsed as ArtifactContent[]
    const totalInputTokens = responses.reduce((sum, r) => sum + r.usage.input_tokens, 0)
    const totalOutputTokens = responses.reduce((sum, r) => sum + r.usage.output_tokens, 0)

    return { success: true, data: { personas, flows, ia, synthesis, totalInputTokens, totalOutputTokens } }
  } catch {
    return { success: false, error: ANALYSIS_ERROR }
  }
}
```

**Do not add `'use server'` to `lib/claude/analyze.ts`** — it's a library file, not a Server Action. Server Actions live in `actions/`.

### `actions/analysis.ts` — Updated Structure

The file already has `'use server'` at the top and exports `submitBrief`. Story 4.5 adds `runAnalysis` as a second export. The `submitBrief` function does NOT call `runAnalysis` — they are separate exports called by the client in sequence. The comment `// Story 4.5 adds: AI analysis pipeline, artifact storage, token tracking` refers to `runAnalysis` being added to this file.

The `Json` type for inserting into Supabase's `content` JSONB column: `ArtifactContent` is compatible with Supabase's `Json` type (it's a plain object with string values and arrays). Cast with `content: result.data[artifactType] as unknown as Json` where `Json` is imported from `@/lib/supabase/types`.

### `stores/workspace.ts` — Full Updated File

```typescript
import { create } from 'zustand'

type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
  analysisError: string | null
  showDisclosure: boolean
  setPhase: (phase: WorkspaceStore['phase']) => void
  setActiveArtifact: (artifact: WorkspaceStore['activeArtifact']) => void
  setActiveRole: (role: string | null) => void
  setRegeneratingSection: (sectionId: string | null) => void
  setAnalysisError: (error: string | null) => void
  setShowDisclosure: (show: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  phase: 'input',
  activeArtifact: 'flows',
  activeRole: null,
  regeneratingSection: null,
  analysisError: null,
  showDisclosure: false,
  setPhase: (phase) => set({ phase }),
  setActiveArtifact: (activeArtifact) => set({ activeArtifact }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setRegeneratingSection: (regeneratingSection) => set({ regeneratingSection }),
  setAnalysisError: (analysisError) => set({ analysisError }),
  setShowDisclosure: (showDisclosure) => set({ showDisclosure }),
}))
```

### Prompt Design Guidelines for `lib/claude/prompts/`

Each prompt file exports one constant (the system prompt string). Follow the `quality-gate.ts` pattern:

```typescript
// lib/claude/prompts/personas.ts
export const PERSONAS_SYSTEM_PROMPT = `You are a UX research expert analyzing a product brief to generate user personas.
...instructions...
Respond with valid JSON only — no prose, no markdown, no code fences. Schema:
{
  "title": "User Personas",
  "sections": [
    {
      "id": "persona-1",
      "figureNumber": "1.0",
      "title": "<FirstName> — <Role>",
      "body": "<2-4 paragraph description: who they are, their context, needs, pain points, and key behaviors>",
      "roles": ["<role name — derive from the brief, not invented>"]
    }
  ]
}

Rules:
- Generate 3 to 5 personas based on roles implied by the brief
- Each persona must have exactly one role in the roles array
- figureNumber format is "1.0", "2.0", "3.0" — not "1" or "1."
- Role names must be consistent with those used in flows (both prompts will be run on the same brief)
- Do not invent role names not implied by the brief`
```

Each prompt must:
- Open with the expert persona and task context
- Specify the exact JSON schema with field types
- List concrete rules (like `figureNumber` format, consistent role names, section count range)
- End with the "valid JSON only" instruction

**Role name consistency across artifacts**: The `roles` array in personas, flows, ia, and synthesis must use the same role name strings. Since all 4 prompts run in parallel on the same brief, each prompt must derive role names from the brief content independently. Remind each prompt to "use role names derived from the brief" and "prefer simple nouns (e.g. 'Designer', 'Manager') not compound strings."

### `BriefInputSurface.tsx` — Key Changes

The `handleQualityGateSubmit` function currently does not store the final `briefText` from the server. The quality gate submit path uses the `enrichedText` local variable and calls `submitBrief` with it. The returned `result.data.briefText` is the same enriched text (submitBrief just returns what it received after parsing). Use `result.data.briefText` as the input to `runAnalysis`.

```tsx
// handleQualityGateSubmit — after setPhase('loading'):
const analysisResult = await runAnalysis(projectId, result.data.briefText)
if (!analysisResult.success) {
  setAnalysisError(analysisResult.error)
  setPhase('input')
  return
}
if (analysisResult.data.showDisclosure) setShowDisclosure(true)
router.refresh()
```

The `useEffect` for pulling `analysisError` from Zustand on mount:

```tsx
useEffect(() => {
  if (analysisError) {
    setError(analysisError)
    setAnalysisError(null)
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

The ESLint disable comment is needed because the empty dep array is intentional (read once on mount).

### `WorkspaceShell.tsx` — Workspace Phase Branch Update

```tsx
if (phase === 'workspace') {
  return (
    <div>
      {showDisclosure && (
        <div className="px-6 pt-4">
          <AttentionRegion variant="info" title="A note about your data">
            <p className="font-mono text-xs text-mg-foreground">
              Your input is processed by Anthropic&apos;s API and is not used to train models.
            </p>
            <div className="mt-3">
              <MidgardButton tier="ghost" type="button" onClick={() => setShowDisclosure(false)}>
                Dismiss
              </MidgardButton>
            </div>
          </AttentionRegion>
        </div>
      )}
      <div className="font-mono text-xs text-mg-foreground-muted p-6">
        Artifacts ready. (Story 5.1)
      </div>
    </div>
  )
}
```

### Deferred Items Addressed in This Story

From `deferred-work.md`:
- **Extension-only file type validation**: Task 8.1 hardens `submitBrief` to require a valid MIME type
- **Enriched brief label**: Task 6.8 adds `---\nAdditional context:\n` delimiter

These are in scope per the deferred-work.md requirement: "address before Story 4.5 ships the AI pipeline."

### File Structure

```
lib/claude/
  client.ts               (unchanged)
  quality-gate.ts         (unchanged)
  analyze.ts              ← CREATE
  prompts/
    personas.ts           ← CREATE
    flows.ts              ← CREATE
    ia.ts                 ← CREATE
    synthesis.ts          ← CREATE

types/
  artifacts.ts            ← POPULATE (currently empty)
  actions.ts              (unchanged)

actions/
  analysis.ts             ← MODIFY (add runAnalysis export, harden submitBrief MIME check)

stores/
  workspace.ts            ← MODIFY (add analysisError + showDisclosure)

components/workspace/
  BriefInputSurface.tsx   ← MODIFY (call runAnalysis + router.refresh, fix enrichedText label)
  WorkspaceShell.tsx      ← MODIFY (add disclosure AttentionRegion)
  AllFatherLoadingState.tsx (unchanged)
  AttentionRegion.tsx     (unchanged)
  MidgardButton.tsx       (unchanged)
```

No new Supabase migrations — the `artifacts` and `token_usage` tables already exist.
No new Zustand actions beyond `analysisError` and `showDisclosure` setters.

### Anti-Patterns to Avoid

- **Do not** add `'use server'` to `lib/claude/analyze.ts` — lib files are not Server Actions; only `actions/*.ts` files use `'use server'`
- **Do not** call `anthropic.messages.create()` directly from `actions/analysis.ts` — always go through `lib/claude/analyze.ts`; this is the isolation boundary the architecture enforces
- **Do not** await `setPhase('loading')` — it is synchronous; the subsequent `await runAnalysis()` in the same callback is what runs while the loading state is visible
- **Do not** make the loading → workspace transition depend on `runAnalysis` returning success — the transition is driven by `router.refresh()` → `hasArtifacts: true` → `WorkspaceShell.setPhase('workspace')`; if analysis fails, `setPhase('input')` returns to the input surface
- **Do not** insert partial artifacts if any Claude call fails — all 4 must succeed before any DB write
- **Do not** use `useWorkspaceStore` inside `AllFatherLoadingState` — that component has no phase awareness; WorkspaceShell owns phase logic
- **Do not** call `router.refresh()` before `revalidatePath` has been called server-side — the correct sequence is: server action calls `revalidatePath` → client receives success → client calls `router.refresh()`
- **Do not** use `src/` prefix in any import path — this codebase uses flat root-relative paths with `@/` alias: `@/lib/claude/analyze`, not `@/src/lib/claude/analyze`
- **Do not** block the user operation if `token_usage` insert fails — token tracking is an operator concern, not a user-facing failure; log and continue
- **Do not** use `Promise.allSettled` for Claude calls — if any call fails, the entire analysis must fail; use `Promise.all` so any rejection bubbles to the outer try/catch

### Token Tracking Note

A single `token_usage` row is inserted per analysis run, aggregating all 4 Claude calls' tokens. Future reporting (Epic 7 token alerting) queries by `created_at` range to compute monthly totals — one aggregated row per analysis is correct for this.

### Supabase Type Import for JSONB Insert

When inserting `ArtifactContent` into the `content: Json` column, cast as follows:

```typescript
import type { Json } from '@/lib/supabase/types'

// In the insert call:
content: result.data[artifactType] as unknown as Json
```

The double cast is needed because `ArtifactContent` is not structurally compatible with Supabase's `Json` recursive type, but at runtime they are compatible. This is the established pattern for typed objects going into JSONB columns.

### `router.refresh()` After Unmount

`BriefInputSurface` unmounts when `setPhase('loading')` is called. The `router` reference captured in the `startTransition` closure is still valid — it's not a React state reference, it's a singleton Next.js router object. Calling `router.refresh()` from an unmounted component's closure is safe and works correctly in Next.js 15 App Router.

### References

- [Source: epics.md#Story 4.5] — acceptance criteria, FR coverage (FR10-FR13, FR9)
- [Source: architecture.md#Data flows] — analysis pipeline data flow diagram
- [Source: architecture.md#Implementation Patterns] — ActionResult<T>, lib/claude/ isolation rule, no direct `anthropic.messages.create()` outside wrapper
- [Source: architecture.md#Communication Patterns] — WorkspaceStore type shape
- [Source: architecture.md#Complete Project Directory Structure] — `lib/claude/prompts/*.ts` locations confirmed
- [Source: implementation-artifacts/4-4-allfather-loading-state-component-and-norse-microcopy.md#Dev Notes] — WorkspaceShell crossfade mechanism; `setPhase('workspace')` is called by WorkspaceShell when `hasArtifacts` becomes true
- [Source: implementation-artifacts/4-4-allfather-loading-state-component-and-norse-microcopy.md#Dependencies on This Story] — "Story 4.5 sets `phase = 'loading'` before calling the Claude API; Story 4.5 calls `setPhase('workspace')` after artifacts are written" — confirmed: it's actually `router.refresh()` that triggers the workspace phase, not a direct `setPhase('workspace')` call from this story
- [Source: implementation-artifacts/4-3-input-quality-gate.md] — `submitBrief` structure, `BriefInputSurface` handleSubmit pattern
- [Source: implementation-artifacts/deferred-work.md] — MIME check hardening (Task 8.1), enriched text labeling (Task 6.8) both required before Story 4.5 ships
- [Source: lib/supabase/types.ts] — `Json` type for JSONB cast
- [Source: lib/claude/quality-gate.ts] — `parseArtifactResponse` pattern (fence-stripping regex, JSON.parse, validation)
- [Source: lib/claude/client.ts] — `getClaudeClient()` singleton pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no debug detours required.

### Completion Notes List

- Task 1: Populated `types/artifacts.ts` with `ArtifactSection`, `ArtifactContent`, `ArtifactType`, and `AnalyzedArtifacts` types.
- Task 2: Created `lib/claude/prompts/` directory with four prompt files (personas, flows, ia, synthesis). Each exports a typed system prompt with JSON schema spec, figureNumber decimal format requirement, and role-name consistency guidance.
- Task 3: Created `lib/claude/analyze.ts` — `analyzeBrief` runs all 4 Claude calls in parallel via `Promise.all`, validates each response through `parseArtifactResponse`, aggregates token counts, returns `ActionResult<AnalyzedArtifacts>`.
- Task 4: Added `runAnalysis` Server Action to `actions/analysis.ts` — authenticates user, reads `has_seen_disclosure`, calls `analyzeBrief`, idempotently deletes then inserts 4 artifact rows, inserts token_usage row (non-blocking on failure), updates disclosure flag, calls `revalidatePath`, returns `showDisclosure`.
- Task 5: Added `analysisError` and `showDisclosure` state + setters to `stores/workspace.ts`.
- Task 6: Updated `BriefInputSurface.tsx` — added `runAnalysis` + `router.refresh()` to both `handleSubmit` and `handleQualityGateSubmit`; added mount-time `useEffect` to recover stored error from Zustand; fixed enriched-text delimiter to `---\nAdditional context:\n`.
- Task 7: Updated `WorkspaceShell.tsx` — disclosure `AttentionRegion` renders above workspace placeholder when `showDisclosure` is true; Ghost Dismiss button clears it via `setShowDisclosure(false)`.
- Task 8: Hardened `submitBrief` MIME check from opt-in (`file.type &&`) to opt-out (`!file.type ||`), closing the bypass for files with missing MIME type.
- Task 9: `pnpm tsc --noEmit` — zero errors. `pnpm lint` — zero errors. `pnpm dev` — starts clean. Manual verification subtasks (9.4–9.8) left for Jason.

### File List

- `types/artifacts.ts` (populated — was empty)
- `lib/claude/prompts/personas.ts` (created)
- `lib/claude/prompts/flows.ts` (created)
- `lib/claude/prompts/ia.ts` (created)
- `lib/claude/prompts/synthesis.ts` (created)
- `lib/claude/analyze.ts` (created)
- `actions/analysis.ts` (modified — added `runAnalysis`, hardened MIME check)
- `stores/workspace.ts` (modified — added `analysisError`, `showDisclosure` state)
- `components/workspace/BriefInputSurface.tsx` (modified — wired `runAnalysis`, error recovery, enriched-text fix)
- `components/workspace/WorkspaceShell.tsx` (modified — added disclosure `AttentionRegion`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updated)
- `_bmad-output/implementation-artifacts/4-5-ai-analysis-pipeline-four-artifact-generation.md` (modified — tasks, status, file list, completion notes)

## Change Log

- 2026-05-04: Story 4.5 implemented — AI analysis pipeline with 4-artifact generation, Supabase storage, token tracking, disclosure flow, error recovery, and MIME hardening (Date: 2026-05-04)
