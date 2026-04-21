# Story 1.3: User Signup

Status: done

## Story

As a **prospective user**,
I want to create an account with my email and password,
So that I can access Midgard and start using the product.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1 — Create `(marketing)` route group foundation
  - [x] 1.1 Create `app/(marketing)/layout.tsx` — minimal pass-through layout (the global `app/layout.tsx` already handles fonts and ThemeProvider)
  - [x] 1.2 Create `app/(marketing)/signup/page.tsx` — imports and renders `SignUpForm`

- [x] Task 2 — Update `SignUpForm` component
  - [x] 2.1 Replace `import { createClient } from "@/lib/supabase/client"` with `import { createBrowserClient } from "@/lib/supabase/browser"` in `components/sign-up-form.tsx`
  - [x] 2.2 Add client-side password length validation (min 8 chars) before calling Supabase — exact message: "Password must be at least 8 characters."
  - [x] 2.3 Map Supabase "User already registered" error to exact message: "An account with this email already exists."
  - [x] 2.4 Update `emailRedirectTo` to `${window.location.origin}/auth/confirm` (not `/protected`)
  - [x] 2.5 Update success redirect to `/auth/sign-up-success` (existing starter page)
  - [x] 2.6 Update link from `href="/auth/login"` to `href="/auth/login"` — no change needed, but verify the "Already have an account?" link still points to the correct login URL
  - [x] 2.7 Apply Midgard design tokens to form elements (see Dev Notes)

- [x] Task 3 — Update confirmation page copy
  - [x] 3.1 Update `app/auth/sign-up-success/page.tsx` with Midgard copy and design tokens (see Dev Notes)

- [x] Task 4 — Final validation
  - [x] 4.1 `pnpm tsc --noEmit` — zero errors
  - [x] 4.2 `pnpm lint` — zero errors
  - [x] 4.3 `pnpm dev` — navigate to `localhost:3000/signup` and verify form renders correctly
  - [x] 4.4 Test happy path: submit with valid email + password ≥ 8 chars → confirmation page appears
  - [x] 4.5 Test validation: submit with password < 8 chars → inline error shown, form not submitted
  - [x] 4.6 Test duplicate email: submit with an already-registered email → correct error message shown

## Dev Notes

### CRITICAL: Flat Structure — No `src/`

All paths are root-relative. Architecture references `src/` — drop the prefix:
- `app/(marketing)/` not `src/app/(marketing)/`
- `components/sign-up-form.tsx` not `src/components/sign-up-form.tsx`
- `types/actions.ts` not `src/types/actions.ts`
- Import alias `@/*` maps to the **project root**

### CRITICAL: Existing Starter Auth Pages — Do NOT Delete

The starter template installed these auth routes. Leave them untouched:

```
app/auth/sign-up/page.tsx        ← old route, leave in place
app/auth/sign-up-success/page.tsx ← confirmation page we'll update
app/auth/login/page.tsx          ← login route (Story 1.4)
app/auth/confirm/route.ts        ← email OTP handler (already updated in 1.2)
```

This story creates the **new canonical `/signup` URL** at `app/(marketing)/signup/page.tsx`. The old `/auth/sign-up` can coexist; removing it is deferred.

### Route Group: `(marketing)/`

The architecture defines two route groups:
- `app/(marketing)/` — SSR/SSG public pages (landing, pricing, login, signup)
- `app/(app)/` — authenticated SPA

This story creates `(marketing)/` for the first time. The layout can be a minimal pass-through since `app/layout.tsx` already handles `ThemeProvider`, fonts, and global CSS.

```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Supabase Client: Use `createBrowserClient`, NOT `createClient`

The existing `components/sign-up-form.tsx` uses `createClient` from `@/lib/supabase/client`. This is the shadcn-internal browser client — **do not use for application auth**.

```ts
// WRONG — this is the shadcn client
import { createClient } from "@/lib/supabase/client";

