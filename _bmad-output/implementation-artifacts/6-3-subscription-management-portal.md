# Story 6.3: Subscription Management Portal

Status: done

## Story

As a **Pro tier user**,
I want to view my subscription status and cancel if needed,
so that I have full control over my billing without contacting support.

## Acceptance Criteria

1. **Given** I navigate to `/account`
   **When** the page loads
   **Then** my current subscription tier (`Free` or `Pro`) is displayed
   **And** if I am on Pro, a "Manage subscription" button is visible

2. **Given** I click "Manage subscription"
   **When** the `createPortalSession` Server Action runs
   **Then** a Stripe Customer Portal session is created with my `stripe_customer_id`
   **And** I am redirected to the Stripe-hosted portal where I can view billing history and cancel

3. **Given** I cancel my subscription via the portal
   **When** Stripe sends the `customer.subscription.deleted` webhook
   **Then** `profiles.subscription_tier` is set to `'free'` (handled by the Story 6.1 webhook handler — no new code required)
   **And** the project cap is enforced on my next project creation

4. **Given** I am a Free tier user and navigate to `/account`
   **When** the page loads
   **Then** my tier (`Free`) is displayed and an upgrade CTA is visible (using the existing `createCheckoutSession` action from 6.2)
   **And** no "Manage subscription" button is shown to free-tier users

5. **Given** `createPortalSession` is called and `profiles.stripe_customer_id` is null
   **When** the action runs (edge case: Pro tier set manually without a Stripe customer)
   **Then** the action returns `{ success: false, error: 'No billing account found. Contact support.' }`
   **And** an inline error is displayed — no redirect occurs

## Tasks / Subtasks

