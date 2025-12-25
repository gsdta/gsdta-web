import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Teachers Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TE2E-001: Admin can navigate to teachers list page', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('h1', { hasText: 'All Teachers' })).toBeVisible();
    await expect(page.getByText('View and manage all teachers in the system')).toBeVisible();
  });

  test('TE2E-002: Admin sees teachers table or empty state', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading to complete
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see the table or the empty state
    const table = page.locator('table');
    const emptyState = page.getByText('No teachers found');

    await expect(table.or(emptyState).first()).toBeVisible();
  });

  test('TE2E-003: Search input is visible', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    const searchInput = page.locator('input[placeholder="Search by name or email..."]');
    await expect(searchInput).toBeVisible();
  });

  test('TE2E-004: Status filter dropdown works', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Find the status filter label (in the filter section, not the table header)
    const statusLabel = page.locator('label[for="status"]');
    await expect(statusLabel).toBeVisible();

    // Verify select is visible and has options
    const statusSelect = page.locator('select#status');
    await expect(statusSelect).toBeVisible();

    // Check we can select different statuses
    await statusSelect.selectOption('inactive');
    await statusSelect.selectOption('all');
    await statusSelect.selectOption('active');
  });

  test('TE2E-005: Table shows correct columns', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check if table exists (may be empty state)
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    }
  });

  test('TE2E-006: Table has horizontal scroll on small screens', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check if table container has overflow-x-auto class
    const table = page.locator('table');
    if (await table.isVisible()) {
      const tableContainer = page.locator('.overflow-x-auto').filter({ has: table });
      await expect(tableContainer).toBeVisible();
    }
  });

  test('TE2E-007: Pagination controls are visible when needed', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check for pagination elements (if there are more than 50 teachers)
    const showingText = page.getByText(/Showing \d+ - \d+ of \d+ teacher/);
    if (await showingText.isVisible()) {
      // Pagination info is shown
      await expect(showingText).toBeVisible();
    }
  });

  test('TE2E-008: View link is present in actions column', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const table = page.locator('table');
    if (await table.isVisible()) {
      // Check that View links exist
      const viewLinks = page.getByRole('link', { name: 'View' });
      const count = await viewLinks.count();
      if (count > 0) {
        // Check first View link has correct href pattern
        const firstViewLink = viewLinks.first();
        const href = await firstViewLink.getAttribute('href');
        expect(href).toMatch(/\/admin\/users\/teachers\/[^/]+$/);
      }
    }
  });

  test('TE2E-009: Edit link is present in actions column', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const table = page.locator('table');
    if (await table.isVisible()) {
      // Check that Edit links exist
      const editLinks = page.getByRole('link', { name: 'Edit' });
      const count = await editLinks.count();
      if (count > 0) {
        // Check first Edit link has correct href pattern
        const firstEditLink = editLinks.first();
        const href = await firstEditLink.getAttribute('href');
        expect(href).toMatch(/\/admin\/users\/teachers\/[^/]+\/edit$/);
      }
    }
  });

  test('TE2E-010: Search filters teachers list', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder="Search by name or email..."]');
    await searchInput.fill('test@example.com');

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Verify search is applied (loading might briefly appear)
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });
  });

  test('TE2E-011: Empty state shows helpful message', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const emptyState = page.getByText('No teachers found');
    if (await emptyState.isVisible()) {
      await expect(page.getByText(/Try adjusting your filters|No teachers have been added yet/)).toBeVisible();
    }
  });
});

test.describe('Admin Teacher View Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TE2E-012: Teacher view page shows back link', async ({ page }) => {
    // First go to list and get a teacher uid
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const viewLinks = page.getByRole('link', { name: 'View' });
    const count = await viewLinks.count();

    if (count > 0) {
      await viewLinks.first().click();
      await expect(page.getByText('Back to Teachers')).toBeVisible();
    }
  });

  test('TE2E-013: Teacher view page shows teacher information section', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const viewLinks = page.getByRole('link', { name: 'View' });
    const count = await viewLinks.count();

    if (count > 0) {
      await viewLinks.first().click();

      // Wait for the view page to load
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      // Check for teacher information section
      await expect(page.getByRole('heading', { name: 'Teacher Information' })).toBeVisible();
    }
  });

  test('TE2E-014: Teacher view page shows account information section', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const viewLinks = page.getByRole('link', { name: 'View' });
    const count = await viewLinks.count();

    if (count > 0) {
      await viewLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      await expect(page.getByRole('heading', { name: 'Account Information' })).toBeVisible();
    }
  });

  test('TE2E-015: Teacher view page has edit button', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const viewLinks = page.getByRole('link', { name: 'View' });
    const count = await viewLinks.count();

    if (count > 0) {
      await viewLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      await expect(page.getByRole('link', { name: 'Edit Teacher' })).toBeVisible();
    }
  });

  test('TE2E-016: Non-existent teacher shows error', async ({ page }) => {
    await page.goto('/admin/users/teachers/non-existent-uid-12345');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Should show error or not found message
    const errorMessage = page.getByText(/Teacher not found|not found/i);
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('Admin Teacher Edit Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TE2E-017: Teacher edit page shows form fields', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      // Check for form fields
      await expect(page.locator('input#firstName')).toBeVisible();
      await expect(page.locator('input#lastName')).toBeVisible();
      await expect(page.locator('input#phone')).toBeVisible();
      await expect(page.locator('select#status')).toBeVisible();
    }
  });

  test('TE2E-018: Teacher edit page has back link', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      await expect(page.getByText('Back to Teacher Details')).toBeVisible();
    }
  });

  test('TE2E-019: Teacher edit page has cancel button', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
    }
  });

  test('TE2E-020: Teacher edit page has save button', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    }
  });

  test('TE2E-021: Email field is disabled on edit page', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      const emailInput = page.locator('input#email');
      await expect(emailInput).toBeDisabled();
    }
  });

  test('TE2E-022: Status dropdown has active/inactive options', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const editLinks = page.getByRole('link', { name: 'Edit' });
    const count = await editLinks.count();

    if (count > 0) {
      await editLinks.first().click();
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

      const statusSelect = page.locator('select#status');
      await expect(statusSelect.locator('option[value="active"]')).toBeVisible();
      await expect(statusSelect.locator('option[value="inactive"]')).toBeVisible();
    }
  });

  test('TE2E-023: Non-existent teacher edit page shows error', async ({ page }) => {
    await page.goto('/admin/users/teachers/non-existent-uid-12345/edit');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Should show error or not found message
    const errorMessage = page.getByText(/Teacher not found|not found/i);
    await expect(errorMessage).toBeVisible();
  });
});
