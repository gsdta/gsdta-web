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

  // ============================================
  // 2025-26 New Fields E2E Tests
  // ============================================

  test('CE2E-010: Class creation form has section dropdown', async ({ page }) => {
    await page.goto('/admin/classes/create');
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Check for section dropdown
    const sectionSelect = page.locator('select[name="section"]');
    await expect(sectionSelect).toBeVisible();

    // Verify section options exist (options are hidden until dropdown is opened)
    await expect(sectionSelect.locator('option', { hasText: 'No section' })).toBeAttached();
    await expect(sectionSelect.locator('option', { hasText: 'Section A' })).toBeAttached();
    await expect(sectionSelect.locator('option', { hasText: 'Section B' })).toBeAttached();
    await expect(sectionSelect.locator('option', { hasText: 'Section C' })).toBeAttached();
    await expect(sectionSelect.locator('option', { hasText: 'Section D' })).toBeAttached();
  });

  test('CE2E-011: Class creation form has room input', async ({ page }) => {
    await page.goto('/admin/classes/create');
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Check for room input
    const roomInput = page.locator('input[name="room"]');
    await expect(roomInput).toBeVisible();

    // Fill room
    await roomInput.fill('B01');
    await expect(roomInput).toHaveValue('B01');
  });

  test('CE2E-012: Create class with section and room', async ({ page }) => {
    await page.goto('/admin/classes/create');
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Fill required fields
    await page.fill('input[name="name"]', 'Grade 1 Section A');
    await page.selectOption('select[name="gradeId"]', { index: 1 });
    await page.selectOption('select[name="day"]', 'Saturday');
    await page.fill('input[name="time"]', '10:00 AM - 12:00 PM');
    await page.fill('input[name="capacity"]', '25');

    // Fill new fields
    await page.selectOption('select[name="section"]', 'A');
    await page.fill('input[name="room"]', 'B01');

    // Submit
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Should redirect to classes list
    await expect(page).toHaveURL(/.*\/admin\/classes/);

    // Verify new class appears
    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.getByText('Grade 1 Section A')).toBeVisible();
  });

  test('CE2E-013: Section and room are optional', async ({ page }) => {
    await page.goto('/admin/classes/create');
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Fill only required fields (no section or room)
    await page.fill('input[name="name"]', 'No Section Class');
    await page.selectOption('select[name="gradeId"]', { index: 1 });
    await page.selectOption('select[name="day"]', 'Saturday');
    await page.fill('input[name="time"]', '2:00 PM - 4:00 PM');
    await page.fill('input[name="capacity"]', '20');

    // Submit without section/room
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Should still redirect successfully
    await expect(page).toHaveURL(/.*\/admin\/classes/);
    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.getByText('No Section Class')).toBeVisible();
  });
});
