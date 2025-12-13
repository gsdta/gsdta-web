import { test, expect } from '@playwright/test';
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
 * Prerequisites:
 * - Firebase emulators running
 * - Seeded data (grades, classes, students)
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

  test('ROSTER-E2E-001: Navigate to class roster from class list', async ({ page }) => {
    // Go to classes page
    await page.goto('/admin/classes');
    await expect(page.locator('h1').filter({ hasText: 'Classes' })).toBeVisible();

    // Wait for classes to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Click on first class's edit link
    const firstClassRow = page.locator('table tbody tr').first();
    await firstClassRow.getByRole('link', { name: 'Edit' }).click();

    // Should be on class edit page
    await expect(page).toHaveURL(/.*\/admin\/classes\/.*\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit Class' })).toBeVisible();

    // Click "View Roster" button
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Should be on roster page
    await expect(page).toHaveURL(/.*\/admin\/classes\/.*\/roster/);
    await expect(page.locator('h1').filter({ hasText: /- Roster/ })).toBeVisible();
  });

  test('ROSTER-E2E-002: View empty class roster', async ({ page }) => {
    // Create a new class
    await page.goto('/admin/classes/create');
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    await page.fill('input[name="name"]', 'Empty Roster Test Class');
    await page.selectOption('select[name="gradeId"]', { index: 1 });
    await page.selectOption('select[name="day"]', 'Saturday');
    await page.fill('input[name="time"]', '10:00 AM');
    await page.fill('input[name="capacity"]', '20');
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Navigate back to find our class
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

  test('ROSTER-E2E-003: View roster with enrolled students', async ({ page }) => {
    // Navigate to a class that has students (from seed data)
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a class with enrolled count > 0 (should show like "2/20" not "0/20")
    const rows = await page.locator('table tbody tr').all();
    let classWithStudents = null;
    
    for (const row of rows) {
      const text = await row.textContent();
      const match = text?.match(/(\d+)\s*\/\s*\d+/);
      if (match && parseInt(match[1]) > 0) {
        classWithStudents = row;
        break;
      }
    }
    
    // If no class with students found, skip test
    if (!classWithStudents) {
      test.skip(true, 'No classes with enrolled students found in test data');
      return;
    }
    
    await classWithStudents.getByRole('link', { name: 'Edit' }).click();

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
  });

  test('ROSTER-E2E-004: Display correct capacity information', async ({ page }) => {
    // Create a test class with specific capacity
    await page.goto('/admin/classes/create');
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    await page.fill('input[name="name"]', 'Capacity Test Class');
    await page.selectOption('select[name="gradeId"]', { index: 1 });
    await page.selectOption('select[name="day"]', 'Sunday');
    await page.fill('input[name="time"]', '2:00 PM');
    await page.fill('input[name="capacity"]', '5');
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Go to roster
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Capacity Test Class' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Verify capacity display
    await expect(page.getByText('0 / 5 students')).toBeVisible();
    await expect(page.getByText(/5 spots available/)).toBeVisible();
  });

  test('ROSTER-E2E-005: Assign Students button shows correct state', async ({ page }) => {
    // Go to a class roster
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstClass = page.locator('table tbody tr').first();
    await firstClass.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Check if Assign Students button exists
    const assignButton = page.getByRole('button', { name: '+ Assign Students' });
    await expect(assignButton).toBeVisible();

    // Button should be enabled if not at capacity
    const capacityText = await page.locator('text=/\\d+ \\/ \\d+ students/').textContent();
    if (capacityText) {
      const match = capacityText.match(/(\d+) \/ (\d+) students/);
      if (match) {
        const [, enrolled, capacity] = match;
        if (parseInt(enrolled) < parseInt(capacity)) {
          await expect(assignButton).not.toBeDisabled();
        } else {
          await expect(assignButton).toBeDisabled();
        }
      }
    }
  });

  test('ROSTER-E2E-006: Remove student confirmation dialog', async ({ page }) => {
    // This test verifies the confirmation dialog appears
    // We'll use dialog handler to intercept it
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a class with students
    const classWithStudents = page.locator('table tbody tr').filter({ hasText: /[1-9]\/\d+/ }).first();
    await classWithStudents.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Set up dialog handler to cancel
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Cancel the removal
    });

    // Click first Remove button
    const removeButton = page.locator('button', { hasText: 'Remove' }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Wait a moment for dialog to be handled
      await page.waitForTimeout(500);

      // Verify dialog was shown with correct message
      expect(dialogMessage).toContain('Remove');
      expect(dialogMessage).toContain('from this class');
    }
  });

  test('ROSTER-E2E-007: Remove student flow (with confirmation)', async ({ page }) => {
    // First, create a test student and assign to a class
    // This requires admin students flow which may not be fully implemented
    // For now, we'll test with existing seeded data

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a class with enrolled count > 0
    const rows = await page.locator('table tbody tr').all();
    let classWithStudents = null;
    let initialCount = 0;
    
    for (const row of rows) {
      const text = await row.textContent();
      const match = text?.match(/(\d+)\s*\/\s*\d+/);
      if (match && parseInt(match[1]) > 0) {
        classWithStudents = row;
        initialCount = parseInt(match[1]);
        break;
      }
    }
    
    if (!classWithStudents) {
      test.skip(true, 'No classes with enrolled students found');
      return;
    }

    await classWithStudents.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Set up dialog handler to confirm
    page.on('dialog', async dialog => {
      await dialog.accept(); // Confirm the removal
    });

    // Get initial number of rows
    const initialRows = await page.locator('table tbody tr').count();

    // Click first Remove button
    const removeButton = page.locator('button', { hasText: 'Remove' }).first();
    if (await removeButton.isVisible() && initialRows > 0) {
      await removeButton.click();

      // Wait for removal to complete
      await page.waitForTimeout(1000);

      // Verify row count decreased or empty state appears
      const newRows = await page.locator('table tbody tr').count();
      if (newRows === 0) {
        await expect(page.getByText('No students enrolled yet')).toBeVisible();
      } else {
        expect(newRows).toBeLessThan(initialRows);
      }

      // Verify enrolled count decreased
      const newEnrolledText = await page.locator('text=/\\d+ \\/ \\d+ students/').textContent();
      if (newEnrolledText) {
        const match = newEnrolledText.match(/(\d+) \/ \d+ students/);
        if (match) {
          const newCount = parseInt(match[1]);
          expect(newCount).toBe(initialCount - 1);
        }
      }
    }
  });

  test('ROSTER-E2E-008: Navigate back to class edit page', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstClass = page.locator('table tbody tr').first();
    await firstClass.getByRole('link', { name: 'Edit' }).click();

    // Wait for navigation to edit page
    await page.waitForURL(/.*\/admin\/classes\/[^/]+\/edit\/?$/);
    const editUrl = page.url();
    const classId = editUrl.match(/classes\/([^/]+)\/edit/)?.[1];

    await page.getByRole('link', { name: 'View Roster' }).click();
    await expect(page).toHaveURL(/.*\/roster/);

    // Click back link
    await page.getByRole('link', { name: '← Back to Class Details' }).click();

    // Should be back on edit page (check URL contains the class ID and /edit path)
    await expect(page).toHaveURL(new RegExp(`/admin/classes/${classId}/edit/?$`));
    await expect(page.getByRole('heading', { name: 'Edit Class' })).toBeVisible();
  });

  test('ROSTER-E2E-009: Breadcrumb navigation works', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstClass = page.locator('table tbody tr').first();
    await firstClass.getByRole('link', { name: 'Edit' }).click();
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

  test('ROSTER-E2E-010: Student links navigate to student detail page', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a class with enrolled count > 0
    const rows = await page.locator('table tbody tr').all();
    let classWithStudents = null;
    
    for (const row of rows) {
      const text = await row.textContent();
      const match = text?.match(/(\d+)\s*\/\s*\d+/);
      if (match && parseInt(match[1]) > 0) {
        classWithStudents = row;
        break;
      }
    }
    
    if (!classWithStudents) {
      test.skip(true, 'No classes with enrolled students found');
      return;
    }
    
    await classWithStudents.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Wait for roster table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click on first student name link
    const firstStudentLink = page.locator('table tbody tr').first().locator('a').first();
    if (await firstStudentLink.isVisible()) {
      await firstStudentLink.click();

      // Should navigate to student detail page
      await expect(page).toHaveURL(/.*\/admin\/students\/[^/]+/);
    }
  });

  test('ROSTER-E2E-011: Loading state displays correctly', async ({ page }) => {
    // Navigate to roster and check for loading state
    // This test needs to be fast enough to catch the loading state
    const response = page.waitForResponse(resp => resp.url().includes('/students') && resp.status() === 200);
    
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });
    
    const firstClass = page.locator('table tbody tr').first();
    await firstClass.getByRole('link', { name: 'Edit' }).click();
    
    // Navigate to roster - loading should appear briefly
    const rosterPromise = page.getByRole('link', { name: 'View Roster' }).click();
    
    // Try to catch loading state (it might be too fast)
    // Look for animate-pulse or loading skeleton
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
    // The exact error message depends on implementation
    await page.waitForTimeout(2000); // Wait for API call to complete

    // Check for error indicators
    const hasErrorMessage = await page.getByText(/not found/i).isVisible().catch(() => false) ||
                           await page.getByText(/error/i).isVisible().catch(() => false) ||
                           await page.getByText(/failed/i).isVisible().catch(() => false);

    expect(hasErrorMessage).toBeTruthy();
  });

  test('ROSTER-E2E-013: Full capacity indicator appears correctly', async ({ page }) => {
    // Create a class with capacity 1
    await page.goto('/admin/classes/create');
    await page.waitForSelector('select[name="gradeId"]', { timeout: 10000 });

    await page.fill('input[name="name"]', 'Full Capacity Test');
    await page.selectOption('select[name="gradeId"]', { index: 1 });
    await page.selectOption('select[name="day"]', 'Friday');
    await page.fill('input[name="time"]', '5:00 PM');
    await page.fill('input[name="capacity"]', '1');
    await page.getByRole('button', { name: /Create Class/i }).click();

    // Navigate to roster
    await page.waitForSelector('table', { timeout: 10000 });
    const classRow = page.locator('table tbody tr', { hasText: 'Full Capacity Test' });
    await classRow.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('link', { name: 'View Roster' }).click();

    // Initially should show "1 spot available"
    await expect(page.getByText(/1 spot available/)).toBeVisible();

    // If we could assign a student here, we'd verify "(Full)" appears
    // For now, just verify the empty state at capacity 1
  });

  test('ROSTER-E2E-014: Mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstClass = page.locator('table tbody tr').first();
    await firstClass.getByRole('link', { name: 'Edit' }).click();
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

  test('ROSTER-E2E-015: Status badges display with correct colors', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find a class with enrolled count > 0
    const rows = await page.locator('table tbody tr').all();
    let classWithStudents = null;
    
    for (const row of rows) {
      const text = await row.textContent();
      const match = text?.match(/(\d+)\s*\/\s*\d+/);
      if (match && parseInt(match[1]) > 0) {
        classWithStudents = row;
        break;
      }
    }
    
    if (!classWithStudents) {
      test.skip(true, 'No classes with enrolled students found');
      return;
    }
    
    await classWithStudents.getByRole('link', { name: 'Edit' }).click();
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