- [x] Task 1 — Add `createPortalSession` to `actions/subscription.ts` (AC: #2, #5)
  - [x] 1.1 Add `'use server'` is already on the file — add `createPortalSession` as a new named export
  - [x] 1.2 Get authenticated user via `supabase.auth.getUser()` — return `{ success: false, error: 'Not authenticated.' }` if missing
  - [x] 1.3 Fetch `profiles` row selecting `subscription_tier` and `stripe_customer_id` — return error if profile query fails
  - [x] 1.4 Guard: if `stripe_customer_id` is null, return `{ success: false, error: 'No billing account found. Contact support.' }`
  - [x] 1.5 Derive `origin` from `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`
  - [x] 1.6 Create Stripe Billing Portal session: `stripe.billingPortal.sessions.create({ customer: customerId, return_url: \`${origin}/account\` })` — wrap in try/catch; on error return `{ success: false, error: 'Failed to create portal session.' }`
  - [x] 1.7 Return `{ success: true, data: { url: session.url } }`
  - [x] 1.8 Return type: `Promise<ActionResult<{ url: string }>>`

- [x] Task 2 — Create `components/account/ManageSubscriptionButton.tsx` (AC: #2, #5)
  - [x] 2.1 Add `'use client'` directive
  - [x] 2.2 Import `createPortalSession` from `@/actions/subscription`
  - [x] 2.3 Add `isRedirecting` and `portalError` state (useState)
  - [x] 2.4 `handleManage` async function: guard double-submit → set `isRedirecting(true)`, clear error → call `createPortalSession()` → on success `window.location.assign(result.data.url)` → on failure set `portalError` and reset `isRedirecting(false)` — wrap in try/catch
  - [x] 2.5 Render a Ghost button: `border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40`; label: "Manage subscription" / "Redirecting..." while in-flight; disabled while in-flight
  - [x] 2.6 On error: render `<p className="font-mono text-xs text-mg-destructive mt-2">{portalError}</p>` below the button

- [x] Task 3 — Create `components/account/UpgradeButton.tsx` (AC: #4)
  - [x] 3.1 Add `'use client'` directive
  - [x] 3.2 Import `createCheckoutSession` from `@/actions/subscription`
  - [x] 3.3 Add `isUpgrading` and `upgradeError` state
  - [x] 3.4 `handleUpgrade` async function: same pattern as ManageSubscriptionButton — guard double-submit, call action, `window.location.assign(url)` on success, set error on failure
  - [x] 3.5 Render a Primary button: `bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40`; label "Upgrade to Pro" / "Redirecting..."
  - [x] 3.6 On error: render inline error `<p className="font-mono text-xs text-mg-destructive mt-2">{upgradeError}</p>`

- [x] Task 4 — Create `app/(app)/account/page.tsx` (AC: #1, #4)
  - [x] 4.1 Server Component — reads `profiles` row (`subscription_tier`, `stripe_customer_id`) server-side using `createServerClient()`
  - [x] 4.2 If profile fetch fails, render error state: `<p className="font-mono text-xs text-mg-destructive">Failed to load account.</p>`
  - [x] 4.3 Export `metadata`: `{ title: 'Account — Midgard', robots: { index: false, follow: false } }`
  - [x] 4.4 Render tier label: "Pro" or "Free" using `font-mono text-xs uppercase tracking-widest` in `text-mg-accent` (Pro) or `text-mg-foreground-muted` (Free)
  - [x] 4.5 If `subscription_tier === 'pro'`: render `<ManageSubscriptionButton />` below the tier display
  - [x] 4.6 If `subscription_tier === 'free'`: render upgrade section with `<UpgradeButton />` — matching the account page visual register (sparse, confident prose)
  - [x] 4.7 Apply page layout consistent with projects page: `<main className="px-6 py-8 max-w-4xl mx-auto">`
  - [x] 4.8 Add a link/nav back to `/projects` (Ghost button or text link) — not specified in ACs but expected for navigation continuity

- [ ] Task 5 — Validation (AC: all)
  - [x] 5.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 5.2 `pnpm lint` — zero ESLint errors
  - [ ] 5.3 Manual (Jason verifies): Navigate to `/account` as a Free tier user → tier label "Free" and upgrade button visible; no "Manage subscription" button
  - [ ] 5.4 Manual (Jason verifies): Navigate to `/account` as a Pro tier user → tier label "Pro" and "Manage subscription" button visible; no upgrade CTA
  - [ ] 5.5 Manual (Jason verifies): Click "Manage subscription" → redirected to Stripe-hosted Customer Portal
  - [ ] 5.6 Manual (Jason verifies): Cancel subscription in portal → return to `/account` (via portal return URL) → tier displays "Free"

### Review Findings

- [x] [Review][Decision] D1 — Auth error not captured in AccountContent — added authError capture + guard; wrapped AccountContent in try/catch for unhandled throws [app/(app)/account/page.tsx]
- [x] [Review][Decision] D2 — Suspense fallback is null — added AccountSkeleton component; Suspense now shows animated placeholder during load [app/(app)/account/page.tsx]
- [x] [Review][Patch] P1 — No ErrorBoundary around Suspense boundary — AccountContent now wrapped in try/catch; all throw paths return graceful error state [app/(app)/account/page.tsx]
- [x] [Review][Patch] P2 — NEXT_PUBLIC_SITE_URL trailing slash not normalized — added `.replace(/\/$/, '')` [actions/subscription.ts:94]
- [x] [Review][Patch] P3 — stripe_customer_id selected but unused in AccountContent — removed from select; query now fetches subscription_tier only [app/(app)/account/page.tsx:43]
- [x] [Review][Patch] P4 — No role="alert" on error paragraphs — added role="alert" to both button error states [components/account/ManageSubscriptionButton.tsx, components/account/UpgradeButton.tsx]
- [x] [Review][Patch] P5 — Disabled buttons lack cursor-not-allowed — added disabled:cursor-not-allowed to both button classNames [components/account/ManageSubscriptionButton.tsx, components/account/UpgradeButton.tsx]
- [x] [Review][Defer] W1 — session.url null guard in createPortalSession [actions/subscription.ts:92] — deferred, Stripe API guarantees non-null url on success
- [x] [Review][Defer] W2 — result.data.url null guard in button components [components/account/ManageSubscriptionButton.tsx:22, components/account/UpgradeButton.tsx:22] — deferred, same Stripe API contract as W1
- [x] [Review][Defer] W3 — Empty catch blocks discard error details [components/account/ManageSubscriptionButton.tsx, components/account/UpgradeButton.tsx] — deferred, generic message is per-spec; server logging is a monitoring concern
- [x] [Review][Defer] W4 — subscription_tier string literal comparison [app/(app)/account/page.tsx:36-47] — deferred, DB check constraint and Supabase types enforce valid enum values
- [x] [Review][Defer] W5 — profileError discarded in createPortalSession [actions/subscription.ts:88] — deferred, intentional per anti-pattern spec; do not surface raw Supabase errors
- [x] [Review][Defer] W6 — Duplicated button component logic [components/account/ManageSubscriptionButton.tsx, components/account/UpgradeButton.tsx] — deferred, both components are spec-compliant; refactor out of scope for this story

## Dev Notes

### What Already Exists — Do Not Recreate

| What | Location | Notes |
|------|----------|-------|
| `createCheckoutSession` | `actions/subscription.ts` | Already built in 6.2; ADD `createPortalSession` to the same file — do NOT create a new file |
| `getStripeClient()` | `lib/stripe/client.ts` | Lazy-initialized singleton; no `apiVersion` — do NOT add one |
| `PRO_PRICE_ID` | `lib/stripe/products.ts` | Not needed in 6.3; `createPortalSession` uses `stripe_customer_id` directly |
| `stripe_customer_id` column | `profiles` table | `text UNIQUE NULL` — set during checkout flow in 6.2 |
| `subscription_tier` column | `profiles` table | `text`, check constraint `('free', 'pro')`, default `'free'` |
| `ActionResult<T>` | `types/actions.ts` | All Server Actions must return this |
| `createServerClient()` | `lib/supabase/server.ts` | Use in Server Component and Server Actions |
| Webhook handler | `app/api/webhooks/stripe/route.ts` | Already handles `customer.subscription.deleted` → sets tier to `'free'`; no changes needed in 6.3 |
| `NEXT_PUBLIC_SITE_URL` | `.env.example` | Already documented; use for `return_url` in portal session |

### Flat Directory Structure — Critical

No `src/` prefix. Architecture spec references `src/` but all paths drop it:
- `src/app/(app)/account/page.tsx` → `app/(app)/account/page.tsx`
- `src/components/account/ManageSubscriptionButton.tsx` → `components/account/ManageSubscriptionButton.tsx`
- `src/actions/subscription.ts` → `actions/subscription.ts`
- Import alias `@/` maps to project root

### `createPortalSession` Implementation Pattern

```typescript
export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) return { success: false, error: 'Profile not found.' }

  const customerId = profile.stripe_customer_id
  if (!customerId) return { success: false, error: 'No billing account found. Contact support.' }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const stripe = getStripeClient()

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    })
    return { success: true, data: { url: session.url } }
  } catch {
    return { success: false, error: 'Failed to create portal session.' }
  }
}
```

### Stripe Billing Portal — Operator Setup Required

The Stripe Billing Portal must be configured in the Stripe Dashboard before this story can be tested:
1. Go to Stripe Dashboard → Billing → Customer Portal
2. Configure allowed actions (at minimum: cancel subscription)
3. Set a default return URL (can be overridden per-session via `return_url`, which this code does)

This is a one-time operator setup — no code change required.

### `window.location.assign()` for External Navigation

`router.push()` does NOT navigate to external URLs (Stripe portal is `https://billing.stripe.com/...`). Use `window.location.assign(url)` for external redirects — same pattern as the upgrade flow in 6.2.

### Account Page Data Flow

The account page is a **Server Component** that reads profile data directly:
```typescript
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, stripe_customer_id')
  .eq('id', user!.id)
  .single()
```

The middleware already protects `/(app)/*` routes — if there's no session, the user is redirected to `/login` before the page runs. You can assume `user` is non-null inside `app/(app)/account/page.tsx`, but still handle `profile` query errors gracefully.

### No `updated_at` Mutation in This Story

`createPortalSession` does not write to the database — it only reads `stripe_customer_id` and creates a Stripe session. No `updated_at` concern in 6.3. (Tier updates happen via the existing webhook handler when the user cancels.)

### Updated_at Rule (General)

If any UPDATE statement on `profiles` is added in this story (unlikely), it must include `updated_at: new Date().toISOString()` — there is no auto-update trigger.

### No Middleware Changes Required

`/account` is under `/(app)/`, which is already middleware-protected. No changes needed to `lib/supabase/proxy.ts` or the public path allowlist.

### Anti-Patterns to Avoid

- **Do not** throw from `createPortalSession` — return `ActionResult<{ url: string }>`
- **Do not** use `router.push(url)` for the portal URL — external navigation requires `window.location.assign(url)`
- **Do not** add `apiVersion` to `getStripeClient()` — established in 6.1, adding it causes TypeScript errors
- **Do not** read `subscription_tier` from client state — always server-side from Supabase
- **Do not** create a separate file for `createPortalSession` — add it to existing `actions/subscription.ts`
- **Do not** use relative imports — always `@/` alias
- **Do not** use `npm` or `yarn` — `pnpm` only
- **Do not** hand-edit `components/ui/` — shadcn CLI manages these
- **Do not** surface raw Supabase error strings to the user — map to generic human-readable copy
- **Do not** add toast notifications or alerts — use inline error text following the same pattern as `UpgradePrompt` in `NewRealmForm.tsx`

### Free-Tier Account Page — Upgrade CTA Notes

The `UpgradeButton` component is a parallel to the upgrade button in `NewRealmForm.tsx`'s `UpgradePrompt`, but simpler — it doesn't need the full `AttentionRegion` wrapper since there's no "cap reached" message context. A straightforward Primary button calling `createCheckoutSession` is sufficient. Errors render as inline mono text below the button.

### File Structure — What to Create / Modify

```
actions/
  subscription.ts         ← ADD createPortalSession (modify existing file)

components/account/
  ManageSubscriptionButton.tsx   ← new (client component)
  UpgradeButton.tsx              ← new (client component)

app/(app)/account/
  page.tsx                ← new (server component)
```

**Do NOT create:**
- Any new lib/stripe files — existing `client.ts`, `products.ts`, `webhooks.ts` are sufficient
- New types — `ActionResult<T>` already covers the return type
- Changes to the webhook handler — 6.1 already handles `customer.subscription.deleted`

### Testing Locally

```bash
# Terminal 1 — dev server
pnpm dev

# Terminal 2 — Stripe CLI for webhook forwarding (to verify post-cancel tier sync)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Navigate to `/account` while logged in with a test account. To test Pro tier: manually update `profiles.subscription_tier` to `'pro'` and `stripe_customer_id` to a valid Stripe customer ID in Supabase Dashboard, or run a test checkout session via Story 6.2's flow first.

### References

- [Source: epics.md#Story 6.3] — User story, acceptance criteria
- [Source: epics.md#Epic 6] — FR31: subscription management via billing portal
- [Source: architecture.md#API & Communication Patterns] — Stripe integration via hosted pages; no custom billing UI
- [Source: architecture.md#Process Patterns] — Subscription tier checks always server-side
- [Source: architecture.md#Format Patterns] — ActionResult<T> shape; never throw from Server Actions
- [Source: architecture.md#Project Structure] — `app/(app)/account/page.tsx`, `actions/subscription.ts`
- [Source: implementation-artifacts/6-2-upgrade-to-pro.md#Dev Notes] — createCheckoutSession pattern; window.location.assign; no apiVersion; Deferred Account Page section
- [Source: implementation-artifacts/6-1-stripe-integration-and-webhook-handler.md] — webhook handler already covers subscription.deleted
- [Source: project-context.md] — Flat directory (no src/); mg-* token prefix; updated_at rule; window.location for external nav; pnpm only; @/ alias
- [Source: lib/stripe/client.ts] — getStripeClient() singleton; no apiVersion
- [Source: actions/subscription.ts] — createCheckoutSession pattern to follow for createPortalSession
- [Source: app/(app)/projects/page.tsx] — Server Component data-fetch pattern; metadata shape; layout class

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `createPortalSession` to existing `actions/subscription.ts` — reads `stripe_customer_id` from profiles, calls `stripe.billingPortal.sessions.create()`, returns portal URL via ActionResult. Guards: unauthenticated, missing profile, null customer ID, Stripe API errors — all map to descriptive error strings, no throws.
- Created `components/account/ManageSubscriptionButton.tsx` — client component with double-submit guard, `window.location.assign()` for external Stripe portal URL, inline error display. Matches Ghost button style from design system.
- Created `components/account/UpgradeButton.tsx` — client component calling existing `createCheckoutSession` action from 6.2. Primary button style. Same redirect + error pattern as ManageSubscriptionButton.
- Created `app/(app)/account/page.tsx` — Server Component reads profile tier server-side; renders tier label in `text-mg-accent` (Pro) or `text-mg-foreground-muted` (Free); conditionally renders ManageSubscriptionButton (Pro) or upgrade section with UpgradeButton (Free); includes ← Realms nav link; graceful error state if profile fetch fails.
- `pnpm tsc --noEmit` — zero errors. `pnpm lint` — zero errors.
- Tasks 5.3–5.6 are manual verification steps for Jason requiring a live Stripe environment.

### File List

- `actions/subscription.ts` (modified) — added `createPortalSession` export
- `components/account/ManageSubscriptionButton.tsx` (new) — client component for Pro portal redirect
- `components/account/UpgradeButton.tsx` (new) — client component for Free → Pro upgrade
- `app/(app)/account/page.tsx` (new) — account page, tier display, conditional billing actions

## Change Log

- 2026-05-14: Implemented Story 6.3 — created account page with subscription tier display and billing actions; added `createPortalSession` Server Action; created ManageSubscriptionButton and UpgradeButton client components.
