# Story 1.6: Last Active Tracking in Auth Middleware

Status: done

## Story

As a **developer**,
I want every authenticated request to update the user's `last_active_at` timestamp,
So that the inactivity purge job (Story 7.3) has accurate data to determine which accounts are inactive.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1 — Update `lib/supabase/proxy.ts` to upsert `last_active_at` on authenticated app route requests
  - [x] 1.1 After the `getClaims()` call and the redirect block (do NOT insert code between `createServerClient` and `getClaims()` — see Supabase critical comment), define the public path exclusion list matching the existing redirect logic:
    ```typescript
    const pathname = request.nextUrl.pathname;
    const isPublicPath =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/auth');
    ```
  - [x] 1.2 When `user` is truthy and `user.sub` is defined and path is NOT public, upsert into `profiles`:
    ```typescript
    if (user?.sub && !isPublicPath) {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.sub,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (updateError) {
        console.error('[middleware] last_active_at update failed:', updateError.message);
      }
    }
    ```
  - [x] 1.3 Return `supabaseResponse` as before — no change to the response object or cookie handling

- [x] Task 2 — Validation
  - [x] 2.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 2.2 `pnpm lint` — zero ESLint errors
  - [x] 2.3 `pnpm dev` — server starts without errors, middleware does not crash
  - [x] 2.4 Manual: log in, navigate to `/projects` — check Supabase Dashboard → Table Editor → `profiles` → confirm `last_active_at` updated to current time
  - [x] 2.5 Manual: log out, attempt to access `/projects` directly — confirm redirect to `/login` and no profile row updated
  - [x] 2.6 Manual: while logged in, visit a public path (e.g., `/login`) — confirm `last_active_at` is NOT updated (public path exclusion working)

## Dev Notes

### Only One File to Change

The entire implementation is in `lib/supabase/proxy.ts` — the `updateSession` function. `middleware.ts` itself does not need any changes; it simply delegates to `updateSession`.

### Flat Directory — No `src/`

All paths are root-relative:
- `lib/supabase/proxy.ts` (not `src/lib/supabase/proxy.ts`)
- Import alias `@/*` maps to the project root

### Critical Supabase Constraint — No Code Between `createServerClient` and `getClaims()`

The existing comment in `proxy.ts` is load-bearing:
```
// Do not run code between createServerClient and
// supabase.auth.getClaims(). A simple mistake could make it very hard to debug
// issues with users being randomly logged out.
```
The `last_active_at` upsert must go **after** `getClaims()` returns and **after** the redirect block — never between these two calls.

### Placement Within `updateSession`

Add the upsert block in this order:
1. `createServerClient(...)` — already there
2. `supabase.auth.getClaims()` — already there
3. Redirect block for unauthenticated users — already there (returns early, so upsert never reached for unauthed requests)
4. **[NEW]** `last_active_at` upsert for authenticated app route requests
5. `return supabaseResponse` — already there

### `user.sub` — User ID from JWT Claims

`getClaims()` returns JWT payload claims. `user.sub` is the standard JWT subject field — it holds the Supabase auth UUID (same value as `auth.uid()` in RLS policies). This is the correct value for `profiles.id`.

Guard with `user?.sub` rather than just `user` because TypeScript types `sub` as `string | undefined`.

### Why Upsert, Not Update

The story spec explicitly requires upsert. In PostgreSQL, `INSERT ... ON CONFLICT DO UPDATE SET ...` only updates the specified columns when the row already exists. Providing `{ id, last_active_at, updated_at }` will:
- **If row exists** (99.99% of requests): update only `last_active_at` and `updated_at`; all other columns untouched
- **If row missing** (edge case — profile creation race): insert with defaults for all other columns

### Include `updated_at` in the Upsert

From Story 1.2 code review (deferred-work.md): "`updated_at` columns have no auto-update trigger — application UPDATE statements must include it explicitly or the field goes stale." Include `updated_at: new Date().toISOString()` alongside `last_active_at` to keep the column accurate.

### Public Path List — Keep in Sync with Existing Redirect Logic

The `isPublicPath` check must exactly match the allowlist used by the redirect block above it. Currently these are:
- `/` (exact match — root/landing)
- `/login*`
- `/signup*`
- `/forgot-password*`
- `/auth*`

When Epic 2 adds `/pricing` (Story 2.1), that path should be added to BOTH the redirect block AND this `isPublicPath` check. This is a known maintenance point flagged in deferred-work.md from Story 1.2.

### Security Headers — NOT in Scope

deferred-work.md from Story 1.1 flagged: "No security headers (CSP, X-Frame-Options, etc.) — revisit when middleware is extended in Story 1.6." These are NOT part of Story 1.6's acceptance criteria. If desired, address in a separate story before launch.

### Supabase Client in Middleware Context

The `supabase` client in `proxy.ts` is created with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key) + the request cookies. Because the user is authenticated (confirmed by `getClaims()`), the cookie-based session is active. The RLS policy on `profiles` allows `auth.uid() = id`, so the update will succeed for the authenticated user's own row.

