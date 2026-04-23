# Story 2.1: Marketing Landing Page

Status: done

## Story

As a **prospective user**,
I want to read a clear, well-designed landing page that explains what Midgard does and what it costs,
So that I can decide whether to sign up without needing to speak to anyone.

## Acceptance Criteria

**Given** I visit `/`
**When** the page loads
**Then** the page is server-side rendered (SSR/SSG) with a Lighthouse Performance score ≥ 90, SEO score ≥ 90, and Accessibility score ≥ 90
**And** the page uses the stripe.dev / Resend visual register: dark background (`#0A0A0A`), high-contrast foreground (`#FAFAFA`), Geist font family, spare confident prose
**And** the value proposition is legible without scrolling on a 1280px desktop viewport: what Midgard does, who it's for, and what it costs
**And** a primary CTA button links to `/signup`
**And** a pricing section displays Free tier (project cap, features) and Pro tier ($15–20/month, no usage caps) without requiring signup to view

**Given** a search engine crawler visits `/`
**When** the page is indexed
**Then** the page has a `<title>` tag, `<meta name="description">`, `og:title`, `og:description`, and `og:image` populated with Midgard-specific content
**And** the page is not blocked by `robots.txt` or `noindex` directives

## Tasks / Subtasks

- [x] Task 1 — Fix ThemeProvider in `app/layout.tsx` to enforce dark-only mode (AC: all)
  - [x] 1.1 Change `defaultTheme="system"` → `defaultTheme="dark"` and add `forcedTheme="dark"`
  - [x] 1.2 Remove `enableSystem` prop — Midgard has no light-mode token overrides; system theme would render broken colors

- [x] Task 2 — Remove conflicting root-level landing page (AC: all)
  - [x] 2.1 Delete `app/page.tsx` — this is the Supabase starter template placeholder; it conflicts with `app/(marketing)/page.tsx` at the `/` route in Next.js App Router

- [x] Task 3 — Create landing page at `app/(marketing)/page.tsx` (AC: 1, 2)
  - [x] 3.1 Export `metadata` (not `generateMetadata`) — title, description, openGraph block with title/description/url/image/type, and `robots: { index: true, follow: true }`
  - [x] 3.2 Build hero section: Midgard wordmark, one-sentence tagline ("From brief to UX foundation in under 10 minutes."), subtext naming the target user (solo designers and contractors), primary CTA button → `/signup`
  - [x] 3.3 Build feature highlight section: 2–3 sparse bullet points covering what Midgard generates (personas, user flows, IA, synthesis overview)
  - [x] 3.4 Build pricing section: Free tier card (3 Realms, all artifact types, no credit card) + Pro tier card ($19/month) with CTA → `/signup`; pricing visible without scrolling on second pass
  - [x] 3.5 Apply design tokens throughout — use `mg-*` Tailwind classes (`bg-mg-background`, `text-mg-foreground`, `text-mg-foreground-muted`, `border-mg-border`, `bg-mg-accent`, `bg-mg-surface`); no hardcoded hex values
  - [x] 3.6 Use `font-mono` Tailwind class for labels, nav items, pricing tier names; use `font-sans` for prose and headings
  - [x] 3.7 Link "Log in" (Ghost tier button) in nav to `/login`; primary CTA in hero and pricing to `/signup`
  - [x] 3.8 No images, no illustrations, no icon libraries — pure typography and borders only (stripe.dev aesthetic)

- [x] Task 4 — Create `app/robots.ts` (AC: 2)
  - [x] 4.1 Allow indexing of `/`, `/pricing`, `/login`, `/signup`
  - [x] 4.2 Disallow indexing of `/(app)/*` — in practice, use `disallow: ['/projects/', '/account/']` since route groups don't appear in URLs

- [x] Task 5 — Verify OG image is served (AC: 2)
  - [x] 5.1 Confirm `app/opengraph-image.png` exists (it does — from Story 1.1 init); the root layout's `metadataBase` makes it resolvable at `{baseUrl}/opengraph-image.png`
  - [x] 5.2 Reference `/opengraph-image.png` in the page metadata `openGraph.images` array

- [x] Task 6 — Validation (AC: all)
  - [x] 6.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 6.2 `pnpm lint` — zero ESLint errors
  - [x] 6.3 `pnpm dev` — server starts, `/` renders with Midgard content (not the Supabase starter)
  - [x] 6.4 Manual: view-source on `/` — confirmed `<title>`, `<meta name="description">`, `og:*` tags present in HTML
  - [x] 6.5 Manual: `/robots.txt` — confirmed public routes allowed, `/projects/` and `/account/` disallowed
  - [x] 6.6 Manual: verified no `noindex` meta tag on `/`

### Review Findings

