# Story 6.2: Upgrade to Pro

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Free tier user**,
I want to upgrade to Pro when I'm ready,
so that I can remove my project limit and continue working without interruption.

## Acceptance Criteria

1. **Given** I click an upgrade CTA (from the upgrade prompt when the project cap is reached)
   **When** the `createCheckoutSession` Server Action runs
   **Then** if `profiles.stripe_customer_id` is null, a new Stripe Customer is created with the user's email and `metadata.supabase_user_id` set to the Supabase user ID
   **And** `profiles.stripe_customer_id` is updated to the new Customer ID (with `updated_at`)
   **And** a Stripe Checkout session is created with `PRO_PRICE_ID`, `mode: 'subscription'`, and `client_reference_id` set to the Supabase user ID
   **And** the action returns `{ success: true, data: { url: string } }` — the client navigates to the Stripe-hosted Checkout URL via `window.location.assign(url)`
   **And** Midgard never handles or stores card details

2. **Given** I complete payment on the Stripe Checkout page
   **When** Stripe sends the `customer.subscription.created` webhook
   **Then** the Story 6.1 webhook handler updates `profiles.subscription_tier` to `'pro'` (no additional code needed in 6.2)
   **And** on my next project creation attempt, the free-tier cap check in `createProject` is skipped

3. **Given** I abandon the Stripe Checkout page without completing payment
   **When** I return to Midgard
   **Then** my tier remains `'free'` and no subscription is created

4. **Given** `STRIPE_PRO_PRICE_ID` is not set in the environment
   **When** `createCheckoutSession` runs
   **Then** the action returns `{ success: false, error: 'Stripe product not configured.' }` — no Stripe API call is made

5. **Given** I am already on the Pro tier
   **When** `createCheckoutSession` runs
   **Then** the action returns `{ success: false, error: 'Already on Pro.' }` — no Checkout session is created

## Tasks / Subtasks

