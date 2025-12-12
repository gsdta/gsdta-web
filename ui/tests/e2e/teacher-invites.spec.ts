import { test, expect } from '@playwright/test';

test.describe('Teacher Invite Flow', () => {
  test('should display invite verification page and show invite details', async ({ page }) => {
    // Use a test token - when ALLOW_TEST_INVITES=1 and token starts with "test-",
    // the API returns mock data with teacher@example.com
    await page.goto('/invite/accept?token=test-invite-valid-123');

    // Should eventually show invite details
    // Note: Loading state may be too fast to catch reliably, so we wait for the email to be visible
    // The mock returns teacher@example.com (see roleInvites.ts line 60)
    await expect(page.getByTestId('invite-email')).toHaveText(/teacher@example.com/i, { timeout: 10000 });
    await expect(page.getByTestId('invite-role')).toHaveText(/teacher/i);
    await expect(page.getByRole('button', { name: /accept invite/i })).toBeVisible();
  });

  test('should show error for invalid invite token', async ({ page }) => {
    await page.goto('/invite/accept?token=invalid-token-xyz');

    // Should show error (loading state might be too fast to catch)
    await expect(page.getByText(/invite not found or expired/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error when token is missing', async ({ page }) => {
    await page.goto('/invite/accept');

    // Should immediately show error
    await expect(page.getByText(/missing invite token/i)).toBeVisible();
  });
});

test.describe('Admin Teacher Invite Creation', () => {
  // Note: These tests require admin authentication
  // They will be implemented when auth mocking is available in E2E tests

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
