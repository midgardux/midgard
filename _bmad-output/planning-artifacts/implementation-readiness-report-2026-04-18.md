---
stepsCompleted: [1, 2, 3, 4, 5, 6]
documentsInventoried:
  prd: '_bmad-output/planning-artifacts/prd.md'
  architecture: '_bmad-output/planning-artifacts/architecture.md'
  epics: '_bmad-output/planning-artifacts/epics.md'
  ux: '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-18
**Project:** Midgard

---

## PRD Analysis

### Functional Requirements

FR1: User can start a new project by entering a freeform product description via text input
FR2: User can upload a text-based brief file (Word, PDF, Markdown, TXT) as project input
FR3: System can detect when a submitted brief lacks sufficient information — defined as missing one or more of: a target user role, a primary problem or goal, and a product context
FR4: System can ask up to two targeted follow-up questions to improve input quality before running analysis
FR5: System gates analysis from running until the brief contains at minimum a target user role, a primary problem or goal, and a product context; briefs missing any of these trigger the follow-up sequence (FR4) before proceeding
FR6: User can converse with a guided agent that asks contextually relevant questions about their product
FR7: Agent extracts structured product information from freeform input without requiring the user to write prompts
FR8: System displays a branded loading state with Norse-flavored microcopy while analysis runs
FR9: System displays a one-sentence pipeline disclosure at the point of first analysis per account
FR10: System generates role-based personas from brief input
FR11: System generates a navigable, role-filtered user flow from brief input
FR12: System generates an information architecture from brief input
FR13: System generates a synthesis overview from brief input
FR14: User can regenerate any individual artifact section without re-running the full project analysis
FR15: User can navigate between artifact types (personas, user flow, IA, synthesis) within a single workspace
FR16: User can filter the user flow view by role
FR17: Artifact navigation transitions without a loading state
FR18: User can view all generated artifacts for a project within a single session
FR19: User can create a new project for each product brief
FR20: User can view a list of all their projects
FR21: User can open and revisit any existing project and its generated artifacts
FR22: User can delete a project
FR23: System permanently and irrecoverably purges all data associated with a deleted project
FR24: System notifies users with inactive accounts before purging their project data
FR25: System automatically purges all project data for accounts inactive for 12 consecutive months with no active subscription, following advance notification
FR26: User can create an account with email and password
FR27: User can request a password reset via email
FR28: User can reset their password using a time-limited link delivered to their registered email address
FR29: User can log in and log out of their account
FR30: User can upgrade from Free tier to Pro tier
FR31: User can manage their subscription (view status, cancel) via a billing portal
FR32: Free tier users can create projects up to a configurable hard limit
FR33: Free tier users are shown an upgrade prompt when they reach the project limit
FR34: Pro tier users have no project creation limit surfaced to them
FR35: System processes subscription payments and manages billing lifecycle events via a third-party payment processor
FR36: Operator receives an email alert when monthly token spend crosses a configurable threshold
FR37: Operator can adjust the free-tier project cap without a code deployment
FR38: Operator can access usage and subscription data via operator-facing infrastructure and billing dashboards
FR39: Prospective users can access a public marketing landing page describing the product and pricing
FR40: Marketing landing page and all public pages are indexable by search engines
FR41: All public-facing pages include meta titles, descriptions, and Open Graph tags

**Total FRs: 41**

### Non-Functional Requirements

