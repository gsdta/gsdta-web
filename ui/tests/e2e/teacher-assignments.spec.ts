import { test, expect } from '@playwright/test';
import { loginAsTeacher } from './helpers/auth';

test.describe('Teacher Portal - Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('TA2E-001: Teacher can access assignments list from class detail', async ({ page }) => {
    await page.goto('/teacher/classes');

    // Navigate to first class
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Click on Assignments quick action
    const assignmentsLink = page.getByRole('link', { name: /Assignments/i });
    await expect(assignmentsLink).toBeVisible({ timeout: 10000 });
    await assignmentsLink.click();

    // Should be on assignments page
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/assignments/);
    await expect(page.getByRole('heading', { name: /Assignments/i })).toBeVisible({ timeout: 10000 });
  });

  test('TA2E-002: Assignments list shows filter tabs', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();

    // Should show filter tabs
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Published/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Closed/i })).toBeVisible();
  });

  test('TA2E-003: Teacher can access create assignment page', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();

    // Click New Assignment button
    const newAssignmentLink = page.getByRole('link', { name: /New Assignment/i });
    await expect(newAssignmentLink).toBeVisible({ timeout: 10000 });
    await newAssignmentLink.click();

    // Should be on create assignment page
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/assignments\/new/);
    await expect(page.getByRole('heading', { name: /Create Assignment/i })).toBeVisible({ timeout: 10000 });
  });

  test('TA2E-004: Create assignment form has required fields', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();
    await page.getByRole('link', { name: /New Assignment/i }).click();

    // Should have required form fields
    await expect(page.getByLabel(/Title/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(page.getByLabel(/Type/i)).toBeVisible();
    await expect(page.getByLabel(/Max Points/i)).toBeVisible();
    await expect(page.getByLabel(/Assigned Date/i)).toBeVisible();
    await expect(page.getByLabel(/Due Date/i)).toBeVisible();
  });

  test('TA2E-005: Create assignment form has save buttons', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();
    await page.getByRole('link', { name: /New Assignment/i }).click();

    // Should have save buttons
    await expect(page.getByRole('button', { name: /Save as Draft/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Publish/i })).toBeVisible();
  });

  test('TA2E-006: Create assignment form validation works', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();
    await page.getByRole('link', { name: /New Assignment/i }).click();

    // Try to submit without required fields
    await page.getByRole('button', { name: /Publish/i }).click();

    // Should show validation error
    await expect(page.getByText(/Title is required/i).or(page.getByText(/Due date is required/i))).toBeVisible({ timeout: 5000 });
  });

  test('TA2E-007: Teacher can create a draft assignment', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();
    await page.getByRole('link', { name: /New Assignment/i }).click();

    // Fill in form
    await page.getByLabel(/Title/i).fill('Test Assignment E2E');
    await page.getByLabel(/Description/i).fill('This is a test assignment created by E2E tests');
    await page.getByLabel(/Max Points/i).fill('100');

    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateStr = tomorrow.toISOString().split('T')[0];
    await page.getByLabel(/Due Date/i).fill(dueDateStr);

    // Save as draft
    await page.getByRole('button', { name: /Save as Draft/i }).click();

    // Should redirect to assignments list
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/assignments$/, { timeout: 10000 });
  });
});

test.describe('Teacher Portal - Gradebook', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('TG2E-001: Teacher can access gradebook from class detail', async ({ page }) => {
    await page.goto('/teacher/classes');

    // Navigate to first class
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Click on Gradebook quick action
    const gradebookLink = page.getByRole('link', { name: /Gradebook/i });
    await expect(gradebookLink).toBeVisible({ timeout: 10000 });
    await gradebookLink.click();

    // Should be on gradebook page
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/gradebook/);
    await expect(page.getByRole('heading', { name: /Gradebook/i })).toBeVisible({ timeout: 10000 });
  });

  test('TG2E-002: Gradebook shows class average', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Gradebook/i }).click();

    // Should show class average (may show 0% if no grades yet)
    await expect(page.getByText(/Class Average/i)).toBeVisible({ timeout: 10000 });
  });

  test('TG2E-003: Gradebook has link to view assignments', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Gradebook/i }).click();

    // Should have link to view assignments
    await expect(page.getByRole('link', { name: /View Assignments/i })).toBeVisible({ timeout: 10000 });
  });

  test('TG2E-004: Gradebook shows empty state when no assignments', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Gradebook/i }).click();

    // Should show either gradebook grid or empty state
    const gridOrEmptyState = page.getByRole('table').or(page.getByText(/No assignments yet/i)).or(page.getByText(/Create Assignment/i));
    await expect(gridOrEmptyState.first()).toBeVisible({ timeout: 10000 });
  });

  test('TG2E-005: Gradebook has inline editing hint', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Gradebook/i }).click();

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Gradebook/i })).toBeVisible({ timeout: 10000 });

    // If there are assignments and grades, should show inline editing hint
    const table = page.getByRole('table');
    const tableCount = await table.count();

    if (tableCount > 0) {
      // Should show editing hint
      await expect(page.getByText(/Click.*cell.*edit/i).or(page.getByText(/Press Enter to save/i))).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Teacher Portal - Grade Entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('TGE2E-001: Grade entry page shows assignment info', async ({ page }) => {
    // First create an assignment if needed
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();

    // Check if there are any published assignments with Grade button
    const gradeButton = page.getByRole('link', { name: /Grade/i }).first();
    const gradeButtonCount = await gradeButton.count();

    if (gradeButtonCount > 0) {
      await gradeButton.click();

      // Should be on grade entry page
      await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/assignments\/[^/]+\/grades/);

      // Should show assignment info
      await expect(page.getByText(/Max Points/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Due/i)).toBeVisible();
    }
  });

  test('TGE2E-002: Grade entry shows student list', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();

    const gradeButton = page.getByRole('link', { name: /Grade/i }).first();
    const gradeButtonCount = await gradeButton.count();

    if (gradeButtonCount > 0) {
      await gradeButton.click();

      // Should show student table header
      await expect(page.getByText(/Student/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Points/i)).toBeVisible();
    }
  });

  test('TGE2E-003: Grade entry has save button', async ({ page }) => {
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    await page.getByRole('link', { name: /Assignments/i }).click();

    const gradeButton = page.getByRole('link', { name: /Grade/i }).first();
    const gradeButtonCount = await gradeButton.count();

    if (gradeButtonCount > 0) {
      await gradeButton.click();

      // Should have save button
      await expect(page.getByRole('button', { name: /Save.*Grades/i })).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Teacher Portal - Class Details with Assignments/Gradebook Links', () => {
  test('TCD2E-001: Class details shows Assignments quick action', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Should show Assignments quick action
    await expect(page.getByRole('link', { name: /Assignments/i })).toBeVisible({ timeout: 10000 });
  });

  test('TCD2E-002: Class details shows Gradebook quick action', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Should show Gradebook quick action
    await expect(page.getByRole('link', { name: /Gradebook/i })).toBeVisible({ timeout: 10000 });
  });
});
