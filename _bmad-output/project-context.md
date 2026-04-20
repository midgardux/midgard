---
project_name: 'Midgard'
user_name: 'Jason'
date: '2026-04-19'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_Critical rules and patterns for implementing code in this project. Focused on unobvious details agents might otherwise miss._

---

## Technology Stack & Versions

- **Next.js** 16.2.4 — App Router, TypeScript, Turbopack (dev)
- **React** 19.2.5
- **TypeScript** 5.9.3 — strict mode enabled
- **Tailwind CSS** 3.4.19 — v3, `tailwind.config.ts` approach (NOT v4 CSS-first)
- **shadcn/ui** — New York style, CSS variables, components at `@/components/ui`
- **pnpm** 10.33.0 — only package manager
- **@supabase/ssr** 0.10.2 + **@supabase/supabase-js** 2.103.3
- **@anthropic-ai/sdk** 0.90.0
- **stripe** 22.0.2 + **@stripe/stripe-js** 9.2.0
- **@tanstack/react-query** 5.99.2 (v5)
- **zustand** 5.0.12
- **geist** 1.7.0 (local font package)
- **mammoth** 1.12.0 + **pdf-parse** 2.4.5
- **resend** 6.12.0

---

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript strict mode is on — never loosen any compiler options
- Import alias `@/*` maps to project root (`./*`) — never use relative paths like `../../`
- All Server Actions must return `ActionResult<T>` from `@/types/actions` — never throw
- Dates: ISO 8601 strings in Supabase; parse to `Date` only at component boundary
- ESM imports only — `require()` is forbidden (`@typescript-eslint/no-require-imports`)
- Fonts: import from `geist/font/sans` and `geist/font/mono` — never `next/font/google`
- Supabase: always via `@/lib/supabase/` clients — never instantiate inline
- Claude: always via `@/lib/claude/` wrapper — never call `anthropic.messages.create()` directly

### Framework-Specific Rules

**Directory structure — FLAT, no `src/`:**
- `app/`, `components/`, `lib/`, `types/`, `actions/`, `stores/` are at the **project root**
- Architecture spec references `src/` paths — drop the prefix: `src/types/actions.ts` → `types/actions.ts`
- shadcn/ui: `components/ui/` — CLI-managed, never hand-edit
- Custom workspace components: `components/workspace/`
- Server Actions: `actions/` (domain-grouped files)
- Zustand stores: `stores/`

**Next.js patterns:**
- Server Actions for ALL user-initiated server ops (CRUD, brief submission, analysis)
- API Routes ONLY for: `POST /api/webhooks/stripe` and future streaming endpoints
- Route groups: `(marketing)/` for SSR/SSG public pages; `(app)/` for authenticated SPA
- Route params: descriptive — `[projectId]` not `[id]`

**State management:**
- **Zustand** (`useWorkspaceStore`): UI state — phase, activeArtifact, activeRole, regeneratingSection
- **TanStack Query v5**: server state — projects, artifacts
  - `onSuccess`/`onError` removed from hook options in v5; use returned `data`/`error` instead
  - Key conventions: `['projects', userId]`, `['project', projectId]`, `['artifacts', projectId]`, `['artifact', projectId, artifactType]`

**Design tokens — IMPORTANT:**
- Midgard tokens use `mg-*` Tailwind prefix: `bg-mg-accent`, `text-mg-foreground`
- Midgard tokens use `--mg-*` CSS vars: `var(--mg-accent)`, `var(--mg-foreground-subtle)`
- shadcn owns unprefixed `--accent`, `--background`, `--foreground` etc. as HSL vars — do NOT overwrite
- Future story specs referencing `var(--accent)` mean `var(--mg-accent)` in this codebase
- Layout tokens (unprefixed, safe): `var(--index-panel-width)`, `var(--index-panel-collapsed)`

**Supabase:**
- Always destructure `{ data, error }` — always check `error` before using `data`
- Server Components + Server Actions → `@/lib/supabase/server`
- Client Components → `@/lib/supabase/client`
- RLS enforces user data scoping at DB level — no app-layer auth duplication needed
- No ORM — raw `@supabase/supabase-js` queries only

### Testing Rules

- Test files co-located alongside source: `*.test.ts` / `*.test.tsx`
- No test framework configured yet (added in a future story)
- Server Actions: test both `ActionResult` branches — success and failure
- Never mock Supabase at the query level — test against real schema shapes using typed responses
- Claude API calls: mock at the `@/lib/claude/` wrapper boundary, not at the SDK level

### Code Quality & Style Rules

- `pnpm lint` — zero errors required before marking any story complete
- `pnpm tsc --noEmit` — zero errors required before marking any story complete
- ESLint: `next/core-web-vitals` + `next/typescript` flat config via `eslint.config.mjs`

**Naming conventions:**
- Components: `PascalCase` — `ArtifactWorkspace.tsx`
- Hooks: `camelCase` with `use` prefix — `useWorkspaceStore`
- Server Actions: `camelCase` verbs — `createProject`, `submitBrief`
- Zustand stores: `use{Domain}Store`
- Types/interfaces: `PascalCase` — `Project`, `Artifact`
- DB tables: `snake_case` plural — `projects`, `token_usage`
- DB columns: `snake_case` — `user_id`, `created_at`
- Route dirs: `kebab-case` — `/app/projects/[projectId]/workspace`

**Comments:** Only when the WHY is non-obvious. No docstrings, no multi-line blocks, no task/story references.

### Development Workflow Rules

- **pnpm only** — `pnpm add <pkg>`, `pnpm add -D <pkg>`, never npm or yarn
- Local env: `.env.local` (gitignored) — copy from `.env.example` which has all 9 required vars
- Never hardcode or log secrets
- Three environments: local, Vercel preview, Vercel production — each has its own Supabase project
- DB migrations: Supabase CLI only — `supabase migration new <name>`, `supabase db push`; raw SQL, no ORM tooling
- Deployment: Vercel auto-deploys on push to main; preview deploys on PRs

### Critical Don't-Miss Rules

**Never do these:**
- Never throw from a Server Action — always return `ActionResult<T>`
- Never call `anthropic.messages.create()` directly — use `@/lib/claude/` wrapper
- Never instantiate Supabase client inline — use `@/lib/supabase/server` or `@/lib/supabase/client`
- Never use `npm` or `yarn`
- Never hand-edit `components/ui/` — shadcn CLI manages these
- Never use `next/font/google` for Geist fonts
- Never use relative imports — always `@/` alias
- Never use `require()` — ESM only
- Never hardcode or log secrets
- Never write partial state to DB on Claude API failure — fail clean, return error shape

**Security gotchas:**
- Stripe webhooks: always verify with `stripe.webhooks.constructEvent()` — never trust raw payload
- Server Actions handle auth via server-side Supabase client + RLS — do not use browser client in actions
- Route protection is handled by middleware for `/app/*` — do not duplicate in every page

**Error handling shape:**
- Claude failure → `{ success: false, error: 'Generation failed. Your brief was saved. Try again.' }` + no partial DB state
- Stripe webhook failure → return HTTP 500 (Stripe retries) + log event ID
- Client errors → `AttentionRegion` Error variant — never `alert()`

---

## Usage Guidelines

**For AI Agents:** Read this file before implementing any code. Follow all rules exactly. When in doubt, prefer the more restrictive option. The flat directory structure and `mg-*` token prefix are the two most common points of confusion — check these first.

**For Humans:** Update when stack changes or new patterns emerge. Review after each epic to remove rules that have become obvious.

_Last Updated: 2026-04-19_
