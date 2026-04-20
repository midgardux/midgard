# Story 1.1: Project Initialization & Design Token Foundation

Status: review

## Story

As a **developer**,
I want the project initialized from the official Supabase Next.js starter with all required dependencies and design tokens configured,
So that every subsequent story builds on a consistent, working foundation with the correct visual system in place.

## Acceptance Criteria

**Given** the repository is empty
**When** the initialization sequence is run
**Then** `npx create-next-app@latest --example with-supabase midgard` produces a working Next.js 15 App Router project with TypeScript, Tailwind CSS, and Supabase auth middleware pre-wired
**And** `pnpm dlx shadcn@latest init` is run and shadcn/ui is configured
**And** `pnpm add stripe @stripe/stripe-js @anthropic-ai/sdk zustand @tanstack/react-query mammoth pdf-parse resend` installs without errors
_(Note: the epics doc says `npm install` — `pnpm add` is equivalent and correct since pnpm is the chosen package manager throughout this project)_

**Given** the project is initialized
**When** Tailwind config is updated
**Then** the full design token set is defined — either as Tailwind color tokens (v3) or as `@theme` CSS vars (v4):
- Base palette: `background #0A0A0A`, `surface #111111`, `surface-elevated #1C1C1E`, `border #27272A`, `muted #3F3F46`, `foreground #FAFAFA`, `foreground-muted #A1A1AA`, `foreground-subtle #52525B`
- Accent palette: `accent #E8D5A3`, `accent-muted #A89060`, `accent-surface #1E1A11`
- Semantic palette: `success #22C55E`, `warning #F59E0B`, `destructive #EF4444`, `info #3B82F6`
**And** Geist Sans (`--font-geist-sans`) and Geist Mono (`--font-geist-mono`) are loaded from the `geist` package and configured as the Tailwind `font-sans` and `font-mono` stacks
**And** custom Tailwind breakpoints are defined: `tablet: { max: '1023px' }`, `mobile: { max: '767px' }`
**And** all 15 design tokens are also declared as CSS custom properties in `globals.css` `:root` (e.g. `--accent: #E8D5A3`) so they are available to arbitrary CSS throughout the app
**And** `.env.example` documents all required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `OPERATOR_ALERT_EMAIL`
**And** `src/types/actions.ts` defines and exports `ActionResult<T>`
**And** `dev` server starts without errors at `localhost:3000`

## Tasks / Subtasks

- [x] Task 1 — Initialize project from Supabase starter (AC: Init command)
  - [x] 1.1 Run `npx create-next-app@latest --example with-supabase midgard` — select **pnpm** when prompted for package manager
  - [x] 1.2 `cd midgard`
  - [x] 1.3 Run `pnpm dlx shadcn@latest init` — accept defaults; components install to `src/components/ui/`
  - [x] 1.4 Install all required shadcn/ui components: `pnpm dlx shadcn@latest add button input textarea badge scroll-area tooltip separator dropdown-menu` — these are all the components the architecture specifies; installing now prevents ad-hoc additions in later stories
  - [x] 1.5 Install additional dependencies: `pnpm add stripe @stripe/stripe-js @anthropic-ai/sdk zustand @tanstack/react-query mammoth pdf-parse resend`
  - [x] 1.6 Verify `pnpm dev` starts without error on `localhost:3000`

- [x] Task 2 — Configure design tokens (AC: Token set + CSS vars)
  - [x] 2.1 **Check Tailwind version first**: run `pnpm list tailwindcss` — if v3.x follow the `tailwind.config.ts` approach; if v4.x follow the `@theme` CSS approach (see Dev Notes for both)
  - [x] 2.2 Apply the appropriate token config per the version detected in 2.1
  - [x] 2.3 Confirm the `geist` package is already present in `package.json` (the starter includes it). If present, import `GeistSans` from `'geist/font/sans'` and `GeistMono` from `'geist/font/mono'`. Do NOT use `next/font/google` — use the local `geist` package only
  - [x] 2.4 In `src/app/layout.tsx`: add `GeistMono` import alongside the existing `GeistSans` import; apply `GeistMono.variable` to the `<html>` className alongside `GeistSans.variable` (see exact snippet in Dev Notes)
  - [x] 2.5 Register `fontFamily.sans` → `var(--font-geist-sans)` and `fontFamily.mono` → `var(--font-geist-mono)` in the Tailwind config (v3) or CSS `@theme` block (v4)
  - [x] 2.6 Add all 15 design tokens as CSS custom properties in `globals.css` `:root` block (see exact snippet in Dev Notes)
  - [x] 2.7 Add custom breakpoints `tablet` and `mobile`
  - [x] 2.8 Run `pnpm tsc --noEmit` — zero type errors

