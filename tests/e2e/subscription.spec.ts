import { test, expect } from '@playwright/test';

test.describe('Account page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
    // Wait for Suspense (AccountContent) to resolve — "Plan" only appears after load.
    // Use .first() throughout: the dev server double-renders RSC content briefly.
    await page.getByText('Plan').first().waitFor({ timeout: 10_000 });
  });

  test('renders account page with Plan section', async ({ page }) => {
    await expect(page.getByText('Plan').first()).toBeVisible();
  });

  test('shows subscription tier label', async ({ page }) => {
    const hasFree = await page.getByText('Free', { exact: true }).first().isVisible();
    const hasPro = await page.getByText('Pro', { exact: true }).first().isVisible();
    expect(hasFree || hasPro).toBe(true);
  });

  test('free tier shows Upgrade to Pro button', async ({ page }) => {
    const isFree = await page.getByText('Free', { exact: true }).first().isVisible();
    if (!isFree) {
      test.skip();
      return;
    }
    await expect(page.getByText('Upgrade to Pro for unlimited Realms.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible();
  });

  test('pro tier shows Manage subscription button', async ({ page }) => {
    const isPro = await page.getByText('Pro', { exact: true }).first().isVisible();
    if (!isPro) {
      test.skip();
      return;
    }
    await expect(page.getByRole('button', { name: 'Manage subscription' })).toBeVisible();
  });

  test('Upgrade to Pro button shows redirecting state when clicked', async ({ page }) => {
    const isFree = await page.getByText('Free', { exact: true }).first().isVisible();
    if (!isFree) {
      test.skip();
      return;
    }
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click();
    await expect(page.getByRole('button', { name: /redirecting/i })).toBeVisible({ timeout: 5_000 });
  });

  test('links back to Realms page', async ({ page }) => {
    await page.getByRole('link', { name: '← Realms' }).click();
    await expect(page).toHaveURL('/projects');
  });
});
