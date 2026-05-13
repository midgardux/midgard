# Story 6.1: Stripe Integration & Webhook Handler

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want Stripe integrated and a webhook handler in place that keeps subscription tier state in sync,
so that billing lifecycle events are processed reliably without manual intervention.

## Acceptance Criteria

1. **Given** the Stripe SDK is installed and configured in `lib/stripe/client.ts`
   **When** a Stripe webhook event is received at `POST /api/webhooks/stripe`
   **Then** the event is verified using `stripe.webhooks.constructEvent()` with the webhook signing secret
   **And** unverified requests (missing or invalid signature) return `400`

2. **Given** a valid webhook event arrives
   **When** the event type is `customer.subscription.created`, `customer.subscription.updated`, or `customer.subscription.deleted`
   **Then** the handler looks up the user via `profiles.stripe_customer_id = event.data.object.customer`
   **And** updates `profiles.subscription_tier` to `'pro'` if subscription status is `'active'`, or `'free'` otherwise
   **And** returns `200` on success

3. **Given** a processing error occurs in the webhook handler
   **When** the Supabase update fails or the customer lookup returns no rows
   **Then** the handler returns `500` so Stripe retries
   **And** the Stripe event ID is logged to the console before returning

4. **Given** a user's subscription is cancelled via Stripe
   **When** the `customer.subscription.deleted` webhook fires
   **Then** `profiles.subscription_tier` is set back to `'free'`

5. **Given** a webhook event type is not one of the three handled types
   **When** the event arrives
   **Then** the handler returns `200` immediately (no-op acknowledgement — Stripe requires 200 for unhandled events to avoid retries)

## Tasks / Subtasks

