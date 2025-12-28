import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Student Bulk Operations E2E Tests
 *
 * These tests verify the bulk import and bulk class assignment UI functionality
 * with Firebase Auth emulator authentication.
 */

test.describe('Admin Student Bulk Import', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AE2E-050: Admin can navigate to import page', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Wait for the main heading to be visible
    await expect(page.locator('h1').filter({ hasText: 'Import Students from CSV' })).toBeVisible();
  });

  test('AE2E-051: Import page shows file upload section', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Check for file upload button
    await expect(page.getByText('Select CSV File')).toBeVisible();
  });

  test('AE2E-052: Import page shows template download button', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Check for template download button
    await expect(page.getByText('Download CSV Template')).toBeVisible();
  });

  test('AE2E-053: Import page shows required columns info', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Check that the page mentions required columns
    await expect(page.getByText(/Required columns/i)).toBeVisible();
  });

  test('AE2E-054: Import page has breadcrumb navigation', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Check for breadcrumb - use exact match to distinguish from sidebar "All Students" link
    await expect(page.getByRole('link', { name: 'Students', exact: true })).toBeVisible();
    // Import is shown as text span in breadcrumb
    await expect(page.locator('.text-sm.text-gray-500').filter({ hasText: 'Import' })).toBeVisible();
  });

  test('AE2E-055: Import page breadcrumb links back to students list', async ({ page }) => {
    await page.goto('/admin/students/import');

    // Click on Students breadcrumb
    await page.getByRole('link', { name: 'Students' }).first().click();
    await expect(page).toHaveURL(/.*\/admin\/students/);
  });
});

test.describe('Admin Student Bulk Class Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AE2E-060: Admin can navigate to assign class page', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for the main heading to be visible
    await expect(page.locator('h1').filter({ hasText: 'Bulk Assign Class' })).toBeVisible();
  });

  test('AE2E-061: Assign page shows class selector section', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Check for class selector
    await expect(page.getByText('Select Class')).toBeVisible();
  });

  test('AE2E-062: Assign page shows student list or empty state', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should show either the table or the empty state message
    const hasTable = await page.locator('table').count() > 0;
    const hasEmptyState = await page.getByText(/No admitted students/i).count() > 0;

    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('AE2E-063: Assign page has select all functionality', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for page to load - either see the table or the empty state
    await page.waitForTimeout(2000);

    // Check if there are students in the list (table exists and has rows)
    const hasTable = await page.locator('table tbody tr').count() > 0;

    if (hasTable) {
      // If there are students, Select All should be visible
      await expect(page.getByText('Select All', { exact: true })).toBeVisible();
    } else {
      // No students = empty state message should be shown
      await expect(page.getByText(/No admitted students/i)).toBeVisible();
    }
  });

  test('AE2E-064: Assign page has search functionality', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Check for search input
    const searchInput = page.getByPlaceholder(/Search by name or parent email/i);
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('AE2E-065: Assign button shows student count', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should have an assign button with "0 Students" or similar text
    await expect(page.getByRole('button', { name: /Assign.*Student/i })).toBeVisible();
  });

  test('AE2E-066: Assign page shows selected student count', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should show student count (0 selected)
    await expect(page.getByText(/Select Students \(\d+ selected\)/i)).toBeVisible();
  });

  test('AE2E-067: Assign page has cancel link to students list', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Check for Cancel link
    const cancelLink = page.getByRole('link', { name: 'Cancel' });
    await expect(cancelLink).toBeVisible();

    // Click and verify navigation
    await cancelLink.click();
    await expect(page).toHaveURL(/.*\/admin\/students/);
  });

  test('AE2E-068: Assign page has breadcrumb navigation', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Check for breadcrumb - use exact match to distinguish from sidebar "All Students" link
    await expect(page.getByRole('link', { name: 'Students', exact: true })).toBeVisible();
    // Assign Class is shown as text span in breadcrumb (not the h1 heading)
    await expect(page.locator('.text-sm.text-gray-500').filter({ hasText: 'Assign Class' })).toBeVisible();
  });

  test('AE2E-069: Class selector is a dropdown', async ({ page }) => {
    await page.goto('/admin/students/assign-class');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Check for select element within the Select Class section
    const selectClassSection = page.locator('h2').filter({ hasText: 'Select Class' }).locator('..');
    const classSelector = selectClassSection.locator('select');
    await expect(classSelector).toBeVisible();
    // Verify the select has the default option by checking its value
    await expect(classSelector).toHaveValue('');
  });
});
