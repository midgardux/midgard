## Deferred from: code review of 5-5-section-regeneration (2026-05-07)

- `JSON.stringify(currentContent)` has no size cap before sending to Claude — large artifacts may silently exceed context window and return the opaque REGENERATION_ERROR with no diagnostic (`lib/claude/regenerate.ts:71`).
- Section-level shape validation missing — individual sections cast from JSONB are not validated; `roles` could be undefined on a malformed DB row, causing a crash downstream when `roles.includes(...)` is called (`actions/regeneration.ts:46`).
- `token_usage` insert is awaited — correctness unaffected (failure is logged, not returned) but adds latency before client response; convert to fire-and-forget if response time becomes a concern (`actions/regeneration.ts:64`).
- `section.title` interpolated unescaped in LLM user message — DB-origin data so low practical risk, but could be sanitized or JSON-encoded in the prompt for defence-in-depth (`lib/claude/regenerate.ts:71`).

## Deferred from: code review of 5-4-rolefiltertoggle (2026-05-07)

- Role string case/whitespace inconsistency produces duplicate chips — if AI generates roles with inconsistent casing (e.g. `"Dev"` vs `"dev"`), `Set`-based deduplication treats them as distinct; clicking one chip won't match sections tagged with the other case variant (`components/workspace/RoleFilterToggle.tsx`, `allRoles` useMemo).

## Deferred from: code review of 5-3-artifactcontent-and-artifactsection-components (2026-05-06)

- Whitespace-only `section.body` renders as non-pending blank content — `pending={!section.body}` is falsy for `""` but truthy for `"  "`, which silently renders a blank body without the "Not yet written." label (`components/workspace/ArtifactContent.tsx:40`).
- Empty `sections` array produces blank content panel with no feedback — if `artifactData.sections` is `[]`, the map produces nothing and the user sees only the sticky header with no body and no empty-state message (`components/workspace/ArtifactContent.tsx`).
- `section.figureNumber` null/undefined renders empty accent span — type declares `figureNumber: string` but runtime malformed data could be null/empty, breaking visual alignment with no fallback (`components/workspace/ArtifactSection.tsx:22`).
- `artifact.created_at` null/invalid renders "Invalid Date" in ContentHeader — `new Date(undefined)` produces `Invalid Date`; `toLocaleDateString` renders it verbatim in the header (`components/workspace/ArtifactContent.tsx`).
- `section.id` empty/non-unique causes `headingId` collision and React `key` conflict — identical IDs break the `aria-labelledby` pointer and React reconciler may produce unexpected DOM mutations (`components/workspace/ArtifactSection.tsx:13`).

## Deferred from: code review of 5-2-artifactindexpanel-and-navigation (2026-05-06)

- `itemRefs.current` stale refs if `ARTIFACT_TYPES` ever shrinks — `ArrowDown`/`ArrowUp` would silently call `.focus()` on a detached DOM node for that slot, breaking wrap-around nav; not applicable while the list is a fixed constant (`components/workspace/ArtifactIndexPanel.tsx`).
- `artifact_type` DB column is an untyped `string` — `ArtifactType` union is only enforced at the app layer; a legacy or misspelled DB row produces an invisible missing entry in the index panel with no error; validate or cast at the data-fetch boundary before adding role filtering in Story 5.4 (`lib/supabase/types.ts`).
- `ArtifactContent` renders `/{activeArtifact}` when no matching artifact exists in `artifacts[]` — upstream `phase = 'workspace'` guard makes this unreachable in practice; Story 5.3 replaces this entire body and should include an empty-state guard (`components/workspace/ArtifactContent.tsx`).

## Deferred from: code review of 5-1-artifactworkspace-layout-and-two-panel-structure (2026-05-05)

