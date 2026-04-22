# Story 1.5: Password Reset

Status: review

## Story

As a **registered user**,
I want to request a password reset email and set a new password via a secure link,
So that I can regain access to my account if I forget my password.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1 — Create canonical `/forgot-password` page
  - [x] 1.1 Create `app/(marketing)/forgot-password/page.tsx` — imports `ForgotPasswordForm`, metadata: `title: 'Forgot password — Midgard'`, `description: 'Request a password reset link.'`; `bg-mg-background` wrapper matching login/signup pages
  - [x] 1.2 Verify `/forgot-password` is already in the middleware allowlist in `lib/supabase/proxy.ts` — it was added in Story 1.4. No change needed if present.

- [x] Task 2 — Update `ForgotPasswordForm`
  - [x] 2.1 Replace `import { createClient }` with `import { createBrowserClient }` from `@/lib/supabase/browser`
  - [x] 2.2 Change `redirectTo` in `resetPasswordForEmail` to: `` `${window.location.origin}/auth/confirm?next=/auth/reset-password` ``
  - [x] 2.3 Replace try/catch throw pattern with `if (error)` destructure pattern (matches established codebase style from Stories 1.3/1.4)
  - [x] 2.4 Success state: always show "Check your email for a reset link." regardless of whether email exists — do NOT surface `error.message` (no user enumeration)
  - [x] 2.5 Add double-submit guard at top of handler: `if (isLoading) return`
  - [x] 2.6 Trim email before submission: `email.trim()`
  - [x] 2.7 Apply Midgard design tokens (Card: `bg-mg-surface border border-mg-border`, Label: `text-mg-foreground-muted`, Input: `border-mg-border focus:border-mg-accent`, Error: `text-mg-destructive text-sm`, Button: `bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide`)
  - [x] 2.8 Update "Already have an account?" / back link to `href="/login"` (canonical URL — NOT `/auth/login`)
  - [x] 2.9 Remove `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` imports if switching to match the exact same component structure — OR keep Card if the existing structure maps cleanly to Midgard tokens

- [x] Task 3 — Update `app/auth/confirm/route.ts` for expired recovery redirects
  - [x] 3.1 Import `type` from searchParams — already done; no change to OTP verification logic
  - [x] 3.2 Add a conditional: if `type === 'recovery'` and verification fails, redirect to `/auth/reset-password?error=expired` instead of `/auth/error`
  - [x] 3.3 All other OTP types (e.g., `signup`, `invite`) continue to redirect to `/auth/error` on failure — no change to their behavior

- [x] Task 4 — Create canonical `/auth/reset-password` page
  - [x] 4.1 Create `app/auth/reset-password/page.tsx` — this lives in flat `app/auth/` (not `(app)/`) since the `(app)/` route group does not yet exist; middleware allows `/auth/*` paths through already
  - [x] 4.2 Page imports `UpdatePasswordForm` and renders it with `bg-mg-background` wrapper matching other auth pages
  - [x] 4.3 Page passes `searchParams` to the form component so `UpdatePasswordForm` can read `?error=expired`

- [x] Task 5 — Update `UpdatePasswordForm`
  - [x] 5.1 Accept a `searchParams` prop: `{ error?: string }` — read to detect expired link state on mount
  - [x] 5.2 Replace `import { createClient }` with `import { createBrowserClient }` from `@/lib/supabase/browser`
  - [x] 5.3 Add a `confirmPassword` field alongside the existing `password` field — validate they match client-side before calling `updateUser`; error: "Passwords do not match."
  - [x] 5.4 Add password length validation: min 8 characters; error: "Password must be at least 8 characters."
  - [x] 5.5 Replace try/catch throw pattern with `if (error)` destructure pattern
  - [x] 5.6 On success: `router.push('/login?message=password-reset')` — NOT `/protected`
  - [x] 5.7 Add expired state: if `searchParams?.error === 'expired'` set initial error state to "This reset link has expired. Request a new one." with a `<Link href="/forgot-password">` inline link; form fields still render
  - [x] 5.8 Apply Midgard design tokens (same token set as `sign-up-form.tsx` / `login-form.tsx`)
  - [x] 5.9 Add double-submit guard: `if (isLoading) return`

- [x] Task 6 — Update login page to display password reset success message
  - [x] 6.1 Update `app/(marketing)/login/page.tsx` to be an async Server Component that reads `searchParams`
  - [x] 6.2 Accept `searchParams: Promise<{ message?: string }>` (Next.js 15 async searchParams API — `await` it)
  - [x] 6.3 If `message === 'password-reset'`, render an inline success message above `LoginForm`: "Your password has been reset. Log in with your new password."

