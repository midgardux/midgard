import { test, expect } from '@playwright/test';

let workspaceUrl: string;
let realmName: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/projects');

  // Wait for Suspense (RealmList) to resolve before checking which button is present
  const openFormBtn = page.getByRole('button', { name: /New Realm|Create your first Realm/ });
  await openFormBtn.waitFor({ timeout: 10_000 });
  await openFormBtn.click();

  realmName = `QA Workspace Test ${Date.now()}`;
  await page.getByLabel('Realm name').fill(realmName);
  await page.getByRole('button', { name: 'Create Realm' }).click();
  await page.waitForURL(/\/projects\/.+\/workspace/, { timeout: 10_000 });
  workspaceUrl = page.url();

  await context.close();
});

test.afterAll(async ({ browser }) => {
  if (!workspaceUrl) return;
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(workspaceUrl);
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('This will permanently delete')).toBeVisible();
  await page.getByRole('button', { name: 'Delete forever' }).click();
  await page.waitForURL('/projects', { timeout: 10_000 });

  await context.close();
});

test.describe('Brief input surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(workspaceUrl);
  });

  test('shows realm name in subheader', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(realmName);
  });

  test('shows brief textarea and action buttons', async ({ page }) => {
    await expect(page.getByPlaceholder('Describe your product to the Allfather.')).toBeVisible();
    await expect(page.getByRole('button', { name: /invoke the allfather/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /upload brief/i })).toBeVisible();
  });

  test('INVOKE THE ALLFATHER is disabled when textarea is empty', async ({ page }) => {
    const textarea = page.getByPlaceholder('Describe your product to the Allfather.');
    await expect(textarea).toBeEmpty();
    await expect(page.getByRole('button', { name: /invoke the allfather/i })).toBeDisabled();
  });

  test('INVOKE THE ALLFATHER becomes enabled when text is entered', async ({ page }) => {
    await page.getByPlaceholder('Describe your product to the Allfather.').fill('A product for testing.');
    await expect(page.getByRole('button', { name: /invoke the allfather/i })).toBeEnabled();
  });

  test('shows error for unsupported file type', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.style.display = 'block';
    });

    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    });

    await expect(
      page.getByText('Unsupported file type. Use .docx, .pdf, .md, or .txt.')
    ).toBeVisible();
  });

  test('Delete button triggers confirm dialog and can be cancelled', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('This will permanently delete')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('This will permanently delete')).not.toBeVisible();
  });
});