- `<main>` landmark removed from `workspace/page.tsx` per spec (Task 5.4 height-calc requirement); no `<main>` landmark on workspace page for assistive technology; consider `dvh` units to restore landmark without breaking layout.
- Tablet tray focus not trapped — backdrop captures mouse clicks but keyboard focus can Tab behind the overlay; no interactive content in stub defers the risk; add focus trap in Story 5.2 when panel items are added (`components/workspace/ArtifactWorkspace.tsx`).
- `mobileNavOpen` state not reset on viewport resize — state persists if user opens mobile nav then widens to tablet/desktop, leaving `aria-controls` pointing to a hidden element (`components/workspace/ArtifactWorkspace.tsx`).
- Stale Zustand `phase` on cross-project navigation — navigating from a workspace-phase project to a new project may briefly render `ArtifactWorkspace` with empty artifacts before mount effect resets phase; related to existing WorkspaceShell cleanup defer (`components/workspace/WorkspaceShell.tsx`).
- `h-[calc(100vh-92px)]` and `top: 92px` clip content on mobile browsers with dynamic toolbars — `100vh` excludes browser chrome on iOS Safari / Chrome Android; address in Story 5.6 responsive polish pass (`components/workspace/ArtifactWorkspace.tsx`).

## Deferred from: code review of 4-5-ai-analysis-pipeline-four-artifact-generation round 2 (2026-05-05)

- `WorkspaceShell` cleanup `() => setPhase('input')` fires on every unmount — if the user navigates away from the workspace page and returns, the phase resets to `'input'` briefly before the mount effect restores it to `'workspace'`, causing a flash of the brief input form (`components/workspace/WorkspaceShell.tsx:40-42`).
- `has_seen_disclosure` DB update failure still returns `showDisclosure: true` — if the Supabase `profiles` update fails transiently (network blip, RLS), the flag stays `false` in the DB while the client shows the disclosure banner; on every subsequent analysis the server reads `has_seen_disclosure = false` again and returns `showDisclosure: true`, re-showing the banner indefinitely (`actions/analysis.ts`).

## Deferred from: code review of 4-5-ai-analysis-pipeline-four-artifact-generation (2026-05-04)

- No per-call timeout on `Promise.all` for Claude calls — if one call hangs, the entire analysis hangs until platform function timeout kills it, leaving the client permanently on the loading screen (`lib/claude/analyze.ts:44`).
- `router.refresh()` has no error callback in Next.js — silent refresh failure leaves the user stuck on the loading screen with no recovery path; no standard fix available at the framework level (`components/workspace/BriefInputSurface.tsx:75`).
- Supabase `.single()` no-row edge case for profiles — if a user's profile row is missing, `has_seen_disclosure` defaults to `false` and the update is a silent no-op; disclosure banner shows on every analysis run for that user (`actions/analysis.ts:95`).
- `hadSeenDisclosure` concurrent analysis race — two parallel submissions both read `has_seen_disclosure = false` before either updates it, causing both to return `showDisclosure: true` and show the banner twice (`actions/analysis.ts:95`).
- Role name consistency across prompts enforced only by prompt wording — the four Claude calls are independent and may produce inconsistently named roles (e.g. "Product Manager" vs "Manager"), breaking any downstream role-filter UI (`lib/claude/analyze.ts`). Cross-validate role names post-parse when Epic 5 RoleFilterToggle is built.
- `stop_reason: 'max_tokens'` produces a truncated JSON fragment with no logging — parse failure is indistinguishable from a malformed model response; add `stop_reason` check and log before treating as a generic error (`lib/claude/analyze.ts:62`).

## Deferred from: code review of 4-4-allfather-loading-state-component-and-norse-microcopy (2026-05-04)

- Text cycling fade (500ms) > outer crossfade window (300ms) — if a text cycle fade starts simultaneously with a phase transition, the invocation text is at intermediate opacity when the container fades out, causing a visual flicker (`WorkspaceShell.tsx:25` / `AllFatherLoadingState.tsx:13`).
- `reducedMotion` SSR/hydration flash — component initializes `reducedMotion=false` and corrects it in `useEffect`; first render always shows non-reduced-motion classes, causing a potential flash and hydration mismatch on SSR paths (`AllFatherLoadingState.tsx:20`).
- Fast Concurrent React phase transitions can bypass `prevPhaseRef` update — if `phase` changes `input→loading→workspace` in rapid succession, the effect may see only `workspace` with `prevPhaseRef` still holding `input`, silently skipping the crossfade (`WorkspaceShell.tsx:22-30`).

