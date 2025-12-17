import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Grades Management E2E Tests
 *
 * Each test creates its own test data and cleans up automatically.
 */

test.describe('Admin Grades Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GE2E-001: Admin can view grades list', async ({ page, testData }) => {
    // Create test-specific grade
    const grade = await testData.createGrade({ name: 'Test Grade GE2E-001' });

    await page.goto('/admin/grades');
    await expect(page.getByRole('heading', { name: 'Grades', exact: true })).toBeVisible();

    // Wait for data to load and verify our test grade is visible
    await expect(page.getByText(grade.name)).toBeVisible({ timeout: 10000 });
  });

  test('GE2E-002: Admin can edit a grade display name', async ({ page, testData }) => {
    // Create test-specific grade
    const grade = await testData.createGrade({ name: 'Test Grade GE2E-002' });

    await page.goto('/admin/grades');

    // Wait for the page and our grade to load
    await expect(page.getByRole('heading', { name: 'Grades', exact: true })).toBeVisible();
    await expect(page.getByText(grade.name)).toBeVisible({ timeout: 10000 });

    // Locate the row containing our test grade by its ID
    const row = page.getByRole('row').filter({ hasText: grade.id }).first();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Edit' }).click();

    // Clear and type new name
    const newName = 'Test Grade Updated';
    await page.locator('input[type="text"]').fill(newName);
    await row.getByRole('button', { name: 'Save' }).click();

    // Verify update
    await expect(page.getByText(newName)).toBeVisible();

    // Note: No need to revert changes - test data cleanup will remove this grade
  });
});