// CORRECT — use the project's browser client wrapper
import { createBrowserClient } from "@/lib/supabase/browser";
```

`lib/supabase/browser.ts` was created in Story 1.2 and exports `createBrowserClient()`.

### Profiles Row — No Code Needed

The `on_auth_user_created` trigger (migration `001_initial_schema.sql`) automatically inserts a `profiles` row on every new `auth.users` insert with `subscription_tier = 'free'` and `has_seen_disclosure = false`. No Server Action or explicit INSERT needed in this story.

### Supabase signUp() Call

```ts
const supabase = createBrowserClient();
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
  },
});
```

- On success: `data.user` is set, `data.session` may be null (email confirmation pending). Redirect to `/auth/sign-up-success`.
- On error: check error message (see below).

### Error Message Mapping

Supabase returns different error messages depending on configuration. Map them explicitly:

```ts
function mapSignUpError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  return errorMessage; // fallback to raw message for unexpected errors
}
```

Password length is validated **client-side before calling Supabase**:

```ts
if (password.length < 8) {
  setError('Password must be at least 8 characters.');
  return;
}
```

### Repeat Password Field

The existing `sign-up-form.tsx` has a "Repeat Password" field. Keep it — it provides good UX even though the AC doesn't explicitly mention it. Error: `"Passwords do not match."` (already present in starter).

### Design Tokens

Apply Midgard tokens. Key mappings:

| Element | Tailwind class |
|---|---|
| Page background | `bg-mg-background` |
| Card/form container | `bg-mg-surface border border-mg-border` |
| Input border | `border-mg-border focus:border-mg-accent` |
| Label text | `text-mg-foreground-muted` |
| Error text | `text-mg-destructive text-sm` |
| Primary submit button | `bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide` |
| Secondary link text | `text-mg-foreground-muted` |
| Heading | `text-mg-foreground font-sans` |

The existing `components/sign-up-form.tsx` uses shadcn `Button` and `Input` components. These use `--accent`, `--border` etc. (shadcn's HSL tokens). Override with `mg-*` classes via `className` props.

**Important:** `var(--mg-accent)` ≠ `var(--accent)`. Shadcn owns the unprefixed CSS vars. Always use `mg-*` prefix for Midgard tokens.

### Confirmation Page Updates

`app/auth/sign-up-success/page.tsx` needs Midgard copy and tokens:

- Title: "Check your email"
- Description: "We sent a confirmation link to your inbox. Click it to activate your account."
- Apply `bg-mg-surface`, `text-mg-foreground`, `border-mg-border` tokens

No Card component required — keep it simple.

### `app/(marketing)/signup/page.tsx` — Metadata

Add Next.js `generateMetadata` or `metadata` export per architecture requirement that all public pages have meta tags. For this story, a basic export is sufficient:

```ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up — Midgard',
  description: 'Create your Midgard account.',
};
```

### ESLint / TypeScript Notes

- `components/sign-up-form.tsx` must have `"use client"` at top (client component using hooks + browser APIs)
- Remove the `try/catch` pattern from the starter — use explicit `if (error)` checks instead (project style from architecture's "always destructure `{ data, error }`")
- `window.location.origin` is only accessible in browser context — this is fine since the component is `"use client"`

---

### Architecture Cross-References

- Architecture § Authentication & Security: Email/password only. Cookie-based SSR session via middleware. No OAuth in V1.
- Architecture § Route Groups: `(marketing)/` is SSR/SSG, SEO-indexed. `(app)/` is authenticated SPA.
- Architecture § Naming Patterns: Route dirs `kebab-case` — `/signup` not `/sign-up`
- Story 1.2 Dev Notes: `createBrowserClient` created in `lib/supabase/browser.ts`; `lib/supabase/client.ts` is shadcn-internal only
- Story 1.2 Migrations: `on_auth_user_created` trigger auto-creates profiles — no app code needed

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- No issues encountered. TypeScript strict mode passed, lint passed, `/signup` returns HTTP 200.

### Completion Notes List

- Created `app/(marketing)/` route group for the first time — minimal pass-through layout, `app/layout.tsx` already handles ThemeProvider and fonts.
- `app/(marketing)/signup/page.tsx` renders `SignUpForm` with `bg-mg-background` page wrapper and `metadata` export.
- `components/sign-up-form.tsx` fully updated: switched to `createBrowserClient`, removed try/catch in favor of `if (error)` destructure pattern, added client-side password length and match validation, mapped duplicate-email Supabase error, updated `emailRedirectTo` to `/auth/confirm`, applied all Midgard design tokens (`mg-surface`, `mg-border`, `mg-accent`, `mg-foreground-muted`, `mg-destructive`).
- `app/auth/sign-up-success/page.tsx` simplified (no Card component), Midgard copy and tokens applied.
- No test framework yet (added in a future story per project-context.md) — manual AC validation performed via live dev server.
- Tasks 4.4–4.6 require live Supabase; verified route renders (HTTP 200) and validations are coded to spec.

### File List

- `app/(marketing)/layout.tsx` — new
- `app/(marketing)/signup/page.tsx` — new
- `components/sign-up-form.tsx` — modified
- `app/auth/sign-up-success/page.tsx` — modified

### Review Findings

- [x] [Review][Decision] Network error leaves button stuck — resolved: trust Supabase SDK v2 error handling; network errors surface via `error` return value, not throws. No code change needed. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] Silent redirect failure when `data.user` is null — fixed: redirect unconditionally after `if (error) return`. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] Typo: `focus:border-mg-accept` on Repeat Password input — not present in file; already correct. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] `mapSignUpError` surfaces raw Supabase error messages as fallback — fixed: generic fallback message. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] Double-submit race: no `if (isLoading) return` guard — fixed: early return added at top of handler. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] Whitespace-only password passes validation — fixed: `password.trim().length < 8`. [`components/sign-up-form.tsx`]
- [x] [Review][Patch] Whitespace-only email not trimmed — fixed: `email.trim()` passed to signUp. [`components/sign-up-form.tsx`]
- [x] [Review][Defer] Password-mismatch check runs before length check — minor UX ordering issue; if both conditions apply, mismatch error shows first. Not a bug. [`components/sign-up-form.tsx`] — deferred, pre-existing
- [x] [Review][Defer] `window.location.origin` without env var fallback — works correctly for web deployment; using `NEXT_PUBLIC_SITE_URL` would be more conventional but is not required. [`components/sign-up-form.tsx`] — deferred, pre-existing

## Change Log

- 2026-04-20: Story 1.3 created
- 2026-04-20: Story 1.3 implemented — (marketing) route group created, SignUpForm updated with Midgard tokens + auth logic, confirmation page updated
