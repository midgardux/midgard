---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
completedAt: '2026-04-16'
lastEdited: '2026-04-16'
editHistory:
  - date: '2026-04-16'
    changes: 'Added J4 acquisition journey; defined input quality threshold in FR3/FR5; removed implementation leakage from FR35/FR38; tightened NFR specificity (Scalability, Accessibility, Reliability)'
releaseMode: phased
inputDocuments: []
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - Midgard

**Author:** Jason
**Date:** 2026-04-16

## Executive Summary

Midgard is a web-based UX analysis tool that converts vague or incomplete product briefs into structured, interactive UX foundations. The target user is a solo designer or contractor who routinely receives underspecified client briefs and needs to move from ambiguity to actionable artifacts without a team or a two-day synthesis sprint. The core problem: translating incomplete input into user flows, personas, and IA is a 1-2 day manual effort that adds no creative value. Midgard compresses it to under ten minutes.

The product accepts input via freeform conversation or text file upload (Word, PDF, Markdown, TXT). A guided conversational agent extracts the right information, then generates four artifact types: role-based personas, user flows, information architecture, and a synthesis overview. Output is a working document for the designer's personal use — a structured starting point before opening Figma, not a client deliverable. It replaces the blank page; it does not replace the designer.

### What Makes It Special

The constraint is not AI capability — it's structure and presentation. General-purpose LLMs produce intelligent but unorganized output that requires manual interpretation and reformatting. Midgard produces UX-native artifacts that match how designers actually think: navigable flows, role-filtered personas, structured IA. The interface performs structural work a raw prompt cannot.

The differentiating moment: when the first user flow renders from a paragraph of input, users stop perceiving it as a chatbot and start perceiving it as a tool. V1 is built around protecting that moment.

Two conditions make this the right time: AI generation quality has crossed the trust threshold where structured synthesis is reliable enough to use without heavy correction; and the market is flooded with generic AI tools, leaving a near-total gap in tooling built specifically for UX thinking.

## Project Classification

- **Type:** Web app — SPA, browser-based, SaaS subscription model
- **Domain:** Design and productivity tooling (no regulated industry constraints)
- **Complexity:** Medium — AI generation pipeline, subscription billing, auth, multi-artifact output
- **Context:** Greenfield — prior prototype (Agent Uxley) exists as reference only; code not carried forward
- **Constraint:** Solopreneur — single builder and maintainer; low operational overhead is non-negotiable
- **Stack:** Next.js + Vercel + Supabase + Stripe + Claude API

## Success Criteria

### User Success

A designer receives a new client brief, opens Midgard, and has a working UX foundation — user flows, personas, IA, and synthesis — in under ten minutes. The primary success signal is project-based return: users come back with every new client brief. This is a low-frequency, high-dependency usage pattern, not daily engagement.

Secondary signal: section regeneration over full restart. When users refine individual artifacts rather than re-running the whole project, it indicates they trust the output enough to build on it. That trust is the product working.

### Business Success

- **Month 12 target:** 50 paying users = viable; 100 paying users = strong
- **Free-to-paid conversion:** 10–15% (self-serve SaaS baseline at this price point)
- **Pro tier:** $15–20/month flat fee, no usage caps surfaced to user
- **Revenue goal:** Sufficient MRR to justify ongoing solo maintenance — sustainable solopreneur product, not growth-at-all-costs

### Technical Success

- User flow and persona generation must be fast, accurate, and structurally clean — these are the product; they cannot be mediocre at launch
- Artifact navigation must be smooth and instant — the wow moment depends on it
- Single-section regeneration must work reliably without corrupting project state
- System must operate with minimal operational overhead: no on-call, no manual intervention, self-healing where possible
- Token costs absorbed into flat pricing; never surfaced to users

### Measurable Outcomes

| Metric | Target |
|---|---|
| Brief-to-artifacts generation time | < 10 minutes |
| Paying users at month 12 | 50 (floor) / 100 (goal) |
| Free-to-paid conversion | 10–15% |
| Project-based return rate | > 30% of active free users |
| Section regeneration rate | Tracked as proxy for output trust |

## User Journeys

### Journey 1: The Solo Designer — Happy Path