## Deferred from: code review of 4-3-input-quality-gate (2026-05-03)

- Singleton Anthropic client untestable; module-level `_client` has no reset mechanism, bleeds state between test runs (`lib/claude/client.ts`).
- API key read once at `Anthropic` construction; stale client persists if `ANTHROPIC_API_KEY` is rotated at runtime without a process restart (`lib/claude/client.ts`).
- Model string `claude-haiku-4-5-20251001` hardcoded with no constant or env override (`lib/claude/quality-gate.ts`).
- Enriched brief appends answers without a label or delimiter; the retry model receives an unlabeled context block — labeling should be addressed when Story 4.5 builds the full analysis prompt (`actions/analysis.ts`).
- Fence-removal regex only strips leading/trailing code fences; mid-string fences would still break JSON parsing — low probability with current model/prompt (`lib/claude/quality-gate.ts:44`).
- `QualityGateChallenge.attempt` is always returned as `0` from the server and stored in component state but never consumed in FormData; dead field could mislead future maintainers (`actions/analysis.ts`, `components/workspace/BriefInputSurface.tsx`).

## Deferred from: code review of 4-2-brief-input-surface (2026-05-02)

- Extension-only file type validation (no MIME/magic-byte check in `actions/analysis.ts:18`) — trivially bypassed by renaming files; address before Story 4.5 ships the AI pipeline.
- Global Zustand singleton state leak across multiple open project tabs — requires context-provider pattern refactor; out of scope for this story.
- `phase='loading'` + server revalidation race: if `hasArtifacts` becomes true mid-loading transition, loading screen may persist depending on timing (`WorkspaceShell.tsx:26-43`) — not triggerable with stub action; revisit in Story 4.5.
- `×` close button character (U+00D7) rendering inconsistency across monospace fonts — cosmetic; consider SVG icon or U+2715 in a future polish pass.

## Deferred from: code review of 4-1-attentionregion-and-button-hierarchy-components (2026-05-01)

- Title focus ring uses `focus:outline` instead of `focus-visible:outline` (`AttentionRegion.tsx:82`) — `:focus-visible` is suppressed by browsers for programmatic `.focus()` calls before any keyboard interaction occurs, which would remove the visible ring on initial trap activation. Using plain `:focus` is intentional; revisit if a cross-browser solution for programmatic focus-visible emerges.
- `role="region"` without accessible name when `aria-label` prop not provided (`AttentionRegion.tsx:70-73`) — `aria-label` is intentionally optional per spec; unnamed landmarks are invisible to screen reader navigation. Revisit when enforcing `aria-label` on `info`/`confirm` variants.
- MidgardButton icon-only accessible name enforcement (`MidgardButton.tsx:6-8`) — component passes through `aria-label` via `...props` but TypeScript does not require it; icon-only Nano buttons (Story 5+) will be silently inaccessible. Add a typed constraint or lint rule before Nano tier is used for icon-only controls.
- Concurrent rendering / Suspense focus timing in `AttentionRegion` `useEffect` (`AttentionRegion.tsx:41-46`) — initial focus fires after React commit; lazy-loaded children may not yet be in the DOM. Revisit if `AttentionRegion` is ever wrapped in a Suspense boundary.
- `cn()` allows callers to override `disabled:opacity-40`/`disabled:cursor-not-allowed` in `MidgardButton` — inherent Tailwind class-merge limitation; callers can silently break disabled affordance. Consider a HOC or CSS layer if this becomes a pattern.
- `FOCUSABLE` selector missing `contenteditable` and `details > summary` elements (`AttentionRegion.tsx:24`) — both are natively focusable but excluded from the trap; Tab can escape through them. Revisit if rich-text or collapsible content is added to `AttentionRegion`.
- `useEffect` dependency array omits `regionRef`/`titleRef` (`AttentionRegion.tsx:66`) — refs are stable objects, `exhaustive-deps` will not flag; low risk. Revisit if component is structurally refactored.