This is NOT the service role key — it's the publishable key with RLS enforced. No bypassing of access controls.

### No Caching or Debouncing Required

The spec says "every authenticated request" — update on each request. At V1 scale (0–500 concurrent users), one DB call per app route request is acceptable. The Supabase client is already being used in the same middleware invocation for session management.

### Previous Story Learnings (from Stories 1.4/1.5)

- `createServerClient` is async — already awaited in proxy.ts; the `from('profiles').upsert()` call must also be `await`-ed
- Double-submit guard pattern (`if (isLoading) return`) does not apply here — this is server-side middleware
- Error handling: log with `console.error` and continue — never throw, never block response
- `"use server"` directive not needed in `proxy.ts` — it's not a Server Action file, it's a middleware utility

### Architecture Cross-References

- [Source: epics.md#Story 1.6] — Acceptance criteria and business context
- [Source: epics.md#Story 7.3] — Consumer of `last_active_at`: monthly job checks 11-month/12-month inactivity thresholds
- [Source: architecture.md#Authentication & Security] — Cookie-based SSR session, RLS enforces user data scoping
- [Source: architecture.md#Enforcement Guidelines] — "Check `error` from every Supabase query before using `data`"
- [Source: deferred-work.md — Story 1.2] — `updated_at` has no auto-trigger; must be set explicitly in UPDATE statements

### Project Structure Notes

- Only `lib/supabase/proxy.ts` is modified — no new files
- The `(app)/` route group does not yet exist in the filesystem (created in Epic 3); the `isPublicPath` exclusion approach correctly handles current route structure without depending on route group names

### References

- [Source: epics.md#Story 1.6] — User story, acceptance criteria
- [Source: lib/supabase/proxy.ts] — updateSession function being extended
- [Source: middleware.ts] — Thin wrapper; no changes needed here
- [Source: architecture.md#Implementation Patterns & Consistency Rules] — Supabase query patterns, error handling shape
- [Source: deferred-work.md#Story 1.2] — updated_at trigger gap, public path allowlist maintenance note
- [Source: project-context.md] — Technology stack, critical implementation rules, flat directory structure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward. No TypeScript errors, no lint errors.

### Completion Notes List

- Refactored the redirect condition in `proxy.ts` to use a shared `isPublicPath` boolean, eliminating duplicate pathname checks between the redirect block and the new upsert block. Logic is identical to the original — no behavioral change to redirect behavior.
- Added `last_active_at` + `updated_at` upsert after the redirect block. Both timestamps set to the same `now` ISO string per request to keep columns in sync (no auto-update trigger exists per deferred-work.md from Story 1.2).
- Guarded with `user?.sub` rather than `user` alone — `sub` is typed `string | undefined` in JWT claims even when claims are present.
- No test framework is configured (project-context.md: "No test framework configured yet — added in a future story"). Manual validation steps 2.3–2.6 must be completed by the developer before code review.
- Tasks 2.3–2.6 are manual validations requiring a running dev server and Supabase Dashboard access; marked pending for developer to complete.

### File List

- `lib/supabase/proxy.ts` — modified

### Review Findings

- [x] [Review][Decision] Out-of-scope files bundled in diff — `app/(marketing)/login/page.tsx` and `app/auth/confirm/route.ts` are modified but not in this story's scope; accepted into story 1.6
- [x] [Review][Patch] Open redirect: `next` param unvalidated in PKCE and OTP flows [app/auth/confirm/route.ts] — fixed via `safeNext()` helper
- [x] [Review][Patch] PKCE `exchangeCodeForSession` exception not caught — unhandled throw falls through to misleading "No token hash or type" error [app/auth/confirm/route.ts] — fixed with try/catch
- [x] [Review][Patch] Error message not URL-encoded in redirect URL — malformed URL on special chars, internal details exposed in browser history [app/auth/confirm/route.ts] — fixed with `encodeURIComponent`
- [x] [Review][Patch] `upsert` missing explicit `onConflict: 'id'` — behavior depends on Supabase default; fragile if table constraints change [lib/supabase/proxy.ts] — fixed
- [x] [Review][Defer] Write amplification: upsert fires on every authenticated request including prefetches — deferred, spec explicitly permits at V1 scale (0–500 users) [lib/supabase/proxy.ts]
- [x] [Review][Defer] `PasswordResetMessage` `message` param is user-controlled (spoofable via URL) — deferred, pre-existing behavior not introduced by this story [app/(marketing)/login/page.tsx]
- [x] [Review][Defer] `settings.local.json` overly broad permissions (`//dev/**`, `//private/tmp/**`, bare `git commit *`) — deferred, local tooling config, not production code [.claude/settings.local.json]

## Change Log

- 2026-04-22: Story 1.6 implemented — `last_active_at` + `updated_at` upsert added to `updateSession` in `proxy.ts`; public path logic consolidated into shared `isPublicPath` boolean