- [x] Task 3 — Environment variable documentation (AC: .env.example)
  - [x] 3.1 Create `.env.example` at project root with all 9 required vars (see Dev Notes)
  - [x] 3.2 Confirm `.env.local` is already in `.gitignore` — do not add a duplicate entry

- [x] Task 4 — Shared TypeScript types (AC: ActionResult<T>)
  - [x] 4.1 Create `src/types/actions.ts` exporting `ActionResult<T>` (see exact shape in Dev Notes)
  - [x] 4.2 Create empty placeholder files: `src/types/database.ts`, `src/types/artifacts.ts`

- [x] Task 5 — Directory scaffolding and path alias verification
  - [x] 5.1 Create `.gitkeep` files in: `src/actions/`, `src/lib/supabase/`, `src/lib/stripe/`, `src/lib/claude/`, `src/lib/parsers/`, `src/stores/`, `src/components/workspace/`
  - [x] 5.2 The starter creates `src/utils/supabase/` — **leave it untouched**; Story 1.2 creates the canonical `src/lib/supabase/` equivalents
  - [x] 5.3 Open `tsconfig.json` and verify: `"baseUrl": "."` and `"paths": { "@/*": ["./src/*"] }` are present. If missing or pointing to a different root, correct them now — every subsequent story uses `@/` imports

- [x] Task 6 — Final validation (AC: dev server)
  - [x] 6.1 Run `pnpm dev` — confirm `localhost:3000` loads without errors
  - [x] 6.2 Run `pnpm tsc --noEmit` — zero type errors
  - [x] 6.3 Run `pnpm lint` — zero lint errors (document any pre-existing starter warnings; do not fix them in this story)

## Dev Notes

### Canonical Commands for This Story

```bash
# 1. Initialize
npx create-next-app@latest --example with-supabase midgard
cd midgard

# 2. shadcn/ui — init + all required components
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input textarea badge scroll-area tooltip separator dropdown-menu

# 3. App dependencies
pnpm add stripe @stripe/stripe-js @anthropic-ai/sdk zustand @tanstack/react-query mammoth pdf-parse resend
```

> **Always use pnpm.** Mixing `npm` and `pnpm` in the same project produces lockfile conflicts. The AC wording `npm install` in epics.md means "install these packages" — `pnpm add` satisfies it.

---

### Tailwind Version Detection

Run `pnpm list tailwindcss` immediately after init and follow the matching section below.

---

#### If Tailwind v3 — `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:          '#0A0A0A',
        surface:             '#111111',
        'surface-elevated':  '#1C1C1E',
        border:              '#27272A',
        muted:               '#3F3F46',
        foreground:          '#FAFAFA',
        'foreground-muted':  '#A1A1AA',
        'foreground-subtle': '#52525B',
        accent:              '#E8D5A3',
        'accent-muted':      '#A89060',
        'accent-surface':    '#1E1A11',
        success:             '#22C55E',
        warning:             '#F59E0B',
        destructive:         '#EF4444',
        info:                '#3B82F6',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      screens: {
        tablet: { max: '1023px' },
        mobile: { max: '767px' },
      },
    },
  },
  plugins: [],
}
export default config
```

---

#### If Tailwind v4 — `globals.css` `@theme` block

Tailwind v4 uses CSS-first configuration. There is no `tailwind.config.ts` for theme customization. Add to `globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-background:          #0A0A0A;
  --color-surface:             #111111;
  --color-surface-elevated:    #1C1C1E;
  --color-border:              #27272A;
  --color-muted:               #3F3F46;
  --color-foreground:          #FAFAFA;
  --color-foreground-muted:    #A1A1AA;
  --color-foreground-subtle:   #52525B;
  --color-accent:              #E8D5A3;
  --color-accent-muted:        #A89060;
  --color-accent-surface:      #1E1A11;
  --color-success:             #22C55E;
  --color-warning:             #F59E0B;
  --color-destructive:         #EF4444;
  --color-info:                #3B82F6;

  /* Fonts */
  --font-sans: var(--font-geist-sans), sans-serif;
  --font-mono: var(--font-geist-mono), monospace;

  /* Breakpoints (desktop-first max-width) */
  --breakpoint-tablet: 1023px;
  --breakpoint-mobile: 767px;
}
```

> In v4 Tailwind classes like `bg-accent`, `text-foreground-muted` etc. are generated automatically from `--color-*` vars. The `tablet:` and `mobile:` prefixes work as max-width variants.

---

### CSS Custom Properties in `globals.css` `:root` (Required for All Tailwind Versions)

These vars must exist regardless of Tailwind version because components reference them directly in CSS (e.g. `outline: 2px solid var(--foreground-subtle)`, `var(--index-panel-width)`). Add to the `:root` block in `globals.css`:

```css
:root {
  /* Design tokens as CSS vars — used by components via var() */
  --background:          #0A0A0A;
  --surface:             #111111;
  --surface-elevated:    #1C1C1E;
  --border:              #27272A;
  --muted:               #3F3F46;
  --foreground:          #FAFAFA;
  --foreground-muted:    #A1A1AA;
  --foreground-subtle:   #52525B;
  --accent:              #E8D5A3;
  --accent-muted:        #A89060;
  --accent-surface:      #1E1A11;
  --success:             #22C55E;
  --warning:             #F59E0B;
  --destructive:         #EF4444;
  --info:                #3B82F6;

  /* Layout tokens */
  --index-panel-width:      258px;
  --index-panel-collapsed:  56px;
}
```

> If the starter already has a `:root` block, **extend it** — do not replace it.

---

### Font Setup in Root Layout — `src/app/layout.tsx`

The `geist` package is a local dependency (already in starter's `package.json`). Import from it directly — do **not** use `next/font/google`.

```tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