**Maya** is a freelance UX contractor with five years of client work. She gets paid to make sense of chaos, but the chaos keeps getting worse. A new client emails at 9pm: kickoff is tomorrow at 10am. The attached brief is three paragraphs of vague vision and a feature wishlist with no users, no flows, and no clear problem statement.

She opens Midgard and pastes the brief into the conversation. The agent acknowledges what it has, asks one targeted question — *who is the primary user, and what's the single most important thing they need to do?* — then runs. Eight minutes later she has four artifacts: two personas with distinct role perspectives, a navigable user flow filtered by role, an IA skeleton, and a synthesis overview that names the core tension in the product. She clicks between them, switches the flow to the secondary role, reads the synthesis. She has a mental model she didn't have before.

She closes Midgard and opens Figma. She shows up to the 10am kickoff thinking three levels deeper than the client expected. They ask how she got so prepared. She doesn't mention it was ten minutes of work.

**Capabilities revealed:** Conversational input with guided agent, text file upload, 4-artifact generation pipeline, artifact navigation, role-filtered flow view, synthesis overview.

---

### Journey 2: The Solo Designer — Thin Brief

**Same Maya, different client.** The brief is one sentence: *"We want to build an app for dog owners."*

She pastes it in. Midgard doesn't guess. It surfaces an input quality signal immediately: *"This brief doesn't have enough to work with yet. Two quick questions: What does the app help dog owners do specifically? And who's the primary person — the owner, a groomer, a vet?"* She answers in three sentences. That's enough.

The analysis runs. The artifacts aren't as sharp as a full brief would produce, but they're directional and structurally sound. She reads the synthesis overview and spots that the IA assumed a consumer-facing product when the client might actually want a B2B tool for groomers. She regenerates the IA section with a clarifying note. It updates. The rest of the project stays intact.

She has something to walk into the discovery call with. She didn't waste a generation on garbage output, and she didn't spend two days guessing.

**Capabilities revealed:** Input quality detection, targeted follow-up question generation, analysis gate (holds until input quality threshold is met), single-section regeneration without re-running full project.

---

### Journey 3: The Operator — Token Cost Alert

**Jason** built and runs Midgard alone. Friday afternoon, an email arrives from his own system: *"Monthly token spend has crossed your alert threshold."* He wasn't expecting it mid-month.

He opens the Supabase dashboard and filters user activity for the past week. One free-tier user ran 34 analysis sessions in four days. Not a normal usage pattern — likely a power user stress-testing before deciding to pay, a developer probing the system, or an edge case in the input quality gate that's letting thin briefs loop. He checks the Stripe dashboard: no conversion event. Still free tier.

He adjusts the free-tier project cap in Supabase config. No code deploy. The user hits the limit on their next session and sees the upgrade prompt. Spend normalizes over the weekend. Jason notes the pattern as a data point for calibrating the free tier limit at the next monthly review.

No ticket was opened. No support interaction happened. He handled it in ten minutes from two browser tabs.

**Capabilities revealed:** Email alert when monthly token spend crosses a configured threshold, free-tier project cap configurable without code deploy, Supabase and Stripe as V1 admin surfaces (no custom admin UI).

---

### Journey 4: The Prospective User — Discovery to Signup

A designer searching for UX tooling finds Midgard via organic search. They land on the marketing page, read the product description and pricing, and understand the value proposition without needing to speak to anyone. They sign up for the free tier, create their first project, and hit the natural limit that surfaces the upgrade prompt.

**Capabilities revealed:** Public marketing landing page with product and pricing information, SEO-indexed public pages, meta and OG tags for discoverability, free-tier project cap with upgrade prompt.

---

### Journey Requirements Summary

| Capability | Source Journey |
|---|---|
| Conversational input with guided agent | J1, J2 |
| Text file upload (Word, PDF, MD, TXT) | J1 |
| Input quality detection and analysis gate | J2 |
| Targeted follow-up question generation | J2 |
| 4-artifact generation pipeline | J1, J2 |
| Artifact navigation (click between artifacts) | J1 |
| Role-filtered user flow view | J1 |
| Single-section regeneration | J2 |
| Token spend email alert with configurable threshold | J3 |
| Free-tier project cap configurable without code deploy | J3 |
| Public marketing landing page with product and pricing | J4 |
| SEO-indexed public pages | J4 |
| Free-tier project cap with upgrade prompt | J4 |

## Domain-Specific Requirements

