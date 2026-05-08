# Story 5.6: Workspace Accessibility & Responsive Polish

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **solo designer**,
I want the full artifact workspace to be keyboard-navigable and screen reader compatible,
so that the product meets WCAG 2.1 AA and works correctly across all supported viewports.

## Acceptance Criteria

1. **Given** a keyboard user navigates the workspace
   **When** they Tab through the interface
   **Then** Tab order follows: AppNav → RoleFilterToggle chips → ArtifactIndexPanel entries → ArtifactContent sections
   **And** all interactive elements have a visible focus ring: `outline: 2px solid` using the `fg-subtle` token
   **And** `outline: none` is never set without a replacement focus indicator

2. **Given** a screen reader user navigates the workspace
   **When** they interact with the index panel
   **Then** `aria-current="page"` identifies the active artifact
   **And** artifact section transitions announce via `aria-live` region
   **And** `AllFatherLoadingState` uses `aria-atomic="false"` so cycling invocation text does not repeat-announce

3. **Given** I run axe DevTools on any workspace view
   **When** the automated scan completes
   **Then** zero critical or serious WCAG 2.1 AA violations are reported

4. **Given** the viewport is at 1023px (tablet boundary)
   **When** the layout switches to icon strip mode
   **Then** icon strip icons have a minimum 44×44px touch target
   **And** `Tooltip` (shadcn/ui) shows the artifact label on icon hover/focus in collapsed mode

5. **Given** the authenticated app is loaded on standard broadband
   **When** measured via Lighthouse or equivalent performance tool
   **Then** Time to Interactive (TTI) for the authenticated workspace completes in under 3 seconds (NFR-PERF-3)

6. **Given** design tokens are applied throughout the workspace
   **When** any component uses `--foreground-muted` (`#A1A1AA`)
   **Then** it is used exclusively for non-essential text (timestamps, metadata, placeholder labels) — never for text that conveys required information or action labels

## Tasks / Subtasks

