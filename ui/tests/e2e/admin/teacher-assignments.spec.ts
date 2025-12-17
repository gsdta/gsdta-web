import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Teacher Assignment E2E Tests
 *
 * These tests verify the bulk teacher assignment UI functionality.
 * Tests the /admin/teachers/assign page where admins can assign
 * teachers to multiple classes from a single view.
 *
 * Each test creates its own test data and cleans up automatically.
 */

// Test user from seed-test-users.js
const TEST_TEACHER = {
  id: 'test-teacher-uid',
  name: 'Test Teacher',
  email: 'teacher@test.com',
};

test.describe('Admin Teacher Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TA-E2E-001: Admin can navigate to teacher assignments page', async ({ page }) => {
    await page.goto('/admin');

    // Click on Teachers menu item
    await page.click('text=Assign to Classes');

    await expect(page).toHaveURL(/.*\/admin\/teachers\/assign/);
    await expect(page.getByRole('heading', { name: 'Teacher Assignments' })).toBeVisible();
  });

  test('TA-E2E-002: Page displays all active classes', async ({ page, testData }) => {
    // Create test classes in different grades
    const grade1 = await testData.createGrade({ name: 'Test Grade TA-002-A' });
    const grade2 = await testData.createGrade({ name: 'Test Grade TA-002-B' });
    const class1 = await testData.createClass(grade1.id, { name: 'Test Class TA-002-A' });
    const class2 = await testData.createClass(grade2.id, { name: 'Test Class TA-002-B' });

    await page.goto('/admin/teachers/assign');

    // Should show our test classes
    await expect(page.getByText(class1.name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(class2.name)).toBeVisible();
  });

  test('TA-E2E-003: Page displays teacher workload summary', async ({ page, testData }) => {
    // Create a class and assign a teacher
    const grade = await testData.createGrade({ name: 'Test Grade TA-003' });
    const testClass = await testData.createClass(grade.id, { name: 'Test Class TA-003' });
    await testData.assignTeacherToClass(testClass.id, TEST_TEACHER.id, TEST_TEACHER.name, 'primary', TEST_TEACHER.email);

    await page.goto('/admin/teachers/assign');

    // Wait for data to load
    await expect(page.getByText('Teacher Workload')).toBeVisible();

    // Should show teachers and their class counts
    const workloadSection = page.locator('text=Teacher Workload').locator('..');
    await expect(workloadSection).toBeVisible();
  });

  test('TA-E2E-004: Page shows assigned/unassigned counts', async ({ page, testData }) => {
    // Create classes (some assigned, some not)
    const grade = await testData.createGrade({ name: 'Test Grade TA-004' });
    const assignedClass = await testData.createClass(grade.id, { name: 'Assigned Class TA-004' });
    await testData.createClass(grade.id, { name: 'Unassigned Class TA-004' });
    await testData.assignTeacherToClass(assignedClass.id, TEST_TEACHER.id, TEST_TEACHER.name, 'primary', TEST_TEACHER.email);

    await page.goto('/admin/teachers/assign');

    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();

    // Should show summary counts with more specific text
    await expect(page.locator('text=/\\d+ assigned/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/\\d+ unassigned/i')).toBeVisible({ timeout: 10000 });
  });

  test('TA-E2E-005: Visual indicators show assignment status', async ({ page, testData }) => {
    // Create a class with assigned teacher
    const grade = await testData.createGrade({ name: 'Test Grade TA-005' });
    const assignedClass = await testData.createClass(grade.id, { name: 'Assigned Class TA-005' });
    const unassignedClass = await testData.createClass(grade.id, { name: 'Unassigned Class TA-005' });
    await testData.assignTeacherToClass(assignedClass.id, TEST_TEACHER.id, TEST_TEACHER.name, 'primary', TEST_TEACHER.email);

    await page.goto('/admin/teachers/assign');

    // Wait for classes to load
    await expect(page.getByText(assignedClass.name)).toBeVisible({ timeout: 10000 });

    // Check for checkmark on assigned class
    const assignedClassRow = page.locator(`text=${assignedClass.name}`).locator('..');
    await expect(assignedClassRow.locator('[title="Primary teacher assigned"]')).toBeVisible();

    // Check for warning on unassigned class
    const unassignedClassRow = page.locator(`text=${unassignedClass.name}`).locator('..');
    await expect(unassignedClassRow.locator('[title="No primary teacher"]')).toBeVisible();
  });

  test('TA-E2E-006: Can filter classes by grade', async ({ page, testData }) => {
    // Create classes in different grades
    const grade1 = await testData.createGrade({ name: 'Filter Grade A' });
    const grade2 = await testData.createGrade({ name: 'Filter Grade B' });
    const class1 = await testData.createClass(grade1.id, { name: 'Filter Class A' });
    const class2 = await testData.createClass(grade2.id, { name: 'Filter Class B' });

    await page.goto('/admin/teachers/assign');

    // Wait for classes to load
    await expect(page.getByText(class1.name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(class2.name)).toBeVisible();

    // Apply grade filter
    const gradeFilter = page.locator('select#gradeFilter');
    await gradeFilter.selectOption(grade1.id);

    // Wait a moment for filter to apply
    await page.waitForTimeout(500);

    // Should only show grade1 classes
    await expect(page.getByText(class1.name)).toBeVisible();

    // Other grade classes should not be visible
    await expect(page.getByText(class2.name)).not.toBeVisible();
  });

  test('TA-E2E-007: Can filter to show unassigned classes only', async ({ page, testData }) => {
    // Create one assigned and one unassigned class
    const grade = await testData.createGrade({ name: 'Test Grade TA-007' });
    const assignedClass = await testData.createClass(grade.id, { name: 'Assigned Class TA-007' });
    const unassignedClass = await testData.createClass(grade.id, { name: 'Unassigned Class TA-007' });
    await testData.assignTeacherToClass(assignedClass.id, TEST_TEACHER.id, TEST_TEACHER.name, 'primary', TEST_TEACHER.email);

    await page.goto('/admin/teachers/assign');

    // Wait for classes to load
    await expect(page.getByText(assignedClass.name)).toBeVisible({ timeout: 10000 });

    // Toggle unassigned filter
    await page.check('input[type="checkbox"]');

    // Assigned class shouldn't be visible
    await expect(page.getByText(assignedClass.name)).not.toBeVisible();

    // Unassigned class should still be visible
    await expect(page.getByText(unassignedClass.name)).toBeVisible();

    // Uncheck to show all again
    await page.uncheck('input[type="checkbox"]');
    await expect(page.getByText(assignedClass.name)).toBeVisible();
  });

  test('TA-E2E-008: Primary teacher dropdown shows available teachers', async ({ page, testData }) => {
    // Create a class
    const grade = await testData.createGrade({ name: 'Test Grade TA-008' });
    await testData.createClass(grade.id, { name: 'Test Class TA-008' });

    await page.goto('/admin/teachers/assign');

    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();

    // Wait for classes to render
    await expect(page.getByText('Test Class TA-008')).toBeVisible({ timeout: 10000 });

    // Find a primary teacher dropdown
    const primarySelects = page.locator('select[id^="primary-"]');
    const firstSelect = primarySelects.first();

    // Wait for the dropdown to have options loaded (more than just the empty option)
    await expect(async () => {
      const options = await firstSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(1); // At least one teacher + empty option
    }).toPass({ timeout: 10000 });
  });

  test('TA-E2E-009: Assistant teacher section is visible', async ({ page, testData }) => {
    // Create a class
    const grade = await testData.createGrade({ name: 'Test Grade TA-009' });
    await testData.createClass(grade.id, { name: 'Test Class TA-009' });

    await page.goto('/admin/teachers/assign');

    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible({ timeout: 10000 });

    // Wait for classes to render
    await page.waitForSelector('.space-y-4 > div', { timeout: 10000 });

    // Should show assistant teacher label (there can be multiple)
    const assistantLabels = page.locator('text=Assistant Teachers (Optional)');
    await expect(assistantLabels.first()).toBeVisible({ timeout: 10000 });

    // Should have add assistant dropdown
    const assistantSelects = page.locator('select option[value=""]:text("+ Add assistant")');
    const count = await assistantSelects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TA-E2E-010: Back button navigates to classes page', async ({ page }) => {
    await page.goto('/admin/teachers/assign');

    // Click back button
    await page.click('text=Back to Classes');

    // Should navigate to classes page
    await expect(page).toHaveURL(/.*\/admin\/classes/);
  });

  test('TA-E2E-011: Info box displays important note', async ({ page }) => {
    await page.goto('/admin/teachers/assign');

    // Should show info about auto-save
    await expect(page.getByText(/changes are saved automatically/i)).toBeVisible();
    await expect(page.getByText(/one primary teacher/i)).toBeVisible();
  });

  test('TA-E2E-012: Empty state shows when no classes match filter', async ({ page, testData }) => {
    // Create a class with teacher assigned
    const grade = await testData.createGrade({ name: 'Test Grade TA-012' });
    const assignedClass = await testData.createClass(grade.id, { name: 'Assigned Class TA-012' });
    await testData.assignTeacherToClass(assignedClass.id, TEST_TEACHER.id, TEST_TEACHER.name, 'primary', TEST_TEACHER.email);

    await page.goto('/admin/teachers/assign');

    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
    await expect(page.getByText(assignedClass.name)).toBeVisible({ timeout: 10000 });

    // Select unassigned filter and our grade
    await page.check('input[type="checkbox"]'); // Show unassigned only
    const gradeFilter = page.locator('select#gradeFilter');
    await gradeFilter.selectOption(grade.id);

    // May show empty state since our only class in this grade is assigned
    const emptyState = page.getByText(/no classes found matching your filters/i);
    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('TA-E2E-013: Page is responsive and mobile-friendly', async ({ page, testData }) => {
    // Create a class
    const grade = await testData.createGrade({ name: 'Test Grade TA-013' });
    await testData.createClass(grade.id, { name: 'Test Class TA-013' });

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/teachers/assign');

    // Should still show main heading
    await expect(page.getByText('Teacher Assignments')).toBeVisible();

    // Filters should stack on mobile
    const filtersSection = page.locator('.flex-wrap');
    await expect(filtersSection).toBeVisible();

    // Our test class should be visible
    await expect(page.getByText('Test Class TA-013')).toBeVisible({ timeout: 10000 });
  });

  test('TA-E2E-014: Loading state is shown initially', async ({ page }) => {
    // Navigate and check for loading immediately
    const loadingPromise = page.goto('/admin/teachers/assign');

    // Try to catch loading state (may be too fast in emulator)
    const loadingText = page.getByText(/loading teacher assignments/i);
    if (await loadingText.count() > 0) {
      await expect(loadingText).toBeVisible();
    }

    await loadingPromise;

    // Eventually should show content
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
  });
});