Midgard operates in a general domain with no formal compliance mandates. However, the product processes client briefs that may contain unreleased product strategy, competitive intelligence, or confidential client IP. The following requirements address data handling expectations that directly affect user trust and purchasing decisions — particularly for contractors working under NDAs.

### Data Privacy & Handling

- **Stored data:** Brief text, full conversation history, and all generated artifacts are stored per project
- **Hard delete:** When a user deletes a project, all associated data is permanently purged. No soft deletes, no recovery. Delete means delete.
- **Account retention:** Project data persists as long as the account is active. Accounts inactive for 12 consecutive months with no active subscription trigger an automated purge of all project data, preceded by advance user notification.
- **Pipeline disclosure:** At the point of first analysis (not buried in ToS), a single visible sentence: *"Your input is processed by Anthropic's API and is not used to train models."* This is a trust signal for NDA-conscious contractors, not a legal requirement.

### Risk Mitigations

- Anthropic's API data handling policies cover the model-side promise; Midgard's obligation is transparency about the pipeline
- Hard delete removes solopreneur liability around retained client data and reduces long-term storage costs
- The 12-month inactivity purge keeps storage costs bounded without requiring active data management

## Innovation & Novel Patterns

### Detected Innovation Areas

**Vertical-specific AI tooling for UX designers.** The market is saturated with horizontal AI tools that require users to know how to prompt correctly. Midgard inverts this: the agent knows what information is needed for UX work and extracts it conversationally. The user describes a product; Midgard does the prompt engineering.

**The interface as the output.** The differentiator is not generation quality — it's presentation. Midgard produces structured, navigable, role-filtered artifacts that match UX mental models. The output is immediately usable without reformatting or interpretation.

**Input quality gate.** Most AI tools follow a generate-then-fix pattern. Midgard gates analysis behind a quality signal: if the input is too thin, the agent asks targeted follow-up questions before running. This reduces wasted generations, preserves token budget, and signals that the tool respects the user's time.

**AI as interviewer, not assistant.** Users never write a prompt. The agent conducts a guided conversation under the hood — asking the right questions, in the right order, to build a complete brief before analysis runs. This removes the skill barrier of prompt engineering entirely.

### Validation Approach

- The user flow render is the validation moment — if a designer sees a real, navigable flow from a paragraph of input and stops thinking "chatbot," the core innovation is working
- Track section regeneration rate as a proxy for output trust: if users refine rather than restart, artifact quality and format are resonating
- Monitor brief-to-generation completion rate: if users abandon mid-conversation, the guided agent is failing to extract enough signal

### Risk Mitigation

- **Generation quality risk:** Prompt design must be treated as a core engineering concern, not an afterthought; artifact schemas must constrain output format to prevent structural hallucinations
- **Novelty misread as complexity:** Users may expect a chatbot. First-run experience must set expectations clearly — this is not a prompt interface
- **Vertical focus as ceiling:** Not a V1 concern — validate the vertical before expanding

## Web App Specific Requirements

### Architecture Overview

Midgard is a Next.js hybrid web application: the authenticated app is a client-side SPA; the marketing landing page is server-side rendered for SEO. Both live in the same Next.js project. The marketing page is the primary sales motion — no paid acquisition, SEO is the distribution strategy.

**Rendering:**
- App (authenticated): Client-side SPA — dynamic, interactive artifact navigation with no full-page reloads
- Landing page (unauthenticated): SSR/SSG — SEO-optimized, fast first paint, crawlable

**Generation loading pattern:**
- V1: loading state followed by full artifact render — no streaming
- Loading state uses Norse-flavored microcopy to manage perceived wait time and reinforce product identity
- Streaming deferred to post-MVP; artifact rendering complexity does not justify it at launch

### Browser Matrix

| Browser | Support |
|---|---|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

No legacy browser support. No IE. No mobile browser optimization at launch.

### Responsive Design

Desktop-first. The app must be fully functional on desktop and tolerate tablet viewports without breaking. Mobile is explicitly out of scope for V1 — designing complex navigable UX artifacts for small screens is a distinct UX problem, not a CSS fix.

### SEO Strategy

- Landing page is the primary conversion surface; SEO is the distribution channel
- Core public pages: landing, pricing, login/signup
- Meta titles, descriptions, and OG tags required on all public pages
- No blog or content marketing in scope for V1

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach:** Revenue MVP — the smallest product that charges real money and validates the core assumption: solo designers will pay $15-20/month to compress two days of brief synthesis into ten minutes.