- [x] [Review][Decision] Two primary CTA buttons on one page — Pro CTA demoted to Ghost, href changed to `/signup?plan=pro`; Story 6.2 to handle plan param in Stripe Checkout flow. [`app/(marketing)/page.tsx`]
- [x] [Review][Patch] No `<main>` landmark element — wrapped hero/features/pricing sections in `<main>`. [`app/(marketing)/page.tsx`]
- [x] [Review][Defer] ThemeSwitcher in `app/protected/layout.tsx` still offers light/system options that `forcedTheme="dark"` silently overrides — pre-existing Supabase starter component, out of scope for Story 2.1
- [x] [Review][Defer] Pricing hardcoded in JSX ($19/month) — intentional for MVP; extract to config when Epic 6 billing is built
- [x] [Review][Defer] `disableTransitionOnChange` is a no-op alongside `forcedTheme="dark"` — dead config, harmless; clean up in a future pass
- [x] [Review][Defer] `app/robots.ts` has no `sitemap` or `host` field; no `app/sitemap.ts` exists — Story 2.2 is the SEO story where sitemap and canonical host should be added

## Dev Notes

### Critical File Conflict — Delete `app/page.tsx` First

`app/page.tsx` currently exists with the Supabase starter template (imports `Hero`, `ConnectSupabaseSteps`, `DeployButton`, etc.). In Next.js App Router, both `app/page.tsx` and `app/(marketing)/page.tsx` would serve the `/` route — this is a build error. **Delete `app/page.tsx` as the first action in this story.** The `(marketing)` route group does not add a URL segment; its pages serve the same paths as if they were in `app/` directly.

### ThemeProvider Must Be Dark-Only

`app/layout.tsx` currently has `defaultTheme="system"` and `enableSystem`. Midgard has no light-mode token overrides — system theme renders broken colors on light OS. Change to:
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  forcedTheme="dark"
  disableTransitionOnChange
>
```
Remove `enableSystem`. This applies globally — login, signup, and all marketing pages are already dark by design.

### Design Token Prefix — `mg-*` Not Bare Names

Midgard tokens use the `mg-*` Tailwind prefix to avoid collision with shadcn/ui's unprefixed CSS vars. Story specs in the architecture and UX docs reference `--accent`, `--background`, etc. — in this codebase those translate to:

| Spec reference | Actual Tailwind class | CSS var |
|---|---|---|
| `--background` | `bg-mg-background` | `var(--mg-background)` |
| `--foreground` | `text-mg-foreground` | `var(--mg-foreground)` |
| `--foreground-muted` | `text-mg-foreground-muted` | `var(--mg-foreground-muted)` |
| `--foreground-subtle` | `text-mg-foreground-subtle` | `var(--mg-foreground-subtle)` |
| `--surface` | `bg-mg-surface` | `var(--mg-surface)` |
| `--border` | `border-mg-border` | `var(--mg-border)` |
| `--accent` | `bg-mg-accent` | `var(--mg-accent)` |
| `--accent-surface` | `bg-mg-accent-surface` | `var(--mg-accent-surface)` |

Never use hardcoded hex colors — always use the `mg-*` token classes.

### Landing Page Strategy — stripe.dev Register

The UX spec explicitly cites stripe.dev and Resend as the visual and tonal reference for the landing page (UX-DR18). The implementation register:
- Dark background `bg-mg-background`, high-contrast `text-mg-foreground`
- Geist Mono for all labels, tier names, navigation items, CTA button text (uppercase, tracked)
- Geist Sans for prose and section descriptions
- Spare, confident prose — no marketing superlatives; facts only
- No icons, no illustrations, no decorative elements
- Three-tier button hierarchy: Primary CTA (one on the page) in `bg-mg-accent text-mg-background`, Ghost nav link with `border-mg-border`

### Button Hierarchy — One Primary Per Page

Only one Primary button is permitted per view. Primary = `bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2`.

- Hero CTA: Primary → `/signup`
- Nav login link: Ghost (`border border-mg-border text-mg-foreground-subtle font-mono text-xs`)
- Pricing section CTAs: Ghost tier for Free, Primary tier for Pro (since the primary action is upgrading/signing up for Pro)

### Pricing Copy

From the epics, Story 2.1 specifies "Pro tier ($15–20/month)". Pick a single specific price for the implementation — $19/month is the upper end and signals value better than $15. Do not use a range in the UI. Free tier cap is 3 Realms (from `config.free_tier_project_cap` seed value).

### Metadata API

Use the static `metadata` export (not `generateMetadata` — no async data needed):

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Midgard — AI UX Analysis for Solo Designers',
  description: 'From brief to UX foundation in under 10 minutes. Personas, user flows, information architecture, and synthesis — generated from your product description.',
  openGraph: {
    title: 'Midgard — AI UX Analysis for Solo Designers',
    description: 'From brief to UX foundation in under 10 minutes.',
    url: '/',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

The `metadataBase` is already set in `app/layout.tsx` using `VERCEL_URL` — page-level metadata inherits it automatically.

### robots.ts Pattern

Create `app/robots.ts` (Next.js file-based robots.txt generation):

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/login', '/signup'],
        disallow: ['/projects/', '/account/'],
      },
    ],
  }
}
```

This serves `/robots.txt` automatically. No `public/robots.txt` file — use the App Router convention.

### Fonts Are Already Configured

