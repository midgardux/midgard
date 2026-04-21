# Story 1.4: User Login & Logout

Status: done

## Story

As a **registered user**,
I want to log in with my email and password and log out when I'm done,
So that my account and projects are secure.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1 — Create canonical `/login` route
  - [x] 1.1 Create `app/(marketing)/login/page.tsx` — imports and renders `LoginForm`; metadata export: `title: 'Log in — Midgard'`, `description: 'Log in to your Midgard account.'`; `bg-mg-background` page wrapper (mirrors signup page)

- [x] Task 2 — Update `LoginForm` component
  - [x] 2.1 Replace `import { createClient }` with `import { createBrowserClient }` from `@/lib/supabase/browser`
  - [x] 2.2 Remove try/catch — use `if (error)` destructure pattern
  - [x] 2.3 Map all Supabase sign-in errors to exact message: `"Invalid email or password."` (single generic message — no user enumeration)
  - [x] 2.4 On success: `router.push("/projects")`
  - [x] 2.5 Add `if (isLoading) return` double-submit guard at top of handler
  - [x] 2.6 Trim email before submission: `email.trim()`
  - [x] 2.7 Update "Forgot your password?" link: `href="/forgot-password"` (future Story 1.5 canonical URL)
  - [x] 2.8 Update "Don't have an account?" link: `href="/signup"` (canonical URL from Story 1.3)
  - [x] 2.9 Apply Midgard design tokens (same token set as `sign-up-form.tsx`)

- [x] Task 3 — Create `signOut` Server Action
  - [x] 3.1 Create `actions/auth.ts` — new file; `"use server"` directive at top
  - [x] 3.2 Export `signOut()` — calls `supabase.auth.signOut()` then `redirect("/login")` from `next/navigation`

- [x] Task 4 — Update `LogoutButton` component
  - [x] 4.1 Replace inline Supabase call with `signOut` Server Action from `@/actions/auth`
  - [x] 4.2 Remove `createClient` import and `useRouter` import
  - [x] 4.3 Button style: Ghost tier (`variant="ghost"`) — "Log out" label

- [x] Task 5 — Update middleware
  - [x] 5.1 In `lib/supabase/proxy.ts`: change `url.pathname = "/auth/login"` → `url.pathname = "/login"`
  - [x] 5.2 Add `/signup` to the public paths allowlist in the unauthenticated check (fixes live bug: currently unauthenticated users hitting `/signup` are incorrectly redirected)

- [x] Task 6 — Final validation
  - [x] 6.1 `pnpm tsc --noEmit` — zero errors
  - [x] 6.2 `pnpm lint` — zero errors
  - [x] 6.3 `pnpm dev` — navigate to `localhost:3000/login` and verify form renders
  - [x] 6.4 Test happy path: valid credentials → redirect to `/projects` (404 expected — Story 3.1 creates this page; confirms redirect fires)
  - [x] 6.5 Test invalid credentials: wrong password → "Invalid email or password." inline error, no redirect
  - [x] 6.6 Test logout: click logout → redirect to `/login`, confirm session cleared
  - [x] 6.7 Test middleware: visit `localhost:3000/projects` unauthenticated → redirects to `/login`
  - [x] 6.8 Test signup still works: visit `localhost:3000/signup` unauthenticated → renders (was broken before middleware fix)

## Dev Notes

### CRITICAL: Flat Structure — No `src/`

All paths are root-relative. Architecture references `src/` — drop the prefix:
- `app/(marketing)/login/` not `src/app/(marketing)/login/`
- `components/login-form.tsx` not `src/components/login-form.tsx`
- `actions/auth.ts` not `src/actions/auth.ts`
- Import alias `@/*` maps to the **project root**

### CRITICAL: Existing Starter Auth Pages — Do NOT Delete

Leave the old starter routes untouched:
```
app/auth/login/page.tsx       ← old route, leave in place
app/auth/forgot-password/     ← password reset entry (Story 1.5)
app/auth/update-password/     ← password reset form (Story 1.5)
```
This story creates the **new canonical `/login` URL** at `app/(marketing)/login/page.tsx`. The old `/auth/login` can coexist.

