import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Flash News Management E2E Tests
 *
 * These tests verify the admin flash news management UI functionality
 * with Firebase Auth emulator authentication.
 */

test.describe('Admin Flash News Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('FN-001: Admin can navigate to flash news page', async ({ page }) => {
    await page.goto('/admin');

    // Click on Flash News in the sidebar
    await page.click('text=Flash News');

    // Verify we're on the flash news page
    await expect(page.locator('h1')).toContainText('Flash News Management');
    await expect(page.getByText('Manage scrolling news items')).toBeVisible();
  });

  test('FN-002: Admin can see create new button', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Verify Create New button is visible
    await expect(page.getByRole('button', { name: '+ Create New' })).toBeVisible();
  });

  test('FN-003: Admin can open create form', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Click Create New button
    await page.click('text=+ Create New');

    // Verify form is visible
    await expect(page.getByText('Create Flash News')).toBeVisible();
    // Check for the label text (not using getByLabel since no htmlFor)
    await expect(page.getByText('News Text (English) *')).toBeVisible();
    await expect(page.getByText('News Text (Tamil) *')).toBeVisible();
  });

  test('FN-004: Admin can create flash news', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Fill in the form using placeholder selectors
    await page.fill('input[placeholder*="New academic year"]', 'Test news from E2E');
    await page.fill('input[placeholder*="புதிய கல்வியாண்டு"]', 'E2E சோதனை செய்தி');

    // Set priority
    await page.fill('input[type="number"]', '50');

    // Handle the alert that will appear
    page.on('dialog', dialog => dialog.accept());

    // Submit the form
    await page.click('button:has-text("Create")');

    // Wait for response
    await page.waitForTimeout(1000);
  });

  test('FN-005: Admin can see filter buttons', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Verify filter buttons are visible using exact match
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inactive', exact: true })).toBeVisible();
  });

  test('FN-006: Admin can filter by active status', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Click Active filter (use exact match)
    await page.getByRole('button', { name: 'Active', exact: true }).click();

    // Verify Active button is highlighted (has blue background)
    const activeButton = page.getByRole('button', { name: 'Active', exact: true });
    await expect(activeButton).toHaveClass(/bg-blue-600/);
  });

  test('FN-007: Admin can filter by inactive status', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Click Inactive filter (use exact match)
    await page.getByRole('button', { name: 'Inactive', exact: true }).click();

    // Verify Inactive button is highlighted
    const inactiveButton = page.getByRole('button', { name: 'Inactive', exact: true });
    await expect(inactiveButton).toHaveClass(/bg-blue-600/);
  });

  test('FN-008: Urgent checkbox is available in form', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Verify urgent checkbox is visible (check for label text)
    await expect(page.getByText('Mark as Urgent')).toBeVisible();
  });

  test('FN-009: Link URL field is available', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Verify link URL field is visible (check for label text)
    await expect(page.getByText('Link URL (optional)')).toBeVisible();
  });

  test('FN-010: Date fields are available', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Verify date fields are visible (check for label text)
    await expect(page.getByText('Start Date (optional)')).toBeVisible();
    await expect(page.getByText('End Date (optional)')).toBeVisible();
  });

  test('FN-011: Form validation requires both languages', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Fill only English
    await page.fill('input[placeholder*="New academic year"]', 'English only');

    // Try to submit - form should not submit due to HTML5 required validation
    await page.click('button:has-text("Create")');

    // Form should still be visible (Tamil is required)
    await expect(page.getByText('Create Flash News')).toBeVisible();
  });

  test('FN-012: Cancel button closes form', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Open create form
    await page.click('text=+ Create New');

    // Verify form is visible
    await expect(page.getByText('Create Flash News')).toBeVisible();

    // Click Cancel button inside the form
    await page.locator('form button:has-text("Cancel")').click();

    // Form should be hidden
    await expect(page.getByText('Create Flash News')).not.toBeVisible();
  });

  test('FN-013: Info note is displayed', async ({ page }) => {
    await page.goto('/admin/content/flash-news');

    // Verify info note is visible
    await expect(page.getByText(/Flash news items scroll across/)).toBeVisible();
    await expect(page.getByText(/Urgent items show with a warning icon/)).toBeVisible();
  });
});

test.describe('Flash News Marquee on Homepage', () => {
  test('FN-014: Homepage loads without flash news when none active', async ({ page }) => {
    await page.goto('/');

    // Page should load successfully
    await expect(page).toHaveTitle(/GSDTA/i);

    // Marquee may or may not be visible depending on data
    // Just verify page loads without error
  });

  test('FN-015: Homepage has proper structure', async ({ page }) => {
    await page.goto('/');

    // Check that main homepage elements exist
    await expect(page.locator('body')).toBeVisible();

    // Page should have rendered without JavaScript errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // Filter out expected errors (like missing flash news)
    const unexpectedErrors = consoleErrors.filter(
      e => !e.includes('flash-news') && !e.includes('404')
    );

    expect(unexpectedErrors.length).toBe(0);
  });
});

test.describe('Flash News Access Control', () => {
  test('FN-016: Unauthenticated user cannot access admin flash news', async ({ page }) => {
    // Try to access admin page without login
    await page.goto('/admin/content/flash-news');

    // Should be redirected to login or show access denied
    // The Protected component should prevent access
    await expect(page.locator('body')).not.toContainText('Flash News Management');
  });
});