NFR-PERF-1: Artifact navigation transitions complete in < 100ms
NFR-PERF-2: Generation loading state appears within 500ms of analysis trigger
NFR-PERF-3: App initial load completes in < 3 seconds on standard broadband
NFR-PERF-4: Marketing landing page achieves Lighthouse scores ≥ 90 for Performance, SEO, and Accessibility
NFR-PERF-5: File upload processing completes before analysis begins without blocking the UI
NFR-SEC-1: All data transmitted over HTTPS/TLS
NFR-SEC-2: All data stored at rest encrypted (Supabase default encryption)
NFR-SEC-3: Payment data handled exclusively via Stripe — Midgard never stores, processes, or logs card details
NFR-SEC-4: Password reset links expire within 1 hour of generation
NFR-SEC-5: User sessions invalidated on explicit logout
NFR-SEC-6: API keys and secrets stored as environment variables; never hardcoded or committed to source control
NFR-SCALE-1: Architecture supports growth from 0 to 500 concurrent active users without infrastructure changes or manual intervention
NFR-SCALE-2: Vercel autoscaling and Supabase managed infrastructure absorb traffic growth transparently
NFR-SCALE-3: Free tier project cap bounds per-user token consumption as user count grows
NFR-ACCESS-1: WCAG 2.1 AA compliance across all authenticated app surfaces and the public marketing landing page
NFR-ACCESS-2: Keyboard navigation supported for all user-facing actions
NFR-ACCESS-3: Screen reader compatibility for artifact navigation and viewing
NFR-REL-1: Claude API failures surface a user-visible error message with retry option within 5 seconds; no partial or corrupted project state is committed on failure
NFR-REL-2: Payment processor webhook failures must not silently place users in incorrect subscription tiers; tier state must be reconcilable from the billing dashboard without manual database intervention
NFR-REL-3: Supabase unavailability must not corrupt stored project data; operations fail cleanly rather than partially
NFR-REL-4: Generated artifacts are not lost between a successful generation and the user's next session

**Total NFRs: 21**

### Additional Requirements

- Desktop-first; tablet tolerated, mobile explicitly out of scope for V1
- Browser matrix: Chrome, Firefox, Safari, Edge — last 2 versions each; no IE
- Hard delete on project deletion — no soft deletes, no recovery
- 12-month inactivity purge with 11-month advance email notification
- Pipeline disclosure: one visible sentence at first analysis per account
- Free-tier cap adjustable via Supabase config table, no redeploy required

### PRD Completeness Assessment

The PRD is thorough and well-structured. Requirements are numbered, precise, and grouped logically. Acceptance criteria will be derivable from the FRs. No ambiguous or contradictory requirements detected. The phased scope is clearly delineated (MVP vs. post-MVP). The PRD is complete and ready for validation against epics.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement (abbreviated) | Epic Coverage | Status |
|---|---|---|---|
| FR1 | Freeform text brief input | Epic 4 | ✓ Covered |
| FR2 | File upload (Word, PDF, MD, TXT) | Epic 4 | ✓ Covered |
| FR3 | Input quality detection | Epic 4 | ✓ Covered |
| FR4 | Up to 2 follow-up questions | Epic 4 | ✓ Covered |
| FR5 | Analysis gate until quality threshold met | Epic 4 | ✓ Covered |
| FR6 | Guided conversational agent | Epic 4 | ✓ Covered |
| FR7 | Structured extraction without user prompting | Epic 4 | ✓ Covered |
| FR8 | Norse-flavored loading state | Epic 4 | ✓ Covered |
| FR9 | Pipeline disclosure at first analysis | Epic 4 | ✓ Covered |
| FR10 | Role-based persona generation | Epic 4 | ✓ Covered |
| FR11 | Navigable role-filtered user flow | Epic 4 | ✓ Covered |
| FR12 | Information architecture generation | Epic 4 | ✓ Covered |
| FR13 | Synthesis overview generation | Epic 4 | ✓ Covered |
| FR14 | Single-section regeneration | Epic 5 | ✓ Covered |
| FR15 | Multi-artifact workspace navigation | Epic 5 | ✓ Covered |
| FR16 | Role filter on user flow view | Epic 5 | ✓ Covered |
| FR17 | Instantaneous artifact navigation transitions | Epic 5 | ✓ Covered |
| FR18 | All artifacts viewable within single session | Epic 5 | ✓ Covered |
| FR19 | Create new project | Epic 3 | ✓ Covered |
| FR20 | View project list | Epic 3 | ✓ Covered |
| FR21 | Open and revisit existing project | Epic 3 | ✓ Covered |
| FR22 | Delete a project | Epic 3 | ✓ Covered |
| FR23 | Hard delete — full data purge | Epic 3 | ✓ Covered |
| FR24 | Advance notification before inactivity purge | Epic 7 | ✓ Covered |
| FR25 | Automatic 12-month inactivity purge | Epic 7 | ✓ Covered |
| FR26 | Account creation (email + password) | Epic 1 | ✓ Covered |
| FR27 | Password reset request via email | Epic 1 | ✓ Covered |
| FR28 | Password reset via time-limited link | Epic 1 | ✓ Covered |
| FR29 | Login and logout | Epic 1 | ✓ Covered |
| FR30 | Upgrade Free → Pro | Epic 6 | ✓ Covered |
| FR31 | Subscription management via billing portal | Epic 6 | ✓ Covered |
| FR32 | Free-tier project cap enforcement | Epic 3 | ✓ Covered |
| FR33 | Upgrade prompt at project cap | Epic 3 | ✓ Covered |
| FR34 | No project limit surfaced to Pro users | Epic 3 | ✓ Covered |
| FR35 | Stripe billing lifecycle processing | Epic 6 | ✓ Covered |
| FR36 | Operator token spend email alert | Epic 7 | ✓ Covered |
| FR37 | Free-tier cap configurable without deploy | Epic 7 | ✓ Covered |
| FR38 | Operator access to usage + billing dashboards | Epic 7 | ✓ Covered |
| FR39 | Public marketing landing page | Epic 2 | ✓ Covered |
| FR40 | SEO-indexed public pages | Epic 2 | ✓ Covered |
| FR41 | Meta titles, descriptions, OG tags | Epic 2 | ✓ Covered |

