import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsParent } from './helpers/auth';

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
  test('admin can create teacher invite', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to invite page
    await page.goto('/admin/teachers/invite');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Invite Teacher' })).toBeVisible();

    // Fill in the email field
    await page.fill('input[type="email"]', 'newtestteacher@example.com');

    // Submit the form
    await page.getByRole('button', { name: /Create Invite/i }).click();

    // Wait for success message
    await expect(page.getByText(/Invite created for newtestteacher@example.com/i)).toBeVisible({ timeout: 10000 });

    // Verify invite link is displayed
    await expect(page.getByText(/Invite Link:/i)).toBeVisible();
  });

  test('non-admin cannot access invite creation', async ({ page }) => {
    await loginAsParent(page);

    // Try to navigate to admin invite page
    await page.goto('/admin/teachers/invite');

    // Should be redirected to signin or parent dashboard (not on admin page)
    await expect(page).not.toHaveURL(/\/admin\/teachers\/invite/);
  });
});