**Quality floor for launch:** User flows must render and be navigable. Personas must be structurally coherent. If those two conditions are met, ship. Everything else iterates based on live user feedback — real signal from a live product outweighs solo refinement in a vacuum.

**Resource requirements:** Single developer. Stack minimizes operational overhead: Next.js + Vercel (zero-ops deployment), Supabase (managed auth + database + storage), Stripe (managed billing). No DevOps, no on-call, no infrastructure maintenance.

### MVP Feature Set (Phase 1)

**Core user journeys supported:**
- Solo designer converts a brief to UX artifacts in under 10 minutes (happy path)
- Solo designer with a thin brief is guided to provide enough context before analysis runs (edge case)
- Operator monitors token spend and manages free tier limits via Supabase/Stripe dashboards (ops)

**Must-have capabilities:**
- Conversational input with guided agent (freeform, agent asks targeted questions under the hood)
- Text file upload (Word, PDF, Markdown, TXT)
- Input quality detection and analysis gate (targeted follow-up questions before analysis runs)
- User flow generation — navigable, role-filtered (must be excellent)
- Role-based persona generation (must be excellent)
- Information architecture generation (acceptable quality)
- Synthesis overview generation (acceptable quality)
- Artifact navigation (instantaneous, no loading state)
- Single-section regeneration (without re-running full project)
- Norse-flavored loading state with on-brand microcopy
- Pipeline disclosure at first analysis
- User authentication and accounts (Supabase Auth)
- Subscription billing: Free tier (hard project cap) + Pro tier ($15-20/month, no usage caps surfaced)
- Token spend email alert with configurable threshold
- Free-tier project cap configurable without code deploy
- Hard delete on project deletion (purge all data)
- Marketing landing page with SEO optimization

### Post-MVP Features (Phase 2 — Growth)

- Full in-place artifact editing
- Polished IA and synthesis overview (elevated from acceptable to excellent)
- Custom admin UI (usage dashboard, account management)
- Onboarding improvements based on early user behavior data

### Vision (Phase 3 — Expansion)

- Run history and comparison across project versions
- Figma handoff or export format
- Collaboration or sharing features (if market expands beyond solo designer)

### Risk Mitigation Strategy

**Technical risks:**
- *Artifact quality:* Prompt design is a core engineering concern from day one. Artifact schemas constrain Claude output format to prevent structural hallucinations. Quality floor (navigable flows + coherent personas) is the launch gate.
- *Input quality gate calibration:* False positives frustrate users; false negatives waste tokens and erode trust. Threshold must be tuned against real input diversity before launch.
- *Single-section regeneration:* Must not corrupt project state. Treat as an isolated operation with clear state boundaries.

**Market risks:**
- *Chatbot perception:* First-run experience must reframe expectations before analysis begins — this is a guided tool, not a chat window.
- *Free-to-paid conversion below target:* Free tier project cap creates natural upgrade pressure; Pro value must be visible before the limit is hit.

**Resource risks:**
- *Solopreneur bottleneck:* Every blocker is a total blocker. Stack eliminates operational failure modes.
- *Token cost spikes:* Free tier project cap bounds per-user exposure; email alert surfaces anomalies before they compound.

## Functional Requirements

### Brief Input & Ingestion

- **FR1:** User can start a new project by entering a freeform product description via text input
- **FR2:** User can upload a text-based brief file (Word, PDF, Markdown, TXT) as project input
- **FR3:** System can detect when a submitted brief lacks sufficient information to generate coherent artifacts — defined as a brief missing one or more of: a target user role, a primary problem or goal, and a product context
- **FR4:** System can ask up to two targeted follow-up questions to improve input quality before running analysis
- **FR5:** System gates analysis from running until the brief contains at minimum a target user role, a primary problem or goal, and a product context; briefs missing any of these trigger the follow-up sequence (FR4) before proceeding

### Guided Analysis Conversation

- **FR6:** User can converse with a guided agent that asks contextually relevant questions about their product
- **FR7:** Agent extracts structured product information from freeform input without requiring the user to write prompts
- **FR8:** System displays a branded loading state with Norse-flavored microcopy while analysis runs
- **FR9:** System displays a one-sentence pipeline disclosure at the point of first analysis per account

