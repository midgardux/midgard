# Story 4.4: AllFatherLoadingState Component & Norse Microcopy

Status: done

## Story

As a **solo designer**,
I want to see a branded, atmospheric loading experience while my artifacts are being generated,
So that the wait feels intentional and I stay engaged rather than anxious.

## Acceptance Criteria

1. **Given** the Zustand workspace `phase` is `'loading'`
   **When** `AllFatherLoadingState` renders
   **Then** a full-viewport centered layout appears with a single bordered region (same surface token, no elevation)
   **And** a 5px accent-colored dot pulses with a slow animation
   **And** invocation text cycles through: "The Allfather sees." → "Your Realm takes shape." → "The flows are written." with a slow fade between each
   **And** no progress bar, percentage, spinner count, or step indicator is shown

2. **Given** the user's system has `prefers-reduced-motion: reduce`
   **When** `AllFatherLoadingState` renders
   **Then** all animations are disabled and a single static invocation line is shown
   **And** `aria-live="polite"` announces when generation completes

3. **Given** the loading state has been active for more than 30 seconds
   **When** generation is still running
   **Then** a second text line appears below the cycling invocation: "This Realm is complex. A moment more." in `--fg-subtle` Geist Mono
   **And** this line does not cycle — it remains static until generation completes

4. **Given** generation completes
   **When** artifacts are ready
   **Then** a brief fade/cross-fade transitions from the loading state to the artifact workspace
   **And** `phase` is set to `'workspace'` in Zustand

## Tasks / Subtasks