## Deferred from: code review of 3-4-delete-a-realm (2026-04-25)

- `CREATE OR REPLACE FUNCTION` in numbered migration `005_delete_project_rpc.sql` — idempotent creation is an anti-pattern in migration files; subsequent re-runs silently replace any manual changes. Migration already applied; revisit migration hygiene strategy before adding more RPC migrations.
- `token_usage` RLS deletion relies on `user_id = auth.uid()` per row — if any `token_usage` row was written by a service role or admin, RLS silently blocks its deletion in `SECURITY INVOKER` context, leaving orphaned rows after the parent project is removed. Revisit when token_usage write paths are extended beyond the authenticated user's own requests.

## Deferred from: code review of 3-3-open-and-revisit-a-realm (2026-04-25)

- `getArtifacts` IDOR risk if artifacts RLS is misconfigured — exported function has no ownership assertion; relies entirely on DB-level RLS. Spec states this is enforced; verify RLS policy before production launch.
- `getProject` PGRST116 conflates unauthenticated session blocks with not-found — absent session causes all rows to return PGRST116 → `notFound()` instead of sign-in redirect. Middleware should prevent this; revisit if auth guard is relaxed.
- Non-PGRST116 DB errors in `getProject` surface as 404 not 500 — `if (!projectResult.success || ...) notFound()` swallows transient DB errors as not-found; spec-mandated pattern, known tradeoff.
- Static `metadata` doesn't include project name in page title — workspace page uses static `robots`-only metadata; switch to `generateMetadata` when page title quality matters.
- "Realm not found." copy in `app/(app)/not-found.tsx` is realm-specific — if other `(app)` routes call `notFound()`, the message will mislead; add route-specific `not-found.tsx` at deeper segment levels as needed.
- `projectId` not validated as UUID format before Supabase query — malformed UUID triggers a Postgres type error handled gracefully (→ notFound()), but causes an unnecessary DB round-trip; add UUID validation when tightening input validation.
- Root `app/not-found.tsx` missing — `notFound()` outside `(app)` falls through to bare Next.js 404; pre-existing, add `app/not-found.tsx` before production launch.

## Deferred from: code review of 3-2-create-a-realm round 2 (2026-04-25)

- `PROJECT_CAP_REACHED` sentinel string protocol — count embedded in error string as `PROJECT_CAP_REACHED:N`; fragile to parse and leaks the count via the raw error field. Correct fix: add a typed error variant to `ActionResult<T>`. Deferred until ActionResult is extended.
- `subscription_tier` untyped string — any profile value not exactly `'free'` silently skips the cap check. Pre-existing schema typing concern; add a discriminated union to the `profiles` type when tightening subscription logic.
- count=0 upgrade prompt copy — "You've built 0 Realms" when `cap=0` blocks all creation. Story 7.2 (free-tier cap runtime configuration) should address this edge case.

## Deferred from: code review of 3-2-create-a-realm (2026-04-25)

- TOCTOU cap race in `createProject` — count check and insert are two non-atomic round-trips; two concurrent free-tier requests can both pass the cap guard and both insert, exceeding the cap. Correct fix: a Postgres function that does count + insert atomically, or a DB-level constraint. **Required fix in Story 7.2** (free-tier cap runtime configuration) — do not mark optional.

## Deferred from: code review of 3-1-realm-list-view (2026-04-24)