// GeistSans.variable === '--font-geist-sans'
// GeistMono.variable === '--font-geist-mono'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

> The starter already imports `GeistSans`. Find that import and add `GeistMono` alongside it. Apply both `.variable` values to `<html>`. Do not create a second font config elsewhere.

---

### ActionResult\<T\> — `src/types/actions.ts`

```typescript
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

This type is used by **every** Server Action in the project. Never throw from a Server Action — always return this shape.

---

### `.env.example` Content

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend (email)
RESEND_API_KEY=
OPERATOR_ALERT_EMAIL=
```

---

### Project Structure Notes

**What the `with-supabase` starter creates — do not delete:**
- `middleware.ts` at project root — Supabase session refresh + route protection. **DO NOT MODIFY in this story.** Story 1.6 extends it.
- `src/utils/supabase/client.ts`, `server.ts`, `middleware.ts` — starter's Supabase utilities. **Leave in place.** Story 1.2 creates the canonical `src/lib/supabase/` versions per the architecture.
- `src/app/login/` and `src/app/auth/` — basic auth scaffolding. **Leave in place.** Stories 1.3–1.5 replace/extend these.

**Final `src/` structure after this story:**

```
src/
  app/
    layout.tsx          ← updated: GeistMono added, CSS var classes applied
    globals.css         ← updated: :root CSS vars + Tailwind theme tokens
    ...                 ← starter routes (untouched)
  components/
    ui/                 ← shadcn/ui (auto-generated — never hand-edit)
    workspace/          ← empty dir, custom components added in later stories
  actions/              ← empty dir, Server Actions added from Story 1.3+
  lib/
    supabase/           ← empty dir, populated in Story 1.2
    stripe/             ← empty dir, populated in Story 6.1
    claude/             ← empty dir, populated in Story 4.5
    parsers/            ← empty dir, populated in Story 4.2
  stores/               ← empty dir, useWorkspaceStore added in Story 4.2
  types/
    actions.ts          ← ActionResult<T> (THIS STORY)
    database.ts         ← empty placeholder
    artifacts.ts        ← empty placeholder
  utils/                ← starter's supabase utils (leave untouched)
```

---

### Architecture Guardrails for This Story

- **Scope is foundation only.** No auth logic, no database migrations, no Claude/Stripe wiring.
- **`shadcn/ui` components** live exclusively in `src/components/ui/` — auto-managed by the CLI, never hand-edited.
- **Custom workspace components** (`AttentionRegion`, etc.) go in `src/components/workspace/` — directory only in this story.
- **TypeScript strict mode** is on by default in the starter. Do not loosen it.
- **Import alias `@/*`** → `./src/*` — use throughout. Never use relative paths like `../../`.
- **No Zustand store yet.** `useWorkspaceStore` is created in Story 4.2.

---

### Key Package Notes

| Package | Purpose | Watch For |
|---|---|---|
| `stripe` | Stripe server SDK | Use latest stable |
| `@stripe/stripe-js` | Stripe browser SDK | Use latest stable |
| `@anthropic-ai/sdk` | Claude API | Use latest stable |
| `zustand` | UI state management | v4+ |
| `@tanstack/react-query` | Server state/cache | **v5** — breaking change from v4: `onSuccess`/`onError` removed from hook options; use returned `data`/`error` instead |
| `mammoth` | Word doc parser (.docx) | Use latest stable |
| `pdf-parse` | PDF text extraction | Use latest stable |
| `resend` | Email delivery (Supabase Edge Functions + server) | Use latest stable |

