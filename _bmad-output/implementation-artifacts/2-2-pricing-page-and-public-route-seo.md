# Story 2.2: Pricing Page & Public Route SEO

Status: done

## Story

As a **prospective user**,
I want a dedicated pricing page and consistent SEO metadata across all public pages,
So that I can find and evaluate Midgard through search engines and share links that render correctly.

## Acceptance Criteria

**Given** I visit `/pricing`
**When** the page loads
**Then** the page renders SSR/SSG with full pricing details for Free and Pro tiers
**And** the page matches the landing page visual register (same dark aesthetic, same font system, mg-* tokens)
**And** a CTA links to `/signup`

**Given** any public page (`/`, `/pricing`, `/login`, `/signup`) is loaded
**When** the HTML is inspected
**Then** each page has a unique, descriptive `<title>` and `<meta name="description">`
**And** each page has `og:title`, `og:description`, `og:image`, and `og:url` Open Graph tags
**And** all tags are populated with page-specific content — no generic fallbacks

**Given** a search engine visits `/login` or `/signup`
**When** the page is crawled
**Then** the pages are indexable and include appropriate meta descriptions
**And** authenticated app routes (`/(app)/*`) are excluded from indexing via `robots.txt` (already in place from Story 2.1)

## Tasks / Subtasks

- [x] Task 1 — Update `lib/supabase/proxy.ts` to allow `/pricing` as a public path (AC: all)
  - [x] 1.1 Add `pathname.startsWith("/pricing") ||` to the `isPublicPath` condition — without this, authenticated users visiting `/pricing` trigger the `last_active_at` update, and more critically, unauthenticated users get redirected to `/login`
  - [x] 1.2 Verify ordering: add after `pathname === "/"` and before existing `.startsWith("/login")` line

- [x] Task 2 — Create `app/(marketing)/pricing/page.tsx` (AC: 1, 2)
  - [x] 2.1 Export static `metadata` with unique title (`Pricing — Midgard`), description, and full `openGraph` block including `og:url: '/pricing'`, `og:image: '/opengraph-image.png'`, `og:type: 'website'`; include `robots: { index: true, follow: true }`
  - [x] 2.2 Match the landing page visual structure exactly: same nav (Midgard wordmark + Log in Ghost button → `/login`), same footer (© 2026 Midgard), same `max-w-4xl mx-auto px-6` container, same `bg-mg-background text-mg-foreground min-h-screen`
  - [x] 2.3 Build hero section: `font-mono text-xs uppercase tracking-widest text-mg-foreground-muted` label ("Pricing"), concise headline in `font-sans`, short description sentence
  - [x] 2.4 Build pricing grid: identical card layout to the landing page pricing section — Free tier card + Pro tier card in `grid grid-cols-1 md:grid-cols-2 gap-4`; include all tier features (Free: 3 Realms, all artifact types, no credit card; Pro: Unlimited Realms, all artifact types, no usage caps, $19/month)
  - [x] 2.5 Button hierarchy on pricing page: one Primary CTA button → `/signup` (the single conversion action on the page); tier cards use Ghost buttons; do NOT put a Primary button in every tier card (one Primary per view rule)
  - [x] 2.6 No images, no icons, no illustrations — pure typography and borders (stripe.dev register)
  - [x] 2.7 No `dynamic` or `revalidate` exports — let Next.js default to SSG

- [x] Task 3 — Add OpenGraph tags to existing marketing pages missing them (AC: 2)
  - [x] 3.1 Update `app/(marketing)/login/page.tsx` metadata: add `openGraph: { title: 'Log in — Midgard', description: 'Log in to your Midgard account.', url: '/login', images: ['/opengraph-image.png'], type: 'website' }` — keep existing `title` and `description` unchanged
  - [x] 3.2 Update `app/(marketing)/signup/page.tsx` metadata: add `openGraph: { title: 'Sign up — Midgard', description: 'Create your Midgard account. First 3 Realms free, no credit card required.', url: '/signup', images: ['/opengraph-image.png'], type: 'website' }` — improve description to be more specific for signup page specifically
  - [x] 3.3 Update `app/(marketing)/forgot-password/page.tsx` metadata: add `openGraph` block with url `/forgot-password`; this page is not in the epics' explicit list but should be consistent