- RLS-only user scoping — `listProjects` relies entirely on Postgres RLS with no application-layer auth check; intentional per spec. Revisit if RLS configuration becomes non-obvious or when adding admin queries.
- `createServerClient` throws if Supabase env vars absent, bypassing middleware's `hasEnvVars` short-circuit. Pre-existing across all server actions; add a runtime env check utility when hardening for production.
- `error.message` in `ActionResult` return exposes raw Supabase error strings (schema names, constraint names). Currently only used in a Server Component so it never reaches the client; scrub before any client-side caller is added.
- `new Date(realm.created_at)` throws `RangeError` on a malformed timestamp string. Theoretical for Postgres timestamptz; add a try/catch or guard when date formatting is extracted to a shared utility.
- No `not-found.tsx` or error boundary under `app/(app)/` — realm card 404s drop users onto the bare Next.js error page, losing AppNav chrome. Create `app/(app)/not-found.tsx` when building Story 5.1 workspace routes.
- Logout form has no loading/pending state — double-submit dispatches two concurrent `signOut` calls. Pre-existing pattern; add `useFormStatus` or optimistic state when polishing the AppNav in a later story.
- `(app)` layout has no server-side session guard — auth relies entirely on middleware. Add a `supabase.auth.getUser()` check in the layout as defense-in-depth before production launch.
- `select('*')` in `listProjects` fetches all project columns; only `id`, `name`, `created_at` are rendered. Changing to column-specific select would require updating the `Project` type export; revisit when query performance becomes a concern.

## Deferred from: code review of 2-2-pricing-page-and-public-route-seo (2026-04-23)

- `lastModified: new Date()` in `app/sitemap.ts` resolves at build time — every deploy marks all sitemap URLs as freshly modified regardless of actual content changes; degrades crawl budget efficiency. Revisit when sitemap grows or SEO fidelity becomes a priority.
- `startsWith("/pricing")` in proxy.ts `isPublicPath` — any future route beginning with `/pricing` (e.g. `/pricing-admin`) would be silently made public; pattern is shared by all other public paths. Enforce stricter path matching or add a lint rule when protected routes are added.
- `robots.ts` disallow list covers only `/projects/` and `/account/` rather than a broader `/(app)/*` catch-all — `(app)` route group not yet built (Epic 3); update the disallow list when Epic 3 creates the authenticated app shell.
- (Cross-reference) `metadataBase` / `VERCEL_URL` OG URL mismatch: first logged in Story 1.1 code review. Story 2.2 confirms the issue is still present; resolve before production launch by aligning `metadataBase` with `NEXT_PUBLIC_SITE_URL`.
- (Cross-reference) `?plan=pro` silently ignored: first logged in Story 2.1 code review. Story 6.2 must read this param post-email-verification and route the user into Stripe Checkout.

## Deferred from: code review of 2-1-marketing-landing-page (2026-04-22)

- Landing page Pro CTA passes `?plan=pro` to `/signup`; Story 6.2 must read this param after email confirmation and route the verified user into Stripe Checkout before landing them in `/projects`.
- ThemeSwitcher in `app/protected/layout.tsx` still offers light/system options that `forcedTheme="dark"` silently overrides — pre-existing Supabase starter component; remove or replace ThemeSwitcher when building the authenticated app shell in Epic 3.
- Pricing hardcoded in JSX ($19/month in `app/(marketing)/page.tsx`) — intentional MVP; extract to a pricing constants file or config when Epic 6 (billing) introduces Stripe price IDs.
- `disableTransitionOnChange` retained alongside `forcedTheme="dark"` in `app/layout.tsx` — dead config, harmless; remove in a future cleanup pass.
- `app/robots.ts` has no `sitemap` or `host` field; no `app/sitemap.ts` exists — add both when Story 2.2 (Pricing Page & Public Route SEO) is implemented.

## Deferred from: code review of 1-5-password-reset (2026-04-21)

- `error.message` appended raw to `/auth/error` redirect URL for non-recovery OTP failures — Supabase error strings can contain internal detail; not URL-encoded. Pre-existing in `app/auth/confirm/route.ts`.
- Open redirect via unvalidated `next` query param in confirm route — also logged from Stories 1.2 and 1.4; still unresolved. Pre-existing.
- `initialError` prop only evaluated at `useState` initializer in `UpdatePasswordForm` — prop changes after mount (e.g. back-button SPA navigation) won't update the displayed error. Matches spec's "detect on mount" requirement; React limitation.
- `/login?message=password-reset` banner injectable via crafted URL — cosmetically misleading but no security impact; pattern is by design per spec.
- Route group placement inconsistency — forgot-password under `(marketing)`, reset-password under flat `app/auth/`; these are the two pages of the same user flow but may render under different layouts. Intentional per spec; revisit when `(app)/` route group is created in Epic 3.
- No fallback redirect when `token_hash`/`type` absent from `app/auth/confirm/route.ts` — request falls through with no response. Pre-existing; not in Story 1.5 scope.

