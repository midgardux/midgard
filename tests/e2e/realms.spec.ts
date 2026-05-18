import { test, expect } from '@playwright/test';

// Shared helper — waits for Suspense to resolve then clicks whichever "open form" button is present
async function clickOpenRealmForm(page: import('@playwright/test').Page) {
  const btn = page.getByRole('button', { name: /New Realm|Create your first Realm/ });
  await btn.waitFor({ timeout: 10_000 });
  await btn.click();
}

test.describe('Realms list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('loads the realms page', async ({ page }) => {
    // Wait for Suspense (RealmList) to resolve
    const openFormBtn = page.getByRole('button', { name: /New Realm|Create your first Realm/ });
    await openFormBtn.waitFor({ timeout: 10_000 });

    const hasRealms = await page.getByRole('button', { name: 'New Realm' }).isVisible();
    if (hasRealms) {
      await expect(page.getByRole('button', { name: 'New Realm' })).toBeVisible();
    } else {
      await expect(page.getByText('Your first Realm awaits.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create your first Realm' })).toBeVisible();
    }
  });

  test('app nav shows Midgard, Account, and Log out', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Midgard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });
});

test.describe('Create and delete a realm', () => {
  test('full create → verify workspace → delete cycle', async ({ page }) => {
    await page.goto('/projects');

    await clickOpenRealmForm(page);

    // Form appears
    await expect(page.getByLabel('Realm name')).toBeVisible();

    // Fill in the name
    const realmName = `QA Test Realm ${Date.now()}`;
    await page.getByLabel('Realm name').fill(realmName);

    // Submit — navigates to workspace
    await page.getByRole('button', { name: 'Create Realm' }).click();
    await expect(page).toHaveURL(/\/projects\/.+\/workspace/, { timeout: 10_000 });

    // Workspace shows the realm name in the sticky subheader
    await expect(page.getByRole('heading', { level: 1 })).toContainText(realmName);

    // Brief input surface is shown for a fresh realm
    await expect(page.getByPlaceholder('Describe your product to the Allfather.')).toBeVisible();

    // Delete the realm we just created
    await page.getByRole('button', { name: 'Delete' }).click();

    // Confirm dialog appears
    await expect(page.getByText('This will permanently delete')).toBeVisible();
    await page.getByRole('button', { name: 'Delete forever' }).click();

    // Redirects back to realms list
    await expect(page).toHaveURL('/projects', { timeout: 10_000 });
  });

  test('cancel new realm form discards input and closes form', async ({ page }) => {
    await page.goto('/projects');

    await clickOpenRealmForm(page);

    const nameInput = page.getByLabel('Realm name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Should be discarded');

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Form is gone; the open-form button is back
    await expect(nameInput).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /New Realm|Create your first Realm/ })
    ).toBeVisible();
  });
});

test.describe('Navigate to existing realm', () => {
  test('clicking a realm card opens its workspace', async ({ page }) => {
    await page.goto('/projects');

    // Wait for Suspense to resolve
    const openFormBtn = page.getByRole('button', { name: /New Realm|Create your first Realm/ });
    await openFormBtn.waitFor({ timeout: 10_000 });

    // Only run if realms exist
    const hasRealms = await page.getByRole('button', { name: 'New Realm' }).isVisible();
    if (!hasRealms) {
      test.skip();
      return;
    }

    // Click the first realm link
    await page.locator('ul li a').first().click();
    await expect(page).toHaveURL(/\/projects\/.+\/workspace/, { timeout: 10_000 });
  });
});