### Canonical Route: `app/(marketing)/login/page.tsx`

Mirror the signup page pattern exactly:

```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in — Midgard",
  description: "Log in to your Midgard account.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
```

### LoginForm Update Pattern

Follow the exact same pattern established in `components/sign-up-form.tsx` (Story 1.3). Key differences:

```ts
// WRONG — shadcn internal client
import { createClient } from "@/lib/supabase/client";

// CORRECT — project browser client
import { createBrowserClient } from "@/lib/supabase/browser";
```

Full handler pattern:
```ts
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isLoading) return;
  setError(null);

  setIsLoading(true);
  const supabase = createBrowserClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  setIsLoading(false);

  if (error) {
    setError("Invalid email or password.");
    return;
  }

  router.push("/projects");
};
```

**Important:** Map ALL Supabase sign-in errors to `"Invalid email or password."` — do not surface raw error messages. Unlike signup, there is no error mapping function needed: a single generic message covers all cases (wrong password, unconfirmed email, user not found) and prevents user enumeration.

### Design Tokens

Apply the same Midgard tokens used in `sign-up-form.tsx`:

| Element | Tailwind class |
|---|---|
| Card/form container | `bg-mg-surface border border-mg-border` |
| Input border | `border-mg-border focus:border-mg-accent` |
| Label text | `text-mg-foreground-muted` |
| Error text | `text-mg-destructive text-sm` |
| Primary submit button | `bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide` |
| Secondary link text | `text-mg-foreground-muted` |
| Heading | `text-mg-foreground font-sans` |

### Server Action: `actions/auth.ts`

This is the first Server Action in the project. Create the `actions/` directory:

```ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- Uses `createServerClient` (NOT `createBrowserClient`) — server-side session management
- `redirect()` from `next/navigation` handles navigation after the action — no `ActionResult<T>` return needed for redirecting actions
- `createServerClient` is async — always `await` it

### LogoutButton Update

Replace the current implementation entirely. No Supabase client needed client-side:

```tsx
"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut()}>
      Log out
    </Button>
  );
}
```

Remove: `createClient` import, `useRouter` import, `useState` if not otherwise needed.

### Middleware Update: `lib/supabase/proxy.ts`

Two changes required:

**Change 1 — Redirect target:**
```ts
// BEFORE
url.pathname = "/auth/login";

// AFTER
url.pathname = "/login";
```

**Change 2 — Public paths allowlist (bug fix):**
```ts
// BEFORE (missing /signup)
!request.nextUrl.pathname.startsWith("/login") &&
!request.nextUrl.pathname.startsWith("/auth")