## Deferred from: code review of 1-4-user-login-and-logout (2026-04-20)

- Missing env vars runtime throw — `createBrowserClient` uses non-null assertions on Supabase env vars; if either is undefined at runtime the SDK throws with no user feedback. Pre-existing, not introduced by Story 1.4.
- `/auth/confirm` open redirect — `next` query param passed verbatim to `redirect()`; originally deferred in Story 1.2. No change in Story 1.4 but still unresolved.
- `SignUpForm` "Already have an account?" still links to `/auth/login` instead of the new canonical `/login` route — not in Story 1.4 scope; should be fixed in a cleanup pass.
- `createServerClient` cookie removal handler — whether the Story 1.2 implementation correctly removes the session cookie on `signOut`; surfaced by the Acceptance Auditor but pre-existing.

## Deferred from: code review of 1-3-user-signup (2026-04-20)

- Password-mismatch check runs before length check — minor UX ordering; if both conditions apply, mismatch error shows first. Not a bug, just a preference question for a future pass.
- `window.location.origin` without env var fallback — works correctly for web deployment; using `NEXT_PUBLIC_SITE_URL` would be more conventional. Revisit before production launch.

## Deferred from: code review of 1-2-database-schema-and-supabase-configuration (2026-04-19)

- `updated_at` columns on profiles/projects/artifacts have no auto-update trigger — column default sets creation time only; application UPDATE statements must include it explicitly or the field goes stale.
- `artifacts` RLS EXISTS subquery has no covering index on `projects(id, user_id)` — latent performance issue at scale; only `projects_user_id_idx` exists, not a composite.
- Open redirect in `app/auth/confirm/route.ts` — `next` query param taken verbatim and passed to `redirect()`; attacker-crafted magic links can redirect victims off-domain after OTP verification. Pre-existing, not introduced by Story 1.2.
- Two divergent browser client factories — `lib/supabase/client.ts` (untouched per spec) and `lib/supabase/browser.ts` (new wrapper). Consumers of `client.ts` get an untyped client; unify with `Database` generic in Story 1.3+.
- Middleware auth guard in `lib/supabase/proxy.ts` uses opt-out logic (redirect if not in known public paths) — adding any new public route without updating the allowlist will block unauthenticated access. Pre-existing.
- `lib/supabase/browser.ts` has no SSR guard or `"use client"` directive — accidental import in a Server Component would throw at runtime. Low risk now; enforce via linting rule or directory convention later.

## Deferred from: code review of 1-1-project-initialization-and-design-token-foundation (2026-04-19)

- No security headers (CSP, X-Frame-Options, Referrer-Policy, etc.) at middleware layer — meaningful gap for a platform handling Stripe webhooks and API keys, but out of scope for Story 1.1. Revisit when middleware is extended in Story 1.6.
- `VERCEL_URL` used as `metadataBase` in `app/layout.tsx` — preview deployments get OG/canonical URLs pointing to the preview domain, which can pollute SEO metadata if staging environments are indexed. Low priority; revisit before production launch.

## Deferred from: code review of 1-6-last-active-tracking-in-auth-middleware (2026-04-22)

- Write amplification: `last_active_at` upsert fires on every authenticated middleware invocation, including prefetch requests and `_next/data` fetches. No debounce or minimum-interval check. Spec explicitly accepts this at V1 scale (0–500 concurrent users); revisit before scaling.
- `PasswordResetMessage` `message` param is user-controlled — any URL with `?message=password-reset` shows the confirmation banner without a real reset having occurred. Pre-existing behavior; consider a server-side flash mechanism or signed token before launch.
- `.claude/settings.local.json` overly broad permissions: `Read(//dev/**)` (device files), `Read(//private/tmp/**)` (system temp, may contain credentials), and bare `Bash(git commit *)` (allows --amend, --no-verify). Tighten before sharing this config with other developers.
