---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-04-17'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowType: 'architecture'
project_name: 'Midgard'
user_name: 'Jason'
date: '2026-04-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

41 FRs across 8 categories establish the full architectural scope:

| Category | FRs | Architectural Implication |
|---|---|---|
| Brief Input & Ingestion | FR1–FR5 | File parsing pipeline (Word, PDF, MD, TXT); quality gate logic pre-analysis |
| Guided Analysis Conversation | FR6–FR9 | Claude API conversational agent; loading state management; pipeline disclosure |
| Artifact Generation | FR10–FR14 | Structured output pipeline producing 4 artifact types; section-scoped regeneration |
| Artifact Workspace | FR15–FR18 | Client-side SPA with instantaneous artifact switching and role filtering |
| Project Management | FR19–FR25 | CRUD on Realms; hard delete with full data purge; inactivity purge with notification |
| Account & Subscription | FR26–FR35 | Supabase Auth; Stripe billing lifecycle; free-tier project cap configurable without deploy |
| Platform Operations | FR36–FR38 | Token spend alerting; cap configuration via Supabase (no code deploy); operator dashboards |
| Marketing & Discoverability | FR39–FR41 | SSR/SSG landing page; SEO metadata on all public pages |

**Non-Functional Requirements:**

- **Performance:** Artifact navigation <100ms; loading state appears within 500ms of trigger; app load <3s; Lighthouse ≥90 on marketing page; file upload non-blocking
- **Security:** HTTPS/TLS; Supabase at-rest encryption; no card data touches Midgard; 1-hour password reset link expiry; sessions invalidated on logout; no hardcoded secrets
- **Scalability:** 0–500 concurrent users absorbed by Vercel autoscaling + Supabase managed infra; no manual intervention required
- **Accessibility:** WCAG 2.1 AA — all authenticated surfaces and marketing page
- **Reliability:** Claude API failures surface user error + retry within 5s with no partial state committed; Stripe webhook failures must not silently misstate tier; Supabase unavailability fails cleanly

**Scale & Complexity:**

- Primary domain: Full-stack web SaaS (Next.js hybrid, Vercel serverless, Supabase managed)
- Complexity level: Medium — AI generation pipeline, subscription billing, auth, multi-artifact workspace, hybrid rendering
- Scalability target: 0–500 concurrent users, fully absorbed by managed infrastructure

### Technical Constraints & Dependencies

- **Stack committed in PRD:** Next.js + Vercel + Supabase + Stripe + Claude API — no evaluation required, decisions already made by the solopreneur constraint
- **Solopreneur constraint:** Zero operational overhead is non-negotiable; every infrastructure choice must be fully managed with no on-call requirement
- **Free-tier cap without deploy:** Requires runtime-configurable value stored in Supabase (env var or config table), not hardcoded in application
- **Hard delete:** Full data purge on project deletion — no soft deletes; must cascade through all associated tables and storage
- **No custom admin UI (V1):** Operator surfaces are Supabase Dashboard + Stripe Dashboard; architecture must make configuration tasks completable through these tools
- **Design system:** Tailwind CSS + shadcn/ui (Radix UI primitives); Geist Sans + Geist Mono; component library already resolved in UX spec

### Cross-Cutting Concerns Identified

| Concern | Affected Areas |
|---|---|
| AI pipeline (Claude API) | Generation, quality gate, section regeneration, error handling, cost tracking |
| State integrity | Phase transitions (input → loading → workspace), section-local regeneration without cascade |
| Subscription tier gating | Project cap enforcement, upgrade prompt timing, Stripe webhook lifecycle |
| Row-Level Security (Supabase RLS) | All user data scoped to authenticated user; hard delete cascades |
| Accessibility (WCAG 2.1 AA) | Every authenticated surface and all public marketing pages |
| Token cost management | Per-generation tracking, monthly aggregation, threshold alerting, free-tier bounding |
| Data privacy / hard delete | Project deletion purge, 12-month inactivity purge, pipeline disclosure at first analysis |
| SEO | Landing page, pricing page, login/signup — SSR/SSG only; app routes excluded |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack SaaS web application — Next.js hybrid (SSR marketing + SPA authenticated app), Vercel deployment, Supabase managed backend, Stripe billing. Stack committed in PRD.

### Selected Starter: Official Supabase Next.js Example