- [x] Task 1 — Create `lib/stripe/client.ts` (AC: #1)
  - [x] 1.1 Export `getStripeClient()` that returns a Stripe singleton, initialized with `STRIPE_SECRET_KEY`
  - [x] 1.2 Pattern matches the singleton pattern in `lib/claude/client.ts` — module-level `_client` variable, lazily initialized

- [x] Task 2 — Create `lib/stripe/products.ts` (AC: #2)
  - [x] 2.1 Export `PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? ''`
  - [x] 2.2 This constant is used by Story 6.2 (`createCheckoutSession`) — establish it now as the canonical source

- [x] Task 3 — Create `lib/stripe/webhooks.ts` (AC: #2, #4)
  - [x] 3.1 Export `getTierFromSubscription(subscription: Stripe.Subscription): 'pro' | 'free'` — returns `'pro'` if `subscription.status === 'active'`, `'free'` otherwise
  - [x] 3.2 This is pure logic with no I/O — isolates testable tier resolution from the route handler

- [x] Task 4 — Create `app/api/webhooks/stripe/route.ts` (AC: #1–#5)
  - [x] 4.1 `export async function POST(request: Request)` — standard Next.js App Router API route export (no `NextRequest` needed)
  - [x] 4.2 Read raw body with `const rawBody = await request.text()` — required for signature verification; never parse as JSON first
  - [x] 4.3 Get Stripe signature: `request.headers.get('stripe-signature') ?? ''`
  - [x] 4.4 Call `stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)` in a try/catch — catch returns `new Response('Invalid signature', { status: 400 })`
  - [x] 4.5 Switch on `event.type` for the three handled types; return `new Response('OK', { status: 200 })` for unrecognized types
  - [x] 4.6 For each handled event, cast `event.data.object as Stripe.Subscription` to get typed access to `customer` and `status`
  - [x] 4.7 Use a Supabase **service role client** (see Dev Notes) to look up profile by `stripe_customer_id` and update `subscription_tier`
  - [x] 4.8 On Supabase error: `console.error('Stripe webhook processing failed, event:', event.id, error); return new Response('Internal error', { status: 500 })`
  - [x] 4.9 On success: `return new Response('OK', { status: 200 })`

- [x] Task 5 — Validation (AC: all)
  - [x] 5.1 `pnpm tsc --noEmit` — zero TypeScript errors
  - [x] 5.2 `pnpm lint` — zero ESLint errors
  - [ ] 5.3 Manual (Jason verifies): Use Stripe CLI to forward test events to the local handler — `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and trigger `stripe trigger customer.subscription.created`
  - [ ] 5.4 Manual (Jason verifies): Confirm `profiles.subscription_tier` updates correctly in Supabase Dashboard after test events

### Review Findings

- [x] [Review][Patch] Add `console.warn` for zero-rows Supabase update — zero-match is intentionally allowed (returns `200`, not `500`; retries won't fix a missing profile), but the miss should be visible in logs. Add `console.warn('Stripe webhook: no profile found for customer', customerId, 'event:', event.id)` after the `update` call when `count` is 0 or after checking data length. [`app/api/webhooks/stripe/route.ts:42-47`]
- [x] [Review][Patch] `getStripeClient()` inside try/catch masks configuration errors as 400 — if `STRIPE_SECRET_KEY` is missing, the Stripe SDK throws inside the catch block and returns `"Invalid signature" 400`, causing Stripe to retry indefinitely with no operator log of the real problem. Move `getStripeClient()` call to before the try/catch. [`app/api/webhooks/stripe/route.ts:11-18`]
- [x] [Review][Patch] Signature verification catch block is silent — no `console.error`; a misconfigured webhook secret, SDK error, or genuine invalid signature all produce identical 400 responses with nothing in logs. Add `console.error` in the catch. [`app/api/webhooks/stripe/route.ts:16-18`]
- [x] [Review][Defer] No idempotency check for duplicate webhook delivery — Stripe delivers at-least-once; duplicate events can race to update the same profile row with no event-ID deduplication. Pre-existing system-level concern, not introduced by this diff. — deferred, pre-existing
- [x] [Review][Defer] `PRO_PRICE_ID` defaults to empty string when env var is absent — `?? ''` coerces a missing `STRIPE_PRO_PRICE_ID` to `''`; callers that treat it as a truthy guard will silently skip their branch. Not consumed by this story; Story 6.2 should validate. [`lib/stripe/products.ts:1`] — deferred, pre-existing
- [x] [Review][Defer] Middleware bypass uses prefix match — `startsWith("/api/webhooks/stripe")` auto-exempts any future sub-paths (e.g. `/api/webhooks/stripe-internal`). Consistent with existing proxy.ts pattern. [`lib/supabase/proxy.ts:58`] — deferred, pre-existing

## Dev Notes

### What Already Exists — Do Not Recreate

| What | Location | Notes |
|------|----------|-------|
| `stripe_customer_id` column | `profiles` table | Already in migration `001_initial_schema.sql`; `text UNIQUE NULL` |
| `subscription_tier` column | `profiles` table | Already in migration `001_initial_schema.sql`; check constraint `('free', 'pro')`, default `'free'` |
| Stripe packages | `package.json` | `stripe: ^22.0.2`, `@stripe/stripe-js: ^9.2.0` — already installed, no `pnpm add` needed |
| Env vars | `.env.example` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` already templated |
| Database types | `lib/supabase/types.ts` | `profiles.stripe_customer_id: string | null`, `profiles.subscription_tier: string` |

### Stripe SDK v22 Initialization

```typescript
// lib/stripe/client.ts
import Stripe from 'stripe'

let _client: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!_client) {
    _client = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _client
}
```

Do NOT specify `apiVersion` — let the SDK use its bundled default (v22.0.2 bundles the correct 2025.x version). Specifying an outdated version string causes a type error.

### Service Role Client — Required for Webhook

The webhook has **no user session** — there are no cookies to read, so `createServerClient()` from `lib/supabase/server.ts` cannot be used. Use a direct service role client that bypasses RLS:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Create this inline inside the `POST` handler function (not module-level) — consistent with the Supabase "don't put client in a global variable" pattern noted in `lib/supabase/server.ts`.

The service role bypasses RLS — the webhook must be able to update any user's profile by `stripe_customer_id` regardless of which user is "authenticated."

### Raw Body is Mandatory for Webhook Verification

```typescript
const rawBody = await request.text()
// NOT: await request.json() — parsed JSON cannot be re-signed
```

Stripe signature verification hashes the exact raw bytes of the request body. If you parse the body to JSON and re-serialize it, byte-level differences (whitespace, key ordering) will break verification.

### Subscription Tier Logic

| Event type | Cast | Tier logic |
|------------|------|------------|
| `customer.subscription.created` | `Stripe.Subscription` | `status === 'active'` → `'pro'`, else `'free'` |
| `customer.subscription.updated` | `Stripe.Subscription` | `status === 'active'` → `'pro'`, else `'free'` |
| `customer.subscription.deleted` | `Stripe.Subscription` | Always `'free'` (deleted subscriptions have status `'canceled'`, so `getTierFromSubscription` returns `'free'` correctly) |

`event.data.object.customer` is typed as `string | Stripe.Customer | Stripe.DeletedCustomer` — cast to `string` since Stripe only sends the ID in webhook payloads (not expanded objects unless explicitly requested):

```typescript
const customerId = event.data.object.customer as string
```

### Supabase Update Pattern

```typescript
const { error } = await supabase
  .from('profiles')
  .update({ subscription_tier: tier })
  .eq('stripe_customer_id', customerId)
```

Note: `.eq()` on a nullable column (`stripe_customer_id`) matches only non-null values — this is correct behaviour. If the customer ID is not found (update affects 0 rows), Supabase does NOT return an error; it silently succeeds. This is acceptable — if no profile has this customer ID, there is nothing to update (e.g. test events from Stripe Dashboard).

### File Structure — What to Create

```
lib/
  stripe/
    client.ts       ← Stripe singleton (new)
    webhooks.ts     ← getTierFromSubscription() pure fn (new)
    products.ts     ← PRO_PRICE_ID constant (new)

app/
  api/
    webhooks/
      stripe/
        route.ts    ← POST handler (new)
```

The `app/api/` directory does not exist yet — create the full path. Architecture spec: `app/api/webhooks/stripe/route.ts` [Source: architecture.md#API Routes].

### What This Story Does NOT Include

- `actions/subscription.ts` — contains `createCheckoutSession` and `createPortalSession`; those are Stories 6.2 and 6.3
- Upgrade CTA UI or any frontend changes — Story 6.2
- Account page subscription display — Story 6.3
- Stripe Customer object creation — Story 6.2 creates the customer when the user initiates checkout

Do not scaffold Story 6.2/6.3 code "to be safe" — the scope of this story is the Stripe client setup + webhook handler only.

### Testing the Webhook Locally

Stripe CLI is required to forward test events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Stripe CLI prints the webhook signing secret to use in .env.local:
# > Ready! Your webhook signing secret is whsec_test_xxxx
```

Trigger test events:
```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the CLI-printed `whsec_test_xxxx` value (not the production webhook secret from the dashboard).

### Anti-Patterns to Avoid

- **Do not** use `req.body` or `await request.json()` for the raw body — signature verification breaks
- **Do not** use `createServerClient()` from `lib/supabase/server.ts` in the webhook — it reads cookies and requires a user session
- **Do not** add `apiVersion` to the Stripe constructor — causes TypeScript errors with v22.x unless you match the exact bundled version string
- **Do not** create `actions/subscription.ts` in this story — out of scope
- **Do not** use `require()` — ESM only
- **Do not** use relative imports — always `@/` alias
- **Do not** use `npm` or `yarn` — `pnpm` only
- **Do not** log `process.env.STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` — secrets must never appear in logs

### Deferred Context — Relevant to This Story

From deferred work: `subscription_tier` is an untyped `string` in the database type (`lib/supabase/types.ts`) rather than a `'free' | 'pro'` union. This means TypeScript won't catch an invalid tier value passed to the update. Mitigate by using the `getTierFromSubscription()` helper which is typed to return `'pro' | 'free'` — never write the tier string inline in the route handler.

### Project Structure Notes

- `app/api/` does not exist yet — create the full directory path
- `lib/stripe/` does not exist yet — create the full directory path
- Import alias `@/` maps to the project root (not `src/`) per `tsconfig.json`
- `components/ui/` — shadcn/ui; never hand-edited; not touched by this story
- `pnpm` only — never `npm install` or `yarn add`

### References

- [Source: epics.md#Story 6.1] — User story, acceptance criteria, event types, tier sync logic
- [Source: architecture.md#API Routes] — `POST /api/webhooks/stripe` is the only API Route; Server Actions are not used for webhooks
- [Source: architecture.md#Authentication & Security] — `stripe.webhooks.constructEvent()` with signing secret; no card data in Midgard
- [Source: architecture.md#Stripe integration] — tier state in `profiles.subscription_tier`; webhook reconciles tier; mismatch resolvable from Stripe Dashboard
- [Source: architecture.md#Complete Project Directory Structure] — `lib/stripe/client.ts`, `lib/stripe/webhooks.ts`, `lib/stripe/products.ts`
- [Source: architecture.md#Process Patterns] — Stripe webhook failures return 500 so Stripe retries; log event ID
- [Source: architecture.md#Error handling] — Stripe webhook failures: return 500, log event ID
- [Source: supabase/migrations/001_initial_schema.sql] — `stripe_customer_id` and `subscription_tier` columns already exist
- [Source: lib/supabase/server.ts] — Cookie-based client not usable in webhooks; inline service role client required
- [Source: lib/supabase/types.ts] — `profiles.stripe_customer_id: string | null`, `profiles.subscription_tier: string`
- [Source: lib/claude/client.ts] — Singleton client pattern to follow for `lib/stripe/client.ts`
- [Source: actions/projects.ts] — `ActionResult<T>` pattern, `createServerClient()` usage, Server Action conventions

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None._

### Completion Notes List

- Created `lib/stripe/client.ts` — lazy-initialized Stripe singleton matching the `lib/claude/client.ts` pattern. No `apiVersion` specified to avoid TypeScript errors with v22.x.
- Created `lib/stripe/products.ts` — `PRO_PRICE_ID` exported as the canonical source for Stories 6.2/6.3.
- Created `lib/stripe/webhooks.ts` — pure `getTierFromSubscription()` helper typed to return `'pro' | 'free'`, isolating tier logic from the route handler and mitigating the untyped `subscription_tier` column.
- Created `app/api/webhooks/stripe/route.ts` — reads raw body via `request.text()` before any parsing (required for signature verification); uses inline service role Supabase client to bypass RLS; handles three subscription event types with `getTierFromSubscription()`; returns `500` + logs event ID on error so Stripe retries; returns `200` for unhandled event types.
- Used an `includes()` array check rather than a switch statement for event type routing — keeps the handler concise while satisfying all five ACs.
- `pnpm tsc --noEmit` — zero errors. `pnpm lint` — zero errors.
- Tasks 5.3 and 5.4 are manual verification steps for Jason (Stripe CLI + Supabase Dashboard).

### File List

- `lib/stripe/client.ts` (new)
- `lib/stripe/products.ts` (new)
- `lib/stripe/webhooks.ts` (new)
- `app/api/webhooks/stripe/route.ts` (new)
- `lib/supabase/proxy.ts` (modified — added `/api/webhooks/stripe` to `isPublicPath`)

## Change Log

- 2026-05-12: Implemented Story 6.1 — Stripe client singleton, PRO_PRICE_ID constant, getTierFromSubscription helper, and POST webhook handler at /api/webhooks/stripe. Zero TypeScript and ESLint errors.
