---
stepsCompleted: [1, 2, 3, 4]
completedAt: '2026-04-18'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Midgard - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Midgard, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can start a new project by entering a freeform product description via text input
FR2: User can upload a text-based brief file (Word, PDF, Markdown, TXT) as project input
FR3: System can detect when a submitted brief lacks sufficient information — defined as missing one or more of: a target user role, a primary problem or goal, and a product context
FR4: System can ask up to two targeted follow-up questions to improve input quality before running analysis
FR5: System gates analysis from running until the brief contains at minimum a target user role, a primary problem or goal, and a product context; briefs missing any of these trigger the follow-up sequence (FR4) before proceeding
FR6: User can converse with a guided agent that asks contextually relevant questions about their product
FR7: Agent extracts structured product information from freeform input without requiring the user to write prompts
FR8: System displays a branded loading state with Norse-flavored microcopy while analysis runs
FR9: System displays a one-sentence pipeline disclosure at the point of first analysis per account
FR10: System generates role-based personas from brief input
FR11: System generates a navigable, role-filtered user flow from brief input
FR12: System generates an information architecture from brief input
FR13: System generates a synthesis overview from brief input
FR14: User can regenerate any individual artifact section without re-running the full project analysis
FR15: User can navigate between artifact types (personas, user flow, IA, synthesis) within a single workspace
FR16: User can filter the user flow view by role
FR17: Artifact navigation transitions without a loading state
FR18: User can view all generated artifacts for a project within a single session
FR19: User can create a new project for each product brief
FR20: User can view a list of all their projects
FR21: User can open and revisit any existing project and its generated artifacts
FR22: User can delete a project
FR23: System permanently and irrecoverably purges all data associated with a deleted project
FR24: System notifies users with inactive accounts before purging their project data
FR25: System automatically purges all project data for accounts inactive for 12 consecutive months with no active subscription, following advance notification
FR26: User can create an account with email and password
FR27: User can request a password reset via email
FR28: User can reset their password using a time-limited link delivered to their registered email address
FR29: User can log in and log out of their account
FR30: User can upgrade from Free tier to Pro tier
FR31: User can manage their subscription (view status, cancel) via a billing portal
FR32: Free tier users can create projects up to a configurable hard limit
FR33: Free tier users are shown an upgrade prompt when they reach the project limit
FR34: Pro tier users have no project creation limit surfaced to them
FR35: System processes subscription payments and manages billing lifecycle events (signup, upgrade, cancellation, renewal) via a third-party payment processor
FR36: Operator receives an email alert when monthly token spend crosses a configurable threshold
FR37: Operator can adjust the free-tier project cap without a code deployment
FR38: Operator can access usage and subscription data via operator-facing infrastructure and billing dashboards
FR39: Prospective users can access a public marketing landing page describing the product and pricing
FR40: Marketing landing page and all public pages are indexable by search engines
FR41: All public-facing pages include meta titles, descriptions, and Open Graph tags

### NonFunctional Requirements

NFR-PERF-1: Artifact navigation transitions complete in < 100ms
NFR-PERF-2: Generation loading state appears within 500ms of analysis trigger
NFR-PERF-3: App initial load completes in < 3 seconds on standard broadband
NFR-PERF-4: Marketing landing page achieves Lighthouse scores ≥ 90 for Performance, SEO, and Accessibility
NFR-PERF-5: File upload processing completes before analysis begins without blocking the UI
NFR-SEC-1: All data transmitted over HTTPS/TLS
NFR-SEC-2: All data stored at rest encrypted (Supabase default encryption)
NFR-SEC-3: Payment data handled exclusively via Stripe — Midgard never stores, processes, or logs card details
NFR-SEC-4: Password reset links expire within 1 hour of generation
NFR-SEC-5: User sessions invalidated on explicit logout
NFR-SEC-6: API keys and secrets stored as environment variables; never hardcoded or committed to source control
NFR-SCALE-1: Architecture supports growth from 0 to 500 concurrent active users without infrastructure changes or manual intervention
NFR-SCALE-2: Vercel autoscaling and Supabase managed infrastructure absorb traffic growth transparently
NFR-SCALE-3: Free tier project cap bounds per-user token consumption as user count grows
NFR-ACCESS-1: WCAG 2.1 AA compliance across all authenticated app surfaces and the public marketing landing page
NFR-ACCESS-2: Keyboard navigation supported for all user-facing actions
NFR-ACCESS-3: Screen reader compatibility for artifact navigation and viewing
NFR-REL-1: Claude API failures surface a user-visible error message with retry option within 5 seconds; no partial or corrupted project state is committed on failure
NFR-REL-2: Payment processor webhook failures must not silently place users in incorrect subscription tiers; tier state must be reconcilable from the billing dashboard without manual database intervention
NFR-REL-3: Supabase unavailability must not corrupt stored project data; operations fail cleanly rather than partially
NFR-REL-4: Generated artifacts are not lost between a successful generation and the user's next session

### Additional Requirements

From Architecture document:

- **Project initialization**: First implementation story must run `npx create-next-app@latest --example with-supabase midgard` and layer in `shadcn/ui`, Stripe SDK, Anthropic SDK, Zustand, TanStack Query, mammoth, pdf-parse
- **Three environments**: Local (`.env.local`), Vercel preview, Vercel production — each with its own Supabase project and Stripe keys
- **Supabase migrations**: All schema changes via committed migration files (`supabase/migrations/`); initial migration covers `projects`, `artifacts`, `token_usage`, `config` tables + RLS policies
- **Config table**: Free-tier project cap and token alert threshold stored as runtime-readable rows in `config` table — no redeploy required to change values (FR37)
- **Token usage tracking**: Every Claude API call writes `input_tokens` + `output_tokens` to `token_usage` table with `user_id`, `project_id`, `created_at`; monthly aggregation query used for alert threshold check (FR36)
- **Hard delete cascade**: Project deletion must use a Supabase RPC/transaction that cascades `artifacts → token_usage → projects` in that order; no sequential queries (FR23)
- **ActionResult<T> type**: All Server Actions return `{ success: true; data: T } | { success: false; error: string }` — never throw
- **lib/claude/ isolation**: All Claude API calls must go through `src/lib/claude/` wrapper — `analyze.ts`, `regenerate.ts`, `quality-gate.ts`; never call `anthropic.messages.create()` directly
- **Server Actions pattern**: User-initiated operations use Server Actions; only Stripe webhooks use API Routes (`/api/webhooks/stripe/route.ts`)
- **Supabase RLS**: All user-owned tables have RLS policies; server-side Supabase client used in Server Actions; browser client used in Client Components
- **Subscription tier gating**: Always read `profiles.subscription_tier` server-side before tier-gated operations; never trust client-side state
- **Inactivity purge (FR24/FR25)**: Requires dedicated story — Supabase Edge Function or pg_cron job; involves 12-month lookback, email notification, and data purge; needs explicit acceptance criteria