**Rationale:** Auth wiring (server-side session handling, middleware, cookies) with Supabase + Next.js App Router is the highest-risk initialization concern. Starting from Supabase's own maintained example eliminates this. Stripe and Claude API integrations are added manually — well-documented, and full ownership is preferred for billing logic.

**Initialization Command:**

```bash
npx create-next-app@latest --example with-supabase midgard
cd midgard
pnpm dlx shadcn@latest init
npm install stripe @stripe/stripe-js @anthropic-ai/sdk
```

**Architectural Decisions Provided by Starter:**

- Language: TypeScript (strict)
- Styling: Tailwind CSS (configured)
- Routing: Next.js App Router
- Auth: Supabase Auth — cookie-based SSR session handling, middleware pre-wired
- Build tooling: Next.js + Turbopack (dev), Vercel (deploy)
- Linting: ESLint
- Import alias: `@/*`

**Added on top:**
- shadcn/ui (Radix UI primitives, component registry)
- Stripe SDK (billing integration, webhooks — manual wiring)
- Anthropic SDK (Claude API — manual wiring)

**Note:** Project initialization using this command is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Server Actions as primary server-side pattern; API Routes for Stripe webhooks
- Zustand for UI state + TanStack Query for server state
- Raw Supabase client (no ORM)
- Token usage tracking via Supabase table
- File parsing via `mammoth` + `pdf-parse` in Server Actions

**Deferred Decisions (Post-MVP):**
- Error monitoring service (Sentry or equivalent) — V1 relies on Vercel logs + Supabase logs
- Streaming Claude API responses — PRD explicitly defers to post-MVP
- Custom admin UI — Supabase + Stripe dashboards are the V1 operator surface

### Data Architecture

**Database:** Supabase (PostgreSQL) — managed, no infrastructure ownership required.

**Access pattern:** Raw `@supabase/supabase-js` client. No ORM. Supabase-generated TypeScript types provide type safety. RLS policies enforce user data scoping at the database level — no application-layer authorization layer required.

**Migration approach:** Supabase CLI migrations (`supabase migration new`, `supabase db push`). Migration files committed to source control.

**Token usage tracking:**
- Table: `token_usage` (`id`, `user_id`, `project_id`, `input_tokens`, `output_tokens`, `created_at`)
- Populated on every Claude API call completion from the API response's usage object
- Monthly aggregation via query: `WHERE user_id = $1 AND created_at >= start_of_month`
- Free-tier project cap stored in a `config` table as a key/value row — readable at runtime, updatable via Supabase Dashboard without code deploy (FR37)
- Token spend email alert: Supabase Edge Function or scheduled cron job queries monthly totals and sends alert when threshold is crossed (FR36)

**Caching:** None beyond Next.js built-in page caching for SSG/SSR. No Redis or additional cache layer at V1 scale.

### Authentication & Security

**Auth method:** Supabase Auth — email/password only (FR26–FR29). No OAuth in V1.

**Session handling:** Cookie-based SSR session via the `with-supabase` starter's pre-wired middleware. Server Components and Server Actions use the server-side Supabase client; Client Components use the browser client.

**Authorization:** Supabase Row Level Security (RLS) on all user-owned tables. Users can only read/write their own data at the database level — not enforced solely at the application layer.

**Route protection:** Next.js middleware (pre-wired by starter) redirects unauthenticated requests away from `/app/*` routes.

**API security:**
- Server Actions are server-side — no exposed HTTP endpoints for user operations
- Stripe webhooks verified via `stripe.webhooks.constructEvent()` with the webhook signing secret
- All secrets (Supabase keys, Stripe keys, Anthropic key, Stripe webhook secret) in environment variables only — never hardcoded or logged

**Password reset:** Time-limited link via Supabase Auth (1-hour expiry, FR28). Sessions invalidated on explicit logout (FR29).

### API & Communication Patterns

**Server Actions:** Primary pattern for all user-initiated server operations — create/read/update/delete Realms, submit brief, trigger analysis, trigger section regeneration. No HTTP endpoint exposed; TypeScript end-to-end; RLS enforced automatically via server-side Supabase client.

**API Routes (`/app/api/`):** Used exclusively for:
- `POST /api/webhooks/stripe` — Stripe posts lifecycle events here; verified with signing secret
- Any future streaming endpoint (post-MVP)

