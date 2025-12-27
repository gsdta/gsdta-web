import { test, expect } from '@playwright/test';
import { loginAsTeacher, loginAsParent } from './helpers/auth';

test.describe('Teacher Portal - Dashboard', () => {
  test('teacher can access dashboard after login', async ({ page }) => {
    await loginAsTeacher(page);

    // Should be on teacher dashboard
    await expect(page).toHaveURL(/\/teacher/);
    await expect(page.getByText(/Welcome/i)).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows stats overview', async ({ page }) => {
    await loginAsTeacher(page);

    // Wait for dashboard to fully load - look for exact text in stats section
    await expect(page.getByText('Assigned Classes', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total Students', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('dashboard shows quick actions', async ({ page }) => {
    await loginAsTeacher(page);

    // Wait for quick actions section to load
    await expect(page.getByText(/Quick Actions/i)).toBeVisible({ timeout: 15000 });
    // Use more specific selector - first link with My Classes text
    await expect(page.getByRole('link', { name: /My Classes/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('non-teacher cannot access teacher portal', async ({ page }) => {
    await loginAsParent(page);

    // Try to navigate to teacher portal
    await page.goto('/teacher');

    // Should be redirected away from teacher portal
    await expect(page).not.toHaveURL(/\/teacher$/);
  });
});

test.describe('Teacher Portal - Classes', () => {
  test('teacher can view classes list', async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to classes page
    await page.goto('/teacher/classes');

    // Should see the classes heading
    await expect(page.getByRole('heading', { name: /My Classes/i })).toBeVisible({ timeout: 10000 });
  });

  test('teacher can navigate to class details', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Wait for classes to load and click View Details
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Should navigate to class detail page (may have trailing slash)
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/?$/);
    await expect(page.getByRole('heading', { name: /Class Information/i })).toBeVisible({ timeout: 10000 });
  });

  test('class details page shows quick actions', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Navigate to first class
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 10000 });
    await viewDetailsLink.click();

    // Should show quick actions
    await expect(page.getByRole('link', { name: /View Roster/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Mark Attendance/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Attendance History/i })).toBeVisible();
  });
});

test.describe('Teacher Portal - Roster', () => {
  test('teacher can view class roster', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Click on Roster link for first class
    const rosterLink = page.getByRole('link', { name: /Roster/i }).first();
    await expect(rosterLink).toBeVisible({ timeout: 10000 });
    await rosterLink.click();

    // Should be on roster page
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/roster/);
    await expect(page.getByRole('heading', { name: /Student Roster/i })).toBeVisible({ timeout: 10000 });
  });

  test('roster page shows student count', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    const rosterLink = page.getByRole('link', { name: /Roster/i }).first();
    await expect(rosterLink).toBeVisible({ timeout: 10000 });
    await rosterLink.click();

    // Should show student count
    await expect(page.getByText(/students/i)).toBeVisible({ timeout: 10000 });
  });

  test('roster has search functionality', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    const rosterLink = page.getByRole('link', { name: /Roster/i }).first();
    await expect(rosterLink).toBeVisible({ timeout: 10000 });
    await rosterLink.click();

    // Should have search input
    await expect(page.getByPlaceholder(/Search students/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Teacher Portal - Attendance', () => {
  test('teacher can access mark attendance page', async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to mark attendance via quick action
    await page.goto('/teacher/attendance/mark');

    // Should show class selection or mark attendance form
    await expect(page.getByRole('heading', { name: /Mark Attendance/i })).toBeVisible({ timeout: 10000 });
  });

  test('mark attendance page shows today\'s classes', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/attendance/mark');

    // Should show either today's classes or other classes section
    await expect(
      page.getByText(/Today's Classes/i).or(page.getByText(/Other Classes/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('teacher can navigate to class-specific attendance', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Go to first class details
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 10000 });
    await viewDetailsLink.click();

    // Click Mark Attendance
    await page.getByRole('link', { name: /Mark Attendance/i }).click();

    // Should be on mark attendance page for this class
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+\/attendance\/mark/);
    await expect(page.getByRole('heading', { name: /Mark Attendance/i })).toBeVisible({ timeout: 10000 });
  });

  test('mark attendance page has status buttons', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Navigate to first class and then to mark attendance
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 10000 });
    await viewDetailsLink.click();
    await page.getByRole('link', { name: /Mark Attendance/i }).click();

    // Should have status buttons
    await expect(page.getByRole('button', { name: /Present/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Absent/i }).first()).toBeVisible();
  });

  test('mark attendance page has save button', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 10000 });
    await viewDetailsLink.click();
    await page.getByRole('link', { name: /Mark Attendance/i }).click();

    // Should have save button
    await expect(page.getByRole('button', { name: /Save Attendance/i })).toBeVisible({ timeout: 10000 });
  });

  test('teacher can view attendance history', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/attendance');

    // Should show attendance history page
    await expect(page.getByRole('heading', { name: /Attendance History/i })).toBeVisible({ timeout: 10000 });
  });

  test('attendance history has filter options', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/attendance');

    // Should have class filter - look for the label specifically
    await expect(page.locator('label').filter({ hasText: 'Class' })).toBeVisible({ timeout: 10000 });
    // Should have date filters
    await expect(page.getByText(/Start Date/i)).toBeVisible();
  });
});

test.describe('Teacher Portal - Navigation', () => {
  test('sidebar navigation works', async ({ page }) => {
    await loginAsTeacher(page);

    // Click on My Classes in sidebar
    await page.getByRole('link', { name: /My Classes/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/classes/);

    // Click on Mark Today
    await page.getByRole('link', { name: /Mark Today/i }).click();
    await expect(page).toHaveURL(/\/teacher\/attendance\/mark/);

    // Click on History
    await page.getByRole('link', { name: /History/i }).click();
    await expect(page).toHaveURL(/\/teacher\/attendance/);

    // Click on Overview to go back to dashboard (may have trailing slash)
    await page.getByRole('link', { name: /Overview/i }).click();
    await expect(page).toHaveURL(/\/teacher\/?$/);
  });

  test('breadcrumb navigation works', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/classes');

    // Go to class details
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible({ timeout: 15000 });
    await viewDetailsLink.click();

    // Go to roster
    await page.getByRole('link', { name: /View Roster/i }).click();

    // Click Dashboard in breadcrumb (may have trailing slash)
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/teacher\/?$/);
  });
});

test.describe('Teacher Portal - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile menu toggle works', async ({ page }) => {
    await loginAsTeacher(page);

    // On mobile, sidebar should be hidden initially
    // Menu toggle button should be visible
    const menuButton = page.getByRole('button', { name: /Toggle menu/i });
    await expect(menuButton).toBeVisible({ timeout: 10000 });

    // Click to open mobile menu
    await menuButton.click();

    // Navigation links should be visible
    await expect(page.getByRole('link', { name: /My Classes/i }).first()).toBeVisible();
  });

  test('mobile navigation works', async ({ page }) => {
    await loginAsTeacher(page);

    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /Toggle menu/i });
    await expect(menuButton).toBeVisible({ timeout: 10000 });
    await menuButton.click();

    // Click on My Classes
    await page.getByRole('link', { name: /My Classes/i }).first().click();

    // Should navigate to classes page
    await expect(page).toHaveURL(/\/teacher\/classes/);
  });
});