### Missing Requirements

None — all 41 FRs have traceable epic coverage.

### Coverage Statistics

- Total PRD FRs: 41
- FRs covered in epics: 41
- Coverage percentage: **100%**

---

## UX Alignment Assessment

### UX Document Status

Found: `_bmad-output/planning-artifacts/ux-design-specification.md` (complete, 14/14 steps, produced from PRD as input)

### UX ↔ PRD Alignment

Strong alignment. The UX spec was produced directly from the PRD and references it as its sole input document. All 4 user journeys in the PRD are elaborated with flow diagrams in the UX spec. All artifact types (personas, user flow, IA, synthesis) are specified at component level. The UX spec adds 20 UX-DR requirements (UX-DR1–UX-DR20) which are fully inventoried and mapped in epics.md.

**One open design decision:** The UX spec notes Futhark script as "a potential subtle visual texture element — not confirmed; evaluate at visual design stage." Story 4.4 references this conditionally ("Futhark texture if adopted"). This is not a blocking gap but requires a resolution decision before Story 4.4 implementation begins.

**One missing AC:** The UX spec specifies: *"Estimated duration shown only if >30 seconds: 'This Realm is complex. A moment more.'"* This behavior is not captured in Story 4.4's acceptance criteria. Minor gap — recommend adding to Story 4.4 before it is developed.

### UX ↔ Architecture Alignment

Strong alignment. The architecture document was produced from both the PRD and UX spec as inputs and explicitly enumerates all 9 custom components from the UX spec. Key alignment confirmations:

- Zustand `WorkspaceStore` shape (`phase`, `activeArtifact`, `activeRole`, `regeneratingSection`) directly supports the UX's two-phase model and section-local regeneration requirement
- Architecture's two loading mode pattern (full analysis via `phase = 'loading'`; section-local via `regeneratingSection`) maps exactly to UX spec's loading state specification
- SSR/SSG for marketing pages and client-side SPA for authenticated workspace matches UX platform strategy
- `<100ms` artifact navigation achieved architecturally via client-side Zustand state (no network request) — UX requirement satisfied by design

