# Story 4.1: AttentionRegion & Button Hierarchy Components

Status: done

## Story

As a **developer**,
I want the `AttentionRegion` component fully spec-complete and the three-tier button system formalized as a reusable `MidgardButton` component,
So that all user feedback, confirmations, and attention states throughout the app share a consistent visual language, and downstream Epic 4 stories have stable component primitives to build on.

## Acceptance Criteria

1. **Given** the `AttentionRegion` component exists at `components/workspace/AttentionRegion.tsx`
   **When** rendered with variant `info`, `warning`, `error`, or `confirm`
   **Then** it renders as an inline bordered region (1px border, color per variant) with 24px vertical / 28px horizontal interior padding, same `surface` background token regardless of variant — no elevated surface, no backdrop
   **And** variant `error` and `warning` use `role="alert"` + `aria-live="assertive"`; variants `info` and `confirm` use `role="region"` + `aria-label`
   **And** when actions are present, focus is trapped within the region and moves to the title on render

2. **Given** the three-tier button system is implemented as `MidgardButton` at `components/workspace/MidgardButton.tsx`
   **When** a Primary button is rendered
   **Then** it uses accent background (#E8D5A3), dark text (#0A0A0A), Geist Mono 12px uppercase, 8px/16px padding — and only one Primary button appears per view
   **And** Ghost buttons use transparent background, 1px `border` token border, `fg-subtle` text
   **And** Nano buttons use transparent background, 11px Geist Mono, 4px/8px padding, no border
   **And** destructive actions use a Ghost button inside an AttentionRegion (Confirm variant) — never a red-colored button

## Tasks / Subtasks

- [x] Task 1 — Extend `AttentionRegion` with focus trap (AC: #1)
  - [x] 1.1 Read `components/workspace/AttentionRegion.tsx` before modifying — component already exists from Story 3.4; do NOT recreate it
  - [x] 1.2 Add `'use client'` directive — required for `useRef` and `useEffect`
  - [x] 1.3 Add `trapFocus?: boolean` prop to `AttentionRegionProps`
  - [x] 1.4 Implement `useRef` on the container div and on the title `<p>` element
  - [x] 1.5 Implement `useEffect`: when `trapFocus` is true, focus the title on mount (via `titleRef.current.focus()`); if no title, focus first focusable element in the region
  - [x] 1.6 Implement Tab/Shift+Tab key trap inside `useEffect`: find all focusable children, wrap Tab at last → first and Shift+Tab at first → last; add `keydown` listener on `document`, clean up on unmount
  - [x] 1.7 Give the title `<p>` a `tabIndex={-1}` when `trapFocus` is true (makes it programmatically focusable)
  - [x] 1.8 Verify all four variants still render correctly, all ARIA roles intact

- [x] Task 2 — Create `MidgardButton` component (AC: #2)
  - [x] 2.1 Create `components/workspace/MidgardButton.tsx`
  - [x] 2.2 Define `type MidgardButtonTier = 'primary' | 'ghost' | 'nano'`
  - [x] 2.3 `MidgardButtonProps` extends `ButtonHTMLAttributes<HTMLButtonElement>` with `tier?: MidgardButtonTier` (defaults to `'ghost'`)
  - [x] 2.4 Primary tier classes: `bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-mg-accent-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
  - [x] 2.5 Ghost tier classes: `border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
  - [x] 2.6 Nano tier classes: `font-mono text-[11px] px-2 py-1 text-mg-foreground-subtle hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
  - [x] 2.7 Use `cn()` from `@/lib/utils` to merge caller-provided `className` with tier classes
  - [x] 2.8 Default `type="button"` to prevent accidental form submission

- [x] Task 3 — Validation
  - [x] 3.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 3.2 `pnpm lint` — zero ESLint errors
  - [x] 3.3 `pnpm dev` — dev server starts cleanly; no console errors
  - [x] 3.4 Manual (Jason verified): focus moves to title on mount, Tab cycles title → Cancel → Confirm → title, Shift+Tab wraps correctly
  - [x] 3.5 Manual (Jason verified): Primary is warm gold with dark text, Ghost is bordered/subtle, Nano is borderless/11px

### Review Findings

- [x] [Review][Patch] Focus not restored when trap lifts — save `document.activeElement` before stealing focus in `useEffect`; restore it in the cleanup [AttentionRegion.tsx:38-66]
- [x] [Review][Patch] Global Tab trap intercepts keyboard on the entire page — `handleKeyDown` does not check if `document.activeElement` is inside `regionRef.current`; any Tab press anywhere on the page runs the trap logic while the region is mounted [AttentionRegion.tsx:48-62]
- [x] [Review][Patch] `aria-live="assertive"` redundant on `role="alert"` — the `alert` role already implies assertive live; explicit `aria-live` causes double-announcement on NVDA/JAWS [AttentionRegion.tsx:72]
- [x] [Review][Patch] All MidgardButton tiers missing `focus-visible` styles — WCAG 2.4.7 failure for keyboard users on any browser/OS where UA default outline is suppressed [MidgardButton.tsx:11-17]
- [x] [Review][Patch] Stale `title` prop in `handleKeyDown` closure — dep array `[trapFocus]` excludes `title`; if `title` changes while trap is active, the focusable list is stale and initial-focus does not re-run [AttentionRegion.tsx:66]
- [x] [Review][Defer] Title focus ring uses `focus:outline` not `focus-visible:outline` [AttentionRegion.tsx:82] — deferred; `:focus-visible` is suppressed by browsers for programmatic `.focus()` on initial mount (no prior keyboard interaction), which would break the visible focus ring when the trap activates. Known tradeoff from Story 4.1 dev.
- [x] [Review][Patch] `className` concatenation on outer div inconsistent — uses template literal + `.trim()` while `cn()` is imported; replace with `cn()` for correctness and consistency [AttentionRegion.tsx:74]
- [x] [Review][Defer] `role="region"` without accessible name [AttentionRegion.tsx:70-73] — deferred, pre-existing; `aria-label` is intentionally optional per spec
- [x] [Review][Defer] MidgardButton icon-only accessible name enforcement [MidgardButton.tsx:6-8] — deferred, caller responsibility; `aria-label` passes through via `...props`
- [x] [Review][Defer] Concurrent rendering / Suspense focus timing [AttentionRegion.tsx:41-46] — deferred, no Suspense usage in current callers
- [x] [Review][Defer] `cn()` allows callers to override `disabled` affordance in MidgardButton — deferred, inherent Tailwind limitation, pre-existing pattern
- [x] [Review][Defer] `FOCUSABLE` selector missing `contenteditable` / `details > summary` [AttentionRegion.tsx:24] — deferred, no current usage
- [x] [Review][Defer] `useEffect` dep array omits ref objects [AttentionRegion.tsx:66] — deferred, refs are stable, ESLint exhaustive-deps will not flag

## Dev Notes

### Critical: AttentionRegion Already Exists — Extend, Do NOT Recreate

`components/workspace/AttentionRegion.tsx` was built in Story 3.4. **Read the file before touching it.** The existing implementation has all four variants, correct ARIA roles, and correct border colors. The only gap versus the full 4.1 spec is the focus trap (explicitly deferred in the Story 3.4 code review).

Current component is a Server Component (no `'use client'`). Adding `useRef` and `useEffect` requires converting it. This is safe — Server Components can import and render Client Components, and all current callers (`DeleteRealmButton`) already run in a Client Component context.

### Focus Trap Implementation

```typescript
'use client'

import { useRef, useEffect, type ReactNode } from 'react'

type AttentionVariant = 'info' | 'warning' | 'error' | 'confirm'

interface AttentionRegionProps {
  variant: AttentionVariant
  'aria-label'?: string
  title?: string
  trapFocus?: boolean
  className?: string
  children: ReactNode
}

const borderClass: Record<AttentionVariant, string> = {
  info:    'border-mg-border',
  warning: 'border-mg-accent-muted',
  error:   'border-mg-foreground-muted',
  confirm: 'border-mg-border',
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AttentionRegion({
  variant,
  'aria-label': ariaLabel,
  title,
  trapFocus = false,
  className = '',
  children,
}: AttentionRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const isAlert = variant === 'error' || variant === 'warning'

  useEffect(() => {
    if (!trapFocus || !regionRef.current) return

    // Focus title on mount; fall back to first focusable element
    if (titleRef.current) {
      titleRef.current.focus()
    } else {
      const first = regionRef.current.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !regionRef.current) return
      const focusable = Array.from(regionRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [trapFocus])

  return (
    <div
      ref={regionRef}
      role={isAlert ? 'alert' : 'region'}
      aria-live={isAlert ? 'assertive' : undefined}
      aria-label={ariaLabel}
      className={`border ${borderClass[variant]} bg-mg-surface py-6 px-7 ${className}`.trim()}
    >
      {title && (
        <p
          ref={titleRef}
          tabIndex={trapFocus ? -1 : undefined}
          className="font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3"
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
```

**Why `tabIndex={-1}` on the title:** `<p>` elements are not natively focusable. `tabIndex={-1}` makes them programmatically focusable via `.focus()` without adding them to the natural Tab order. Only apply when `trapFocus` is true to avoid polluting the tab order when focus management is off.

**Why `document.addEventListener` not `regionRef.current.addEventListener`:** The keydown listener must be on `document` to intercept Tab events that would otherwise move focus out of the region, including when focus is on native interactive elements that handle keyboard events themselves.

### MidgardButton Implementation

```typescript
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export type MidgardButtonTier = 'primary' | 'ghost' | 'nano'

interface MidgardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tier?: MidgardButtonTier
}

const tierClass: Record<MidgardButtonTier, string> = {
  primary:
    'bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-mg-accent-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  nano:
    'font-mono text-[11px] px-2 py-1 text-mg-foreground-subtle hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
}

export function MidgardButton({
  tier = 'ghost',
  className,
  type = 'button',
  ...props
}: MidgardButtonProps) {
  return (
    <button
      type={type}
      className={cn(tierClass[tier], className)}
      {...props}
    />
  )
}
```

**Do NOT use `components/ui/button.tsx` (shadcn `Button`)** for Midgard-branded buttons. The shadcn Button uses unprefixed shadcn tokens (`--primary`, `--accent`, `--foreground`) which are HSL vars set by shadcn's theme system and conflict with Midgard's `--mg-*` tokens. `MidgardButton` uses Midgard tokens directly.

**Primary button constraint:** Only one Primary button per view maximum (UX-DR14). This is a design rule enforced by code review, not by the component — the component doesn't restrict count.

**Destructive button rule:** Destructive actions (delete, irreversible operations) NEVER use a red button. They use Ghost tier inside an `AttentionRegion` with `variant="confirm"`. The confirm variant's border signals danger; the button itself stays Ghost.

### Token Reference

| Intent | Tailwind class | CSS var |
|---|---|---|
| Page background | `bg-mg-background` | `var(--mg-background)` |
| Surface (component bg) | `bg-mg-surface` | `var(--mg-surface)` |
| Border (standard) | `border-mg-border` | `var(--mg-border)` |
| Primary text | `text-mg-foreground` | `var(--mg-foreground)` |
| Muted text | `text-mg-foreground-muted` | `var(--mg-foreground-muted)` |
| Subtle text | `text-mg-foreground-subtle` | `var(--mg-foreground-subtle)` |
| Accent (Primary btn bg) | `bg-mg-accent` | `var(--mg-accent)` |
| Accent hover | `hover:bg-mg-accent-muted` | `var(--mg-accent-muted)` |
| Warning border | `border-mg-accent-muted` | `var(--mg-accent-muted)` |
| Error border | `border-mg-foreground-muted` | `var(--mg-foreground-muted)` |
| Dark text on accent | `text-mg-background` | `var(--mg-background)` |

**Never use:** shadcn's unprefixed tokens (`--accent`, `--background`, `--foreground`, `--border`) — these are HSL vars owned by shadcn's theme and conflict with Midgard tokens.

### Flat Directory Structure — No `src/`

```
components/
  workspace/
    AttentionRegion.tsx    ← MODIFY (extend, do not recreate)
    MidgardButton.tsx      ← CREATE
  projects/
    DeleteRealmButton.tsx  ← EXISTS: uses inline button classes (not replaced by MidgardButton in this story)
```

Architecture doc references `src/` paths — drop the prefix. All imports use `@/` alias resolving to project root.

**Do NOT refactor `DeleteRealmButton` to use `MidgardButton` in this story.** That's out of scope. Story 4.2 (BriefInputSurface) will use `MidgardButton` as its first consumer.

### Existing AttentionRegion Callers — No Changes Required

| File | Usage | Action |
|---|---|---|
| `components/projects/DeleteRealmButton.tsx` | AttentionRegion (confirm + error variants) | No change — doesn't use `trapFocus`, works without it |
| `app/(app)/projects/[projectId]/workspace/page.tsx` | No direct AttentionRegion usage | No change |

`trapFocus` defaults to `false`, so existing callers are unaffected.

### From Story 3.4 Code Review — What Was Already Fixed

These patches were applied in Story 3.4's code review; they are already in the current file and must be preserved:
- `aria-label` now applied to all variants (not conditionally stripped from alert variants)
- All four variant border colors correct: `info/confirm → mg-border`, `warning → mg-accent-muted`, `error → mg-foreground-muted`

These were deferred in Story 3.4 and are addressed in THIS story:
- Focus trap (Task 1 above)

### From Epic 3 Retro — Process Rules for This Story

1. **Manual verification tracking:** Task 3.4 and 3.5 checkboxes must remain `[ ]` until Jason explicitly confirms in the change log. Write "pending Jason verification" in completion notes — do not pre-tick manual tasks.

2. **Concurrent execution check:** This story has no Server Actions or guard-then-write patterns. No concurrent execution risk to flag. (Focus trap `useEffect` is lifecycle-bound and not subject to race conditions.)

### What Downstream Stories (4.2+) Depend On

| Dependency | Used by | How |
|---|---|---|
| `AttentionRegion` with `trapFocus` | Story 4.3 (quality gate) | Quality gate AttentionRegion traps focus, has action buttons |
| `MidgardButton` (Primary tier) | Story 4.2 (BriefInputSurface) | "Invoke the Allfather" submit button |
| `MidgardButton` (Ghost tier) | Story 4.3 (quality gate), Story 4.4 | Secondary actions in AttentionRegion |
| `MidgardButton` (Nano tier) | Story 5+ (section controls) | Inline workspace controls |

**Stories 4.1 → 4.2 → 4.3 → 4.4 → 4.5 must be implemented in sequence.** This story is the foundation; do not skip or defer Task 2 (`MidgardButton`) to a later story.

### Project Structure Reference

```
components/
  workspace/
    AttentionRegion.tsx    ← MODIFY
    MidgardButton.tsx      ← CREATE
lib/
  utils.ts                 ← EXISTS: exports cn() — import from here
```

### References

- [Source: epics.md#Story 4.1] — acceptance criteria
- [Source: ux-design-specification.md#AttentionRegion] — anatomy, states, accessibility, C64 model constraint
- [Source: ux-design-specification.md#Button Hierarchy] — three-tier spec, standing rules
- [Source: ux-design-specification.md#UX-DR3] — AttentionRegion: variants, padding, border colors, ARIA
- [Source: ux-design-specification.md#UX-DR14] — three-tier button hierarchy
- [Source: ux-design-specification.md#UX-DR20] — feedback via AttentionRegion exclusively; no toasts, modals, or banners
- [Source: architecture.md#Frontend Architecture] — component list, shadcn vs. custom
- [Source: project-context.md] — flat directory (no src/), mg-* token prefix, cn() from @/lib/utils, pnpm only
- [Source: implementation-artifacts/3-4-delete-a-realm.md#Dev Notes] — AttentionRegion implementation (current state), button tier classes
- [Source: implementation-artifacts/epic-3-retro-2026-04-26.md#Story 4.1 — Critical Note] — extend not recreate, focus trap deferred, Nano never built

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Converted `AttentionRegion` from Server Component to Client Component (`'use client'`). Added `trapFocus?: boolean` prop, `regionRef` on the container div, `titleRef` on the title `<p>`. `useEffect` focuses the title on mount when `trapFocus` is true (falls back to first focusable element if no title). Tab trap implemented via `document` `keydown` listener: wraps Tab at last→first, Shift+Tab at first→last. `tabIndex={-1}` applied to title `<p>` only when `trapFocus` is true. All four variants and ARIA roles preserved unchanged.
- Task 2: Created `MidgardButton` at `components/workspace/MidgardButton.tsx`. Exports `MidgardButtonTier` type and `MidgardButton` component. Three tiers (primary/ghost/nano) via `tierClass` map. `cn()` merges caller `className`. Defaults `type="button"`. Does not use shadcn Button or unprefixed tokens.
- Task 3: `pnpm tsc --noEmit` — 0 errors. `pnpm lint` — 0 errors. `pnpm dev` — existing server already running cleanly on port 3000, no compilation errors.
- Tasks 3.4 and 3.5: verified by Jason. Focus trap bug fixed post-initial-implementation: title was excluded from Tab cycle (tabIndex=-1 not caught by FOCUSABLE selector) and focus ring was not visible on mount (browser :focus-visible suppresses programmatic focus until keyboard interaction). Fixed by manually prepending titleRef to the focusable array in handleKeyDown, and adding explicit focus:outline classes to the title. Focus color consistency across the trap (title vs buttons) noted as a known UX debt — deferred as a global design decision.

### File List

- `components/workspace/AttentionRegion.tsx` (modified)
- `components/workspace/MidgardButton.tsx` (created)

## Change Log

- 2026-05-01: Story 4.1 implemented — `AttentionRegion` extended with focus trap (`trapFocus` prop, title auto-focus on mount, Tab/Shift+Tab cycle within region); `MidgardButton` created with primary/ghost/nano tiers using Midgard design tokens. Tasks 3.4 and 3.5 pending Jason manual verification.