**Claude API calls:** Executed inside Server Actions. Non-streaming (V1 — PRD decision). Response `usage` object written to `token_usage` table after each call. Failures surface user-visible error with retry option; no partial project state committed on failure (NFR: Reliability).

**File parsing:** Server Action receives uploaded file buffer, runs `mammoth` (docx) or `pdf-parse` (PDF) server-side, extracts plain text, passes to analysis pipeline. Markdown and TXT read directly. No file stored in Supabase Storage for brief uploads — processed in-memory and discarded.

**Stripe integration:**
- Checkout and billing portal via Stripe-hosted pages (no custom payment UI)
- Subscription tier state stored in Supabase (`profiles.subscription_tier`) and kept in sync via webhook handler
- Webhook handler reconciles tier state — any mismatch is resolvable from Stripe Dashboard without manual DB intervention (NFR: Reliability)

### Frontend Architecture

**State management:**
- **Zustand** — UI state: active artifact, active role filter, workspace phase (input / loading / workspace), section regeneration status per section ID
- **TanStack Query** — server state: project list, project detail, artifact data (fetch, cache, refetch on regeneration)
- These compose cleanly: TanStack Query manages what came from the server; Zustand manages what the user is doing with it

**Component architecture:** Resolved by UX spec — shadcn/ui primitives + 9 custom components (`AttentionRegion`, `AllFatherLoadingState`, `BriefInputSurface`, `ArtifactWorkspace`, `ArtifactIndexPanel`, `ArtifactContent`, `ArtifactSection`, `RoleFilterToggle`, `SectionRegenerateControl`).

**Rendering split:**
- `/` (landing), `/pricing`, `/login`, `/signup` — SSR/SSG, SEO-optimized
- `/app/*` (authenticated workspace) — client-side SPA, no full-page reloads

**Performance:** Artifact navigation transitions <100ms — achieved via client-side Zustand state updates with no network request; role filtering is a pure client-side filter on already-fetched artifact data.

### Infrastructure & Deployment

**Hosting:** Vercel — zero-ops, automatic deployments from main branch, environment variables managed in Vercel Dashboard.

**CI/CD:** Vercel automatic preview deployments on PRs; production deployment on merge to main. No additional pipeline required at V1.

**Environment configuration:** Three environments — local (`.env.local`), preview (Vercel preview), production (Vercel production). Each has its own Supabase project and Stripe keys.

**Monitoring (V1):** Vercel function logs + Supabase Dashboard logs. No dedicated error monitoring service at V1 — added post-MVP based on observed error patterns.

**Scaling:** Vercel autoscaling + Supabase managed infrastructure absorbs 0–500 concurrent users transparently. Free-tier project cap bounds per-user token consumption as user count grows.

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL/Supabase):**
- Tables: `snake_case` plural — `users`, `projects`, `artifacts`, `token_usage`, `config`
- Columns: `snake_case` — `user_id`, `created_at`, `input_tokens`
- Foreign keys: `{table_singular}_id` — `project_id`, `user_id`
- Indexes: `{table}_{column}_idx` — `projects_user_id_idx`

**TypeScript/React:**
- Components: `PascalCase` — `ArtifactWorkspace`, `RoleFilterToggle`
- Files: match component name — `ArtifactWorkspace.tsx`
- Hooks: `camelCase` with `use` prefix — `useArtifactStore`, `useProjects`
- Server Actions: `camelCase` verbs — `createProject`, `submitBrief`, `regenerateSection`
- Zustand stores: `use{Domain}Store` — `useWorkspaceStore`
- Types/interfaces: `PascalCase` — `Project`, `Artifact`, `TokenUsage`

**Next.js routes:**
- App routes: `kebab-case` directories — `/app/projects/[projectId]/workspace`
- API routes: `kebab-case` — `/api/webhooks/stripe`
- Route params: descriptive — `[projectId]` not `[id]` where ambiguous

### Structure Patterns

**Feature-based organization under `src/`:**

```
src/
  app/                          # Next.js App Router
    (marketing)/                # Route group: unauthenticated, SSR/SSG
    (app)/                      # Route group: authenticated SPA
      projects/[projectId]/
  components/
    ui/                         # shadcn/ui generated components
    workspace/                  # Custom workspace components
  lib/
    supabase/                   # Server + browser client factories
    stripe/                     # Stripe client + webhook helpers
    claude/                     # Anthropic SDK wrapper + prompts
    parsers/                    # mammoth + pdf-parse wrappers
  stores/                       # Zustand stores
  types/                        # Shared TypeScript types
  actions/                      # Server Actions (domain-grouped)
```