- [x] Task 1 — Add `aria-live` region for artifact transitions to `ArtifactContent.tsx` (AC: #2)
  - [x] 1.1 Add `useState, useEffect` to imports (they are not currently imported)
  - [x] 1.2 Add announcement state and effect:
    ```typescript
    const [announcement, setAnnouncement] = useState('')
    useEffect(() => {
      setAnnouncement(`Now viewing ${activeArtifact}`)
    }, [activeArtifact])
    ```
  - [x] 1.3 Render the live region as the FIRST child of the returned JSX — the region must be in the DOM before content changes so the screen reader can pick up updates:
    ```tsx
    <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    ```
    Place this as the first element inside the root `<div>` wrapper of `ArtifactContent`

- [x] Task 2 — Add Tooltip to tablet icon strip in `ArtifactWorkspace.tsx` (AC: #4)
  - [x] 2.1 Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`
  - [x] 2.2 Wrap the entire tablet icon strip `<div>` in `<TooltipProvider delayDuration={200}>`:
    ```tsx
    <TooltipProvider delayDuration={200}>
      <div className="hidden tablet:flex mobile:hidden flex-col flex-shrink-0 border-r border-mg-border" ...>
        {ARTIFACT_TYPES.map(...)}
      </div>
    </TooltipProvider>
    ```
  - [x] 2.3 Wrap each icon strip button in `<Tooltip>` + `<TooltipTrigger asChild>` + `<TooltipContent>`:
    ```tsx
    <Tooltip key={type}>
      <TooltipTrigger asChild>
        <button
          onClick={() => { setActiveArtifact(type); setTrayOpen(true) }}
          aria-label={ARTIFACT_LABELS[type]}
          aria-current={activeArtifact === type ? 'true' : undefined}
          className={cn(
            'h-11 w-full truncate font-mono text-[11px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-foreground-subtle',
            activeArtifact === type
              ? 'text-mg-accent'
              : 'text-mg-foreground-muted hover:text-mg-foreground'
          )}
        >
          {ARTIFACT_LABELS[type]}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="bg-mg-surface border border-mg-border font-mono text-[11px] text-mg-foreground"
      >
        {ARTIFACT_LABELS[type]}
      </TooltipContent>
    </Tooltip>
    ```
    Remove the `key={type}` from the inner `<button>` since it moves to `<Tooltip>`

- [x] Task 3 — Fix `fg-muted` token violation on mobile nav disclosure button in `ArtifactWorkspace.tsx` (AC: #6)
  - [x] 3.1 The mobile nav disclosure button at line 106 currently uses `text-mg-foreground-muted` for the active artifact label — this is essential navigation information (conveys which artifact is active) and `--fg-muted` fails WCAG AA contrast at 3.2:1
  - [x] 3.2 Change `text-mg-foreground-muted` to `text-mg-foreground-subtle` on that button:
    ```tsx
    <button
      aria-expanded={mobileNavOpen}
      aria-controls="mobile-artifact-nav"
      onClick={() => setMobileNavOpen((prev) => !prev)}
      className="h-11 w-full flex items-center px-4 font-mono text-[11px] text-mg-foreground-subtle"
    >
      {ARTIFACT_LABELS[activeArtifact]}
    </button>
    ```

- [x] Task 4 — Add 44×44px touch targets to role filter chips in `RoleFilterToggle.tsx` (AC: #4)
  - [x] 4.1 Update `chipClass` to include `tablet:min-h-[44px] mobile:min-h-[44px]` and flex centering so the visual chip remains small but the touch area expands:
    ```typescript
    const chipClass = (isActive: boolean) =>
      cn(
        'font-mono text-[11px] px-2 py-0.5 border rounded cursor-pointer transition-colors',
        'tablet:min-h-[44px] mobile:min-h-[44px] tablet:flex mobile:flex tablet:items-center mobile:items-center',
        isActive
          ? 'border-mg-accent bg-mg-accent-surface text-mg-accent'
          : 'border-mg-border text-mg-foreground-subtle hover:border-mg-muted hover:text-mg-foreground-muted'
      )
    ```

- [x] Task 5 — Add 44×44px touch target wrapper for nano buttons in `SectionRegenerateControl.tsx` (AC: #4)
  - [x] 5.1 Wrap `MidgardButton` in a div that expands the touch area on tablet/mobile. Move `className` to the wrapper div (opacity transitions on the wrapper propagate to children, preserving existing hover-reveal behavior; `flex-shrink-0` on the wrapper keeps it as a flex item in the parent row):
    ```tsx
    export function SectionRegenerateControl({
      onClick,
      disabled,
      className,
    }: SectionRegenerateControlProps) {
      return (
        <div
          className={cn(
            'tablet:min-h-[44px] mobile:min-h-[44px] tablet:flex mobile:flex tablet:items-center mobile:items-center',
            className
          )}
        >
          <MidgardButton tier="nano" type="button" onClick={onClick} disabled={disabled}>
            ↺ regenerate
          </MidgardButton>
        </div>
      )
    }
    ```
  - [x] 5.2 No changes needed to `ArtifactSection.tsx` — the `className` it passes (opacity transitions, `flex-shrink-0`) now applies to the wrapper div, which is the flex item in the header row. Behavior is identical: wrapper opacity propagates to button, `flex-shrink-0` prevents wrapper from shrinking in the flex row

- [x] Task 6 — Validation (AC: all)
  - [x] 6.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 6.2 `pnpm lint` — zero ESLint errors
  - [ ] 6.3 Manual (Jason verifies): Tab through workspace — AppNav → RoleFilterToggle chips (each chip individually tabbable per checkbox group pattern) → ArtifactIndexPanel active entry → arrow key through other entries → ArtifactContent sections; all elements show visible `outline: 2px solid` focus ring
  - [ ] 6.4 Manual (Jason verifies): VoiceOver (macOS Safari) — tab to an index panel entry, press Enter to switch artifact; hear live region announce "Now viewing [type]"; navigate artifact sections and hear them announced by heading
  - [ ] 6.5 Manual (Jason verifies): AllFatherLoadingState — VoiceOver announces invocation text once on change; does not re-announce on each cycling fade (aria-atomic="false" already implemented)
  - [ ] 6.6 Manual (Jason verifies): axe DevTools — run on desktop workspace view and tablet view (via DevTools responsive mode at 1023px); zero critical/serious WCAG 2.1 AA violations
  - [ ] 6.7 Manual (Jason verifies): Tablet (1023px) — hover/focus each icon strip icon; Tooltip appears with label to the right; touch targets visually confirm ≥44px height via DevTools box model inspector; Escape dismisses overlay tray
  - [ ] 6.8 Manual (Jason verifies): Role filter chips on tablet — confirm chips have ≥44px touch height in DevTools box model
  - [ ] 6.9 Manual (Jason verifies): Lighthouse audit on authenticated workspace → TTI < 3s (NFR-PERF-3)

## Dev Notes

### What Previous Stories Already Built (Do Not Re-Implement)

This is a polish story — it applies accessibility and touch-target improvements on top of the full workspace from Stories 5.1–5.5. Most ARIA and keyboard work is already done:

| Component | Already Done |
|-----------|-------------|
| `ArtifactSection` | `role="region"` + `aria-labelledby` pointing to heading `id` |
| `ArtifactIndexPanel` | `role="navigation"` + `aria-label="Artifact sections"` + `aria-current="page"` on active entry + arrow key navigation (roving tabindex) + `focus-visible:outline` focus ring |
| `RoleFilterToggle` | `role="group"` + `aria-label="Filter by role"` + per-chip `role="checkbox"` + `aria-checked` |
| `AllFatherLoadingState` | `role="status"` + `aria-live="polite"` + `aria-atomic="false"` + `prefers-reduced-motion` support |
| Tablet icon strip (in `ArtifactWorkspace`) | `h-11` (44px) height, `aria-label` per button, `aria-current`, `focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-foreground-subtle`, Escape key handler |
| Mobile disclosure | `aria-expanded` + `aria-controls="mobile-artifact-nav"` |

### The Missing Pieces (What This Story Adds)

**1. Artifact transition announcement (`ArtifactContent.tsx`)**

There is no `aria-live` region today. When the user switches artifacts via the index panel, the content panel swaps entirely but screen readers get no announcement. The `aria-live` span must already be in the DOM before the update happens (mounting an `aria-live` region mid-change doesn't work). Placing it as the first child of the root div ensures it's mounted on initial render.

**2. Tooltip on tablet icon strip (`ArtifactWorkspace.tsx`)**

The tablet 56px icon strip shows truncated mono labels (`/flo`, `/per`, etc.) with no Tooltip. The `components/ui/tooltip.tsx` component exists (Radix UI `TooltipPrimitive`). The default shadcn/ui Tooltip uses `bg-foreground text-background` which in dark mode renders as white box / black text — override via `className` on `TooltipContent` to match the dark surface aesthetic: `bg-mg-surface border border-mg-border font-mono text-[11px] text-mg-foreground`.

**3. `fg-muted` on mobile nav disclosure button (`ArtifactWorkspace.tsx:106`)**

The mobile nav disclosure button renders `{ARTIFACT_LABELS[activeArtifact]}` (e.g., `/flows`) in `text-mg-foreground-muted`. This is the user's navigation context label — essential information. `--fg-muted` (`#A1A1AA`) has a 3.2:1 contrast ratio against `--background` (`#0A0A0A`), which fails WCAG AA (requires 4.5:1 for normal text). Change to `text-mg-foreground-subtle` (~5.5:1 — passes AA).

**4. Touch targets for chips and nano buttons**

Chips (visual ~20px) and nano buttons (~27px) are too small for 44px touch targets without adjustment. Use `tablet:min-h-[44px] mobile:min-h-[44px]` with `tablet:flex mobile:flex tablet:items-center mobile:items-center` to expand the hit area without changing visual size on desktop.

### `aria-live` Region — Why First Child Placement Matters

The `aria-live` region must exist in the DOM at initial render. Screen readers only announce changes to live regions that were already mounted. If you mount the `<span>` conditionally (e.g., only after first artifact switch), the first announcement will be silently dropped. Place it unconditionally as the first child of the root div.

### Roving Tabindex in `ArtifactIndexPanel` (Already Correct)

The index panel uses `tabIndex={activeArtifact === type ? 0 : -1}` — only the active entry has `tabIndex=0`. Users Tab into the list focusing the active entry, then use arrow keys to move between entries. This is ARIA-correct for a navigation list. The Enter key activates buttons natively — no explicit `onKeyDown` for Enter needed.

### TooltipProvider Placement

`TooltipProvider` should wrap the entire tablet icon strip, not be at the page/app level. This is intentional — the Tooltip is only needed in collapsed mode, and placing `TooltipProvider` inline keeps the scope minimal. If a root-level `TooltipProvider` is added elsewhere in a future story, these can be consolidated; for now, local scope is correct.

### `SectionRegenerateControl` Wrapper Div — Opacity Propagation

Making the wrapper div the opacity carrier (instead of the inner MidgardButton) is safe: CSS `opacity` is inherited by all children. The group-hover opacity reveal pattern (`opacity-0 group-hover:opacity-100`) and the pending-visible override (`opacity-100`) both work identically on a wrapper div as they did on the button directly. The `group` class lives on the `ArtifactSection` root div, which is an ancestor of the wrapper.

### `fg-muted` Token Constraint — Where It IS Correct

Leave these usages untouched (they are intentional and spec-compliant):
- `ArtifactSection.tsx`: "regenerating..." loading indicator — non-essential status text ✅
- `AllFatherLoadingState.tsx`: invocation text — atmospheric/decorative during loading ✅
- `ArtifactIndexPanel.tsx`: inactive entry labels — UX spec explicitly calls for `fg-muted` on inactive entries ✅
- Tablet icon strip inactive buttons — same as index entries, secondary navigation state ✅

### Tailwind Breakpoints — Already Configured

The project's `tailwind.config.js` already defines:
```javascript
tablet: { max: "1023px" },
mobile: { max: "767px" },
```
These are max-width breakpoints. `tablet:` applies at ≤1023px; `mobile:` applies at ≤767px. Never use raw CSS media queries in component files per UX spec.

### TooltipContent Styling — Override Required

The default `components/ui/tooltip.tsx` uses `bg-foreground text-background`. In dark mode:
- `--foreground` = `#FAFAFA` (near-white) → tooltip background appears white
- `--background` = `#0A0A0A` (near-black) → tooltip text appears black

This produces a light tooltip on a dark UI — technically readable but inconsistent with the Derived Systems dark aesthetic. Override via `className` on `TooltipContent`:
```
className="bg-mg-surface border border-mg-border font-mono text-[11px] text-mg-foreground"
```
Do NOT edit `components/ui/tooltip.tsx` directly — it is a shadcn/ui generated file and marked as never hand-edited in the architecture.

### Project Structure Notes

- `components/workspace/` — flat; no subdirectories; all workspace components at same level
- `components/ui/tooltip.tsx` — DO NOT edit; use only via className prop overrides
- `@/` alias maps to project root
- Use `pnpm` only — never `npm` or `yarn`

### Files to Modify

- `components/workspace/ArtifactContent.tsx` — add `aria-live` region (Task 1)
- `components/workspace/ArtifactWorkspace.tsx` — add Tooltip to tablet strip + fix mobile nav fg-muted (Tasks 2, 3)
- `components/workspace/RoleFilterToggle.tsx` — expand chip touch targets (Task 4)
- `components/workspace/SectionRegenerateControl.tsx` — wrapper div for nano touch target (Task 5)

### Files NOT Changed

- `components/workspace/ArtifactIndexPanel.tsx` — arrow keys, roving tabindex, and focus ring already correct
- `components/workspace/ArtifactSection.tsx` — `role="region"` + `aria-labelledby` already correct; caller's className on SectionRegenerateControl unchanged
- `components/workspace/AllFatherLoadingState.tsx` — `aria-atomic="false"` + prefers-reduced-motion already correct
- `components/workspace/MidgardButton.tsx` — `focus-visible:outline` already on all tiers; touch target expansion handled at SectionRegenerateControl wrapper level
- `components/ui/tooltip.tsx` — never hand-edit shadcn/ui generated components
- Any Supabase migration files — schema is unchanged

### Anti-Patterns to Avoid

- **Do not** add `outline: none` or `focus:outline-none` anywhere — always replace with a visible alternative
- **Do not** import `Tooltip` from anywhere other than `@/components/ui/tooltip`
- **Do not** use raw CSS media queries in component files — use `tablet:` and `mobile:` Tailwind prefixes
- **Do not** put `TooltipProvider` in a layout or at app root level — keep it scoped to the tablet strip
- **Do not** render the `aria-live` region conditionally — it must be in DOM from initial mount
- **Do not** use `@/lib/utils` `cn` without importing it where needed
- **Do not** change `ArtifactIndexPanel.tsx` tabIndex logic — roving tabindex is ARIA-correct as-is
- **Do not** use `role="main"` on `ArtifactContent` or `ArtifactWorkspace` — the workspace is not the page's main landmark (that lives higher in the app layout)
- **Do not** use `require()` — ESM only
- **Do not** use relative imports — always `@/` alias

### Design Token Reference

| Element | Correct token | Contrast vs `--background` |
|---------|--------------|--------------------------|
| Essential navigation labels | `text-mg-foreground-subtle` | ~5.5:1 — AA Pass |
| Secondary/inactive labels | `text-mg-foreground-muted` | ~3.2:1 — AA Fail (use only for decorative/non-essential) |
| Focus ring | `outline-mg-foreground-subtle` | Visible on all surfaces |
| Tooltip surface | `bg-mg-surface border-mg-border text-mg-foreground` | Overrides default shadcn/ui light styles |

### References

- [Source: epics.md#Story 5.6] — User story, acceptance criteria, WCAG 2.1 AA target, fg-muted constraint
- [Source: epics.md#UX-DR16] — Full WCAG 2.1 AA requirement spec: tab order, touch targets, focus ring, screen reader ARIA
- [Source: epics.md#UX-DR17] — Desktop-first responsive, breakpoints, ArtifactWorkspace owns all layout logic
- [Source: ux-design-specification.md#Accessibility] — WCAG AA color contrast table, `--fg-muted` fails AA at 3.2:1, keyboard navigation spec, screen reader ARIA map, touch target requirements (44×44px minimum)
- [Source: ux-design-specification.md#ArtifactIndexPanel] — Tooltip labels in collapsed tablet mode (56px strip)
- [Source: ux-design-specification.md#Design System Coverage] — Tooltip used for abbreviated labels in tablet icon-strip mode
- [Source: ux-design-specification.md#Responsive Layout] — Tablet breakpoint 768–1023px, 56px icon strip, overlay tray; mobile single column
- [Source: ux-design-specification.md#Implementation Guidelines] — `tablet:` and `mobile:` Tailwind prefixes only; ArtifactWorkspace owns breakpoint logic
- [Source: architecture.md#Accessibility] — WCAG 2.1 AA; Radix UI primitives
- [Source: components/workspace/ArtifactWorkspace.tsx] — Existing tablet strip (h-11, aria-label, focus ring, Escape handler), mobile disclosure (aria-expanded, aria-controls)
- [Source: components/workspace/ArtifactContent.tsx] — No aria-live region currently; activeArtifact drives content swap
- [Source: components/workspace/ArtifactIndexPanel.tsx] — Roving tabindex, arrow keys, aria-current="page" already complete
- [Source: components/workspace/RoleFilterToggle.tsx] — chipClass function; chips have py-0.5 (~20px visual height)
- [Source: components/workspace/SectionRegenerateControl.tsx] — Currently returns MidgardButton directly (no wrapper div)
- [Source: components/workspace/ArtifactSection.tsx] — Passes className with opacity transitions to SectionRegenerateControl
- [Source: components/ui/tooltip.tsx] — Radix UI TooltipPrimitive; never hand-edit; use className override for dark theme
- [Source: tailwind.config.js] — tablet: { max: "1023px" }, mobile: { max: "767px" }
- [Source: 5-5-section-regeneration.md#Dev Notes] — ArtifactSection group class for hover-reveal; opacity-0 group-hover:opacity-100 pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. `pnpm tsc --noEmit` and `pnpm lint` both passed clean on first attempt.

### Completion Notes List

- Added `aria-live="polite" aria-atomic="true"` region to `ArtifactContent.tsx` as the first child of both the "no content" and normal return paths. Announcement state updates via `useEffect` on `activeArtifact` changes, ensuring screen readers announce "Now viewing [type]" when the user switches artifacts via the index panel.
- Added shadcn/ui `Tooltip` to tablet icon strip in `ArtifactWorkspace.tsx`. Each strip button is wrapped in `<Tooltip>` + `<TooltipTrigger asChild>` + `<TooltipContent side="right">`. `TooltipProvider` scoped to the strip with `delayDuration={200}`. `TooltipContent` overrides default light styles with dark-surface tokens (`bg-mg-surface border-mg-border text-mg-foreground`).
- Fixed WCAG AA contrast violation: mobile nav disclosure button changed from `text-mg-foreground-muted` (~3.2:1, fails AA) to `text-mg-foreground-subtle` (~5.5:1, passes AA). The button label conveys essential navigation context (which artifact is active).
- Added `tablet:min-h-[44px] mobile:min-h-[44px] tablet:flex mobile:flex tablet:items-center mobile:items-center` to `chipClass` in `RoleFilterToggle.tsx`. Desktop visual unchanged; touch target expands to 44px on tablet/mobile.
- Refactored `SectionRegenerateControl.tsx` to wrap `MidgardButton` in a `<div>` that carries the `className` prop and adds touch target classes on tablet/mobile. CSS opacity on the wrapper propagates to the button child — hover-reveal behavior in `ArtifactSection.tsx` is unchanged. No changes needed to `ArtifactSection.tsx`.

### File List

- `components/workspace/ArtifactContent.tsx` — added `useState`, `useEffect`; aria-live region in both return paths (Task 1)
- `components/workspace/ArtifactWorkspace.tsx` — added Tooltip to tablet icon strip; fixed mobile nav button contrast (Tasks 2, 3)
- `components/workspace/RoleFilterToggle.tsx` — expanded chip touch targets on tablet/mobile (Task 4)
- `components/workspace/SectionRegenerateControl.tsx` — wrapper div for nano button touch target + cn import (Task 5)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated
- `_bmad-output/implementation-artifacts/5-6-workspace-accessibility-and-responsive-polish.md` — story file updated

## Change Log

- 2026-05-07: Story 5.6 implemented — aria-live announcement region in ArtifactContent, Tooltip on tablet icon strip, mobile nav contrast fix (fg-muted → fg-subtle), 44px touch targets on role chips and nano button wrapper

### Review Findings

- [x] [Review][Decision] Tooltip content duplicates aria-label on tablet icon strip buttons — accepted, keep both; mild double-announcement is not a WCAG violation and aria-label prevents silent naming failures if tooltip fails to mount.
- [x] [Review][Decision] aria-live announces raw type key, not human-readable label — fixed: imported ARTIFACT_LABELS locally in ArtifactContent and use label value in announcement.
- [x] [Review][Patch] aria-live region split across two branches — fixed: both return paths now share `<div>` as root; live region is first child in both, stable across branch transitions. [`components/workspace/ArtifactContent.tsx`]
- [x] [Review][Patch] aria-live announces on initial mount producing spurious first-render announcement — fixed: added `useRef` isFirstRender guard to skip mount-time announcement. [`components/workspace/ArtifactContent.tsx`]
- [x] [Review][Patch] Tooltip arrow inherits hardcoded `bg-foreground fill-foreground` from tooltip.tsx — fixed: added `[&>svg]:hidden` to TooltipContent className to hide the arrow entirely. [`components/workspace/ArtifactWorkspace.tsx`]
- [x] [Review][Patch] No cursor-pointer on SectionRegenerateControl touch-target wrapper div — fixed: added `tablet:cursor-pointer mobile:cursor-pointer` to wrapper className. [`components/workspace/SectionRegenerateControl.tsx`]
- [x] [Review][Defer] trayOpen has no toggle when same artifact button is re-clicked on tablet — keyboard users cannot close the overlay tray by pressing the already-active icon strip button again; Escape is the only dismiss path. [`components/workspace/ArtifactWorkspace.tsx`] — deferred, pre-existing behavior unchanged by this diff
