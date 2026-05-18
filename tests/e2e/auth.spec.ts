import { test, expect } from '@playwright/test';

// All tests in this file run without auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth guard', () => {
  test('redirects unauthenticated /projects to /login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/login');
  });

  test('redirects unauthenticated /account to /login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders form elements', async ({ page }) => {
    await expect(page.getByText('Log in').first()).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 8_000 });
  });

  test('links to sign up page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('links to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot your password?' }).click();
    await expect(page).toHaveURL('/forgot-password');
  });
});

test.describe('Sign up page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders form elements', async ({ page }) => {
    await expect(page.getByText('Sign up').first()).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Repeat Password')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Repeat Password').fill('different123');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('shows error for password under 8 characters', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Repeat Password').fill('short');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
  });

  test('links to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL('/auth/login');
  });
});

test.describe('Forgot password page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('renders form elements', async ({ page }) => {
    await expect(page.getByText('Forgot password').first()).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  });

  test('shows success state after submitting — no user enumeration', async ({ page }) => {
    await page.getByLabel('Email').fill('any@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Check your email').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Password reset instructions sent')).toBeVisible();
  });
});
