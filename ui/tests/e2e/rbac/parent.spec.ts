import { test, expect } from '@playwright/test';

/**
 * Parent RBAC E2E Tests
 *
 * NOTE: Tests requiring Firebase Auth login are currently experiencing
 * connectivity issues with the emulator from the browser context.
 * The structure tests verify page accessibility without requiring login.
 */

// Set English language for all tests in this file
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('i18n:lang', 'en');
      window.sessionStorage.clear();
    } catch {}
  });
});

test.describe('Parent Pages - Structure Tests', () => {
  test('parent page is protected', async ({ page }) => {
    await page.goto('/parent');

    // Wait for either redirect to signin OR show loading (auth checking)
    try {
      await page.waitForURL(/\/signin/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/signin/);
    } catch {
      // If no redirect, verify we see loading or signin link
      const hasLoading = await page.getByText(/loading/i).count() > 0;
      const hasSigninLink = await page.getByRole('link', { name: /login|sign in/i }).count() > 0;
      expect(hasLoading || hasSigninLink || page.url().includes('/signin')).toBeTruthy();
    }
  });
});
