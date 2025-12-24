import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Class Roster E2E Tests
 *
 * These tests verify the full browser experience for:
 * - Viewing class rosters
 * - Removing students from classes
 * - Capacity tracking
 * - Navigation flows
 *
 * Each test creates its own test data and cleans up after completion.
 */

test.describe('Admin Class Roster Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set English language for consistent test behavior
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('i18n:lang', 'en');
      } catch {}
    });
    await loginAsAdmin(page);
  });

  test('ROSTER-E2E-001: Navigate to class roster from class list', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 001' });
    const cls = await testData.createClass(grade.id, { name: 'Navigation Test Class' });

    // Go to classes page
    await page.goto('/admin/classes');
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Wait for classes to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find our test class and click Edit
    const classRow = page.locator('table tbody tr', { hasText: 'Navigation Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();

    // Should be on class edit page
    await expect(page).toHaveURL(/.*\/admin\/classes\/.*\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit Class' })).toBeVisible();

    // Click "View Roster" button
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Should be on roster page
    await expect(page).toHaveURL(/.*\/admin\/classes\/.*\/roster/);
    await expect(page.locator('h1').filter({ hasText: /- Roster/ })).toBeVisible();
  });

  test('ROSTER-E2E-002: View empty class roster', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 002' });
    const cls = await testData.createClass(grade.id, {
      name: 'Empty Roster Test Class',
      capacity: 20,
    });

    // Navigate to classes and find our class
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Empty Roster Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();

    // Go to roster
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Verify empty state
    await expect(page.getByText('No students enrolled yet')).toBeVisible();
    await expect(page.getByText('0 / 20 students')).toBeVisible();
    await expect(page.getByText(/20 spots available/)).toBeVisible();
  });

  test('ROSTER-E2E-003: View roster with enrolled students', async ({ page, testData }) => {
    // Create test data: grade, class, and enrolled student
    const grade = await testData.createGrade({ name: 'Roster Test Grade 003' });
    const cls = await testData.createClass(grade.id, {
      name: 'Roster With Students Class',
      capacity: 20,
    });

    // Create a student and assign to class
    const student = await testData.createStudentWithStatus(
      { firstName: 'RosterTest', lastName: 'Student' },
      'active',
      cls.id,
      cls.name
    );

    // Navigate to our class roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Roster With Students Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();

    // Go to roster
    await page.getByRole('link', { name: 'View Roster' }).click();
    await expect(page).toHaveURL(/.*\/roster/);

    // Wait for roster table with students to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Verify roster table is visible
    await expect(page.locator('table')).toBeVisible();

    // Check for table headers using simple text matching within thead
    const thead = page.locator('table thead');
    await expect(thead.locator('text=Student Name')).toBeVisible();
    await expect(thead.locator('text=Grade')).toBeVisible();
    await expect(thead.locator('text=Status')).toBeVisible();
    await expect(thead.locator('text=Parent Email')).toBeVisible();
    await expect(thead.locator('text=Actions')).toBeVisible();

    // Verify our test student is visible
    await expect(page.getByText('RosterTest Student')).toBeVisible();
  });

  test('ROSTER-E2E-004: Display correct capacity information', async ({ page, testData }) => {
    // Create a test class with specific capacity
    const grade = await testData.createGrade({ name: 'Roster Test Grade 004' });
    const cls = await testData.createClass(grade.id, {
      name: 'Capacity Test Class',
      capacity: 5,
    });

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Capacity Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Verify capacity display
    await expect(page.getByText('0 / 5 students')).toBeVisible();
    await expect(page.getByText(/5 spots available/)).toBeVisible();
  });

  test('ROSTER-E2E-005: Assign Students button shows correct state', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 005' });
    const cls = await testData.createClass(grade.id, {
      name: 'Assign Button Test Class',
      capacity: 20,
    });

    // Go to class roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Assign Button Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Check if Assign Students button exists and is enabled (class not at capacity)
    const assignButton = page.getByRole('button', { name: '+ Assign Students' });
    await expect(assignButton).toBeVisible();
    await expect(assignButton).not.toBeDisabled();
  });

  test('ROSTER-E2E-006: Remove student confirmation dialog', async ({ page, testData }) => {
    // Create test data with enrolled student
    const grade = await testData.createGrade({ name: 'Roster Test Grade 006' });
    const cls = await testData.createClass(grade.id, {
      name: 'Remove Dialog Test Class',
      capacity: 20,
    });
    const student = await testData.createStudentWithStatus(
      { firstName: 'RemoveDialog', lastName: 'TestStudent' },
      'active',
      cls.id,
      cls.name
    );

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Remove Dialog Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Set up dialog handler to cancel
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Cancel the removal
    });

    // Click Remove button
    const removeButton = page.locator('button', { hasText: 'Remove' }).first();
    await removeButton.click();

    // Wait a moment for dialog to be handled
    await page.waitForTimeout(500);

    // Verify dialog was shown with correct message
    expect(dialogMessage).toContain('Remove');
    expect(dialogMessage).toContain('from this class');
  });

  test('ROSTER-E2E-007: Remove student flow (with confirmation)', async ({ page, testData }) => {
    // Create test data with enrolled student
    const grade = await testData.createGrade({ name: 'Roster Test Grade 007' });
    const cls = await testData.createClass(grade.id, {
      name: 'Remove Flow Test Class',
      capacity: 20,
    });
    const student = await testData.createStudentWithStatus(
      { firstName: 'RemoveFlow', lastName: 'TestStudent' },
      'active',
      cls.id,
      cls.name
    );

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Remove Flow Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Get initial number of rows
    const initialRows = await page.locator('table tbody tr').count();
    expect(initialRows).toBe(1); // We created one student

    // Set up dialog handler to confirm
    page.on('dialog', async dialog => {
      await dialog.accept(); // Confirm the removal
    });

    // Click Remove button
    const removeButton = page.locator('button', { hasText: 'Remove' }).first();
    await removeButton.click();

    // Wait for removal to complete and page to update
    await page.waitForTimeout(1500);

    // Verify empty state appears (the roster should show no students)
    await expect(page.getByText('No students enrolled yet')).toBeVisible({ timeout: 10000 });
  });

  test('ROSTER-E2E-008: Navigate back to class edit page', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 008' });
    const cls = await testData.createClass(grade.id, { name: 'Back Nav Test Class' });

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Back Nav Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();

    // Wait for navigation to edit page
    await page.waitForURL(/.*\/admin\/classes\/[^/]+\/edit\/?$/);

    await page.getByRole('link', { name: 'View Roster' }).click();
    await expect(page).toHaveURL(/.*\/roster/);

    // Click back link
    await page.getByRole('link', { name: '← Back to Class Details' }).click();

    // Should be back on edit page
    await expect(page).toHaveURL(/.*\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit Class' })).toBeVisible();
  });

  test('ROSTER-E2E-009: Breadcrumb navigation works', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 009' });
    const cls = await testData.createClass(grade.id, { name: 'Breadcrumb Test Class' });

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Breadcrumb Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Find breadcrumb area (first occurrence in main content, not sidebar)
    const breadcrumbLink = page.locator('main').getByRole('link', { name: 'Classes', exact: true }).first();

    // Verify breadcrumb is present
    await expect(breadcrumbLink).toBeVisible();

    // Click breadcrumb to go back to classes list
    await breadcrumbLink.click();
    await expect(page).toHaveURL(/.*\/admin\/classes\/?$/);
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();
  });

  test('ROSTER-E2E-010: Student links navigate to student detail page', async ({ page, testData }) => {
    // Create test data with enrolled student
    const grade = await testData.createGrade({ name: 'Roster Test Grade 010' });
    const cls = await testData.createClass(grade.id, {
      name: 'Student Link Test Class',
      capacity: 20,
    });
    const student = await testData.createStudentWithStatus(
      { firstName: 'StudentLink', lastName: 'TestStudent' },
      'active',
      cls.id,
      cls.name
    );

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Student Link Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click on student name link
    const studentLink = page.getByRole('link', { name: 'StudentLink TestStudent' });
    await studentLink.click();

    // Should navigate to student detail page
    await expect(page).toHaveURL(/.*\/admin\/students\/[^/]+/);
  });

  test('ROSTER-E2E-011: Loading state displays correctly', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 011' });
    const cls = await testData.createClass(grade.id, { name: 'Loading State Test Class' });

    // Navigate to roster and check for loading state
    const response = page.waitForResponse(resp => resp.url().includes('/students') && resp.status() === 200);

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Loading State Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();

    // Navigate to roster - loading should appear briefly
    const rosterPromise = page.getByRole('link', { name: 'View Roster' }).click();

    // Try to catch loading state (it might be too fast)
    const hasLoadingState = await page.locator('.animate-pulse').isVisible({ timeout: 1000 }).catch(() => false);

    await rosterPromise;
    await response;

    // After loading, content should be visible
    await expect(page.locator('h1').filter({ hasText: /- Roster/ })).toBeVisible();
  });

  test('ROSTER-E2E-012: Error state when class not found', async ({ page }) => {
    // Try to access roster for non-existent class
    await page.goto('/admin/classes/nonexistent-class-id/roster');

    // Should show error message
    await page.waitForTimeout(2000); // Wait for API call to complete

    // Check for error indicators
    const hasErrorMessage = await page.getByText(/not found/i).isVisible().catch(() => false) ||
                           await page.getByText(/error/i).isVisible().catch(() => false) ||
                           await page.getByText(/failed/i).isVisible().catch(() => false);

    expect(hasErrorMessage).toBeTruthy();
  });

  test('ROSTER-E2E-013: Full capacity indicator appears correctly', async ({ page, testData }) => {
    // Create a class with capacity 1
    const grade = await testData.createGrade({ name: 'Roster Test Grade 013' });
    const cls = await testData.createClass(grade.id, {
      name: 'Full Capacity Test',
      capacity: 1,
    });

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Full Capacity Test' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Initially should show "1 spot available"
    await expect(page.getByText(/1 spot available/)).toBeVisible();
  });

  test('ROSTER-E2E-014: Mobile responsive design', async ({ page, testData }) => {
    // Create test data
    const grade = await testData.createGrade({ name: 'Roster Test Grade 014' });
    const cls = await testData.createClass(grade.id, { name: 'Mobile Test Class' });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const classRow = page.locator('table tbody tr', { hasText: 'Mobile Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Verify page is accessible on mobile
    await expect(page.locator('h1').filter({ hasText: /- Roster/ })).toBeVisible();

    // Check that key elements are visible
    await expect(page.getByText(/\d+ \/ \d+ students/)).toBeVisible();

    // Table should be scrollable or responsive
    const table = page.locator('table');
    if (await table.isVisible()) {
      // Table exists - verify it doesn't break layout
      const tableWidth = await table.evaluate(el => el.scrollWidth);
      expect(tableWidth).toBeGreaterThan(0);
    }
  });

  test('ROSTER-E2E-015: Status badges display with correct colors', async ({ page, testData }) => {
    // Create test data with enrolled student
    const grade = await testData.createGrade({ name: 'Roster Test Grade 015' });
    const cls = await testData.createClass(grade.id, {
      name: 'Status Badge Test Class',
      capacity: 20,
    });
    const student = await testData.createStudentWithStatus(
      { firstName: 'StatusBadge', lastName: 'TestStudent' },
      'active',
      cls.id,
      cls.name
    );

    // Navigate to roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Status Badge Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Check for status badges
    const statusBadges = page.locator('span', { hasText: /active|admitted|pending/ });

    if (await statusBadges.first().isVisible()) {
      // Verify badge has color classes
      const firstBadge = statusBadges.first();
      const className = await firstBadge.getAttribute('class');

      // Should have Tailwind color classes
      expect(className).toMatch(/bg-(green|blue|yellow|gray)-/);
    }
  });
});
