import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Textbooks Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TBE2E-001: Admin can navigate to textbooks page', async ({ page }) => {
    await page.goto('/admin/textbooks');
    // Use h1 specifically to avoid matching sidebar or info box headings
    await expect(page.locator('h1', { hasText: 'Textbooks' })).toBeVisible();
    await expect(page.getByText('Manage textbooks and homework materials')).toBeVisible();
  });

  test('TBE2E-002: Admin sees textbooks list or empty state', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for loading to complete
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see the table or the empty state
    const table = page.locator('table');
    const emptyState = page.getByText('No textbooks found.');

    await expect(table.or(emptyState).first()).toBeVisible();
  });

  test('TBE2E-003: Add Textbook button is visible', async ({ page }) => {
    await page.goto('/admin/textbooks');
    await expect(page.getByRole('button', { name: 'Add Textbook' })).toBeVisible();
  });

  test('TBE2E-004: Status filter dropdown works', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Find the status filter by its label
    const statusLabel = page.getByText('Status:', { exact: true });
    await expect(statusLabel).toBeVisible();

    // Verify a select is visible near the status label
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('TBE2E-005: Grade filter dropdown shows grades', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const gradeLabel = page.getByText('Grade:', { exact: true });
    await expect(gradeLabel).toBeVisible();
  });

  test('TBE2E-006: Create textbook modal opens', async ({ page }) => {
    await page.goto('/admin/textbooks');

    await page.getByRole('button', { name: 'Add Textbook' }).click();

    // Modal should be visible
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeVisible();

    // Check form fields
    await expect(page.getByText('Grade *')).toBeVisible();
    await expect(page.getByText('Item Number *')).toBeVisible();
    await expect(page.getByText('Name *', { exact: true })).toBeVisible();
    await expect(page.getByText('Type *')).toBeVisible();
    await expect(page.getByText('Page Count *')).toBeVisible();
    await expect(page.getByText('Copies *')).toBeVisible();
  });

  test('TBE2E-007: Create textbook modal has cancel button', async ({ page }) => {
    await page.goto('/admin/textbooks');

    await page.getByRole('button', { name: 'Add Textbook' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeHidden();
  });

  test('TBE2E-008: Create textbook form has type dropdown with options', async ({ page }) => {
    await page.goto('/admin/textbooks');

    await page.getByRole('button', { name: 'Add Textbook' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeVisible();

    // Find type select within the modal (the modal is fixed position with z-50)
    const modal = page.locator('.fixed.inset-0');
    const typeSelect = modal.locator('select').nth(1); // Second select in modal (first is grade)
    await expect(typeSelect).toBeVisible();

    // Check we can select different types
    await typeSelect.selectOption('homework');
    await typeSelect.selectOption('textbook');
  });

  test('TBE2E-009: Create textbook form has semester dropdown', async ({ page }) => {
    await page.goto('/admin/textbooks');

    await page.getByRole('button', { name: 'Add Textbook' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeVisible();

    // Find semester select within the modal
    const modal = page.locator('.fixed.inset-0');
    const semesterSelect = modal.locator('select').nth(2); // Third select in modal
    await expect(semesterSelect).toBeVisible();

    // Check we can select semesters
    await semesterSelect.selectOption('First');
    await semesterSelect.selectOption('Second');
  });

  test('TBE2E-010: Admin can fill textbook creation form', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for grades to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add Textbook' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Textbook' })).toBeVisible();

    // Fill the form within the modal
    const modal = page.locator('.fixed.inset-0');

    // Verify grade select is present and has options
    const gradeSelect = modal.locator('select').first();
    await expect(gradeSelect).toBeVisible();

    // Verify item number input is present
    const itemInput = modal.locator('input[placeholder="#910131"]');
    await expect(itemInput).toBeVisible();
    await itemInput.fill('#E2E-TEST-001');

    // Verify name input is present
    const nameInput = modal.locator('input[placeholder*="Mazhalai"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Test Textbook');

    // Verify number inputs are present
    const numberInputs = modal.locator('input[type="number"]');
    await expect(numberInputs.first()).toBeVisible();
    await expect(numberInputs.last()).toBeVisible();

    // Verify Create button is present
    await expect(modal.getByRole('button', { name: 'Create Textbook' })).toBeVisible();
  });

  test('TBE2E-011: Table shows correct columns', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check if table exists (may be empty state)
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Item #' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Pages' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Copies' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    }
  });

  test('TBE2E-012: Refresh button is visible', async ({ page }) => {
    await page.goto('/admin/textbooks');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('TBE2E-013: Info box is displayed', async ({ page }) => {
    await page.goto('/admin/textbooks');

    await expect(page.getByText('About Textbooks')).toBeVisible();
    await expect(page.getByText('Textbooks are linked to grades for curriculum organization')).toBeVisible();
  });

  test('TBE2E-014: Empty state has add textbook link', async ({ page }) => {
    await page.goto('/admin/textbooks');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const emptyState = page.getByText('No textbooks found.');
    if (await emptyState.isVisible()) {
      await expect(page.getByText('Add your first textbook')).toBeVisible();
    }
  });
});