### Artifact Generation

- **FR10:** System generates role-based personas from brief input
- **FR11:** System generates a navigable, role-filtered user flow from brief input
- **FR12:** System generates an information architecture from brief input
- **FR13:** System generates a synthesis overview from brief input
- **FR14:** User can regenerate any individual artifact section without re-running the full project analysis

### Artifact Workspace

- **FR15:** User can navigate between artifact types (personas, user flow, IA, synthesis) within a single workspace
- **FR16:** User can filter the user flow view by role
- **FR17:** Artifact navigation transitions without a loading state
- **FR18:** User can view all generated artifacts for a project within a single session

### Project Management

- **FR19:** User can create a new project for each product brief
- **FR20:** User can view a list of all their projects
- **FR21:** User can open and revisit any existing project and its generated artifacts
- **FR22:** User can delete a project
- **FR23:** System permanently and irrecoverably purges all data associated with a deleted project
- **FR24:** System notifies users with inactive accounts before purging their project data
- **FR25:** System automatically purges all project data for accounts inactive for 12 consecutive months with no active subscription, following advance notification

### Account & Subscription

- **FR26:** User can create an account with email and password
- **FR27:** User can request a password reset via email
- **FR28:** User can reset their password using a time-limited link delivered to their registered email address
- **FR29:** User can log in and log out of their account
- **FR30:** User can upgrade from Free tier to Pro tier
- **FR31:** User can manage their subscription (view status, cancel) via a billing portal
- **FR32:** Free tier users can create projects up to a configurable hard limit
- **FR33:** Free tier users are shown an upgrade prompt when they reach the project limit
- **FR34:** Pro tier users have no project creation limit surfaced to them
- **FR35:** System processes subscription payments and manages billing lifecycle events (signup, upgrade, cancellation, renewal) via a third-party payment processor

### Platform Operations

- **FR36:** Operator receives an email alert when monthly token spend crosses a configurable threshold
- **FR37:** Operator can adjust the free-tier project cap without a code deployment
- **FR38:** Operator can access usage and subscription data via operator-facing infrastructure and billing dashboards

### Marketing & Discoverability

- **FR39:** Prospective users can access a public marketing landing page describing the product and pricing
- **FR40:** Marketing landing page and all public pages are indexable by search engines
- **FR41:** All public-facing pages include meta titles, descriptions, and Open Graph tags

## Non-Functional Requirements

### Performance

- Artifact navigation transitions complete in < 100ms
- Generation loading state appears within 500ms of analysis trigger
- App initial load completes in < 3 seconds on standard broadband
- Marketing landing page achieves Lighthouse scores ≥ 90 for Performance, SEO, and Accessibility
- File upload processing completes before analysis begins without blocking the UI

### Security

- All data transmitted over HTTPS/TLS
- All data stored at rest encrypted (Supabase default encryption)
- Payment data handled exclusively via Stripe — Midgard never stores, processes, or logs card details
- Password reset links expire within 1 hour of generation
- User sessions invalidated on explicit logout
- API keys and secrets stored as environment variables; never hardcoded or committed to source control

### Scalability

- Architecture supports growth from 0 to 500 concurrent active users without infrastructure changes or manual intervention
- Vercel autoscaling and Supabase managed infrastructure absorb traffic growth transparently
- Free tier project cap bounds per-user token consumption as user count grows
- Monthly token spend email alert fires when spend crosses a configurable operator-defined threshold, set below the operator's monthly budget ceiling to allow intervention before the ceiling is reached

### Accessibility

- WCAG 2.1 AA compliance across all authenticated app surfaces and the public marketing landing page
- Keyboard navigation supported for all user-facing actions: account creation, login/logout, project creation, brief submission, artifact navigation, and subscription management
- Screen reader compatibility for artifact navigation and viewing (personas, user flows, IA, synthesis overview)

### Reliability

- Claude API failures surface a user-visible error message with retry option within 5 seconds; no partial or corrupted project state is committed on failure
- Payment processor webhook failures must not silently place users in incorrect subscription tiers; tier state must be reconcilable from the billing dashboard without manual database intervention
- Supabase unavailability must not corrupt stored project data; operations fail cleanly rather than partially
- Generated artifacts are not lost between a successful generation and the user's next session
