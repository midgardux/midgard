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