**Identified accessibility concern (self-flagged in UX spec):** `--fg-muted` (zinc-600) on `--surface` (#0A0A0A) yields ~3.2:1 contrast ratio — below the WCAG AA 4.5:1 requirement for normal text. The UX spec itself flags this: *"Action required: `--fg-muted` fails contrast for body text... No `--fg-muted` on text that conveys essential information."* No story explicitly enforces this constraint. Recommend adding a note to Story 1.1 (design token setup) and Story 5.6 (accessibility) specifying that `--fg-muted` is restricted to non-essential labels (timestamps, metadata) only.

### Warnings

- **Futhark script decision**: Must be resolved before Story 4.4 begins. Two options: confirm and specify texture usage, or explicitly remove from scope.
- **Estimated duration text in loading state**: Not captured in Story 4.4 AC. Add before development.
- **`--fg-muted` contrast enforcement**: No story enforces the UX spec's own constraint. Recommend adding implementation guard to Story 1.1 and Story 5.6.

---

## Epic Quality Review

### Epic Evaluation Summary

| Epic | Title | User Value | Independence | Stories | Status |
|---|---|---|---|---|---|
| 1 | Foundation & Authentication | ✓ Auth stories deliver user value; Story 1.1 is infra (acceptable for greenfield) | ✓ Standalone | 1.1–1.5 | ⚠️ Schema gaps |
| 2 | Marketing & Acquisition | ✓ Prospective users can discover and sign up | ✓ Public SSG/SSR — buildable without Epic 1 complete | 2.1–2.2 | ✓ Pass |
| 3 | Realm Management | ✓ Users manage their projects | Requires Epic 1 (auth). Backward dep only. | 3.1–3.4 | ✓ Pass |
| 4 | Brief Submission & AI Analysis Pipeline | ✓ Core product value delivered | Requires Epics 1 + 3. Story 4.1 is a developer story | 4.1–4.5 | ⚠️ Minor gaps |
| 5 | Artifact Workspace | ✓ Defining product experience | Requires Epics 1 + 3 + 4 | 5.1–5.6 | ✓ Pass |
| 6 | Subscription & Billing | ✓ Users can upgrade and manage billing | Requires Epic 1. Blocked by schema gap. | 6.1–6.3 | 🔴 Critical |
| 7 | Operational Controls & Monitoring | ✓ Operator value | Requires Epics 1 + 6 | 7.1–7.3 | 🔴 Critical |

---

### 🔴 Critical Violations

#### CV-1: `stripe_customer_id` missing from Story 1.2 database schema

**Location:** Story 1.2 `profiles` table definition
**Impact:** Blocks entire Epic 6 implementation

The `profiles` table in Story 1.2 defines: `(id, subscription_tier, has_seen_disclosure, created_at, updated_at)`.

Story 6.2 creates a Stripe Checkout Session and Story 6.1 processes `customer.subscription.created` webhooks — both require a mechanism to link a Stripe customer to a Supabase user. Without `stripe_customer_id` in `profiles`:
- `createCheckoutSession` cannot check if the user already has a Stripe customer ID (double-customer risk)
- The webhook handler cannot determine which `profiles` row to update when a Stripe lifecycle event fires

**Remediation:** Add `stripe_customer_id TEXT UNIQUE` to the `profiles` table definition in Story 1.2's AC. Add `stripe_customer_id` update logic to Story 6.2 (set after checkout session creation) and Story 6.1 (read `stripe_customer_id` to identify user in webhook handler).

---

#### CV-2: `last_active_at` missing from Story 1.2 database schema

**Location:** Story 1.2 `profiles` table definition
**Impact:** Blocks Story 7.3 (Inactivity Purge)

Story 7.3 specifies: *"A monthly scheduled job checks `profiles.last_active_at` for all free-tier users"* and *"`last_active_at` is updated in the auth middleware on each authenticated request."* Neither the column nor the middleware update is included in any Epic 1 story.

**Remediation:**
1. Add `last_active_at TIMESTAMPTZ DEFAULT now()` to the `profiles` table in Story 1.2
2. Add an acceptance criterion to Story 1.4 (Login & Logout) or create a new Story 1.6: auth middleware updates `profiles.last_active_at` on each successful authenticated request

---

### 🟠 Major Issues

#### MI-1: Zustand workspace store (`useWorkspaceStore`) has no creation story

**Location:** Referenced in Stories 4.2, 4.4, 5.1, 5.2, 5.4, 5.5 — never created in a story
**Impact:** Implementation ambiguity; risk of inconsistent store shape across stories

The Zustand `WorkspaceStore` shape is specified in the architecture doc:
```typescript
type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
}
```
No story creates `src/stores/workspaceStore.ts`. This means the first developer to implement Story 4.2 must infer store shape from the architecture doc and multi-story context.

**Remediation:** Add an AC to Story 4.2 (Brief Input Surface) to create `src/stores/workspaceStore.ts` with the full store shape and initial values defined in the architecture doc. Alternatively add it to Story 1.1 with other initialization tasks.

---

#### MI-2: Email delivery provider not set up in any story

**Location:** Stories 7.1 and 7.3 both require sending emails; no story installs or configures an email provider
**Impact:** Stories 7.1 and 7.3 cannot be implemented without an email sender

Story 7.1 notes: *"Use Supabase's built-in email capabilities or a lightweight SMTP integration (e.g., Resend) for alert delivery."* Story 7.3 requires an advance notification email. Neither story includes installing the email SDK or configuring environment variables for the email service.

**Remediation:** Add to Story 1.1 (Project Initialization) or create an early Story 7.0 "Email Provider Setup" that installs the Resend SDK (`npm install resend`), adds `RESEND_API_KEY` to `.env.example`, and validates send capability.

---

#### MI-3: `last_active_at` middleware update has no story owner

**Location:** Story 7.3 Technical Notes: *"`last_active_at` is updated in the auth middleware on each authenticated request"*
**Impact:** The middleware update is a cross-cutting concern with no story to implement it

The auth middleware update needed for inactivity tracking touches code from Epic 1 but is only mentioned in Epic 7. When a developer implements Story 7.3, the middleware change will require touching authenticated routes set up in Epic 1 — a backward dependency.

**Remediation:** Create Story 1.6 (or add an AC to Story 1.4): *"As a developer, when any authenticated request completes, `profiles.last_active_at` is updated to `now()` via the Supabase server client in middleware."* This makes the update part of Epic 1's auth foundation where it belongs.

---

### 🟡 Minor Concerns

#### MC-1: Stories 4.1→4.2→4.3→4.4→4.5 have implicit sequential dependencies not documented

Story 4.1 (`AttentionRegion` + button system) is required by Story 4.3 (quality gate uses `AttentionRegion`). Story 4.2 (Brief Input Surface) is required by Story 4.3 (quality gate renders below it). This ordering is obvious from context but not documented with `after`/`before` indicators in the story file. Minor risk for parallel development.

**Remediation:** Add a note at the top of Epic 4 in `epics.md` stating that Stories 4.1–4.5 must be implemented in sequence.

---

#### MC-2: NFR-PERF-3 (app initial load <3 seconds) not verified in any story AC

No story includes a Lighthouse or performance measurement for the authenticated app initial load. Story 2.1 covers the marketing page Lighthouse requirement (NFR-PERF-4) but NFR-PERF-3 has no story-level verification.

**Remediation:** Add an AC to Story 5.1 or Story 5.6: *"Given the app loads at `/projects/[projectId]/workspace`, when measured on standard broadband via Lighthouse, the TTI (Time to Interactive) completes in under 3 seconds."*

---

#### MC-3: NFR-REL-3 (Supabase unavailability) not addressed in any story

NFR-REL-3: *"Supabase unavailability must not corrupt stored project data; operations fail cleanly rather than partially."* No story explicitly tests or verifies this behavior. The architecture's `ActionResult<T>` pattern and Supabase query error checking pattern (`{ data, error }`) address this implicitly, but no story AC confirms it.

**Remediation:** Low priority — the architecture pattern handles this by design. Document as an implementation assumption. No new story required.

---

#### MC-4: Story 4.4 missing AC for "long generation" estimated duration text

The UX spec specifies: *"Estimated duration shown only if >30 seconds: 'This Realm is complex. A moment more.'"* Story 4.4 acceptance criteria do not include this behavior.

**Remediation:** Add one AC to Story 4.4: *"Given the loading state has been active for more than 30 seconds, when the invocation is still running, then a second text line appears below the cycling invocation: 'This Realm is complex. A moment more.' using `--fg-subtle` text."*

---

### Best Practices Compliance Summary

| Check | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Epic 6 | Epic 7 |
|---|---|---|---|---|---|---|---|
| User value | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Epic independence | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No forward dependencies | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DB tables when needed | ✓* | N/A | ✓ | ✓ | ✓ | ⚠️ | ⚠️ |
| Clear ACs | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FR traceability | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

*Story 1.2 creates all tables upfront — acceptable for Supabase migration-based projects; however missing columns for `stripe_customer_id` and `last_active_at` are blocking gaps.

---

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK — Conditionally Ready**

The planning artifacts (PRD, Architecture, UX Design, Epics & Stories) are comprehensive and well-aligned. FR coverage is 100%. UX-Architecture alignment is strong. The majority of stories have specific, testable acceptance criteria in correct BDD format. However, **2 critical schema gaps** will block Epic 6 and Epic 7 if not resolved before those epics are implemented. These are small, targeted fixes — not architectural rework.

Recommended path: fix the critical and major issues in `epics.md` before starting Sprint Planning, then proceed to Phase 4.

---

### Critical Issues Requiring Immediate Action

| ID | Issue | Blocked Epic | Fix Required |
|---|---|---|---|
| CV-1 | `stripe_customer_id` missing from `profiles` schema in Story 1.2 | Epic 6 | Add column to Story 1.2 AC; add usage to Stories 6.1 and 6.2 |
| CV-2 | `last_active_at` missing from `profiles` schema in Story 1.2 | Epic 7 (Story 7.3) | Add column to Story 1.2 AC; create Story 1.6 for middleware update |

---

### Recommended Next Steps

1. **Fix Story 1.2 schema** — Add two columns to the `profiles` table AC:
   - `stripe_customer_id TEXT UNIQUE`
   - `last_active_at TIMESTAMPTZ DEFAULT now()`

2. **Create Story 1.6: Auth Middleware — Last Active Tracking** — Add a story to Epic 1 that updates `profiles.last_active_at` on each authenticated request via Supabase server client in the Next.js middleware.

3. **Update Stories 6.1 and 6.2 for `stripe_customer_id`** — Story 6.2's `createCheckoutSession` should set `stripe_customer_id` on the `profiles` row after Stripe confirms the customer. Story 6.1's webhook handler should look up the user via `stripe_customer_id`.

4. **Add email provider setup to Story 1.1 or create Story 7.0** — Install the Resend SDK, add `RESEND_API_KEY` to `.env.example`. Stories 7.1 and 7.3 depend on this.

5. **Add `useWorkspaceStore` initialization to Story 4.2 AC** — Create `src/stores/workspaceStore.ts` with the full store shape defined in the architecture doc.

6. **Add 4 minor AC additions** (low priority, before the relevant story is developed):
   - Story 4.2: initialize `workspaceStore`
   - Story 4.4: add AC for 30-second extended loading text
   - Story 5.6: add explicit `--fg-muted` constraint (essential-only use)
   - Story 5.1 or 5.6: add NFR-PERF-3 app load verification

---

### Issue Totals

| Severity | Count | Description |
|---|---|---|
| 🔴 Critical | 2 | Schema gaps blocking Epic 6 and Epic 7 |
| 🟠 Major | 3 | Missing store initialization, missing email provider setup, missing middleware story |
| 🟡 Minor | 4 | Missing ACs for specific UX behaviors and NFR verification |

**Total issues: 9** — All are targeted, localized fixes to `epics.md`. No architectural rework required. No PRD changes required.

---

**Assessment completed:** 2026-04-18
**Assessor:** Implementation Readiness Check (BMad)
**Documents reviewed:** PRD, Architecture, UX Design Specification, Epics & Stories