### UX Design Requirements

UX-DR1: Implement design token system as Tailwind CSS custom tokens — base palette (background #0A0A0A, surface #111111, surface-elevated #1C1C1E, border #27272A, muted #3F3F46, foreground #FAFAFA, foreground-muted #A1A1AA, foreground-subtle #52525B), accent palette (accent #E8D5A3, accent-muted #A89060, accent-surface #1E1A11), semantic palette (success #22C55E, warning #F59E0B, destructive #EF4444, info #3B82F6)
UX-DR2: Implement typography system — Geist Mono (system/UI: labels, slash-prefixed identifiers, figure numbers, metadata) and Geist Sans (body/headings) via `next/font`; type scale from caption (0.75rem) to display (2.25rem); tight leading throughout workspace
UX-DR3: Build `AttentionRegion` component — C64 model inline container (no overlay); variants: info (standard border), warning (accent-muted border), error (zinc-400 border), confirm (standard border); 24px vertical / 28px horizontal interior padding; `role="region"` or `role="alert"` per variant; focus trap when actions present
UX-DR4: Build `AllFatherLoadingState` component — full-viewport centered; animated accent dot (pulse); cycling invocation text ("The Allfather sees." / "Your Realm takes shape." / "The flows are written.") with slow fade; no progress bar or percentage; `prefers-reduced-motion` disables animation; `role="status"` + `aria-live="polite"`
UX-DR5: Build `BriefInputSurface` component — centered layout max-width 580px; Geist Mono 13px Textarea; file upload secondary affordance (drag-drop or click); quality gate AttentionRegion renders inline below textarea (textarea remains editable); submit button disabled during submission; states: idle, focused, quality-gate-active, submitting, error
UX-DR6: Build `ArtifactWorkspace` component — root two-panel layout container; AppNav (46px sticky) + WorkspaceBody (ArtifactIndexPanel + ArtifactContent); handles phase transition (loading → workspace reveal with brief fade); desktop: full two-panel; tablet (≤1023px): 56px icon strip; mobile (<768px): single column
UX-DR7: Build `ArtifactIndexPanel` component — persistent left nav (258px desktop); 4 slash-prefixed artifact entries (/flows, /personas, /ia, /synthesis); 2px left border active indicator (accent color); RoleFilterToggle at top; `role="navigation"` + `aria-current="page"` on active item; arrow key navigation between entries; tooltip labels in collapsed (56px) tablet mode
UX-DR8: Build `ArtifactContent` component — primary panel (flex:1); sticky ContentHeader (type tag + title + generated-at meta); figure-numbered ArtifactSection list with 22px/28px padding; section-loading state: one section shows local indicator while all others remain fully readable and interactive
UX-DR9: Build `ArtifactSection` component — figure number (Geist Mono, accent color) + section title + hover-reveal SectionRegenerateControl in header row; section body content; states: default, hover (control visible), loading (body replaced with local indicator), error (body replaced with AttentionRegion Error variant)
UX-DR10: Build `RoleFilterToggle` component — row of role chips (All roles + role names from artifact data); active chip: accent border + accent-surface bg + accent text; inactive: border + fg-subtle text; multiple roles additive; instant visual filter (no network request); `role="checkbox"` + `aria-checked` per chip; resets to "All roles" on new Realm load
UX-DR11: Build `SectionRegenerateControl` component — hover-reveal button (opacity 0→1 on section hover, 150ms transition); "↺ regenerate" label (11px Geist Mono, fg-subtle); right-aligned in ArtifactSection header; triggers section-scoped Server Action only; adjacent sections must remain unaffected; disabled during active regeneration
UX-DR12: Implement Norse invocation microcopy system — curated string array for AllFatherLoadingState; slow fade cycling animation; `prefers-reduced-motion` shows static text; `aria-atomic="false"` prevents screen reader repeat announcements; each invocation line must read as standalone (not a progress status)
UX-DR13: Implement slash-prefix navigation convention — `/flows`, `/personas`, `/ia`, `/synthesis` as persistent labels throughout workspace; Geist Mono; `before:content-['/']` CSS convention or explicit markup; used in ArtifactIndexPanel and ContentHeader
UX-DR14: Implement three-tier button hierarchy — Primary (accent bg #E8D5A3, dark text, Geist Mono 12px uppercase, 8px/16px padding, one per view max), Ghost (transparent, 1px border, fg-subtle text, surface-raised hover), Nano (transparent, 11px Geist Mono, 4px/8px padding, no border); destructive actions use Ghost inside AttentionRegion Confirm variant — never a red button
UX-DR15: Implement workspace reveal choreography — brief fade/cross-fade from AllFatherLoadingState to ArtifactWorkspace on generation complete; /flows active by default; primary role pre-selected in RoleFilterToggle; all 4 artifact types visible in index panel immediately
UX-DR16: Implement full WCAG 2.1 AA accessibility — Tab order (nav bar → role filter → index entries → content panel); Enter activates index entries; Escape dismisses tablet overlay tray and AttentionRegion dismiss actions; Arrow keys navigate index panel; focus ring: `outline: 2px solid --fg-subtle`; minimum 44×44px touch targets; screen reader ARIA for all workspace components; never `outline: none` without replacement
UX-DR17: Implement desktop-first responsive layout — desktop (≥1024px): full two-panel (258px + flex:1); tablet (768–1023px): 56px icon strip + full content panel; mobile (<768px): single column with collapsible disclosure; Tailwind custom breakpoints (`tablet: { max: '1023px' }`, `mobile: { max: '767px' }`); CSS custom properties for panel widths; `ArtifactWorkspace` owns all breakpoint logic
UX-DR18: Implement marketing landing page in stripe.dev / Resend visual register — dark high-contrast aesthetic; spare confident prose; Geist font family; meta titles + descriptions + OG tags on all public pages (FR41); SSR/SSG rendering; Lighthouse ≥90 (NFR-PERF-4)
UX-DR19: Implement empty states (text-only, no illustrations) — realm-empty ("Your first Realm awaits." + Primary CTA), section-pending (Geist Mono label "Not yet written." + SectionRegenerateControl), filter-empty ("No sections match this role." + Ghost chip clear), invocation-pending (AllFatherLoadingState)
UX-DR20: Implement feedback exclusively via AttentionRegion — no toasts, no banners, no snackbars, no floating notifications; placement rules: brief input feedback below BriefInputSurface inline; section-level feedback within ArtifactSection; destructive confirmation inline adjacent to triggering control; `DropdownMenu` permitted only for Realm selector nav and sparse inline menus (≤3 items)

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 4 | Freeform text brief input |
| FR2 | Epic 4 | File upload (Word, PDF, MD, TXT) |
| FR3 | Epic 4 | Input quality detection |
| FR4 | Epic 4 | Targeted follow-up question generation |
| FR5 | Epic 4 | Analysis gate until quality threshold met |
| FR6 | Epic 4 | Guided conversational agent |
| FR7 | Epic 4 | Structured info extraction without prompting |
| FR8 | Epic 4 | Norse-flavored loading state |
| FR9 | Epic 4 | Pipeline disclosure at first analysis |
| FR10 | Epic 4 | Role-based persona generation |
| FR11 | Epic 4 | Navigable role-filtered user flow generation |
| FR12 | Epic 4 | Information architecture generation |
| FR13 | Epic 4 | Synthesis overview generation |
| FR14 | Epic 5 | Single-section regeneration |
| FR15 | Epic 5 | Multi-artifact workspace navigation |
| FR16 | Epic 5 | Role filter on user flow view |
| FR17 | Epic 5 | Instantaneous artifact navigation transitions |
| FR18 | Epic 5 | All artifacts viewable within a single session |
| FR19 | Epic 3 | Create new project |
| FR20 | Epic 3 | View project list |
| FR21 | Epic 3 | Open and revisit existing project |
| FR22 | Epic 3 | Delete a project |
| FR23 | Epic 3 | Hard delete — full data purge on project deletion |
| FR24 | Epic 7 | Advance notification before inactivity purge |
| FR25 | Epic 7 | Automatic 12-month inactivity purge |
| FR26 | Epic 1 | Account creation (email + password) |
| FR27 | Epic 1 | Password reset request via email |
| FR28 | Epic 1 | Password reset via time-limited link |
| FR29 | Epic 1 | Login and logout |
| FR30 | Epic 6 | Upgrade Free → Pro |
| FR31 | Epic 6 | Subscription management via billing portal |
| FR32 | Epic 3 | Free-tier project cap enforcement |
| FR33 | Epic 3 | Upgrade prompt at project cap |
| FR34 | Epic 3 | No project limit surfaced to Pro users |
| FR35 | Epic 6 | Stripe billing lifecycle (signup, upgrade, cancel, renew) |
| FR36 | Epic 7 | Operator token spend email alert |
| FR37 | Epic 7 | Free-tier cap configurable without code deploy |
| FR38 | Epic 7 | Operator access to usage + subscription dashboards |
| FR39 | Epic 2 | Public marketing landing page |
| FR40 | Epic 2 | SEO-indexed public pages |
| FR41 | Epic 2 | Meta titles, descriptions, OG tags on all public pages |

## Epic List

### Epic 1: Foundation & Authentication
Users can create accounts, log in, and access the authenticated product. The technical foundation (schema, environments, design tokens, typography) is in place for all subsequent epics.
**FRs covered:** FR26, FR27, FR28, FR29
**UX-DRs covered:** UX-DR1, UX-DR2
**Architecture reqs:** Starter template initialization, database schema + RLS migrations, config table, three environment setup
**Stories:** 1.1 (init), 1.2 (schema), 1.3 (signup), 1.4 (login/logout), 1.5 (password reset), 1.6 (last-active middleware)

### Epic 2: Marketing & Acquisition
Prospective users can discover Midgard, understand the value proposition and pricing, and sign up — all from a public marketing site in the product's visual register.
**FRs covered:** FR39, FR40, FR41
**UX-DRs covered:** UX-DR18

### Epic 3: Realm Management
Authenticated users can create, view, open, and delete their Realms (projects), with free-tier project limits enforced and an upgrade prompt surfaced at the cap.
**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR32, FR33, FR34

### Epic 4: Brief Submission & AI Analysis Pipeline
Users can submit a product brief (text or file), be guided through a quality gate if needed, and receive four generated UX artifacts with a branded loading experience.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13
**UX-DRs covered:** UX-DR3, UX-DR4, UX-DR5, UX-DR12, UX-DR14

### Epic 5: Artifact Workspace
Users can navigate between artifact types, filter by role, regenerate individual sections, and work within a persistent two-panel workspace — the product's defining experience.
**FRs covered:** FR14, FR15, FR16, FR17, FR18
**UX-DRs covered:** UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10, UX-DR11, UX-DR13, UX-DR15, UX-DR16, UX-DR17, UX-DR19, UX-DR20

### Epic 6: Subscription & Billing
Users can upgrade to Pro, manage their subscription, and billing lifecycle events are processed automatically and kept in sync with tier state.
**FRs covered:** FR30, FR31, FR35

### Epic 7: Platform Operations
The operator receives token spend alerts, can adjust free-tier limits without deploying, and the system automatically manages account data lifecycle with advance notification.
**FRs covered:** FR24, FR25, FR36, FR37, FR38

---

## Epic 1: Foundation & Authentication

Users can create accounts, log in, and access the authenticated product. The technical foundation (schema, environments, design tokens, typography) is in place for all subsequent epics.

### Story 1.1: Project Initialization & Design Token Foundation

As a **developer**,
I want the project initialized from the official Supabase Next.js starter with all required dependencies and design tokens configured,
So that every subsequent story builds on a consistent, working foundation with the correct visual system in place.

**Acceptance Criteria:**

**Given** the repository is empty
**When** the initialization sequence is run
**Then** `npx create-next-app@latest --example with-supabase midgard` produces a working Next.js 15 App Router project with TypeScript, Tailwind CSS, and Supabase auth middleware pre-wired
**And** `pnpm dlx shadcn@latest init` is run and shadcn/ui is configured
**And** `npm install stripe @stripe/stripe-js @anthropic-ai/sdk zustand @tanstack/react-query mammoth pdf-parse resend` installs without errors

**Given** the project is initialized
**When** Tailwind config is updated
**Then** the full design token set is defined as Tailwind CSS custom properties: base palette (background #0A0A0A, surface #111111, surface-elevated #1C1C1E, border #27272A, muted #3F3F46, foreground #FAFAFA, foreground-muted #A1A1AA, foreground-subtle #52525B), accent palette (accent #E8D5A3, accent-muted #A89060, accent-surface #1E1A11), semantic palette (success #22C55E, warning #F59E0B, destructive #EF4444, info #3B82F6)
**And** Geist Sans and Geist Mono are loaded via `next/font` and configured as the Tailwind `font-sans` and `font-mono` stacks
**And** custom Tailwind breakpoints are defined: `tablet: { max: '1023px' }`, `mobile: { max: '767px' }`
**And** `.env.example` documents all required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `OPERATOR_ALERT_EMAIL`
**And** `src/types/actions.ts` defines and exports `ActionResult<T>`
**And** `dev` server starts without errors at `localhost:3000`

---

### Story 1.2: Database Schema & Supabase Configuration

As a **developer**,
I want the complete database schema created with RLS policies and a config table,
So that all user data is correctly isolated and runtime-configurable values can be set without code deploys.

**Acceptance Criteria:**

**Given** Supabase CLI is initialized (`supabase init`)
**When** migrations are applied (`supabase db push`)
**Then** the following tables exist with correct column types: `profiles` (id, subscription_tier, has_seen_disclosure, stripe_customer_id text unique nullable, last_active_at timestamptz default now(), created_at, updated_at), `projects` (id, user_id, name, created_at, updated_at), `artifacts` (id, project_id, artifact_type, content jsonb, created_at, updated_at), `token_usage` (id, user_id, project_id, input_tokens, output_tokens, created_at), `config` (key text PK, value text, updated_at)
**And** RLS is enabled on all tables with policies that restrict all operations to `auth.uid() = user_id` (or `auth.uid() = id` for profiles)
**And** the `config` table is seeded with initial rows: `free_tier_project_cap = '3'`, `token_alert_threshold_usd = '50'`
**And** `src/lib/supabase/server.ts` exports `createServerClient()` using `@supabase/ssr`
**And** `src/lib/supabase/browser.ts` exports `createBrowserClient()`
**And** Supabase TypeScript types are generated into `src/lib/supabase/types.ts`
**And** migration files are committed to `supabase/migrations/`

---

### Story 1.3: User Signup

As a **prospective user**,
I want to create an account with my email and password,
So that I can access Midgard and start using the product.

**Acceptance Criteria:**

**Given** I am on `/signup`
**When** I enter a valid email and password (min 8 characters) and submit
**Then** Supabase Auth creates my account and sends a verification email
**And** I am redirected to a confirmation page telling me to check my email
**And** a `profiles` row is created for my user ID with `subscription_tier = 'free'` and `has_seen_disclosure = false`

**Given** I enter an email already registered
**When** I submit the signup form
**Then** an inline error message is displayed: "An account with this email already exists."
**And** no new account is created

**Given** I enter a password under 8 characters
**When** I submit
**Then** an inline error message is displayed before the form submits: "Password must be at least 8 characters."

---

### Story 1.4: User Login & Logout

As a **registered user**,
I want to log in with my email and password and log out when I'm done,
So that my account and projects are secure.

**Acceptance Criteria:**

**Given** I am on `/login` with valid credentials
**When** I submit the login form
**Then** Supabase Auth creates a session cookie
**And** I am redirected to `/projects`

**Given** I enter incorrect credentials
**When** I submit
**Then** an inline error is shown: "Invalid email or password."
**And** no session is created

**Given** I am authenticated and click logout
**When** the logout action completes
**Then** my session cookie is cleared
**And** I am redirected to `/login`
**And** navigating back to `/projects` redirects me to `/login`

**Given** I attempt to access any `/(app)/*` route without a session
**When** the middleware runs
**Then** I am redirected to `/login`

---

### Story 1.5: Password Reset

As a **registered user**,
I want to request a password reset email and set a new password via a secure link,
So that I can regain access to my account if I forget my password.

**Acceptance Criteria:**

**Given** I am on `/login` and click "Forgot password?"
**When** I enter my registered email and submit
**Then** Supabase Auth sends a password reset email to that address
**And** the page shows: "Check your email for a reset link."
**And** no confirmation of whether the email exists is given (no user enumeration)

**Given** I click the reset link in my email within 1 hour
**When** I land on `/auth/reset-password`
**Then** I can enter and confirm a new password
**And** on submission my password is updated and I am redirected to `/login` with a success message

**Given** I click a reset link older than 1 hour
**When** I land on the reset page
**Then** an error is shown: "This reset link has expired. Request a new one."
**And** a link back to the reset request flow is provided

---

### Story 1.6: Last Active Tracking in Auth Middleware

As a **developer**,
I want every authenticated request to update the user's `last_active_at` timestamp,
So that the inactivity purge job (Story 7.3) has accurate data to determine which accounts are inactive.

**Acceptance Criteria:**

**Given** an authenticated user makes any request to an `/(app)/*` route
**When** the Next.js middleware runs and confirms a valid session
**Then** `profiles.last_active_at` is updated to `now()` for that user via the Supabase server client
**And** the update uses an upsert on the `profiles` row — it never fails silently or blocks the request if the update errors (log and continue)

**Given** an unauthenticated request hits any `/(app)/*` route
**When** the middleware runs
**Then** `last_active_at` is not touched — no update is attempted

**Given** a Pro tier user makes a request
**When** the middleware updates `last_active_at`
**Then** the update occurs identically to free-tier users — all authenticated users are tracked

---

## Epic 2: Marketing & Acquisition

Prospective users can discover Midgard, understand the value proposition and pricing, and sign up — all from a public marketing site in the product's visual register.

### Story 2.1: Marketing Landing Page

As a **prospective user**,
I want to read a clear, well-designed landing page that explains what Midgard does and what it costs,
So that I can decide whether to sign up without needing to speak to anyone.

**Acceptance Criteria:**

**Given** I visit `/`
**When** the page loads
**Then** the page is server-side rendered (SSR/SSG) with a Lighthouse Performance score ≥ 90, SEO score ≥ 90, and Accessibility score ≥ 90
**And** the page uses the stripe.dev / Resend visual register: dark background (#0A0A0A), high-contrast foreground (#FAFAFA), Geist font family, spare confident prose
**And** the value proposition is legible without scrolling on a 1280px desktop viewport: what Midgard does, who it's for, and what it costs
**And** a primary CTA button links to `/signup`
**And** a pricing section displays Free tier (project cap, features) and Pro tier ($15–20/month, no usage caps) without requiring signup to view

**Given** a search engine crawler visits `/`
**When** the page is indexed
**Then** the page has a `<title>` tag, `<meta name="description">`, `og:title`, `og:description`, and `og:image` populated with Midgard-specific content
**And** the page is not blocked by `robots.txt` or `noindex` directives

---

### Story 2.2: Pricing Page & Public Route SEO

As a **prospective user**,
I want a dedicated pricing page and consistent SEO metadata across all public pages,
So that I can find and evaluate Midgard through search engines and share links that render correctly.

**Acceptance Criteria:**

**Given** I visit `/pricing`
**When** the page loads
**Then** the page renders SSR/SSG with full pricing details for Free and Pro tiers
**And** the page matches the landing page visual register (same dark aesthetic, same font system)
**And** a CTA links to `/signup`

**Given** any public page (`/`, `/pricing`, `/login`, `/signup`) is loaded
**When** the HTML is inspected
**Then** each page has a unique, descriptive `<title>` and `<meta name="description">`
**And** each page has `og:title`, `og:description`, `og:image`, and `og:url` Open Graph tags
**And** all tags are populated with page-specific content — no generic fallbacks

**Given** a search engine visits `/login` or `/signup`
**When** the page is crawled
**Then** the pages are indexable and include appropriate meta descriptions
**And** authenticated app routes (`/(app)/*`) are excluded from indexing via `robots.txt` or `noindex` meta tags

---

## Epic 3: Realm Management

Authenticated users can create, view, open, and delete their Realms, with free-tier project limits enforced and an upgrade prompt surfaced at the cap.

### Story 3.1: Realm List View

As a **registered user**,
I want to see all my Realms when I log in,
So that I can quickly access my existing work or start something new.

**Acceptance Criteria:**

**Given** I am authenticated and navigate to `/projects`
**When** the page loads
**Then** all my Realms are listed, each showing the Realm name and creation date
**And** if I have no Realms, an empty state is shown: "Your first Realm awaits." with a primary CTA to create one
**And** Realm cards link to `/projects/[projectId]/workspace`
**And** the list is scoped to my user ID only — no other users' Realms are visible (RLS enforced server-side)

**Given** I have more than one Realm
**When** the list renders
**Then** Realms are ordered by most recently updated first

---

### Story 3.2: Create a Realm

As a **registered user**,
I want to create a new Realm for each product brief I'm working on,
So that I can keep my projects organized.

**Acceptance Criteria:**

**Given** I am a Free tier user below the project cap
**When** I click "New Realm" and provide a name
**Then** a `projects` row is created in Supabase with my `user_id`
**And** I am redirected to `/projects/[projectId]/workspace`
**And** the `createProject` Server Action returns `ActionResult<Project>` — on failure returns `{ success: false, error: '...' }` without creating a partial record

**Given** I am a Free tier user at the project cap (read from `config.free_tier_project_cap` at runtime)
**When** I attempt to create a new Realm
**Then** the `createProject` Server Action returns an error without inserting a record
**And** an upgrade prompt AttentionRegion is shown (Info variant): what I've accomplished, what Pro unlocks, and a CTA to upgrade

**Given** I am a Pro tier user
**When** I create a new Realm
**Then** no project cap is checked and the Realm is created successfully

---

### Story 3.3: Open and Revisit a Realm

As a **registered user**,
I want to open any of my existing Realms and see its generated artifacts,
So that I can continue working from where I left off.

**Acceptance Criteria:**

**Given** I have an existing Realm with generated artifacts
**When** I click on it from the Realm list
**Then** I am taken to `/projects/[projectId]/workspace` and the artifact workspace renders with the previously generated artifacts
**And** no re-generation is triggered — existing artifact data is loaded from Supabase

**Given** I navigate directly to a Realm URL that belongs to another user
**When** the page loads
**Then** the Supabase RLS policy blocks the query and the page shows a not-found state

---

### Story 3.4: Delete a Realm

As a **registered user**,
I want to permanently delete a Realm and all its data,
So that I can remove client work I no longer need and know it's truly gone.

**Acceptance Criteria:**

**Given** I trigger the delete action on a Realm
**When** the action is initiated
**Then** an inline AttentionRegion (Confirm variant) appears adjacent to the triggering control: "This will permanently delete '[Realm name]' and all its runes. This cannot be undone."
**And** the triggering control is disabled while the confirmation is visible
**And** no overlay or modal appears — the workspace surface remains visible and interactive

**Given** I confirm the deletion
**When** the `deleteProject` Server Action runs
**Then** a Supabase RPC/transaction cascades deletion in order: `artifacts` → `token_usage` → `projects`
**And** if all three deletions succeed, the action returns `{ success: true }` and I am redirected to `/projects`
**And** if any deletion fails, the transaction is rolled back and no partial deletion occurs

**Given** I cancel the confirmation
**When** I click "Cancel"
**Then** the AttentionRegion closes, the Realm is untouched, and the triggering control is re-enabled

---

## Epic 4: Brief Submission & AI Analysis Pipeline

Users can submit a product brief (text or file), be guided through a quality gate if needed, and receive four generated UX artifacts with a branded loading experience.

> **Implementation note:** Stories 4.1 → 4.2 → 4.3 → 4.4 → 4.5 must be implemented in sequence. Each story depends on components built in the previous one.

### Story 4.1: AttentionRegion & Button Hierarchy Components

As a **developer**,
I want the `AttentionRegion` component and three-tier button system built,
So that all user feedback, confirmations, and attention states throughout the app share a consistent visual language.

**Acceptance Criteria:**

**Given** the `AttentionRegion` component exists at `src/components/workspace/AttentionRegion.tsx`
**When** rendered with variant `info`, `warning`, `error`, or `confirm`
**Then** it renders as an inline bordered region (1px border, color per variant) with 24px vertical / 28px horizontal interior padding, same `surface` background token regardless of variant — no elevated surface, no backdrop
**And** variant `error` and `warning` use `role="alert"` + `aria-live="assertive"`; variants `info` and `confirm` use `role="region"` + `aria-label`
**And** when actions are present, focus is trapped within the region and moves to the title on render

**Given** the three-tier button system is implemented
**When** a Primary button is rendered
**Then** it uses accent background (#E8D5A3), dark text (#0A0A0A), Geist Mono 12px uppercase, 8px/16px padding — and only one Primary button appears per view
**And** Ghost buttons use transparent background, 1px `border` token border, `fg-subtle` text
**And** Nano buttons use transparent background, 11px Geist Mono, 4px/8px padding, no border
**And** destructive actions use a Ghost button inside an AttentionRegion (Confirm variant) — never a red-colored button

---

### Story 4.2: Brief Input Surface

As a **solo designer**,
I want to submit my product brief by typing or pasting into a clean input area,
So that I can start the analysis process without any configuration or prompt engineering.

**Acceptance Criteria:**

**Given** I am on the workspace page for a new Realm (no artifacts yet)
**When** the page loads
**Then** the `BriefInputSurface` component is displayed — centered layout, max-width 580px, dominant on the page
**And** the Textarea uses Geist Mono 13px with placeholder: "Describe your product to the Allfather."
**And** a primary submit button is labeled "Invoke the Allfather"
**And** a secondary file upload affordance is available (click or drag-drop) accepting `.docx`, `.pdf`, `.md`, `.txt`

**Given** the story is being implemented
**When** `src/stores/workspaceStore.ts` is created
**Then** it exports `useWorkspaceStore` with initial state: `{ phase: 'input', activeArtifact: 'flows', activeRole: null, regeneratingSection: null }` and typed as `WorkspaceStore` per the architecture doc

**Given** I type or paste a brief and click submit
**When** the form is submitted
**Then** the textarea and submit button are disabled (submitting state)
**And** the Zustand workspace store sets `phase = 'loading'`
**And** the `submitBrief` Server Action is called with the brief text

**Given** I upload a `.docx` file
**When** the file is processed server-side
**Then** `mammoth` extracts plain text from the Word document
**And** the extracted text is passed to the analysis pipeline — the file itself is not stored in Supabase

**Given** I upload a `.pdf` file
**When** the file is processed server-side
**Then** `pdf-parse` extracts plain text
**And** the extracted text is passed to the analysis pipeline

---

### Story 4.3: Input Quality Gate

As a **solo designer**,
I want the Allfather to ask me targeted follow-up questions if my brief is too thin,
So that I don't waste a generation on garbage output.

**Acceptance Criteria:**

**Given** I submit a brief missing one or more of: a target user role, a primary problem or goal, a product context
**When** `quality-gate.ts` assesses the brief
**Then** an AttentionRegion (Info variant) appears inline below the BriefInputSurface: "The Allfather needs more context." followed by up to two targeted questions specific to what is missing
**And** the AttentionRegion contains an inline textarea for my answers
**And** the original textarea remains visible and editable above — I am never forced to start over
**And** the quality gate asks at most two questions before allowing analysis to proceed regardless

**Given** I answer the follow-up questions and resubmit
**When** the enriched brief meets the quality threshold
**Then** the AttentionRegion closes and the analysis pipeline proceeds
**And** my answers are appended to the original brief before being sent to Claude

**Given** I submit a brief that already meets the quality threshold
**When** `quality-gate.ts` assesses it
**Then** no AttentionRegion appears and the analysis pipeline runs immediately

---

### Story 4.4: AllFatherLoadingState Component & Norse Microcopy

As a **solo designer**,
I want to see a branded, atmospheric loading experience while my artifacts are being generated,
So that the wait feels intentional and I stay engaged rather than anxious.

**Acceptance Criteria:**

**Given** the Zustand workspace `phase` is `'loading'`
**When** `AllFatherLoadingState` renders
**Then** a full-viewport centered layout appears with a single bordered region (same surface token, no elevation)
**And** a 5px accent-colored dot pulses with a slow animation
**And** invocation text cycles through: "The Allfather sees." → "Your Realm takes shape." → "The flows are written." with a slow fade between each
**And** no progress bar, percentage, spinner count, or step indicator is shown

**Given** the user's system has `prefers-reduced-motion: reduce`
**When** `AllFatherLoadingState` renders
**Then** all animations are disabled and a single static invocation line is shown
**And** `aria-live="polite"` announces when generation completes

**Given** the loading state has been active for more than 30 seconds
**When** generation is still running
**Then** a second text line appears below the cycling invocation: "This Realm is complex. A moment more." in `--fg-subtle` Geist Mono
**And** this line does not cycle — it remains static until generation completes

**Given** generation completes
**When** artifacts are ready
**Then** a brief fade/cross-fade transitions from the loading state to the artifact workspace
**And** `phase` is set to `'workspace'` in Zustand

---

### Story 4.5: AI Analysis Pipeline — Four Artifact Generation

As a **solo designer**,
I want my brief to be analyzed and four UX artifacts generated — personas, user flows, IA, and synthesis,
So that I have a complete, structured UX foundation in under ten minutes.

**Acceptance Criteria:**

**Given** a brief has passed the quality gate
**When** `analyze.ts` calls the Claude API via the `lib/claude/` wrapper
**Then** the Claude API is called with structured prompts from `lib/claude/prompts/` (one per artifact type)
**And** the response is parsed into four typed artifact objects: `Persona[]`, `UserFlow`, `InformationArchitecture`, `SynthesisOverview`
**And** all four artifacts are inserted into the `artifacts` table with the correct `project_id` and `artifact_type`
**And** `input_tokens` and `output_tokens` from the API response are written to `token_usage`

**Given** it is my first analysis on this account (`profiles.has_seen_disclosure = false`)
**When** analysis completes
**Then** a one-sentence disclosure is shown once: "Your input is processed by Anthropic's API and is not used to train models."
**And** `profiles.has_seen_disclosure` is set to `true` — the disclosure never shows again

**Given** the Claude API call fails (network error, timeout, API error)
**When** the error is caught in `analyze.ts`
**Then** the Server Action returns `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }`
**And** no `artifacts` or `token_usage` rows are written (no partial state)
**And** the workspace `phase` returns to `'input'` and an AttentionRegion (Error variant) is shown with a retry option

---

## Epic 5: Artifact Workspace

Users can navigate between artifact types, filter by role, regenerate individual sections, and work within a persistent two-panel workspace — the product's defining experience.

### Story 5.1: ArtifactWorkspace Layout & Two-Panel Structure

As a **solo designer**,
I want a persistent two-panel workspace to appear when my artifacts are ready,
So that I always know what artifacts exist and can navigate between them without losing my place.

**Acceptance Criteria:**

**Given** the Zustand workspace `phase` is `'workspace'`
**When** `ArtifactWorkspace` renders
**Then** a sticky AppNav (46px) spans the full width showing the Realm name and account menu
**And** below the nav, `ArtifactIndexPanel` (258px fixed) and `ArtifactContent` (flex:1) render side by side
**And** the content panel scrolls independently; the index panel and nav remain sticky

**Given** the viewport is between 768px and 1023px (tablet)
**When** the layout renders
**Then** the index panel collapses to a 56px icon strip
**And** tapping an icon opens the index as an overlay tray scoped to that artifact — the only permitted overlay in the workspace
**And** the content panel expands to fill the remaining width

**Given** the viewport is below 768px (mobile)
**When** the layout renders
**Then** the workspace renders as a single column with a collapsible disclosure for artifact navigation below the nav bar

---

### Story 5.2: ArtifactIndexPanel & Navigation

As a **solo designer**,
I want a persistent panel showing all four artifact types that I can click to switch between,
So that I can navigate the workspace instantly without losing context of what exists.

**Acceptance Criteria:**

**Given** the artifact workspace is in `phase = 'workspace'`
**When** `ArtifactIndexPanel` renders
**Then** four entries are listed with slash-prefixed Geist Mono labels: `/flows`, `/personas`, `/ia`, `/synthesis`
**And** the active entry has a 2px left border in accent color and `fg-default` text
**And** inactive entries have `fg-muted` text and no border
**And** `RoleFilterToggle` renders at the top of the panel above the artifact entries
**And** the panel uses `role="navigation"` with `aria-current="page"` on the active entry

**Given** I click a non-active artifact entry
**When** the click is registered
**Then** the active artifact updates in Zustand (`activeArtifact`) and the content panel renders the new artifact
**And** the transition completes in under 100ms with no loading state
**And** arrow keys navigate between index entries; Enter activates the focused entry

---

### Story 5.3: ArtifactContent & ArtifactSection Components

As a **solo designer**,
I want my generated artifacts rendered as structured, figure-numbered documents in the content panel,
So that the output looks and feels like a professional tool rather than chat output.

**Acceptance Criteria:**

**Given** an artifact type is active in Zustand
**When** `ArtifactContent` renders
**Then** a sticky `ContentHeader` shows the slash-prefixed artifact type tag (Geist Mono), artifact title, and generated-at timestamp
**And** the artifact body is divided into `ArtifactSection` components, each with a figure number (Geist Mono, accent color), section title, and body content
**And** figure numbers follow the pattern `1.0`, `2.0`, `3.0` etc.

**Given** I hover over an artifact section
**When** the cursor enters the section
**Then** `SectionRegenerateControl` becomes visible (opacity 0→1, 150ms transition) right-aligned in the section header row
**And** moving the cursor off the section hides the control again

**Given** the artifact has no content yet (section-pending state)
**When** the section renders
**Then** a Geist Mono label reads "Not yet written." and a `SectionRegenerateControl` is persistently visible (not hover-only)

---

### Story 5.4: RoleFilterToggle

As a **solo designer**,
I want to filter the artifact workspace by user role,
So that I can see which content is relevant to a specific role without re-running analysis.

**Acceptance Criteria:**

**Given** the artifact workspace is active
**When** `RoleFilterToggle` renders at the top of the index panel
**Then** role chips are shown for "All roles" plus each role extracted from the artifact data
**And** "All roles" is active by default (accent border + accent-surface bg + accent text)
**And** inactive chips show `border` token border and `fg-subtle` text

**Given** I click a role chip
**When** the chip is activated
**Then** artifact sections not tagged for that role are hidden in `ArtifactContent` — no network request, no loading state
**And** the filter state persists as I navigate between artifact types in the same session
**And** each chip uses `role="checkbox"` + `aria-checked` for screen reader compatibility

**Given** the active role filter produces no visible sections
**When** `ArtifactContent` renders
**Then** an empty state shows: "No sections match this role." with a Ghost button to clear the filter

---

### Story 5.5: Section Regeneration

As a **solo designer**,
I want to regenerate a single artifact section without re-running the full analysis,
So that I can refine a specific output while keeping everything else intact.

**Acceptance Criteria:**

**Given** I click the `SectionRegenerateControl` on an artifact section
**When** the action is triggered
**Then** Zustand sets `regeneratingSection = sectionId`
**And** that section's body is replaced with a local loading indicator: `regenerating...` (11px Geist Mono, `fg-muted`)
**And** all other sections remain fully readable and interactive — no panel-level loading state

**Given** the `regenerateSection` Server Action completes successfully
**When** the response is received
**Then** the section body updates in place with the new content
**And** TanStack Query invalidates `['artifact', projectId, artifactType]`
**And** Zustand sets `regeneratingSection = null`
**And** `input_tokens` and `output_tokens` are written to `token_usage`

**Given** the regeneration Claude API call fails
**When** the error is caught
**Then** the section body is replaced with an AttentionRegion (Error variant): "Regeneration failed. Try again." with a retry button
**And** no `artifacts` or `token_usage` rows are written
**And** the surrounding sections remain untouched

---

### Story 5.6: Workspace Accessibility & Responsive Polish

As a **solo designer**,
I want the full artifact workspace to be keyboard-navigable and screen reader compatible,
So that the product meets WCAG 2.1 AA and works correctly across all supported viewports.

**Acceptance Criteria:**

**Given** a keyboard user navigates the workspace
**When** they Tab through the interface
**Then** Tab order follows: AppNav → RoleFilterToggle chips → ArtifactIndexPanel entries → ArtifactContent sections
**And** all interactive elements have a visible focus ring: `outline: 2px solid` using the `fg-subtle` token
**And** `outline: none` is never set without a replacement focus indicator

**Given** a screen reader user navigates the workspace
**When** they interact with the index panel
**Then** `aria-current="page"` identifies the active artifact
**And** artifact section transitions announce via `aria-live` region
**And** `AllFatherLoadingState` uses `aria-atomic="false"` so cycling invocation text does not repeat-announce

**Given** I run axe DevTools on any workspace view
**When** the automated scan completes
**Then** zero critical or serious WCAG 2.1 AA violations are reported

**Given** the viewport is at 1023px (tablet boundary)
**When** the layout switches to icon strip mode
**Then** icon strip icons have a minimum 44×44px touch target
**And** `Tooltip` (shadcn/ui) shows the artifact label on icon hover/focus in collapsed mode

**Given** the authenticated app is loaded on standard broadband
**When** measured via Lighthouse or equivalent performance tool
**Then** Time to Interactive (TTI) for the authenticated workspace completes in under 3 seconds (NFR-PERF-3)

**Given** design tokens are applied throughout the workspace
**When** any component uses `--foreground-muted` (`#A1A1AA`)
**Then** it is used exclusively for non-essential text (timestamps, metadata, placeholder labels) — never for text that conveys required information or action labels; this constraint is enforced via code review checklist

---

## Epic 6: Subscription & Billing

Users can upgrade to Pro, manage their subscription, and billing lifecycle events are processed automatically and kept in sync with tier state.

### Story 6.1: Stripe Integration & Webhook Handler

As a **developer**,
I want Stripe integrated and a webhook handler in place that keeps subscription tier state in sync,
So that billing lifecycle events are processed reliably without manual intervention.

**Acceptance Criteria:**

**Given** the Stripe SDK is installed and configured in `src/lib/stripe/client.ts`
**When** a Stripe webhook event is received at `POST /api/webhooks/stripe`
**Then** the event is verified using `stripe.webhooks.constructEvent()` with the webhook signing secret — unverified requests return `400`
**And** the handler processes `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` events
**And** on each event, the handler looks up the user via `profiles.stripe_customer_id = event.data.object.customer` and updates `profiles.subscription_tier` to `'pro'` or `'free'` accordingly
**And** on success the handler returns `200`; on processing error it returns `500` so Stripe retries
**And** if the handler fails and leaves tier state incorrect, it is reconcilable from the Stripe Dashboard without manual database intervention

**Given** a user's subscription is cancelled via Stripe
**When** the `customer.subscription.deleted` webhook fires
**Then** `profiles.subscription_tier` is set back to `'free'`
**And** the user's project cap is enforced on their next project creation attempt

---

### Story 6.2: Upgrade to Pro

As a **Free tier user**,
I want to upgrade to Pro when I'm ready,
So that I can remove my project limit and continue working without interruption.

**Acceptance Criteria:**

**Given** I click an upgrade CTA (from the upgrade prompt or account page)
**When** the `createCheckoutSession` Server Action runs
**Then** if `profiles.stripe_customer_id` is null, a new Stripe customer is created and `profiles.stripe_customer_id` is set to the returned customer ID
**And** a Stripe Checkout session is created with the Pro tier price ID from `src/lib/stripe/products.ts` and `client_reference_id` set to the Supabase user ID
**And** I am redirected to the Stripe-hosted Checkout page
**And** Midgard never handles or stores card details

**Given** I complete payment on the Stripe Checkout page
**When** Stripe sends the `customer.subscription.created` webhook
**Then** the webhook handler looks up the user via `profiles.stripe_customer_id` and updates `profiles.subscription_tier` to `'pro'`
**And** on my next project creation attempt, no project cap is checked

**Given** I abandon the Stripe Checkout page without completing payment
**When** I return to Midgard
**Then** my tier remains `'free'` and no subscription is created

---

### Story 6.3: Subscription Management Portal

As a **Pro tier user**,
I want to view my subscription status and cancel if needed,
So that I have full control over my billing without contacting support.

**Acceptance Criteria:**

**Given** I navigate to `/account`
**When** the page loads
**Then** my current subscription tier (`Free` or `Pro`) is displayed
**And** if I am on Pro, a "Manage subscription" button is visible

**Given** I click "Manage subscription"
**When** the `createPortalSession` Server Action runs
**Then** a Stripe Customer Portal session is created
**And** I am redirected to the Stripe-hosted portal where I can view billing history and cancel

**Given** I cancel my subscription via the portal
**When** Stripe sends the `customer.subscription.deleted` webhook
**Then** `profiles.subscription_tier` is set to `'free'`
**And** the project cap is enforced on my next project creation

---

## Epic 7: Operational Controls & Monitoring

**Epic Goal:** Give the operator runtime visibility into token costs and platform health, with automated alerts and configurable caps — all without requiring a code deployment.

**Stories:**

### Story 7.1: Token Spend Alerting

**As** the operator,
**I want** to receive an automated email alert when monthly token spend exceeds a configurable threshold,
**So that** I can monitor costs and act before they become a problem.

**Acceptance Criteria:**
- AC1: A Supabase Edge Function or pg_cron job runs monthly and aggregates `token_usage` records for the current billing period.
- AC2: The aggregated token count is converted to a USD estimate using a cost-per-token constant defined in the function.
- AC3: If the estimated spend exceeds `config.token_alert_threshold_usd`, an alert email is sent to the operator email address defined in environment config.
- AC4: The threshold value is read from the `config` table at runtime — changing it in Supabase Dashboard takes effect on the next scheduled run without a deployment.
- AC5: If spend is below the threshold, no email is sent and no error is logged.
- AC6: Alert emails include the current estimated spend, the threshold, and the billing period covered.

**Technical Notes:**
- Implement as a Supabase Edge Function triggered by pg_cron (monthly schedule).
- Use the Resend SDK for alert email delivery — `RESEND_API_KEY` and `OPERATOR_ALERT_EMAIL` are available as Edge Function environment variables (set up in Story 1.1).
- Cost-per-token constant may be defined as an environment variable on the Edge Function for easier updates.
- FRs covered: FR36, FR38.

---

### Story 7.2: Free-Tier Cap Runtime Configuration

**As** the operator,
**I want** to change the maximum number of projects a free-tier user can create without deploying code,
**So that** I can adjust capacity limits in response to growth or abuse patterns.

**Acceptance Criteria:**
- AC1: The `createProject` Server Action reads the free-tier project cap from `config.free_tier_project_cap` at the time of each request.
- AC2: If a free-tier user has reached or exceeded the cap, project creation is blocked and the user receives an inline `AttentionRegion` message explaining they must upgrade to create more projects.
- AC3: Updating `config.free_tier_project_cap` in Supabase Dashboard takes effect immediately — no deployment required.
- AC4: Setting the cap to `0` blocks all free-tier project creation.
- AC5: Pro users are not subject to the cap check.
- AC6: The cap check occurs server-side in the Server Action — not in client-side UI logic.

**Technical Notes:**
- `config` table row for `free_tier_project_cap` must exist at launch (seeded in migration).
- Server Action reads config value fresh on each call — no caching of this value.
- FRs covered: FR37.

---

### Story 7.3: Inactivity Purge with Advance Notification

**As** the operator,
**I want** inactive free-tier accounts to be automatically purged after 12 months of inactivity — with a warning email sent at 11 months —
**So that** the platform stays clean and storage costs remain bounded.

**Acceptance Criteria:**
- AC1: A monthly scheduled job checks `profiles.last_active_at` for all free-tier users.
- AC2: Users who have been inactive for 11 months receive an advance notification email warning that their account and data will be deleted in 30 days if they do not log in.
- AC3: Users who have been inactive for 12 months have their data deleted in cascade order: `artifacts → token_usage → projects → profiles`.
- AC4: Logging in at any point resets `last_active_at` and restarts the inactivity clock.
- AC5: Pro users are exempt from inactivity purge.
- AC6: If any step of the cascade deletion fails, the job halts for that user and logs the error — no partial deletion occurs.
- AC7: Deletion is performed via a Supabase RPC transaction to ensure atomicity.

**Technical Notes:**
- Implement as a Supabase Edge Function triggered by pg_cron (monthly schedule).
- `last_active_at` is updated in the auth middleware on each authenticated request (implemented in Story 1.6).
- Use the Resend SDK for notification email delivery — `RESEND_API_KEY` is available as an Edge Function environment variable (set up in Story 1.1).
- Advance notification email should include account details and a direct login link.
- FRs covered: FR24, FR25.