- [x] Task 1 — Create `actions/subscription.ts` (AC: #1, #4, #5)
  - [x] 1.1 Add `'use server'` directive; import `ActionResult` from `@/types/actions`, `createServerClient` from `@/lib/supabase/server`, `getStripeClient` from `@/lib/stripe/client`, `PRO_PRICE_ID` from `@/lib/stripe/products`, and `headers` from `next/headers`
  - [x] 1.2 Guard: if `!PRO_PRICE_ID` return `{ success: false, error: 'Stripe product not configured.' }` — addresses deferred issue from 6.1 code review
  - [x] 1.3 Get authenticated user via `supabase.auth.getUser()` — return error if missing
  - [x] 1.4 Fetch `profiles` row selecting `subscription_tier` and `stripe_customer_id`
  - [x] 1.5 Guard: if `profile.subscription_tier === 'pro'` return `{ success: false, error: 'Already on Pro.' }`
  - [x] 1.6 If `profile.stripe_customer_id` is null → create Stripe Customer with `{ email: user.email!, metadata: { supabase_user_id: user.id } }` → update `profiles.stripe_customer_id` (and `updated_at`) → use the new customer ID; on Supabase update error return `{ success: false, error: '...' }`
  - [x] 1.7 Derive `origin` from `await headers()` then `headersList.get('origin') ?? 'http://localhost:3000'`
  - [x] 1.8 Create Stripe Checkout session: `mode: 'subscription'`, `customer: customerId`, `line_items: [{ price: PRO_PRICE_ID, quantity: 1 }]`, `client_reference_id: user.id`, `success_url: `${origin}/projects``, `cancel_url: `${origin}/projects``
  - [x] 1.9 Return `{ success: true, data: { url: session.url! } }` — let the client navigate

- [x] Task 2 — Update `UpgradePrompt` in `components/projects/NewRealmForm.tsx` (AC: #1, #4)
  - [x] 2.1 Import `createCheckoutSession` from `@/actions/subscription`
  - [x] 2.2 Add `isUpgrading` and `upgradeError` state to `UpgradePrompt` (or lift from parent — simplest to add local state inside `UpgradePrompt`)
  - [x] 2.3 Replace the static `<a href="/pricing?plan=pro">` with an `<button type="button">` that calls `createCheckoutSession` programmatically, shows loading state while upgrading, and handles errors with an inline error message
  - [x] 2.4 On success: `window.location.assign(result.data.url)` — navigates to Stripe-hosted Checkout
  - [x] 2.5 On error: render error text below the button using `font-mono text-xs text-mg-destructive` — no `alert()`, no toast
  - [x] 2.6 Disable the upgrade button while `isUpgrading === true`; label changes to `'Redirecting...'` while in-flight

- [x] Task 3 — Validation (AC: all)
  - [x] 3.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 3.2 `pnpm lint` — zero ESLint errors
  - [ ] 3.3 Manual (Jason verifies): Hit the project cap → upgrade prompt appears → click "Upgrade to Pro" → Stripe Checkout page loads in the same tab
  - [ ] 3.4 Manual (Jason verifies): Abandon Checkout → return to `/projects` → tier is still `'free'`
  - [ ] 3.5 Manual (Jason verifies): Complete test payment in Stripe test mode → Stripe CLI forwards `customer.subscription.created` webhook → `profiles.subscription_tier` updates to `'pro'` in Supabase Dashboard → next project creation has no cap check

## Dev Notes

### What Already Exists — Do Not Recreate

| What | Location | Notes |
|------|----------|-------|
| `getStripeClient()` singleton | `lib/stripe/client.ts` | Lazy-initialized, no `apiVersion` — do NOT add one |
| `PRO_PRICE_ID` constant | `lib/stripe/products.ts` | `process.env.STRIPE_PRO_PRICE_ID ?? ''` — validate non-empty before use |
| `getTierFromSubscription()` | `lib/stripe/webhooks.ts` | Pure fn for webhook; not needed in 6.2 |
| `stripe_customer_id` column | `profiles` table | `text UNIQUE NULL` — already in `supabase/migrations/001_initial_schema.sql` |
| `subscription_tier` column | `profiles` table | `text`, check constraint `('free', 'pro')`, default `'free'` |
| Stripe packages | `package.json` | `stripe: ^22.0.2`, `@stripe/stripe-js: ^9.2.0` — already installed |
| `createServerClient()` | `lib/supabase/server.ts` | Use in Server Actions; reads cookies for user session |
| `ActionResult<T>` | `types/actions.ts` | All Server Actions must return this — no exceptions |
| Upgrade prompt UI | `components/projects/NewRealmForm.tsx` | `UpgradePrompt` component — modify in-place, do NOT recreate |
| `createProject` cap guard | `actions/projects.ts` | Reads `profiles.subscription_tier` server-side; skips cap for `'pro'` users |

### Flat Directory Structure — Critical

The project has **no `src/` prefix**. Architecture doc references `src/` but all paths drop it:
- `src/actions/subscription.ts` → `actions/subscription.ts`
- `src/lib/stripe/client.ts` → `lib/stripe/client.ts`
- Import alias `@/` maps to the **project root** (`./*`), not `src/`

### `createCheckoutSession` Implementation Pattern

```typescript
'use server'

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'
import { PRO_PRICE_ID } from '@/lib/stripe/products'
import type { ActionResult } from '@/types/actions'

export async function createCheckoutSession(): Promise<ActionResult<{ url: string }>> {
  if (!PRO_PRICE_ID) return { success: false, error: 'Stripe product not configured.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) return { success: false, error: 'Profile not found.' }

  if (profile.subscription_tier === 'pro') return { success: false, error: 'Already on Pro.' }

  const stripe = getStripeClient()

  let customerId = profile.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (updateError) return { success: false, error: 'Failed to save billing account.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    mode: 'subscription',
    client_reference_id: user.id,
    success_url: `${origin}/projects`,
    cancel_url: `${origin}/projects`,
  })

  return { success: true, data: { url: session.url! } }
}
```

### UpgradePrompt Client Update Pattern

The `UpgradePrompt` function component inside `NewRealmForm.tsx` currently renders a static `<a href="/pricing?plan=pro">`. Replace with an async button:

```tsx
// Add these imports at top of file
import { createCheckoutSession } from '@/actions/subscription'

// Inside UpgradePrompt, add state:
const [isUpgrading, setIsUpgrading] = useState(false)
const [upgradeError, setUpgradeError] = useState<string | null>(null)

async function handleUpgrade() {
  if (isUpgrading) return
  setIsUpgrading(true)
  setUpgradeError(null)
  try {
    const result = await createCheckoutSession()
    if (!result.success) {
      setUpgradeError(result.error)
      setIsUpgrading(false)
      return
    }
    window.location.assign(result.data.url)
    // Don't reset isUpgrading — browser is navigating away
  } catch {
    setIsUpgrading(false)
    setUpgradeError('Something went wrong. Please try again.')
  }
}
```

Replace the `<a>` with:
```tsx
<button
  type="button"
  onClick={handleUpgrade}
  disabled={isUpgrading}
  className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
>
  {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro'}
</button>
{upgradeError && (
  <p className="font-mono text-xs text-mg-destructive mt-2">{upgradeError}</p>
)}
```

### Stripe SDK v22 Notes

- Do NOT add `apiVersion` to `getStripeClient()` — already established in 6.1, adding it causes TypeScript errors
- `stripe.customers.create()` and `stripe.checkout.sessions.create()` are standard calls, no special v22 caveats
- Wrap Stripe API calls in try/catch — Stripe SDK throws on network errors and API errors; map to `ActionResult`

### `updated_at` Rule

Every `profiles` UPDATE must explicitly include `updated_at: new Date().toISOString()`. No auto-update trigger exists on the column. Missing `updated_at` silently leaves the column stale.

### Why `client_reference_id`

Setting `client_reference_id: user.id` links the Checkout session to the Supabase user. This is a safety net: if a user creates a new Stripe Customer in one tab while abandoning another Checkout (edge case), the webhook can still resolve the user via `profiles.stripe_customer_id`. This field is not strictly required for the happy path (which uses `stripe_customer_id` lookup) but is good practice and required by the AC.

### `window.location.assign()` for External Navigation

`router.push()` from Next.js does NOT navigate to external URLs (Stripe Checkout is `https://checkout.stripe.com/...`). Use `window.location.assign(url)` for external redirects. This is the correct pattern; do NOT use `router.push(url)`.

### Deferred: `?plan=pro` Post-Signup Flow

Code reviews of Stories 2.1 and 2.2 noted that the landing/pricing page "Upgrade to Pro" CTA passes `?plan=pro` to `/signup`, and Story 6.2 should route verified users into Stripe Checkout post-confirmation. This requires state preservation through the email confirmation flow (complex and not in the primary ACs). **This remains deferred** — the `?plan=pro` param is still silently ignored. Address post-MVP or in a dedicated cleanup story.

### Deferred: Account Page Upgrade CTA

The architecture references `app/(app)/account/page.tsx` as another upgrade CTA location. Story 6.3 creates the account page. The `createCheckoutSession` action built in this story is designed to be consumed by both the current upgrade prompt (6.2) and the account page (6.3) — no changes to the action will be needed in 6.3 for the upgrade path.

### No New Env Vars Required

`STRIPE_PRO_PRICE_ID` must be added to `.env.local` by Jason (not in `.env.example` yet). Add it to `.env.example` in this story:
```
STRIPE_PRO_PRICE_ID=price_xxx
```

### File Structure — What to Create / Modify

```
actions/
  subscription.ts         ← createCheckoutSession (new)

components/projects/
  NewRealmForm.tsx        ← modify UpgradePrompt only

.env.example              ← add STRIPE_PRO_PRICE_ID line
```

**Do NOT create:**
- Account page — Story 6.3
- `createPortalSession` — Story 6.3
- Any new UI components beyond modifying the existing `UpgradePrompt`

### Anti-Patterns to Avoid

- **Do not** throw from `createCheckoutSession` — return `ActionResult<{ url: string }>`
- **Do not** use `redirect()` from `next/navigation` in this action — return the URL and let the client navigate (keeps error handling clean)
- **Do not** use `router.push(url)` for the Stripe URL — external navigation requires `window.location.assign(url)`
- **Do not** store or log card details — all payment handling is on Stripe's servers
- **Do not** read `subscription_tier` from client state — always server-side from Supabase
- **Do not** create `createPortalSession` — that is Story 6.3 scope
- **Do not** add `apiVersion` to `getStripeClient()`
- **Do not** use relative imports — always `@/` alias
- **Do not** use `npm` or `yarn` — `pnpm` only
- **Do not** hardcode or log `STRIPE_SECRET_KEY` or `STRIPE_PRO_PRICE_ID`

### Testing Locally

Use Stripe CLI to test the full flow:
```bash
# Terminal 1 — dev server
pnpm dev

# Terminal 2 — Stripe webhook listener (for verifying post-payment tier update)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use a Stripe test mode price ID for `STRIPE_PRO_PRICE_ID` in `.env.local`. Complete checkout with Stripe test card `4242 4242 4242 4242`.

### References

- [Source: epics.md#Story 6.2] — User story, acceptance criteria, stripe_customer_id flow, client_reference_id
- [Source: architecture.md#API & Communication Patterns] — Stripe integration via hosted Checkout; tier state in profiles; no card data in Midgard
- [Source: architecture.md#Process Patterns] — Subscription tier checks always server-side
- [Source: architecture.md#Format Patterns] — ActionResult<T> shape; never throw from Server Actions
- [Source: lib/stripe/client.ts] — getStripeClient() singleton pattern; no apiVersion
- [Source: lib/stripe/products.ts] — PRO_PRICE_ID constant; validate non-empty before use
- [Source: actions/projects.ts] — createServerClient() usage, ActionResult<T> pattern, server-side tier check
- [Source: components/projects/NewRealmForm.tsx] — UpgradePrompt to modify; existing isLoading pattern
- [Source: deferred-work.md (6.1)] — PRO_PRICE_ID empty-string deferred item; Story 6.2 must validate
- [Source: project-context.md] — Flat directory structure (no src/); mg-* token prefix; updated_at rule; window.location for external nav

## File List

- `actions/subscription.ts` (new) — `createCheckoutSession` Server Action
- `components/projects/NewRealmForm.tsx` (modified) — `UpgradePrompt` wired to `createCheckoutSession`
- `.env.example` (modified) — added `STRIPE_PRO_PRICE_ID=price_xxx`

### Review Findings

- [x] [Review][Patch] `session.url!` asserted without null guard — returns `null` cast as string, causing `window.location.assign(null)` runtime error [actions/subscription.ts:67]
- [x] [Review][Patch] Orphaned Stripe customer on Supabase write failure — `stripe.customers.create` succeeds but if the subsequent `profiles` update fails, a customer exists in Stripe with no matching DB record; next call creates a second customer [actions/subscription.ts:34-47]
- [x] [Review][Patch] `user.email!` non-null assertion — OAuth users (GitHub hidden email, Apple) can have `email: undefined`; guard missing before passing to Stripe [actions/subscription.ts:36]
- [x] [Review][Patch] `origin` request header unvalidated before interpolation into `success_url`/`cancel_url` — replaced with `NEXT_PUBLIC_SITE_URL` env var [actions/subscription.ts:50-51]
- [x] [Review][Patch] `PRO_PRICE_ID` whitespace-string bypasses falsy guard — `if (!PRO_PRICE_ID)` passes for `" "`, sends whitespace price ID to Stripe [actions/subscription.ts:10]
- [x] [Review][Defer] `Suspense fallback={null}` no loading skeleton on `/projects` [app/(app)/projects/page.tsx] — deferred, pre-existing
- [x] [Review][Defer] `isUpgrading` stuck `true` if `success_url` same-origin redirect keeps component mounted [components/projects/NewRealmForm.tsx] — deferred, pre-existing

## Dev Agent Record

### Implementation Plan

1. Created `actions/subscription.ts` with all required guards (PRO_PRICE_ID present, user authenticated, profile found, not already pro), lazy Stripe Customer creation with `updated_at` written on profile update, and Stripe Checkout session creation returning the hosted URL.
2. Modified `UpgradePrompt` in `NewRealmForm.tsx`: replaced static `<a>` with an async button that calls `createCheckoutSession`, shows `'Redirecting...'` loading state, disables during in-flight, and renders inline error via `font-mono text-xs text-mg-destructive`. Uses `window.location.assign()` for external navigation to Stripe Checkout.
3. Added `STRIPE_PRO_PRICE_ID=price_xxx` to `.env.example` as required by Dev Notes.
4. Wrapped Stripe API calls in try/catch blocks to map SDK exceptions to `ActionResult` error returns.

### Completion Notes

- All automated tasks (1–2) complete; TypeScript (`pnpm tsc --noEmit`) and ESLint (`pnpm lint`) both pass with zero errors.
- Tasks 3.3–3.5 are manual verification steps for Jason in a live environment with Stripe CLI.
- `PRO_PRICE_ID` guard resolves the deferred item from the 6.1 code review.
- No new packages or env vars introduced beyond `STRIPE_PRO_PRICE_ID` (already documented).

## Change Log

- 2026-05-14: Implemented Story 6.2 — created `createCheckoutSession` Server Action and wired `UpgradePrompt` to it; added `STRIPE_PRO_PRICE_ID` to `.env.example`.
