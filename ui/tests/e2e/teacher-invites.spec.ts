import { test, expect } from '@playwright/test';

test.describe('Teacher Invite Flow', () => {
  test('should display invite verification page and show invite details', async ({ page }) => {
    // Set up test environment variable for test invite
    await page.goto('/invite/accept?token=test-valid-token');

    // Should show loading state
    await expect(page.getByText(/validating invite/i)).toBeVisible();

    // Should eventually show invite details (with ALLOW_TEST_INVITES=1 in API)
    // This test assumes API has test mode enabled
    await expect(page.getByText(/teacher@example.com/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/teacher/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /accept invite/i })).toBeVisible();
  });

  test('should show error for invalid invite token', async ({ page }) => {
    await page.goto('/invite/accept?token=invalid-token-xyz');

    // Should show loading state
    await expect(page.getByText(/validating invite/i)).toBeVisible();

    // Should show error
    await expect(page.getByText(/invite not found or expired/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error when token is missing', async ({ page }) => {
    await page.goto('/invite/accept');

    // Should immediately show error
    await expect(page.getByText(/missing invite token/i)).toBeVisible();
  });

  // Note: Full acceptance flow requires authentication which is complex to test in E2E
  // Additional scenarios to consider:
  // - User signs in with matching email and accepts invite
  // - User signs in with non-matching email and sees error
  // - Successful acceptance redirects to teacher dashboard
});

test.describe('Admin Teacher Invite Creation', () => {
  // Note: These tests require admin authentication
  // They should be implemented when auth mocking is available in E2E tests

  test.skip('admin can create teacher invite', async ({ page }) => {
    // TODO: Implement when admin auth is available
    // 1. Sign in as admin
    // 2. Go to /admin
    // 3. Fill in teacher email
    // 4. Click create invite
    // 5. Verify invite link is generated
  });

  test.skip('non-admin cannot access invite creation', async ({ page }) => {
    // TODO: Implement when auth is available
    // 1. Sign in as non-admin (parent/teacher)
    // 2. Try to go to /admin
    // 3. Should be redirected or see forbidden message
  });
});
