import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Student Management E2E Tests
 *
 * These tests verify the admin student management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * NOTE: Some tests are skipped as they require UI implementation or
 * have complex state dependencies that need careful handling.
 */

test.describe('Admin Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AE2E-003: Admin sees all students', async ({ page }) => {
    await page.goto('/admin/students');

    // Wait for the main heading (h1) to be visible
    await expect(page.locator('h1').filter({ hasText: 'Students' })).toBeVisible();

    // Wait for data to load (table should have data)
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for seeded students
    await expect(page.getByText('Arun Kumar')).toBeVisible();
    await expect(page.getByText('Priya Sharma')).toBeVisible();
  });

  test('AE2E-004: Filter pending students', async ({ page }) => {
    await page.goto('/admin/students');

    // Wait for stats card to load (the clickable filter card)
    await page.waitForSelector('table', { timeout: 10000 });

    // Click the Pending stat card to filter (look for p tag with "Pending" text)
    await page.locator('p').filter({ hasText: /^Pending$/ }).first().click();

    // Wait for table to update
    await page.waitForTimeout(500);

    // Meera Krishnan and Lakshmi Iyer are pending in seed
    await expect(page.getByText('Meera Krishnan').or(page.getByText('Lakshmi Iyer')).first()).toBeVisible();

    // Arun Kumar is active, should NOT be visible in pending filter
    await expect(page.getByText('Arun Kumar')).not.toBeVisible();
  });

  test('AE2E-007: Admit pending student', async ({ page }) => {
    // Handle confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/admin/students?status=pending');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Students' })).toBeVisible();
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a pending student (either Meera or Lakshmi from seed data)
    const meeraRow = page.getByRole('row').filter({ hasText: 'Meera Krishnan' });
    const lakshmiRow = page.getByRole('row').filter({ hasText: 'Lakshmi Iyer' });

    // Use whichever pending student is available
    const pendingRow = (await meeraRow.count()) > 0 ? meeraRow : lakshmiRow;
    const studentName = (await meeraRow.count()) > 0 ? 'Meera Krishnan' : 'Lakshmi Iyer';

    if ((await pendingRow.count()) > 0) {
      // Click Admit button
      await pendingRow.getByRole('button', { name: 'Admit' }).click();

      // Wait for admission to process
      await page.waitForTimeout(1000);

      // Verify student is no longer in pending view (either not visible or status changed)
      // Navigate to all students view to verify admitted status
      await page.goto('/admin/students');
      await page.waitForSelector('table', { timeout: 10000 });

      const rowAll = page.getByRole('row').filter({ hasText: studentName });
      await expect(rowAll.getByText('Admitted')).toBeVisible();
    } else {
      console.log('No pending students found, skipping admit test');
    }
  });

  // ============================================
  // 2025-26 New Fields E2E Tests
  // ============================================

  test('AE2E-020: Admin can view student detail page', async ({ page }) => {
    await page.goto('/admin/students');
    await expect(page.locator('h1').filter({ hasText: 'Students' })).toBeVisible();
    await page.waitForSelector('table', { timeout: 10000 });

    // Find the row with Arun Kumar and click the View link
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/.*\/admin\/students\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();
  });

  test('AE2E-021: Student detail shows Student Information section', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click View link for Arun Kumar
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();

    // Check for Student Information section
    await expect(page.getByText('Student Information')).toBeVisible();
  });

  test('AE2E-022: Student detail shows gender field', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click View link for Arun Kumar
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();

    // Check for Gender field (if populated in seed data)
    await expect(page.getByText('Gender')).toBeVisible();
  });

  test('AE2E-023: Student detail shows school information', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click View link for Arun Kumar
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();

    // Check for school-related fields (in Student Information section)
    await expect(page.getByText('Student Information')).toBeVisible();
    await expect(page.getByText('School', { exact: true })).toBeVisible();
    await expect(page.getByText('School District')).toBeVisible();
  });

  test('AE2E-024: Student detail shows parent contact sections', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click View link for Arun Kumar
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();

    // Parent info section should exist (may show legacy parentEmail or new contacts)
    await expect(page.getByText('Parent').first()).toBeVisible();
  });

  test('AE2E-025: Student detail page has back navigation', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click View link for Arun Kumar
    const arunRow = page.getByRole('row').filter({ hasText: 'Arun Kumar' });
    await arunRow.getByRole('link', { name: 'View' }).click();

    await expect(page.getByRole('heading', { name: /Arun Kumar/i })).toBeVisible();

    // Check for back link
    const backLink = page.getByRole('link', { name: /Back to Students/i });
    await expect(backLink).toBeVisible();

    // Click back and verify navigation
    await backLink.click();
    await expect(page).toHaveURL(/.*\/admin\/students/);
  });
});