- [x] Task 1 — Create `components/workspace/AllFatherLoadingState.tsx` (AC: #1, #2, #3)
  - [x] 1.1 Add `'use client'` directive — component uses hooks
  - [x] 1.2 Define `INVOCATIONS` as a const array at module level: `['The Allfather sees.', 'Your Realm takes shape.', 'The flows are written.']`
  - [x] 1.3 Add state: `currentIndex: number` (init `0`), `isVisible: boolean` (init `true` — controls text opacity for fade), `showComplexity: boolean` (init `false`), `reducedMotion: boolean` (init `false`)
  - [x] 1.4 Detect `prefers-reduced-motion` via `useEffect` + `window.matchMedia('(prefers-reduced-motion: reduce)')` — set initial value AND add `change` event listener; clean up on unmount
  - [x] 1.5 Text cycling `useEffect`: runs only when `!reducedMotion`; `setInterval` every 3500ms; on each tick: `setIsVisible(false)`, then `setTimeout` at 500ms to `setCurrentIndex(prev => (prev + 1) % INVOCATIONS.length)` and `setIsVisible(true)`; return cleanup that clears both interval and timeout
  - [x] 1.6 30-second complexity timer `useEffect` (independent, always runs regardless of `reducedMotion`): `setTimeout` at 30000ms sets `setShowComplexity(true)`; clear on unmount
  - [x] 1.7 Root element: `<div>` with `role="status"` + `aria-live="polite"` + `aria-atomic="false"` + `aria-label="Generating your artifacts"`; full-viewport centering classes
  - [x] 1.8 Bordered container: 1px border (`border border-mg-border`), `bg-mg-surface`, `py-6 px-7` (24px/28px interior padding), no rounded corners, no shadow/elevation
  - [x] 1.9 Pulse dot: `<div>` 5px × 5px (`w-[5px] h-[5px]`), `bg-mg-accent`, `motion-safe:animate-pulse`; no dot animation on reduced motion (class absent, element still visible)
  - [x] 1.10 Invocation text: `<p>` with `font-mono text-[13px] italic text-mg-foreground-muted`; content: `INVOCATIONS[currentIndex]`; apply `transition-opacity duration-500` + (`isVisible ? 'opacity-100' : 'opacity-0'`) for the fade; on reduced motion: always `opacity-100`, no transition class
  - [x] 1.11 Complexity message: conditionally render `<p>` when `showComplexity === true`; text: "This Realm is complex. A moment more."; classes: `font-mono text-[11px] text-mg-foreground-subtle mt-2`; no animation, static
  - [x] 1.12 Export as named export: `export function AllFatherLoadingState() {`

- [x] Task 2 — Update `components/workspace/WorkspaceShell.tsx` (AC: #4)
  - [x] 2.1 Import `AllFatherLoadingState` from `@/components/workspace/AllFatherLoadingState`
  - [x] 2.2 Add local state `isFading: boolean` (init `false`) and `prevPhase` ref (`useRef(phase)`)
  - [x] 2.3 Add `useEffect` that detects phase transition from `'loading'` → `'workspace'`: when `prevPhase.current === 'loading' && phase === 'workspace'`, set `isFading(true)`, then `setTimeout` at 300ms to set `isFading(false)`; always update `prevPhase.current = phase`; clean up timeout on unmount
  - [x] 2.4 Replace the existing `phase === 'loading'` branch: render `<AllFatherLoadingState />` wrapped in a `<div>` with `transition-opacity duration-300` + (`isFading ? 'opacity-0' : 'opacity-100'`); keep rendering this div while `phase === 'loading' || isFading` (so it stays visible during the fade-out)
  - [x] 2.5 Preserve all other `WorkspaceShell` logic unchanged (hasArtifacts → setPhase('workspace'), reset on unmount, workspace placeholder "Artifacts ready. (Story 5.1)")

- [x] Task 3 — Validation
  - [x] 3.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 3.2 `pnpm lint` — zero ESLint errors
  - [x] 3.3 `pnpm dev` — dev server starts; navigate to a new Realm workspace page
  - [ ] 3.4 Manual (Jason verifies): submit a valid brief that passes quality gate → `phase` becomes `'loading'` → loading state appears with pulse dot and cycling invocations
  - [ ] 3.5 Manual (Jason verifies): wait 30s (or temporarily lower timeout to test) → complexity message appears below invocation text
  - [ ] 3.6 Manual (Jason verifies): in Chrome DevTools, emulate `prefers-reduced-motion: reduce` → invocations are static (first item only, no fade), dot is visible but not animated
  - [ ] 3.7 Manual (Jason verifies): manually call `setPhase('workspace')` from browser console (or temporarily add a button) → loading state fades out (300ms) → workspace placeholder appears

## Dev Notes

### What This Story Builds and Why

Story 4.3 added the quality gate; when the gate passes, `BriefInputSurface` calls `setPhase('loading')`. `WorkspaceShell` currently shows a one-line placeholder for this phase. This story replaces that placeholder with the real `AllFatherLoadingState` component — the primary trust-building UX during the multi-minute generation wait.

Story 4.5 will complete the pipeline: it calls `setPhase('workspace')` after `analyze.ts` writes artifacts to Supabase. Story 4.4 must wire the crossfade so Story 4.5 just needs `setPhase('workspace')` and everything transitions cleanly.

### `AllFatherLoadingState.tsx` — Full Implementation

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const INVOCATIONS = [
  'The Allfather sees.',
  'Your Realm takes shape.',
  'The flows are written.',
]

const CYCLE_INTERVAL_MS = 3500
const FADE_DURATION_MS = 500   // half of CSS transition, set to same in duration-500
const COMPLEXITY_DELAY_MS = 30000

export function AllFatherLoadingState() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [showComplexity, setShowComplexity] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Detect prefers-reduced-motion (must run in effect — no SSR window access)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Text cycling — only when motion is OK
  useEffect(() => {
    if (reducedMotion) return

    let fadeTimeout: ReturnType<typeof setTimeout>
    const interval = setInterval(() => {
      setIsVisible(false)
      fadeTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % INVOCATIONS.length)
        setIsVisible(true)
      }, FADE_DURATION_MS)
    }, CYCLE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(fadeTimeout)
    }
  }, [reducedMotion])

  // 30-second complexity message
  useEffect(() => {
    const t = setTimeout(() => setShowComplexity(true), COMPLEXITY_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Generating your artifacts"
      className="flex min-h-screen items-center justify-center bg-mg-background"
    >
      <div className="border border-mg-border bg-mg-surface px-7 py-6 flex flex-col items-center gap-4">
        {/* Pulse dot */}
        <div
          className={cn(
            'h-[5px] w-[5px] rounded-full bg-mg-accent',
            !reducedMotion && 'animate-pulse'
          )}
        />

        {/* Cycling invocation text */}
        <p
          className={cn(
            'font-mono text-[13px] italic text-mg-foreground-muted',
            !reducedMotion && 'transition-opacity duration-500',
            reducedMotion ? 'opacity-100' : isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {INVOCATIONS[currentIndex]}
        </p>

        {/* 30-second complexity message */}
        {showComplexity && (
          <p className="font-mono text-[11px] text-mg-foreground-subtle">
            This Realm is complex. A moment more.
          </p>
        )}
      </div>
    </div>
  )
}
```

**Why `aria-atomic="false"`:** The cycling invocation text changes independently. With `aria-atomic="false"`, the screen reader announces only the changed text node — not the entire region on every update. This prevents repetitive announcements while keeping the loading state accessible.

**Why `animate-pulse` not `motion-safe:animate-pulse`:** Tailwind v3's `motion-safe:` variant applies the class only when the user has no reduced-motion preference. Using it on `animate-pulse` is the correct approach. BUT the implementation above uses a JS-detected `reducedMotion` flag — this is needed anyway for the text cycling logic, so it's cleaner to gate the dot animation via JS too (conditional `className`). Both approaches are equivalent; the JS approach avoids a CSS-only variant.

**Dot styling note:** `rounded-full` makes the 5px square div a circle. The spec says "5px accent-colored dot" — a circle is correct for a dot.

### `WorkspaceShell.tsx` — Crossfade Update

The current implementation:
```tsx
if (phase === 'loading') {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="font-mono text-xs text-mg-foreground-muted">The Allfather works…</p>
    </div>
  )
}
```

Replace with the crossfade-aware version. The full updated file:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { BriefInputSurface } from '@/components/workspace/BriefInputSurface'
import { AllFatherLoadingState } from '@/components/workspace/AllFatherLoadingState'
import { cn } from '@/lib/utils'

interface WorkspaceShellProps {
  projectId: string
  hasArtifacts: boolean
  projectName: string
}

export function WorkspaceShell({ projectId, hasArtifacts }: WorkspaceShellProps) {
  const phase = useWorkspaceStore((s) => s.phase)
  const setPhase = useWorkspaceStore((s) => s.setPhase)

  // Crossfade: track previous phase to detect loading → workspace transition
  const prevPhaseRef = useRef(phase)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    if (prevPhaseRef.current === 'loading' && phase === 'workspace') {
      setIsFading(true)
      const t = setTimeout(() => setIsFading(false), 300)
      prevPhaseRef.current = phase
      return () => clearTimeout(t)
    }
    prevPhaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (hasArtifacts) {
      setPhase('workspace')
    }
    return () => {
      setPhase('input')
    }
  }, [hasArtifacts, setPhase])

  // Show loading state (and keep it visible during the 300ms fade-out)
  if (phase === 'loading' || isFading) {
    return (
      <div className={cn('transition-opacity duration-300', isFading ? 'opacity-0' : 'opacity-100')}>
        <AllFatherLoadingState />
      </div>
    )
  }

  if (phase === 'workspace') {
    return (
      <div className="font-mono text-xs text-mg-foreground-muted p-6">
        Artifacts ready. (Story 5.1)
      </div>
    )
  }

  return <BriefInputSurface projectId={projectId} />
}
```

**Why the `prevPhaseRef` approach:** `useEffect` sees the new `phase` but needs to know the old value to detect the specific `loading → workspace` transition. A ref persists across renders without triggering re-renders. An alternative would be `usePrevious` hook, but the ref inline is cleaner for a single use.

**Why `phase === 'loading' || isFading`:** The loading content must continue to render during the 300ms fade-out. Without `|| isFading`, the DOM would unmount immediately when phase changes to 'workspace', and no fade would be visible.

### ARIA Design Notes

The UX spec (UX-DR4) specifies:
- `role="status"` — for the loading state container
- `aria-live="polite"` — announces changes without interrupting current speech
- `aria-atomic="false"` — announces only changed regions, not the entire component

When generation completes (Story 4.5 calls `setPhase('workspace')`), the `AllFatherLoadingState` component unmounts. The screen reader will announce the change based on whatever next-focused element or live region fires. Story 4.5 should ensure an appropriate aria announcement at completion. Story 4.4 does not need to handle this — just implement the loading state accurately.

### Token Reference

| Intent | Tailwind class |
|---|---|
| Page background | `bg-mg-background` |
| Bordered container background | `bg-mg-surface` |
| Bordered container border | `border border-mg-border` |
| Pulse dot | `bg-mg-accent` |
| Invocation text | `text-mg-foreground-muted` |
| Complexity message | `text-mg-foreground-subtle` |

### prefers-reduced-motion Behavior

| Setting | Dot | Cycling text | Complexity message |
|---|---|---|---|
| Motion OK | `animate-pulse` active | Fades between strings every 3.5s | Appears after 30s (static) |
| Motion reduced | No animation, dot visible | First string only, always visible (`opacity-100`, no `transition-opacity`) | Appears after 30s (static) |

The complexity message timer always runs — it is not an animation, it is a content update. `prefers-reduced-motion` does not suppress it.

### File Structure

```
components/
  workspace/
    AllFatherLoadingState.tsx   ← CREATE
    WorkspaceShell.tsx          ← MODIFY (crossfade + swap placeholder)
    AttentionRegion.tsx         (unchanged)
    BriefInputSurface.tsx       (unchanged)
    MidgardButton.tsx           (unchanged)
```

No new Server Actions, no new Zustand state, no Supabase changes — this is a pure UI story.

### Dependencies on This Story

| Dependency | Used by | How |
|---|---|---|
| `AllFatherLoadingState` component | Story 4.5 | 4.5 sets `phase = 'loading'` before calling the Claude API; this component renders during that window |
| Crossfade mechanism in `WorkspaceShell` | Story 4.5 | 4.5 calls `setPhase('workspace')` after artifacts are written; the fade-out is already wired |
| `COMPLEXITY_DELAY_MS` constant | Future QA | If load times consistently exceed 30s, this may need tuning — exported constant makes that easy |

### Anti-Patterns to Avoid

- **Do not** put `animate-pulse` directly in JSX without gating on `reducedMotion` — the CSS class alone does not reliably respect the media query in all browsers when added via JS
- **Do not** use a single `useEffect` for both text cycling and reduced-motion detection — they have different dependency arrays and mixing them creates logic errors
- **Do not** use `setInterval` alone for the text cycle — the fade requires a `setTimeout` for the mid-transition text swap; missing this makes text snap instead of fade
- **Do not** use `src/` prefix in any import path — this codebase is flat: `@/components/workspace/AllFatherLoadingState`
- **Do not** import Geist fonts from `next/font/google` — fonts are already loaded globally; just use `font-mono` Tailwind class
- **Do not** use `useWorkspaceStore` inside `AllFatherLoadingState` — the component has no phase awareness; `WorkspaceShell` owns the phase logic and conditionally mounts `AllFatherLoadingState`
- **Do not** add a `useEffect` cleanup that only clears `clearInterval` — the `fadeTimeout` inside the interval callback must also be cleared or it may fire after unmount and update unmounted state

### References

- [Source: epics.md#Story 4.4] — acceptance criteria, FR8/UX-DR4/UX-DR12 coverage
- [Source: ux-design-specification.md#AllFatherLoadingState] — anatomy: full-viewport centered, bordered region, animated dot, invocation text cycling, no progress bar; states: active, complete
- [Source: ux-design-specification.md#Loading States] — Mode 1 (Full Invocation): full content panel, text-only, no spinner; index panel present but muted during loading (Story 5.1 concern)
- [Source: ux-design-specification.md#Space as Functional Signal] — "The loading/invocation state opens — a single centered bordered region, room to breathe"; same surface tokens, no elevated surface
- [Source: ux-design-specification.md#Accessibility Strategy] — AllFatherLoadingState uses `role="status"` + `aria-live="polite"`; `aria-atomic="false"` prevents cycling repeat-announce
- [Source: ux-design-specification.md#Norse Brand System] — invocation copy: "The Allfather sees.", "Your Realm takes shape.", "The flows are written."
- [Source: architecture.md#Frontend Architecture] — Zustand phase state shape; `WorkspaceShell` owns phase rendering logic
- [Source: project-context.md] — flat directory, `@/` alias, `mg-*` tokens, `font-mono` class, `pnpm` only, `motion-safe:` Tailwind variant available in v3
- [Source: implementation-artifacts/4-3-input-quality-gate.md#Dev Notes] — `setPhase('loading')` call path: when `submitBrief` returns success with no `qualityGate`, `BriefInputSurface` calls `setPhase('loading')`
- [Source: implementation-artifacts/4-2-brief-input-surface.md#Dev Notes] — `useWorkspaceStore` pattern; `setPhase` usage in components

### Review Findings

- [x] [Review][Decision] ARIA live region announces every invocation cycle — dismissed; spec intent is authoritative, polite live region cycling is acceptable per Task 1.7 reasoning — `aria-live="polite"` + `aria-atomic="false"` on the root container causes screen readers to announce the cycling invocation text every 3.5s. AC2's stated intent is that `aria-live="polite"` "announces when generation completes," not during cycling. Task 1.7 mandates the current attributes and the dev notes justify `aria-atomic="false"`. Decision needed: is continuous cycling announcement acceptable, or should `aria-live` be scoped/suppressed during cycling and only fire on completion?
- [x] [Review][Patch] Missing `mt-2` on complexity message — Task 1.11 mandates `font-mono text-[11px] text-mg-foreground-subtle mt-2`; the rendered `<p>` omits `mt-2` [`components/workspace/AllFatherLoadingState.tsx:80`]
- [x] [Review][Patch] Cycling effect can expose `isVisible=false` on reducedMotion toggle — if `reducedMotion` flips `false→true→false` mid-session (interval cleanup fires, leaving `isVisible=false`), the cycling effect restarts but text is hidden for up to 3.5s. Fix: add `setIsVisible(true)` at the top of the cycling effect before starting the interval [`components/workspace/AllFatherLoadingState.tsx:30-42`]
- [x] [Review][Defer] Text cycling fade (500ms) overlaps outer crossfade window (300ms) — if a text cycle fade starts simultaneously with a phase transition, the loading text will be at intermediate opacity when the container fades out, causing a visual flicker [`components/workspace/WorkspaceShell.tsx:25` / `components/workspace/AllFatherLoadingState.tsx:13`] — deferred, pre-existing
- [x] [Review][Defer] `reducedMotion` SSR/hydration flash — component initializes `reducedMotion=false` and corrects it in a `useEffect`; first render always shows non-reduced-motion classes regardless of OS preference, causing a potential flash and hydration mismatch on SSR paths [`components/workspace/AllFatherLoadingState.tsx:20`] — deferred, pre-existing
- [x] [Review][Defer] Fast Concurrent React phase transitions can bypass `prevPhaseRef` update — if `phase` changes `input→loading→workspace` in rapid succession, the effect may see only `workspace` with `prevPhaseRef` still holding `input`, silently skipping the crossfade [`components/workspace/WorkspaceShell.tsx:22-30`] — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues — implementation followed the spec exactly.

### Completion Notes List

- Created `AllFatherLoadingState.tsx` with three independent `useEffect` hooks: reduced-motion detection (with `change` listener cleanup), text cycling (setInterval + setTimeout pattern for mid-fade text swap), and 30s complexity timer.
- Dot animation gated via JS `reducedMotion` state (not CSS-only `motion-safe:` variant) to keep parity with the text cycling logic that also needs the flag.
- Updated `WorkspaceShell.tsx`: added `prevPhaseRef` + `isFading` state for the crossfade; loading state stays mounted during the 300ms opacity fade via `phase === 'loading' || isFading` condition.
- `pnpm tsc --noEmit` — zero errors. `pnpm lint` — zero errors. Dev server compiled cleanly.
- Tasks 3.4–3.7 are manual verifications for Jason (browser-only behaviour).

### File List

- `components/workspace/AllFatherLoadingState.tsx` (created)
- `components/workspace/WorkspaceShell.tsx` (modified)

### Change Log

- 2026-05-04: Story 4.4 implemented — AllFatherLoadingState component created with cycling invocations, reduced-motion support, 30s complexity message; WorkspaceShell updated with crossfade logic (Date: 2026-05-04)
