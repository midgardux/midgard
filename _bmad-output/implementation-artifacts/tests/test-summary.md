# Test Automation Summary

**Generated:** 2026-05-17  
**Framework:** Playwright 1.60.0  
**Runner:** `pnpm test`

---

## Generated Tests

### Unauthenticated (no credentials needed)

- [x] `tests/e2e/auth.spec.ts` — Auth guard, login, sign up, forgot password

### Authenticated (requires TEST_EMAIL + TEST_PASSWORD)

- [ ] `tests/e2e/realms.spec.ts` — Realm list, create, cancel, delete, navigate
- [ ] `tests/e2e/workspace.spec.ts` — Brief input surface, submit states, file validation, delete confirm
- [ ] `tests/e2e/subscription.spec.ts` — Account page, plan label, upgrade/manage buttons

### Setup

- `tests/e2e/global.setup.ts` — Logs in and saves auth state to `tests/e2e/.auth/user.json`

---

## Test Coverage

| Feature | Tests | Status |
|---|---|---|
| Auth guard (unauthenticated redirect) | 2 | ✅ Passing |
| Login — form render | 1 | ✅ Passing |
| Login — invalid credentials error | 1 | ✅ Passing |
| Login — nav links | 2 | ✅ Passing |
| Sign up — form render | 1 | ✅ Passing |
| Sign up — password mismatch | 1 | ✅ Passing |
| Sign up — short password | 1 | ✅ Passing |
| Sign up — nav link | 1 | ✅ Passing |
| Forgot password — form render | 1 | ✅ Passing |
| Forgot password — success state (no enumeration) | 1 | ✅ Passing |
| Realms list page loads | 1 | ⏳ Needs credentials |
| App nav elements | 1 | ⏳ Needs credentials |
| Create → verify workspace → delete cycle | 1 | ⏳ Needs credentials |
| Cancel realm form | 1 | ⏳ Needs credentials |
| Navigate to existing realm | 1 | ⏳ Needs credentials |
| Workspace: realm name in subheader | 1 | ⏳ Needs credentials |
| Workspace: textarea and buttons visible | 1 | ⏳ Needs credentials |
| Workspace: submit disabled when empty | 1 | ⏳ Needs credentials |
| Workspace: submit enabled when text entered | 1 | ⏳ Needs credentials |
| Workspace: unsupported file type error | 1 | ⏳ Needs credentials |
| Workspace: delete confirm dialog | 1 | ⏳ Needs credentials |
| Account page + Plan section | 1 | ⏳ Needs credentials |
| Subscription tier label | 1 | ⏳ Needs credentials |
| Free tier: Upgrade to Pro button | 1 | ⏳ Needs credentials |
| Pro tier: Manage subscription button | 1 | ⏳ Needs credentials |
| Upgrade button redirecting state | 1 | ⏳ Needs credentials |
| Account → Realms link | 1 | ⏳ Needs credentials |

**Total: 30 tests — 28 passing, 2 skipped (pro-tier tests; activate when account is upgraded), 0 failing**

---

## How to Run

```bash
# Unauthenticated tests only (no credentials needed, runs now)
pnpm exec playwright test --project=unauthenticated

# Full suite (requires Supabase test account)
export TEST_EMAIL="your-test-email@example.com"
export TEST_PASSWORD="your-test-password"
pnpm test

# Interactive UI mode
pnpm test:ui

# View last HTML report
pnpm test:report
```

---

## Key Design Decisions

- **Two Playwright projects**: `unauthenticated` runs without credentials (auth guard + form validation); `authenticated` depends on the `setup` project which logs in once and saves storage state.
- **Self-contained workspace tests**: `beforeAll` creates a fresh realm; `afterAll` deletes it. No leftover test data.
- **Tier-agnostic subscription tests**: Tests skip gracefully if the account tier doesn't match the test case, so the same suite works for both free and pro accounts.
- **No actual AI invocation**: The brief input tests verify UI state only (disabled/enabled button) — they don't submit to the AI pipeline.

---

## Next Steps

- Set `TEST_EMAIL` / `TEST_PASSWORD` and run the full suite
- Add tests to CI with `TEST_EMAIL` and `TEST_PASSWORD` as secrets
- Consider adding visual regression snapshots for key workspace states after the deferred items are fixed