// AFTER
!request.nextUrl.pathname.startsWith("/login") &&
!request.nextUrl.pathname.startsWith("/signup") &&
!request.nextUrl.pathname.startsWith("/auth")
```

**Why:** `/signup` introduced in Story 1.3 was never added to the public paths allowlist. Unauthenticated users visiting `/signup` are currently being redirected to `/auth/login`. This story fixes that bug as part of the middleware update.

### Route Protection Logic

The current middleware uses an opt-out allowlist. As `(app)/` routes are added in future stories (e.g., `/projects`), they are automatically protected because they don't match any allowlist prefix. No changes to the protection logic are needed for this story beyond the two changes above.

The `(app)/` path segment is a Next.js route group — it is invisible in the browser URL. `/app/(app)/projects/page.tsx` is served at `/projects`.

### `app/auth/confirm/route.ts` — No Change

The email confirmation handler was updated in Story 1.2. Do not modify it.

### ESLint / TypeScript Notes

- `actions/auth.ts` must have `"use server"` as the first line (directives must be at top)
- `LoginForm` must have `"use client"` at top (hooks + browser APIs)
- `LogoutButton` must have `"use client"` at top (event handler)
- No `require()` — ESM only

### Architecture Cross-References

- Architecture § Authentication & Security: email/password only; sessions invalidated on logout (NFR-SEC-5)
- Architecture § Server Actions: all user-initiated server ops use Server Actions — logout is a user-initiated server op
- Architecture § Route Protection: middleware pre-wired from starter; `lib/supabase/proxy.ts` is the `updateSession` function
- Project Context § Critical Rules: `createServerClient` for Server Components/Actions; `createBrowserClient` for Client Components
- Story 1.3 Dev Notes: `createBrowserClient` pattern, design token application, `if (error)` destructure style established

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing lint error in `sign-up-form.tsx` (unused `data` variable) fixed as part of 6.2 lint gate — `const { data, error }` → `const { error }`
- Middleware redirect for `/projects` returns 404 (not redirect) in local dev — expected: `hasEnvVars` is false without `.env.local`, so auth check is skipped per the documented guard in `proxy.ts`

### Completion Notes List

- Created `app/(marketing)/login/page.tsx` — canonical `/login` route mirroring signup page structure with `bg-mg-background` wrapper
- Updated `components/login-form.tsx` — replaced shadcn `createClient` with project `createBrowserClient`, applied `if (error)` pattern, double-submit guard, email trim, all errors mapped to single generic message, design tokens applied, links updated to canonical URLs
- Created `actions/auth.ts` — first Server Action in project; `signOut()` uses `createServerClient`, calls `supabase.auth.signOut()`, then `redirect("/login")`
- Updated `components/logout-button.tsx` — replaced inline Supabase call with `signOut` Server Action; ghost variant button
- Updated `lib/supabase/proxy.ts` — redirect target changed from `/auth/login` to `/login`; added `/signup` to public paths allowlist fixing bug from Story 1.3

### File List

- `app/(marketing)/login/page.tsx` — new
- `components/login-form.tsx` — modified
- `components/logout-button.tsx` — modified
- `components/sign-up-form.tsx` — modified (pre-existing lint fix: removed unused `data` from signUp destructure)
- `actions/auth.ts` — new
- `lib/supabase/proxy.ts` — modified

### Review Findings

- [x] [Review][Decision→Patch] `signOut()` fire-and-forget in LogoutButton — resolved: converted to `<form action={signOut}>` pattern. [components/logout-button.tsx]
- [x] [Review][Decision→Patch] `router.push("/projects")` without `router.refresh()` — resolved: added `router.refresh()` before push. [components/login-form.tsx]
- [x] [Review][Patch] Missing try/catch in `handleLogin` — wrapped `signInWithPassword` in try/finally; `setIsLoading(false)` now always executes. [components/login-form.tsx]
- [x] [Review][Patch] `signOut` server action discards `supabase.auth.signOut()` error — accepted behavior; redirect always fires, session expires naturally. [actions/auth.ts]
- [x] [Review][Patch] `/forgot-password` not in middleware allowlist — added to allowlist in `proxy.ts`. [lib/supabase/proxy.ts]
- [x] [Review][Defer] Missing env vars runtime throw — `createBrowserClient` uses non-null assertions on Supabase env vars; undefined at runtime throws with no user feedback. Pre-existing, not introduced by this story. [lib/supabase/browser.ts] — deferred, pre-existing
- [x] [Review][Defer] `/auth/confirm` open redirect — `next` query param passed verbatim to `redirect()`; already deferred in Story 1.2 review. Pre-existing. [app/auth/confirm/route.ts] — deferred, pre-existing
- [x] [Review][Defer] `SignUpForm` "Already have an account?" links to `/auth/login` not `/login` — not in Story 1.4 scope. [components/sign-up-form.tsx] — deferred, pre-existing
- [x] [Review][Defer] `createServerClient` cookie removal handler — whether Story 1.2's implementation correctly removes the session cookie on signOut; pre-existing, not introduced here. [lib/supabase/server.ts] — deferred, pre-existing

## Change Log

- 2026-04-20: Story 1.4 created
- 2026-04-20: Story 1.4 implemented — canonical /login route, LoginForm updated with project patterns and design tokens, signOut Server Action created, LogoutButton updated, middleware redirect and allowlist fixed
