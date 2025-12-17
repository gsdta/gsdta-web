import { test, expect } from '../fixtures/testData.fixture';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Student Management E2E Tests
 *
 * These tests verify the admin student management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * Each test creates its own test data and cleans up after completion,
 * ensuring full test isolation and no dependency on seed data.
 */

test.describe('Admin Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AE2E-003: Admin sees all students', async ({ page, testData }) => {
    // Create test-specific data
    const grade = await testData.createGrade({ name: 'Test Grade AE2E-003' });
    const student1 = await testData.createStudentWithStatus(
      { firstName: 'TestAlpha', lastName: 'Student' },
      'active'
    );
    const student2 = await testData.createStudentWithStatus(
      { firstName: 'TestBeta', lastName: 'Student' },
      'active'
    );

    await page.goto('/admin/students');

    // Wait for the main heading (h1) to be visible
    await expect(page.locator('h1').filter({ hasText: 'Students' })).toBeVisible();

    // Wait for data to load (table should have data)
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for our test students
    await expect(page.getByText(`${student1.firstName} ${student1.lastName}`)).toBeVisible();
    await expect(page.getByText(`${student2.firstName} ${student2.lastName}`)).toBeVisible();
  });

  test('AE2E-004: Filter pending students', async ({ page, testData }) => {
    // Create test-specific data with different statuses
    const grade = await testData.createGrade({ name: 'Test Grade AE2E-004' });

    // Create an active student (should NOT appear in pending filter)
    const activeStudent = await testData.createStudentWithStatus(
      { firstName: 'ActiveTest', lastName: 'Student' },
      'active'
    );

    // Create pending students (should appear in pending filter)
    const pendingStudent1 = await testData.createStudent({
      firstName: 'PendingTest',
      lastName: 'StudentOne',
    });
    const pendingStudent2 = await testData.createStudent({
      firstName: 'PendingTest',
      lastName: 'StudentTwo',
    });

    await page.goto('/admin/students');

    // Wait for stats card to load (the clickable filter card)
    await page.waitForSelector('table', { timeout: 10000 });

    // Click the Pending stat card to filter (look for p tag with "Pending" text)
    await page.locator('p').filter({ hasText: /^Pending$/ }).first().click();

    // Wait for table to update
    await page.waitForTimeout(500);

    // Pending students should be visible
    const pendingName1 = `${pendingStudent1.firstName} ${pendingStudent1.lastName}`;
    const pendingName2 = `${pendingStudent2.firstName} ${pendingStudent2.lastName}`;
    await expect(
      page.getByText(pendingName1).or(page.getByText(pendingName2)).first()
    ).toBeVisible();

    // Active student should NOT be visible in pending filter
    const activeName = `${activeStudent.firstName} ${activeStudent.lastName}`;
    await expect(page.getByText(activeName)).not.toBeVisible();
  });

  test('AE2E-007: Admit pending student', async ({ page, testData }) => {
    // Handle confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Create a pending student specifically for this test
    const grade = await testData.createGrade({ name: 'Test Grade AE2E-007' });
    const pendingStudent = await testData.createStudent({
      firstName: 'AdmitTest',
      lastName: 'Student',
    });
    const studentName = `${pendingStudent.firstName} ${pendingStudent.lastName}`;

    await page.goto('/admin/students?status=pending');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Students' })).toBeVisible();
    await page.waitForSelector('table', { timeout: 10000 });

    // Find our pending student
    const pendingRow = page.getByRole('row').filter({ hasText: studentName });

    // Verify student is present
    await expect(pendingRow).toBeVisible();

    // Click Admit button
    await pendingRow.getByRole('button', { name: 'Admit' }).click();

    // Wait for admission to process
    await page.waitForTimeout(1000);

    // Navigate to all students view to verify admitted status
    await page.goto('/admin/students');
    await page.waitForSelector('table', { timeout: 10000 });

    const rowAll = page.getByRole('row').filter({ hasText: studentName });
    await expect(rowAll.getByText('Admitted')).toBeVisible();
  });
});