Tests co-located: `*.test.ts` / `*.test.tsx` alongside source files.

### Format Patterns

**Server Action return type (all actions):**
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```
Never throw from a Server Action — always return the error shape.

**Dates:** ISO 8601 strings in Supabase; parsed to `Date` at component boundary.

**Supabase queries:** Always destructure `{ data, error }`. Always check `error` before using `data`.

### Communication Patterns

**Zustand workspace store shape:**
```typescript
type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
}
```

**TanStack Query key conventions:**
```typescript
['projects', userId]
['project', projectId]
['artifacts', projectId]
['artifact', projectId, artifactType]
```

**Claude API:** Always via `src/lib/claude/` wrapper — never call `anthropic.messages.create()` directly from actions or components.

### Process Patterns

**Error handling:**
- Server Actions return `ActionResult` — never throw
- Claude API failures: return `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }` — no partial state written
- Stripe webhook failures: return `500` so Stripe retries; log event ID
- Client errors: surface via `AttentionRegion` (Error variant) — never `alert()`

**Loading states — two modes only:**
- Full analysis: `phase = 'loading'` in Zustand → `AllFatherLoadingState` renders
- Section regeneration: `regeneratingSection = sectionId` → section-local only; workspace remains interactive

**Subscription tier checks:** Always server-side from Supabase `profiles.subscription_tier`. Never trust client-side state for gating.

**Hard delete (FR23):** Must cascade in order via Supabase RPC/transaction: `artifacts` → `token_usage` → `projects`. No sequential queries — partial deletes not acceptable.

### Enforcement Guidelines

**All AI agents MUST:**
- Return `ActionResult<T>` from every Server Action — no raw throws
- Use `useWorkspaceStore` for phase/artifact/role state — no local `useState` for these
- Use `src/lib/claude/` wrapper for all Claude API calls
- Read subscription tier server-side before any tier-gated operation
- Check `error` from every Supabase query before using `data`
- Name tables `snake_case` plural, columns `snake_case`

**Anti-patterns:**
- `useState` for workspace phase, active artifact, or active role
- Direct `anthropic.messages.create()` outside `src/lib/claude/`
- Throwing from Server Actions
- Storing or logging card data
- Soft-deleting projects

## Project Structure & Boundaries

### Complete Project Directory Structure

```
midgard/
├── .env.example
├── .env.local                      # local dev secrets (gitignored)
├── .gitignore
├── README.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── middleware.ts                   # Supabase session refresh + route protection
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_config_table.sql
│
├── public/
│   └── og-image.png
│
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout (fonts, providers)
    │   ├── globals.css
    │   ├── (marketing)/            # SSR/SSG — unauthenticated, SEO-indexed
    │   │   ├── layout.tsx
    │   │   ├── page.tsx            # Landing page (FR39-41)
    │   │   ├── pricing/page.tsx
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── (app)/                  # Client SPA — authenticated, middleware-protected
    │   │   ├── layout.tsx          # AppNav + auth check
    │   │   ├── projects/
    │   │   │   ├── page.tsx        # Realm list (FR20)
    │   │   │   └── [projectId]/workspace/page.tsx  # ArtifactWorkspace (FR15-18)
    │   │   ├── account/page.tsx    # Subscription management (FR31)
    │   │   └── auth/
    │   │       ├── callback/route.ts
    │   │       └── reset-password/page.tsx  # FR28
    │   └── api/webhooks/stripe/route.ts     # Stripe lifecycle events (FR35)
    │
    ├── components/
    │   ├── ui/                     # shadcn/ui generated (never hand-edited)
    │   │   ├── button.tsx
    │   │   ├── badge.tsx
    │   │   ├── scroll-area.tsx
    │   │   ├── tooltip.tsx
    │   │   ├── separator.tsx
    │   │   ├── textarea.tsx
    │   │   ├── input.tsx
    │   │   └── dropdown-menu.tsx
    │   └── workspace/              # Custom components (UX spec)
    │       ├── AttentionRegion.tsx
    │       ├── AllFatherLoadingState.tsx
    │       ├── BriefInputSurface.tsx
    │       ├── ArtifactWorkspace.tsx
    │       ├── ArtifactIndexPanel.tsx
    │       ├── ArtifactContent.tsx
    │       ├── ArtifactSection.tsx
    │       ├── RoleFilterToggle.tsx
    │       └── SectionRegenerateControl.tsx
    │
    ├── actions/
    │   ├── projects.ts             # createProject, deleteProject, listProjects (FR19-25)
    │   ├── analysis.ts             # submitBrief, triggerAnalysis (FR6-13)
    │   ├── regeneration.ts         # regenerateSection (FR14)
    │   ├── subscription.ts         # createCheckoutSession, createPortalSession (FR30-31)
    │   └── account.ts              # updatePassword (FR27-28)
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── server.ts           # createServerClient()
    │   │   ├── browser.ts          # createBrowserClient()
    │   │   └── types.ts            # Generated DB types
    │   ├── stripe/
    │   │   ├── client.ts
    │   │   ├── webhooks.ts
    │   │   └── products.ts
    │   ├── claude/
    │   │   ├── client.ts
    │   │   ├── analyze.ts          # Full brief → 4 artifacts
    │   │   ├── regenerate.ts       # Single section regeneration
    │   │   ├── quality-gate.ts     # Input quality + follow-up Qs
    │   │   └── prompts/
    │   │       ├── personas.ts
    │   │       ├── flows.ts
    │   │       ├── ia.ts
    │   │       └── synthesis.ts
    │   └── parsers/
    │       ├── docx.ts             # mammoth (Word)
    │       ├── pdf.ts              # pdf-parse (PDF)
    │       └── index.ts            # dispatch by MIME type
    │
    ├── stores/
    │   └── workspace.ts            # useWorkspaceStore (Zustand)
    │
    └── types/
        ├── database.ts
        ├── artifacts.ts            # Persona, Flow, IA, Synthesis shapes
        └── actions.ts              # ActionResult<T>