- [x] Task 7 — Final validation
  - [x] 7.1 `pnpm tsc --noEmit` — zero errors
  - [x] 7.2 `pnpm lint` — zero errors
  - [ ] 7.3 `pnpm dev` — verify `/forgot-password` renders with Midgard tokens
  - [ ] 7.4 Happy path: enter email → success state shows "Check your email for a reset link." — same message regardless of whether email is registered
  - [ ] 7.5 Verify link from `login-form.tsx` (`href="/forgot-password"`) navigates correctly
  - [ ] 7.6 Expired link simulation: navigate to `/auth/reset-password?error=expired` — verify error message and link back to `/forgot-password`
  - [ ] 7.7 Reset-password form renders with both password fields and Midgard tokens
  - [ ] 7.8 Login page at `/login?message=password-reset` shows success message

## Dev Notes

### CRITICAL: Flat Structure — No `src/`

All paths are root-relative. Architecture references `src/` prefix — drop it:
- `app/(marketing)/forgot-password/` not `src/app/(marketing)/forgot-password/`
- `components/forgot-password-form.tsx` not `src/components/forgot-password-form.tsx`
- Import alias `@/*` maps to the **project root**

### Supabase Client Pattern — Use `createBrowserClient`

The project-context.md says "Client Components → `@/lib/supabase/client`" — this is stale. The established pattern from Stories 1.3 and 1.4 is:
```ts
// CORRECT — project browser client (typed, established pattern)
import { createBrowserClient } from "@/lib/supabase/browser";

// WRONG — shadcn internal client (untyped, do not use)
import { createClient } from "@/lib/supabase/client";
```
Both `forgot-password-form.tsx` and `update-password-form.tsx` currently use `createClient` — this must be updated.

### Password Reset Supabase Flow

Supabase OTP-based reset flow (what the starter uses via `app/auth/confirm/route.ts`):

```
1. ForgotPasswordForm calls:
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
   })

2. Supabase sends email with link:
   /auth/confirm?token_hash=<hash>&type=recovery&next=/auth/reset-password

3. User clicks link → confirm route verifyOtp({ type: 'recovery', token_hash })
   - Success: redirect('/auth/reset-password')  ← user now has session
   - Failure: redirect('/auth/reset-password?error=expired')  ← Task 3 change

4. User on /auth/reset-password calls:
   supabase.auth.updateUser({ password: newPassword })  ← requires active session

5. Success → router.push('/login?message=password-reset')
```

The `resetPasswordForEmail` call should NOT pass `redirectTo` pointing directly to `/auth/reset-password` — it must point to `/auth/confirm` so the OTP is verified server-side first. Only after verification does the confirm handler redirect to the reset form.

### `app/auth/confirm/route.ts` — Minimal Change Required

Only change needed: redirect expired recovery tokens to the reset page instead of the error page:

```ts
// BEFORE (all failures go to /auth/error)
if (!error) {
  redirect(next);
} else {
  redirect(`/auth/error?error=${error?.message}`);
}

// AFTER (recovery failures get specific redirect)
if (!error) {
  redirect(next);
} else {
  if (type === 'recovery') {
    redirect('/auth/reset-password?error=expired');
  }
  redirect(`/auth/error?error=${error?.message}`);
}
```

No change to the OTP verification logic or other types.

### `app/(marketing)/forgot-password/page.tsx` Pattern

Mirror the login page exactly:

```tsx
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — Midgard",
  description: "Request a password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
```

Note: The old `app/auth/forgot-password/page.tsx` should be left in place — same approach as Story 1.4 which left `/auth/login` untouched. The canonical URL becomes `/forgot-password`.

### `ForgotPasswordForm` — No User Enumeration

Always transition to success state regardless of error. Do NOT show `error.message` — this would confirm whether an email is registered:

```ts
const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
});

setIsLoading(false);

// Always show success — never confirm if email exists
setSuccess(true);
```

The `error` return is intentionally ignored for user-facing output. Supabase does not send an email for unregistered addresses but the UI must not reveal this (NFR-SEC-4 spirit, no user enumeration).

### `app/auth/reset-password/page.tsx` — Async searchParams (Next.js 15)

Next.js 15 made `searchParams` an async prop. Use `await`:

```tsx
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm error={params.error} />
      </div>
    </div>
  );
}
```

### `UpdatePasswordForm` — Expired State