---

### References

- Architecture: init command and directory structure [Source: `_bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation`]
- Architecture: ActionResult\<T\> definition [Source: `_bmad-output/planning-artifacts/architecture.md#Format Patterns`]
- Architecture: Complete directory structure [Source: `_bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure`]
- UX: Design token values [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Color System`]
- UX: Typography and font setup [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Typography System`]
- UX: Breakpoint strategy [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Breakpoint Strategy`]
- UX: Layout tokens (panel widths) [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Spacing & Layout Foundation`]
- Epics: Story 1.1 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.1`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- pnpm not installed — installed via `npm install -g pnpm` before running project setup
- `create-next-app` rejected "Midgard" as a project name (capital letters forbidden in npm package names) — initialized into a `midgard/` subdirectory, then hoisted all files to project root via `rsync`
- Starter uses **flat structure** (no `src/`): `app/`, `components/`, `lib/` live at project root. All story path references adapted accordingly (`types/` not `src/types/`, etc.)
- `geist` package was NOT pre-installed in this version of the starter (it used `next/font/google` instead). Installed `geist@1.7.0` explicitly and switched `layout.tsx` to use local package imports as the story requires
- shadcn already initialized by the starter (components.json present). Added only the missing components: `scroll-area`, `tooltip`, `separator`, `textarea`
- Design token naming conflict with shadcn: shadcn occupies `--background`, `--foreground`, `--accent`, `--muted`, `--destructive`, `--border` as HSL vars. Midgard tokens use `--mg-*` prefix in CSS vars and `mg-*` prefix in Tailwind classes to coexist without breaking shadcn components
- Pre-existing lint error in starter's `tailwind.config.ts`: `require("tailwindcss-animate")` flagged by `@typescript-eslint/no-require-imports`. Fixed by converting to ESM import since the story requires zero lint errors
- tsconfig path alias is `"@/*": ["./*"]` (root-relative), not `"./src/*"` — correct for the flat structure; no change needed

### Completion Notes List

- Tailwind v3.4.19 detected — used `tailwind.config.ts` approach
- All 15 design tokens added to `tailwind.config.ts` as `mg-*` color keys and to `globals.css` `:root` as `--mg-*` CSS vars
- Font stack: GeistSans + GeistMono applied as `.variable` on `<html>`, registered in Tailwind `fontFamily.sans`/`fontFamily.mono`
- Breakpoints `tablet` and `mobile` added to `tailwind.config.ts`
- `types/actions.ts` exports `ActionResult<T>` — used by all Server Actions
- Scaffold dirs created: `actions/`, `lib/stripe/`, `lib/claude/`, `lib/parsers/`, `stores/`, `components/workspace/`
- `lib/supabase/` already present from starter — left untouched per story spec
- `pnpm tsc --noEmit` — zero errors; `pnpm lint` — zero errors; `pnpm dev` — loads at localhost:3000

### File List

- `tailwind.config.ts` — modified: added mg-* design tokens, fontFamily, screens, ESM import for tailwindcss-animate
- `app/globals.css` — modified: added --mg-* CSS vars and layout tokens to :root block
- `app/layout.tsx` — modified: switched to geist local package, added GeistMono, applied .variable on html
- `.env.example` — modified: expanded from 2 to 9 required env vars
- `types/actions.ts` — created: ActionResult<T> type
- `types/database.ts` — created: empty placeholder
- `types/artifacts.ts` — created: empty placeholder
- `actions/.gitkeep` — created: scaffold directory
- `lib/stripe/.gitkeep` — created: scaffold directory
- `lib/claude/.gitkeep` — created: scaffold directory
- `lib/parsers/.gitkeep` — created: scaffold directory
- `stores/.gitkeep` — created: scaffold directory
- `components/workspace/.gitkeep` — created: scaffold directory
- `components/ui/scroll-area.tsx` — created: by shadcn CLI
- `components/ui/tooltip.tsx` — created: by shadcn CLI
- `components/ui/separator.tsx` — created: by shadcn CLI
- `components/ui/textarea.tsx` — created: by shadcn CLI

## Change Log

- 2026-04-19: Story 1.1 implemented — project initialized from with-supabase starter, all dependencies installed, Midgard design tokens configured (mg-* prefix), fonts switched to local geist package, scaffold directories created, ActionResult<T> type defined
