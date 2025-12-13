import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Class Management E2E Tests
 *
 * These tests verify the admin class management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * NOTE: Some tests are skipped as they require UI implementation.
 * API-level class functionality is covered by Cucumber tests.
 */

test.describe('Admin Class Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('CE2E-002: Admin sees all classes', async ({ page }) => {
    await page.goto('/admin/classes');

    // Wait for the main heading (h1) to be visible
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for seeded classes (from seed-emulator.js)
    await expect(page.getByText('PS-1 Section A')).toBeVisible();
  });

  test('CE2E-004: Complete class creation flow', async ({ page }) => {
    await page.goto('/admin/classes');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Click create class link (use the main button, not sidebar)
    await page.getByRole('link', { name: 'Create Class', exact: true }).click();

    await expect(page).toHaveURL(/.*\/admin\/classes\/create/);
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load (the form waits for grades dropdown)
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Fill in the form
    await page.fill('input[name="name"]', 'E2E Test Class');
    await page.selectOption('select[name="gradeId"]', { index: 1 }); // Select first available grade
    await page.selectOption('select[name="day"]', 'Sunday');
    await page.fill('input[name="time"]', '2:00 PM - 4:00 PM');
    await page.fill('input[name="capacity"]', '15');

    // Submit the form
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Should redirect to classes list
    await expect(page).toHaveURL(/.*\/admin\/classes/);

    // Wait for table to load and verify new class appears
    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.getByText('E2E Test Class')).toBeVisible();
  });
});