`app/layout.tsx` (from Story 1.1) already loads Geist via:
```tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
```
And applies `font-sans` and `font-mono` CSS variables. No font setup needed in this story — just use `font-sans` and `font-mono` Tailwind utility classes in the landing page.

### SSG — No Dynamic Data

The landing page has no user-specific or dynamic data. Next.js will statically generate it by default (no `export const dynamic = 'force-dynamic'` needed). Do not add `revalidate` or `dynamic` exports — let the framework default to static.

### No `(app)/` Route Group Yet

Epic 3 creates the `(app)/` route group. The `app/protected/` folder from the Supabase starter template still exists — do not touch it in this story. Middleware already protects `/projects/` and `/account/` paths (once those routes exist in Epic 3).

### Middleware Public Path Allowlist — No Change Needed

`lib/supabase/proxy.ts` already has `/` in its `isPublicPath` check. No middleware changes required for this story. When Story 2.2 adds `/pricing`, that path must be added to both the redirect guard AND the `isPublicPath` boolean in `proxy.ts`.

### Value Proposition Copy — Suggested

From the UX spec (Primary user: Maya — solo designer/contractor, time-pressured, desktop):
- Hero headline: "Your brief. Four UX artifacts. Ten minutes." (or similar — spare, fact-first)
- Subtext: "Midgard synthesizes product descriptions into personas, user flows, information architecture, and a synthesis overview — without prompting, without manual formatting."
- Target user signal: "Built for solo designers and UX contractors."

The dev agent should write copy that is sparse and confident (Runes and Iron principle) — no "revolutionary", "AI-powered magic", or marketing superlatives.

### Project Structure Notes

- **New file**: `app/(marketing)/page.tsx` — landing page at `/`
- **New file**: `app/robots.ts` — serves `/robots.txt`
- **Delete**: `app/page.tsx` — Supabase starter template; conflicts with `(marketing)/page.tsx`
- **Modify**: `app/layout.tsx` — ThemeProvider dark-only fix
- No new dependencies, no schema changes, no Server Actions

### References

- [Source: epics.md#Story 2.1] — Acceptance criteria and business context
- [Source: epics.md#Story 2.2] — Pricing page (next story); `/pricing` path added there, not here
- [Source: architecture.md#Frontend Architecture] — SSR/SSG for `(marketing)/` route group; rendering split
- [Source: architecture.md#Complete Project Directory Structure] — `app/(marketing)/page.tsx` canonical path
- [Source: ux-design-specification.md#Design Direction Decision] — Derived Systems; stripe.dev landing register; density as resting state
- [Source: ux-design-specification.md#Button Hierarchy] — Primary/Ghost/Nano tiers; one Primary per view
- [Source: ux-design-specification.md#Norse Brand System] — Midgard / Realms / Allfather vocabulary; "Runes and Iron" voice
- [Source: project-context.md#Critical Implementation Rules] — mg-* token prefix; geist font imports; dark-only ThemeProvider; no src/ prefix
- [Source: project-context.md#Middleware public path allowlist] — no change needed for `/`; note for `/pricing` in Story 2.2
- [Source: prd.md#FR39–FR41] — Public landing page, SEO indexing, meta tags on all public pages
- [Source: prd.md#NFR-PERF-4] — Lighthouse ≥90 for Performance, SEO, Accessibility on marketing page
- [Source: prd.md#NFR-ACCESS-1] — WCAG 2.1 AA on marketing landing page

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Cleared `.next` cache after deleting `app/page.tsx` to resolve stale TS validator reference
- Fixed unescaped apostrophe in "persona's" copy (`&apos;`) per react/no-unescaped-entities rule
- Hardcoded year `2026` in footer — `new Date()` is disallowed in static Server Components in Next.js 16
- Added `robots.txt` and `sitemap.xml` to middleware matcher exclusion pattern; middleware was redirecting `/robots.txt` to `/login` since it wasn't in the `isPublicPath` allowlist and wasn't excluded from the matcher

### Completion Notes List

All six tasks and 17 subtasks complete. Implemented the Midgard marketing landing page at `app/(marketing)/page.tsx` with stripe.dev-register design (dark background, Geist fonts, sparse typography, no illustrations). ThemeProvider locked to dark-only. Supabase starter `app/page.tsx` deleted to resolve route conflict. `app/robots.ts` serves correct `/robots.txt`. All `mg-*` tokens used throughout — no hardcoded hex values. `pnpm tsc --noEmit` and `pnpm lint` both pass with zero errors.

### File List

- `app/(marketing)/page.tsx` — new: marketing landing page at `/`
- `app/robots.ts` — new: Next.js file-based robots.txt generation
- `app/layout.tsx` — modified: ThemeProvider dark-only (`defaultTheme="dark"`, `forcedTheme="dark"`, removed `enableSystem`)
- `app/page.tsx` — deleted: Supabase starter template placeholder (route conflict)
- `middleware.ts` — modified: added `robots.txt` and `sitemap.xml` to matcher exclusion pattern

## Change Log

- 2026-04-22: Story 2.1 implemented — landing page created, ThemeProvider dark-only, robots.ts added, app/page.tsx deleted, middleware matcher updated for robots.txt
