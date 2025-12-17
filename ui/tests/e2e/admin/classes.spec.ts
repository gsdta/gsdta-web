import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Class Management E2E Tests
 *
 * These tests verify the admin class management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * Each test creates its own test data and cleans up automatically.
 */

test.describe('Admin Class Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('CE2E-002: Admin sees all classes', async ({ page, testData }) => {
    // Create test-specific data
    const grade = await testData.createGrade({ name: 'Test Grade CE2E-002' });
    const testClass = await testData.createClass(grade.id, {
      name: 'Test Class CE2E-002',
      day: 'Sunday',
      time: '10:00 AM - 12:00 PM',
      capacity: 20,
    });

    await page.goto('/admin/classes');

    // Wait for the main heading (h1) to be visible
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for our test class
    await expect(page.getByText(testClass.name)).toBeVisible();
  });

  test('CE2E-004: Complete class creation flow', async ({ page, testData }) => {
    // Create a grade for the class creation form
    const grade = await testData.createGrade({ name: 'Test Grade CE2E-004' });

    await page.goto('/admin/classes');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Click create class link (use the main button, not sidebar)
    await page.getByRole('link', { name: 'Create Class', exact: true }).click();

    await expect(page).toHaveURL(/.*\/admin\/classes\/create/);
    await expect(page.getByRole('heading', { name: 'Create New Class' })).toBeVisible();

    // Wait for grades to load (the form waits for grades dropdown)
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    // Generate unique class name for this test
    const uniqueClassName = `E2E Test Class ${Date.now()}`;

    // Fill in the form
    await page.fill('input[name="name"]', uniqueClassName);
    await page.selectOption('select[name="gradeId"]', grade.id); // Select our test grade
    await page.selectOption('select[name="day"]', 'Sunday');
    await page.fill('input[name="time"]', '2:00 PM - 4:00 PM');
    await page.fill('input[name="capacity"]', '15');

    // Submit the form
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Should redirect to classes list
    await expect(page).toHaveURL(/.*\/admin\/classes/);

    // Wait for table to load and verify new class appears
    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.getByText(uniqueClassName)).toBeVisible();

    // Track the created class for cleanup by finding it in the table
    // The testData fixture will clean up the grade, but we need to track the UI-created class
    // Since we don't have easy access to the ID, we'll rely on the test data factory's pattern
    // The grade cleanup will cascade or the class will be orphaned (acceptable for test isolation)
  });
});
