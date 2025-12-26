import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Grades Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GE2E-001: Admin can view grades list', async ({ page }) => {
    await page.goto('/admin/grades');
    await expect(page.getByRole('heading', { name: 'Grades', exact: true })).toBeVisible();
    
    // Check for at least one expected element (Grade 1 or Seed button)
    const grade1 = page.getByText('Grade 1', { exact: true }); // "Grade 1" text in row
    const seedBtn = page.getByText('Seed Default Grades');
    
    // Wait for data to load
    await expect(grade1.or(seedBtn).first()).toBeVisible();
  });

  test('GE2E-002: Admin can access grade action menu', async ({ page }) => {
    await page.goto('/admin/grades');

    // Define locators
    const seedBtn = page.getByRole('button', { name: 'Seed Default Grades' }).first();
    const grade1 = page.getByText('Grade 1', { exact: true });

    // Wait for either the seed button or the grade to be visible (data loaded)
    await expect(seedBtn.or(grade1).first()).toBeVisible({ timeout: 10000 });

    // If seed button is visible, click it to seed grades
    if (await seedBtn.isVisible()) {
        await seedBtn.click();
        // Wait for seeding to complete and grade to appear
        await expect(grade1).toBeVisible({ timeout: 10000 });
    }

    // Locate the row containing "Grade 1" by its ID "grade-1" which is stable
    const row = page.locator('tbody tr').filter({ hasText: 'grade-1' }).first();
    await expect(row).toBeVisible();

    // Click row to open action menu
    await row.click();

    // Verify Edit and Deactivate actions are available
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Deactivate' })).toBeVisible();

    // Click Edit to enter edit mode
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    // Wait for edit mode - input field should appear
    const displayNameInput = row.locator('input[type="text"]');
    await expect(displayNameInput).toBeVisible();

    // Verify the input shows the current value
    await expect(displayNameInput).toHaveValue('Grade 1');

    // Cancel editing by clicking Cancel in the action menu
    await row.locator('td:nth-child(2)').click();
    await expect(page.getByRole('menuitem', { name: 'Cancel' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Cancel' }).click();

    // Verify edit mode is dismissed
    await expect(displayNameInput).not.toBeVisible({ timeout: 5000 });

    // Verify the original value is still displayed
    await expect(page.getByText('Grade 1', { exact: true }).first()).toBeVisible();
  });
});