- [x] Task 4 — Add `app/sitemap.ts` (AC: 2, nice-to-have — deferred explicitly from Story 2.1)
  - [x] 4.1 Create `app/sitemap.ts` using Next.js `MetadataRoute.Sitemap` type
  - [x] 4.2 Include only public routes: `/`, `/pricing`, `/login`, `/signup` — do NOT include authenticated routes or `/forgot-password` (not canonical)
  - [x] 4.3 Use `NEXT_PUBLIC_SITE_URL` env var for the `url` base if available, fallback to production domain — do NOT hardcode a domain; check `.env.example` for `NEXT_PUBLIC_SITE_URL`; if not present, add it to `.env.example` and use a sensible fallback string like `https://midgard.app`
  - [x] 4.4 Set `lastModified: new Date()` and `changeFrequency: 'monthly'` for static pages

- [x] Task 5 — Validation (AC: all)
  - [x] 5.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 5.2 `pnpm lint` — zero ESLint errors
  - [x] 5.3 `pnpm dev` — server starts; `/pricing` renders Midgard pricing content (not a redirect to `/login`)
  - [x] 5.4 Manual: view-source on `/pricing` — confirm `<title>`, `<meta name="description">`, `og:*` tags present
  - [x] 5.5 Manual: view-source on `/login` and `/signup` — confirm `og:*` tags present
  - [x] 5.6 Manual: `/sitemap.xml` — confirm it renders and includes all four public routes
  - [x] 5.7 Manual: `/robots.txt` — confirm `/pricing` is in `allow` list (already is from Story 2.1; confirm no regression)
  - [x] 5.8 Manual: visit `/pricing` while NOT logged in — confirm page loads without redirect to `/login` (verifies proxy.ts fix)

## Dev Notes

### Critical First Action — Update `proxy.ts` Before Creating `/pricing`

`lib/supabase/proxy.ts` currently has this `isPublicPath` check:
```ts
const isPublicPath =
  pathname === "/" ||
  pathname.startsWith("/login") ||
  pathname.startsWith("/signup") ||
  pathname.startsWith("/forgot-password") ||
  pathname.startsWith("/auth");
```

`/pricing` is not in this list. Without adding it:
- Unauthenticated users visiting `/pricing` are **redirected to `/login`** — the page is completely inaccessible to prospective users
- This was explicitly called out in Story 2.1 dev notes: "When Story 2.2 adds `/pricing`, that path must be added to both the redirect guard AND the `isPublicPath` boolean in `lib/supabase/proxy.ts`"

Add `pathname.startsWith("/pricing") ||` as the second condition (after `pathname === "/"`). **Do this in Task 1 before building the page — the page won't be testable without it.**

### Pricing Page Structure — Match the Landing Page Exactly

The pricing page shares the same shell as the landing page:
- Same nav: `Midgard` wordmark + `Log in` Ghost button → `/login`
- Same `max-w-4xl mx-auto px-6` container
- Same footer: `© 2026 Midgard` in `font-mono text-xs text-mg-foreground-muted`
- Same body background: `bg-mg-background text-mg-foreground min-h-screen`

The pricing card grid structure from the landing page (`app/(marketing)/page.tsx`) is the source of truth — replicate the two-column card pattern exactly. The pricing page is a deeper version of what already exists; the landing page already has this pricing section.

### Button Hierarchy — One Primary Per View (Critical)

Story 2.1's code review caught this: two Primary buttons on one page violates the design system. The landing page demoted one CTA to Ghost. The same rule applies here.

On the pricing page:
- **One Primary button**: "Get started" or "Start free" → `/signup` (position: above or below the pricing cards, not inside both tier cards)
- **Tier card CTAs**: Ghost buttons. Free → `/signup`, Pro → `/signup?plan=pro` (consistent with Story 2.1's fix where `?plan=pro` is preserved for Epic 6's Stripe Checkout flow)

### Design Token Reminder — mg-* Prefix Only

All design tokens use `mg-*` Tailwind prefix in this codebase. No bare token names, no hardcoded hex values:

| Intent | Tailwind class | Never use |
|---|---|---|
| Page background | `bg-mg-background` | `#0A0A0A` |
| Primary text | `text-mg-foreground` | `#FAFAFA` |
| Muted text | `text-mg-foreground-muted` | `#A1A1AA` |
| Subtle text | `text-mg-foreground-subtle` | `#52525B` |
| Surface | `bg-mg-surface` | `#111111` |
| Border | `border-mg-border` | `#27272A` |
| Accent (Primary button bg) | `bg-mg-accent` | `#E8D5A3` |
| Accent text (on accent bg) | `text-mg-background` | `#0A0A0A` |

### Metadata API — Static Export Pattern

All marketing pages use the static `metadata` export (not `generateMetadata` — no async data needed). Template:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Midgard',
  description: 'Simple, transparent pricing. Start free with 3 Realms. Upgrade to Pro for unlimited Realms.',
  openGraph: {
    title: 'Pricing — Midgard',
    description: 'Simple, transparent pricing. Start free with 3 Realms. Upgrade to Pro for unlimited Realms.',
    url: '/pricing',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

`metadataBase` is already set in `app/layout.tsx` using `VERCEL_URL` — no need to set it per-page.

### Sitemap Implementation

Story 2.1's code review explicitly deferred sitemap creation to this story. Next.js generates `/sitemap.xml` automatically from `app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://midgard.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
  ]
}
```

If `NEXT_PUBLIC_SITE_URL` is not in `.env.example`, add it. The middleware matcher already excludes `sitemap.xml` from processing (added in Story 2.1).

### Authenticated Route Exclusion — Already Handled

The `app/(app)/*` route group (Realm Management, workspace, account) does not exist yet — it's created in Epic 3. The `robots.ts` already disallows `/projects/` and `/account/`. When Epic 3 implements `app/(app)/`, its layout can add a `noindex` meta as a belt-and-suspenders measure. This story does not need to create any `noindex` directives for routes that don't exist yet.

### Fonts Are Already Configured

From Story 1.1, `app/layout.tsx` imports Geist via the `geist` package (not `next/font/google`):
```tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
```
Use only `font-sans` and `font-mono` Tailwind utility classes. Never import fonts directly in page files.

### ThemeProvider Is Already Dark-Only

From Story 2.1, `app/layout.tsx` has `defaultTheme="dark"` and `forcedTheme="dark"`. No change needed. The pricing page inherits this automatically.

### No `(app)/` Route Group Yet

`app/(app)/` is Epic 3. Do not create it. The existing `app/protected/` folder from the Supabase starter is untouched. Middleware route protection for `/projects/` and `/account/` is already in place.

### OG Image Source

`app/opengraph-image.png` was confirmed in Story 2.1 (exists from Story 1.1 init). `metadataBase` in `app/layout.tsx` makes it resolvable at `{baseUrl}/opengraph-image.png`. Reference it as `/opengraph-image.png` in all `openGraph.images` arrays — never a relative path or full URL.

### Project Structure Notes

- **New file**: `app/(marketing)/pricing/page.tsx` — pricing page at `/pricing`
- **New file**: `app/sitemap.ts` — serves `/sitemap.xml` automatically
- **Modify**: `lib/supabase/proxy.ts` — add `/pricing` to `isPublicPath`
- **Modify**: `app/(marketing)/login/page.tsx` — add `openGraph` block to metadata
- **Modify**: `app/(marketing)/signup/page.tsx` — add `openGraph` block + improve description
- **Modify**: `app/(marketing)/forgot-password/page.tsx` — add `openGraph` block
- **Possibly modify**: `.env.example` — add `NEXT_PUBLIC_SITE_URL` if not present
- No new dependencies, no schema changes, no Server Actions, no Supabase changes

### References

- [Source: epics.md#Story 2.2] — All acceptance criteria
- [Source: epics.md#FR39–FR41] — Public pages indexed, meta on all public pages
- [Source: epics.md#NFR-PERF-4] — Lighthouse ≥90 for marketing pages
- [Source: architecture.md#Frontend Architecture] — SSR/SSG for `(marketing)/` route group
- [Source: architecture.md#Complete Project Directory Structure] — `app/(marketing)/pricing/page.tsx` canonical path
- [Source: ux-design-specification.md#UX-DR18] — stripe.dev / Resend visual register for marketing pages
- [Source: project-context.md#Critical Implementation Rules] — mg-* token prefix; flat directory (no `src/`); `geist` font package; pnpm only
- [Source: project-context.md#Middleware public path allowlist] — `/pricing` must be added to proxy.ts `isPublicPath`
- [Source: implementation-artifacts/2-1-marketing-landing-page.md#Dev Notes] — Design token table, button hierarchy, metadata pattern, font setup, SSG default, pricing copy ($19/mo)
- [Source: implementation-artifacts/2-1-marketing-landing-page.md#Review Findings] — Primary button limit enforced; sitemap deferred to this story; `/pricing` in proxy.ts noted for this story

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Added `/pricing` to `isPublicPath` in `proxy.ts` as second condition (after `/`, before `/login`) so unauthenticated users can access the page without redirect.
- Created `app/(marketing)/pricing/page.tsx` with SSG-default rendering, full static metadata export, matching nav/footer shell from landing page, one Primary CTA above pricing grid, Ghost buttons in tier cards (one Primary per view rule).
- Added `openGraph` block to login, signup, and forgot-password pages; updated signup description to be conversion-specific.
- Created `app/sitemap.ts` using `MetadataRoute.Sitemap` — 4 public routes only, base URL from `NEXT_PUBLIC_SITE_URL` env var with `https://midgard.app` fallback.
- Added `NEXT_PUBLIC_SITE_URL` to `.env.example`.
- All checks passed: `pnpm tsc --noEmit` (0 errors), `pnpm lint` (0 errors), `/pricing` HTTP 200 unauthenticated, all OG tags confirmed in source, `/sitemap.xml` renders all 4 routes, `/robots.txt` includes `/pricing` allow.

### File List

- `lib/supabase/proxy.ts` (modified)
- `app/(marketing)/pricing/page.tsx` (new)
- `app/(marketing)/login/page.tsx` (modified)
- `app/(marketing)/signup/page.tsx` (modified)
- `app/(marketing)/forgot-password/page.tsx` (modified)
- `app/sitemap.ts` (new)
- `.env.example` (modified)

### Review Findings

- [x] [Review][Patch] Trailing slash in `NEXT_PUBLIC_SITE_URL` produces double-slash sitemap URLs — if the env var is set with a trailing slash (e.g. `https://midgard.app/`), all sitemap entries become `https://midgard.app//pricing`; add `.replace(/\/$/, '')` normalization to `baseUrl` [app/sitemap.ts:3]
- [x] [Review][Defer] `metadataBase` resolves to `VERCEL_URL` — OG URLs resolve to preview domain in non-Vercel deploys; pre-existing decision from Story 2.1 layout.tsx; Story 2.2 follows established pattern [app/layout.tsx] — deferred, pre-existing
- [x] [Review][Defer] `?plan=pro` silently ignored by signup form — intentional deferral; documented in Epic 6 (Stripe Checkout) where signup must read this param post-verification — deferred, pre-existing (also logged in 2.1)
- [x] [Review][Defer] `startsWith("/pricing")` matches any future `/pricing*` route — pre-existing pattern across all public paths in proxy.ts; no protected `/pricing*` routes exist yet — deferred, pre-existing
- [x] [Review][Defer] `lastModified: new Date()` at build time marks every page as freshly modified on every deploy regardless of content changes — minor crawl-budget concern for static marketing pages — deferred, pre-existing
- [x] [Review][Defer] `robots.ts` disallow list covers only `/projects/` and `/account/` rather than all `/(app)/*` routes — `(app)` route group not yet created (Epic 3); revisit when Epic 3 builds the app shell — deferred, pre-existing

## Change Log

- 2026-04-23: Story implemented — pricing page created, OG tags added to all marketing pages, sitemap generated, proxy.ts updated for `/pricing` public access.
- 2026-04-23: Code review complete — 1 patch, 5 deferred, 7 dismissed.