```

### Architectural Boundaries

**API Boundaries:**
- All user operations → Server Actions in `src/actions/` (no HTTP endpoints)
- Stripe lifecycle events → `POST /api/webhooks/stripe` only
- Claude API calls → `src/lib/claude/` wrapper exclusively
- Supabase → `src/lib/supabase/server.ts` (server) or `browser.ts` (client)

**Auth boundary:** `middleware.ts` intercepts all `/(app)/*` routes, refreshes session, redirects unauthenticated users to `/login`.

**Data flows:**

*Analysis pipeline:*
```
BriefInputSurface → submitBrief (Server Action)
  → parsers/ (if file upload)
  → claude/quality-gate.ts
  → [AttentionRegion if thin brief]
  → claude/analyze.ts → 4 artifacts
  → supabase: insert artifacts + token_usage
  → ActionResult<Artifacts>
  → TanStack Query invalidates ['artifacts', projectId]
  → Zustand: phase = 'workspace'
```

*Section regeneration:*
```
SectionRegenerateControl → regenerateSection (Server Action)
  → Zustand: regeneratingSection = sectionId
  → claude/regenerate.ts
  → supabase: update artifact section + insert token_usage
  → ActionResult<Section>
  → TanStack Query invalidates ['artifact', projectId, artifactType]
  → Zustand: regeneratingSection = null
```

### Requirements to Structure Mapping

| FR Category | Primary Location |
|---|---|
| Brief Input & Ingestion (FR1–5) | `components/workspace/BriefInputSurface.tsx`, `lib/parsers/`, `lib/claude/quality-gate.ts` |
| Guided Analysis (FR6–9) | `actions/analysis.ts`, `lib/claude/analyze.ts`, `lib/claude/prompts/` |
| Artifact Generation (FR10–14) | `lib/claude/analyze.ts`, `lib/claude/regenerate.ts`, `actions/regeneration.ts` |
| Artifact Workspace (FR15–18) | `components/workspace/ArtifactWorkspace.tsx` + children, `stores/workspace.ts` |
| Project Management (FR19–25) | `actions/projects.ts`, `app/(app)/projects/` |
| Account & Subscription (FR26–35) | `actions/account.ts`, `actions/subscription.ts`, `lib/stripe/`, `app/api/webhooks/stripe/` |
| Platform Operations (FR36–38) | `supabase/migrations/` (config + token_usage tables), `lib/stripe/webhooks.ts` |
| Marketing & Discoverability (FR39–41) | `app/(marketing)/`, meta exports per page |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All choices are mutually compatible. Next.js App Router + Supabase `with-supabase` starter is a known-good combination. Zustand and TanStack Query are independently scoped with no conflicts. `mammoth` + `pdf-parse` run server-side in Node.js — fully compatible with Vercel serverless. No version conflicts identified.

**Pattern Consistency:** `ActionResult<T>` applied consistently across all 5 action files. Zustand store shape covers all workspace state from the UX spec. TanStack Query key conventions defined for all data types. `lib/claude/` isolation boundary directly enforces the anti-pattern rule.

**Structure Alignment:** Every FR category maps to specific files. The `(marketing)` / `(app)` route group split cleanly enforces the SSR/SPA rendering boundary.

### Requirements Coverage Validation

All 41 FRs are architecturally covered. Non-obvious coverage:

| FR | Coverage |
|---|---|
| FR9 — Pipeline disclosure at first analysis | `actions/analysis.ts` — check `profiles.has_seen_disclosure`, show once per account |
| FR23 — Hard delete with full purge | Supabase RPC transaction in `actions/projects.ts`; cascades `artifacts → token_usage → projects` |
| FR24/FR25 — Inactivity purge with notification | Supabase Edge Function / pg_cron; scheduled operator job — dedicated story required |
| FR36 — Token spend email alert | Supabase Edge Function querying `token_usage` monthly aggregate |
| FR37 — Cap configurable without deploy | `config` table in Supabase; read at runtime in `createProject` before insert |

**NFR Coverage:**

| NFR | Architectural support |
|---|---|
| <100ms artifact navigation | Zustand state update — zero network calls |
| <500ms loading state appearance | `phase = 'loading'` set before Claude API call initiates |
| WCAG 2.1 AA | Radix UI primitives + explicit `aria-*` in custom components per UX spec |
| No partial state on API failure | `ActionResult` never writes to DB on failure path |
| Stripe webhook reliability | `constructEvent()` verification + Stripe retry; tier reconcilable from Dashboard |

### Gap Analysis Results

No critical gaps. One story-level note: **FR24/FR25 (inactivity purge with notification)** involves scheduled jobs, email delivery, and a 12-month lookback query — the most complex operator task in V1. Should be a dedicated implementation story with explicit acceptance criteria.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium, 0–500 users)
- [x] Technical constraints identified (solopreneur, no ORM, managed infra only)
- [x] Cross-cutting concerns mapped (8 identified)

**Architectural Decisions**
- [x] Critical decisions documented (Server Actions, Zustand+TanStack Query, raw Supabase client, token tracking, file parsing)
- [x] Technology stack fully specified
- [x] Integration patterns defined (analysis pipeline, regeneration pipeline, Stripe webhook)
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established (DB, TypeScript, routes)
- [x] Structure patterns defined (feature-based under `src/`)
- [x] Communication patterns specified (`ActionResult<T>`, Zustand store shape, TanStack Query keys)
- [x] Process patterns documented (error handling, loading states, hard delete, tier checks)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped (2 data flow diagrams)
- [x] All 41 FRs mapped to specific locations

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — stack is committed, inputs are rich, no ambiguous decisions remain.

**Key Strengths:**
- Zero operational overhead by design — fully managed infra throughout
- `ActionResult<T>` enforced throughout eliminates unhandled error bugs
- `lib/claude/` wrapper isolates all future AI behaviour changes to one location
- No ORM reduces abstraction layers and plays naturally with Supabase RLS
- UX spec pre-resolved component strategy — no design decisions left for implementation agents

**Areas for Future Enhancement (Post-MVP):**
- Error monitoring service (Sentry or equivalent)
- Streaming Claude API responses
- Custom admin UI for operator tasks

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use `ActionResult<T>` for every Server Action — no exceptions
- Call Claude API only through `src/lib/claude/` wrapper
- Read subscription tier server-side before every tier-gated operation
- Refer to this document for all architectural questions

**First Implementation Command:**
```bash
npx create-next-app@latest --example with-supabase midgard
cd midgard
pnpm dlx shadcn@latest init
npm install stripe @stripe/stripe-js @anthropic-ai/sdk zustand @tanstack/react-query mammoth pdf-parse
```
