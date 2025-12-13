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

  test('GE2E-002: Admin can edit a grade display name', async ({ page }) => {
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
    const row = page.getByRole('row').filter({ hasText: 'grade-1' }).first();
    await expect(row).toBeVisible();
    
    await row.getByRole('button', { name: 'Edit' }).click();
    
    // Clear and type new name
    await page.locator('input[type="text"]').fill('Grade One Updated');
    await row.getByRole('button', { name: 'Save' }).click();
    
    // Verify update
    await expect(page.getByText('Grade One Updated')).toBeVisible();
    
    // Revert changes
    // Row still has ID "grade-1"
    const updatedRow = page.getByRole('row').filter({ hasText: 'grade-1' }).first();
    await updatedRow.getByRole('button', { name: 'Edit' }).click();
    await page.locator('input[type="text"]').fill('Grade 1');
    await updatedRow.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Grade 1', { exact: true }).first()).toBeVisible();
  });
});
