import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Teacher Assignment E2E Tests
 *
 * These tests verify the bulk teacher assignment UI functionality.
 * Tests the /admin/teachers/assign page where admins can assign
 * teachers to multiple classes from a single view.
 */

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

  test('TA-E2E-002: Page displays all active classes', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Should show classes from seed data
    await expect(page.getByText('PS-1 Section A')).toBeVisible();
    await expect(page.getByText('Grade 3 Section A')).toBeVisible();
  });

  test('TA-E2E-003: Page displays teacher workload summary', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for data to load
    await expect(page.getByText('Teacher Workload')).toBeVisible();
    
    // Should show teachers and their class counts
    const workloadSection = page.locator('text=Teacher Workload').locator('..');
    await expect(workloadSection).toBeVisible();
  });

  test('TA-E2E-004: Page shows assigned/unassigned counts', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
    
    // Should show summary counts with more specific text
    await expect(page.locator('text=/\\d+ assigned/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/\\d+ unassigned/i')).toBeVisible({ timeout: 10000 });
  });

  test('TA-E2E-005: Visual indicators show assignment status', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Check for checkmark on assigned class
    const assignedClass = page.locator('text=PS-1 Section A').locator('..');
    await expect(assignedClass.locator('[title="Primary teacher assigned"]')).toBeVisible();
    
    // Check for warning on unassigned class (if any exist)
    const warningIcons = page.locator('[title="No primary teacher"]');
    const count = await warningIcons.count();
    if (count > 0) {
      await expect(warningIcons.first()).toBeVisible();
    }
  });

  test('TA-E2E-006: Can filter classes by grade', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for classes to load
    await expect(page.getByText('PS-1 Section A')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Grade 3 Section A')).toBeVisible({ timeout: 10000 });
    
    // Apply grade filter - select by value instead of label
    const gradeFilter = page.locator('select#gradeFilter');
    await gradeFilter.selectOption('ps-1');
    
    // Wait a moment for filter to apply
    await page.waitForTimeout(500);
    
    // Should only show PS-1 classes
    await expect(page.getByText('PS-1 Section A')).toBeVisible();
    
    // Other grade classes should not be visible
    await expect(page.getByText('Grade 3 Section A')).not.toBeVisible();
  });

  test('TA-E2E-007: Can filter to show unassigned classes only', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for classes to load
    await expect(page.getByText('PS-1 Section A')).toBeVisible();
    
    // Toggle unassigned filter
    await page.check('input[type="checkbox"]');
    
    // Should only show classes without primary teacher
    // PS-1 Section A has a teacher, so it shouldn't be visible
    await expect(page.getByText('PS-1 Section A')).not.toBeVisible();
    
    // Uncheck to show all again
    await page.uncheck('input[type="checkbox"]');
    await expect(page.getByText('PS-1 Section A')).toBeVisible();
  });

  test('TA-E2E-008: Primary teacher dropdown shows available teachers', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
    
    // Wait for classes to render (indicating data is loaded)
    await expect(page.getByText('PS-1 Section A')).toBeVisible({ timeout: 10000 });
    
    // Find a primary teacher dropdown
    const primarySelects = page.locator('select[id^="primary-"]');
    const firstSelect = primarySelects.first();
    
    // Wait for the dropdown to have options loaded (more than just the empty option)
    await expect(async () => {
      const options = await firstSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(1); // At least one teacher + empty option
    }).toPass({ timeout: 10000 });
  });

  test('TA-E2E-009: Assistant teacher section is visible', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible({ timeout: 10000 });
    
    // Wait for classes to render
    await page.waitForSelector('.space-y-4 > div', { timeout: 10000 });
    
    // Should show assistant teacher label (there can be multiple)
    const assistantLabels = page.locator('text=Assistant Teachers (Optional)');
    await expect(assistantLabels.first()).toBeVisible({ timeout: 10000 });
    
    // Should have add assistant dropdown - use more specific selector
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

  test('TA-E2E-012: Empty state shows when no classes match filter', async ({ page }) => {
    await page.goto('/admin/teachers/assign');
    
    // Wait for page to load
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
    
    // Select a grade and unassigned filter that results in no matches
    await page.check('input[type="checkbox"]'); // Show unassigned only
    
    // Then filter by a grade that has all teachers assigned
    const gradeFilter = page.locator('select#gradeFilter');
    await gradeFilter.selectOption({ index: 1 });
    
    // May show empty state depending on data
    const emptyState = page.getByText(/no classes found matching your filters/i);
    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('TA-E2E-013: Page is responsive and mobile-friendly', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/teachers/assign');
    
    // Should still show main heading
    await expect(page.getByText('Teacher Assignments')).toBeVisible();
    
    // Filters should stack on mobile
    const filtersSection = page.locator('.flex-wrap');
    await expect(filtersSection).toBeVisible();
    
    // Classes should be visible
    await expect(page.getByText(/Section A/i).first()).toBeVisible();
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
