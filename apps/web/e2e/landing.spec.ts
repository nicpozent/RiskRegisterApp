import { test, expect } from '@playwright/test';

// Real-browser smoke of the unauthenticated shell: the built SPA loads, MSAL
// initializes, and the sign-in screen renders without the authenticated nav.
test('unauthenticated landing renders the sign-in screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Risk Register/);
  await expect(page.getByRole('heading', { name: /Risk Register/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Microsoft Entra ID/ })).toBeVisible();

  // Authenticated-only navigation must not be present before sign-in.
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Register' })).toHaveCount(0);
});

test('the sign-in control is a focusable, interactive button', async ({ page }) => {
  await page.goto('/');
  const signIn = page.getByRole('button', { name: /Sign in with Microsoft Entra ID/ });
  await signIn.focus();
  await expect(signIn).toBeFocused();
});