If `error === 'expired'`, show the expired message immediately on mount, before any user interaction. The form fields should still render — a user who arrives with a stale link but has an active session from another tab can still use the form. The expired message is a warning, not a block.

```tsx
const [formError, setFormError] = useState<string | null>(
  error === 'expired' ? 'This reset link has expired.' : null
);
```

For the "Request a new one." link inline: use Next.js `<Link href="/forgot-password">` with `underline underline-offset-4 text-mg-foreground-muted` styling.

### Login Page — Async `searchParams` (Next.js 15)

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        {params.message === 'password-reset' && (
          <p className="mb-4 text-sm text-center text-mg-foreground-muted">
            Your password has been reset. Log in with your new password.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
```

The success message sits above the `LoginForm` card, not inside it. No toast, no `AttentionRegion` — plain text is sufficient for a post-redirect success confirmation (UX-DR20 reserves `AttentionRegion` for inline feedback, not cross-page confirmations).

### Design Tokens Reference

| Element | Tailwind class |
|---|---|
| Page background | `bg-mg-background` |
| Card/form container | `bg-mg-surface border border-mg-border` |
| Input border | `border-mg-border focus:border-mg-accent` |
| Label text | `text-mg-foreground-muted` |
| Error text | `text-mg-destructive text-sm` |
| Success / muted text | `text-mg-foreground-muted text-sm` |
| Primary submit button | `bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide` |
| Back/secondary links | `underline underline-offset-4 text-mg-foreground-muted` |
| Card title | `text-2xl text-mg-foreground font-sans` |

### Existing Starter Files — Do NOT Delete

Leave these untouched:
```
app/auth/forgot-password/page.tsx   ← old starter route, leave in place
app/auth/update-password/page.tsx   ← old starter route, leave in place
```
This story creates the canonical `/forgot-password` and `/auth/reset-password` URLs. Old routes coexist.

### `middleware.ts` / `proxy.ts` — No Change Needed

`/forgot-password` was added to the middleware allowlist in Story 1.4:
```ts
!request.nextUrl.pathname.startsWith("/forgot-password") &&
```
`/auth/*` paths are already allowed through (the allowlist check uses `startsWith("/auth")`).
No changes to `lib/supabase/proxy.ts` are required for this story.

### Previous Story Learnings (from Story 1.4)

- `createServerClient` is async — always `await` it in Server Actions
- `redirect()` from `next/navigation` can be used in Server Actions/route handlers — no `ActionResult<T>` needed for redirect-only paths
- Double-submit guard `if (isLoading) return` must be at the TOP of the event handler, before any state updates
- `router.refresh()` before `router.push()` is only needed when the route destination reads session state synchronously (login → `/projects`). For password reset → `/login`, `router.push('/login?message=password-reset')` without `refresh()` is fine — the login page is stateless
- `"use server"` directive must be the FIRST line of any server action file (before imports)
- `"use client"` directive must be the FIRST line of any client component file

### Architecture Cross-References

- Architecture § Authentication & Security: "Password reset: Time-limited link via Supabase Auth (1-hour expiry, FR28). Sessions invalidated on explicit logout." — NFR-SEC-4
- Architecture § API Patterns: Server Actions for user-initiated ops; `resetPasswordForEmail` is client-side Supabase call (browser SDK, not Server Action) because it only triggers an email send with no data mutation on our side
- Architecture § Route Protection: middleware allows `/auth/*` and `/forgot-password` through — no new allowlist entries needed
- Epics § FR27, FR28: "User can request password reset via email" and "User can reset password using time-limited link"

### Project Structure Notes

- Alignment: `app/(marketing)/forgot-password/page.tsx` follows established `(marketing)/` route group pattern
- `app/auth/reset-password/page.tsx` is flat `app/auth/` for now; architecture shows eventual `app/(app)/auth/reset-password/page.tsx` but `(app)/` route group is not yet created — will be created in Epic 3
- `components/forgot-password-form.tsx` and `components/update-password-form.tsx` are flat `components/` — not workspace components (those go in `components/workspace/`)

### References

- [Source: epics.md#Story 1.5] — Acceptance Criteria, FR27, FR28
- [Source: architecture.md#Authentication & Security] — Password reset time-limited link, session invalidation
- [Source: architecture.md#Implementation Patterns] — NFR-SEC-4, no user enumeration
- [Source: 1-4-user-login-and-logout.md#Dev Notes] — createBrowserClient pattern, design tokens, proxy.ts allowlist
- [Source: lib/supabase/proxy.ts] — middleware allowlist (current state with /forgot-password already present)
- [Source: app/auth/confirm/route.ts] — OTP verification handler, existing redirect behavior

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `forgot-password-form.tsx`: intentionally discards `resetPasswordForEmail` return value (no user enumeration); lint caught unused `_error` destructure — fixed by not destructuring at all

### Completion Notes List

- Created `app/(marketing)/forgot-password/page.tsx` — canonical `/forgot-password` route with Midgard design tokens and metadata, mirrors login/signup page structure
- Updated `components/forgot-password-form.tsx` — replaced `createClient` with `createBrowserClient`, changed `redirectTo` to route through `/auth/confirm?next=/auth/reset-password`, always shows success state regardless of error (no user enumeration), applied Midgard tokens, fixed back link to `/login`
- Updated `app/auth/confirm/route.ts` — expired/invalid recovery tokens now redirect to `/auth/reset-password?error=expired` instead of `/auth/error`; all other OTP type failures unchanged
- Created `app/auth/reset-password/page.tsx` — canonical reset-password page in flat `app/auth/` (not `(app)/` — doesn't exist yet); async Server Component reading Next.js 15 searchParams; passes `error` prop to `UpdatePasswordForm`
- Updated `components/update-password-form.tsx` — replaced `createClient` with `createBrowserClient`, added confirm password field, password length validation (min 8 chars), expired link state from prop (shows "This reset link has expired." with inline link to `/forgot-password`), success redirects to `/login?message=password-reset`, applied Midgard tokens, double-submit guard
- Updated `app/(marketing)/login/page.tsx` — converted to async Server Component, reads Next.js 15 async searchParams, shows success message "Your password has been reset. Log in with your new password." when `?message=password-reset` is present

### File List

- `app/(marketing)/forgot-password/page.tsx` — new
- `app/auth/reset-password/page.tsx` — new
- `components/forgot-password-form.tsx` — modified
- `components/update-password-form.tsx` — modified
- `app/auth/confirm/route.ts` — modified
- `app/(marketing)/login/page.tsx` — modified

## Review Findings

### Decision Needed
_All resolved._

### Patches
- [x] [Review][Patch] No session guard on `/auth/reset-password` — add client-side `getSession()` check on mount; render "Invalid or missing reset link" with disabled form if no session [app/auth/reset-password/page.tsx or components/update-password-form.tsx]
- [x] [Review][Patch] `resetPasswordForEmail` result silently discarded — network failure produces false "Check your email" success state [components/forgot-password-form.tsx]
- [x] [Review][Patch] `password.trim()` used for length validation but raw untrimmed value sent to Supabase — user can set a password with invisible leading/trailing spaces they cannot reproduce at login [components/update-password-form.tsx]
- [x] [Review][Patch] `setFormError(null)` unconditionally clears expired-link warning at top of submit handler — `/forgot-password` back-link is lost on first submit attempt [components/update-password-form.tsx]
- [x] [Review][Patch] `updateUser` failure message "Please request a new reset link" is misleading for transient network errors where a retry would succeed [components/update-password-form.tsx]
- [x] [Review][Patch] `router.push` after success allows back-navigation to the already-used reset form — use `router.replace` instead [components/update-password-form.tsx]

### Deferred
- [x] [Review][Defer] `error.message` appended raw to `/auth/error` redirect URL for non-recovery OTP failures [app/auth/confirm/route.ts] — deferred, pre-existing
- [x] [Review][Defer] Open redirect via unvalidated `next` query param in confirm route [app/auth/confirm/route.ts] — deferred, pre-existing (also in deferred-work.md from Stories 1.2 and 1.4)
- [x] [Review][Defer] `initialError` prop only evaluated at `useState` initializer — prop changes after mount won't update displayed error [components/update-password-form.tsx] — deferred, pre-existing React pattern; matches spec's "detect on mount" requirement
- [x] [Review][Defer] `/login?message=password-reset` banner injectable via crafted URL [app/(marketing)/login/page.tsx] — deferred, by design per spec; no security impact
- [x] [Review][Defer] Route group placement inconsistency — forgot-password in `(marketing)`, reset-password in flat `app/auth/` — deferred, intentional per spec
- [x] [Review][Defer] No fallback redirect when `token_hash`/`type` absent from confirm route [app/auth/confirm/route.ts] — deferred, pre-existing fallthrough

## Change Log

- 2026-04-21: Story 1.5 implemented — canonical forgot-password and reset-password pages, form components updated with correct Supabase client, design tokens, security fixes (no user enumeration), expired link handling, login success message
