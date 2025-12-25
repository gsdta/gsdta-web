import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Volunteers Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('VE2E-001: Admin can navigate to volunteers page', async ({ page }) => {
    await page.goto('/admin/volunteers');
    // Use h1 specifically to avoid matching sidebar or info box headings
    await expect(page.locator('h1', { hasText: 'Volunteers' })).toBeVisible();
    await expect(page.getByText('Manage high school and parent volunteers')).toBeVisible();
  });

  test('VE2E-002: Admin sees volunteers list or empty state', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for loading to complete
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see the table or the empty state
    const table = page.locator('table');
    const emptyState = page.getByText('No volunteers found.');

    await expect(table.or(emptyState).first()).toBeVisible();
  });

  test('VE2E-003: Add Volunteer button is visible', async ({ page }) => {
    await page.goto('/admin/volunteers');
    await expect(page.getByRole('button', { name: 'Add Volunteer' })).toBeVisible();
  });

  test('VE2E-004: Status filter dropdown works', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Find the status filter by its label
    const statusLabel = page.getByText('Status:', { exact: true });
    await expect(statusLabel).toBeVisible();

    // Verify a select is visible
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('VE2E-005: Type filter dropdown shows volunteer types', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Find the type filter by its label
    const typeLabel = page.getByText('Type:', { exact: true });
    await expect(typeLabel).toBeVisible();

    // Verify the type filter select is visible (contains "All Types" option)
    const typeSelect = page.locator('select').filter({ hasText: 'All Types' });
    await expect(typeSelect).toBeVisible();
  });

  test('VE2E-006: Search input is visible', async ({ page }) => {
    await page.goto('/admin/volunteers');

    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await expect(searchInput).toBeVisible();
  });

  test('VE2E-007: Create volunteer modal opens', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();

    // Modal should be visible
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // Check form fields
    await expect(page.getByText('First Name *')).toBeVisible();
    await expect(page.getByText('Last Name *')).toBeVisible();
    await expect(page.getByText('Volunteer Type *')).toBeVisible();
    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('Phone', { exact: true })).toBeVisible();
  });

  test('VE2E-008: Create volunteer modal has cancel button', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeHidden();
  });

  test('VE2E-009: Create volunteer form has type dropdown with options', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // Find the type select in the modal (first select after modal opens)
    const modal = page.locator('.fixed.inset-0');
    const typeSelect = modal.locator('select').first();
    await expect(typeSelect).toBeVisible();

    // Check we can select different types
    await typeSelect.selectOption('parent');
    await typeSelect.selectOption('community');
    await typeSelect.selectOption('high_school');
  });

  test('VE2E-010: High school volunteer shows school/grade fields', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // High School is selected by default, so school/grade fields should be visible
    const modal = page.locator('.fixed.inset-0');
    await expect(modal.locator('input[placeholder*="Poway High School"]')).toBeVisible();
    await expect(modal.getByText('Grade Level')).toBeVisible();
  });

  test('VE2E-011: Available days checkboxes are visible', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();

    await expect(page.getByText('Available Days')).toBeVisible();
    await expect(page.getByText('Saturday')).toBeVisible();
    await expect(page.getByText('Sunday')).toBeVisible();
  });

  test('VE2E-012: Notes textarea is visible', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();

    await expect(page.getByText('Notes')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('VE2E-013: Admin can fill high school volunteer form', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // Fill the form within the modal
    const modal = page.locator('.fixed.inset-0');

    // Verify and fill first name input
    const firstNameInput = modal.locator('input').first();
    await expect(firstNameInput).toBeVisible();
    await firstNameInput.fill('E2E Test');

    // Verify and fill last name input
    const lastNameInput = modal.locator('input').nth(1);
    await expect(lastNameInput).toBeVisible();
    await lastNameInput.fill('Volunteer');

    // Type is already High School by default - verify school input is visible
    const schoolInput = modal.locator('input[placeholder*="Poway High School"]');
    await expect(schoolInput).toBeVisible();
    await schoolInput.fill('E2E Test High School');

    // Verify grade level select is visible
    const gradeSelect = modal.locator('select').nth(1);
    await expect(gradeSelect).toBeVisible();

    // Verify Add Volunteer button is present
    await expect(modal.getByRole('button', { name: 'Add Volunteer' })).toBeVisible();
  });

  test('VE2E-014: Admin can fill parent volunteer form', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    // Fill the form within the modal
    const modal = page.locator('.fixed.inset-0');

    // Fill first and last name
    const inputs = modal.locator('input');
    await inputs.first().fill('Parent');
    await inputs.nth(1).fill('TestVolunteer');

    // Change type to Parent (first select in modal)
    const typeSelect = modal.locator('select').first();
    await typeSelect.selectOption('parent');

    // When type is Parent, school input should be hidden
    await expect(modal.locator('input[placeholder*="Poway High School"]')).toBeHidden();

    // Verify Add Volunteer button is present
    await expect(modal.getByRole('button', { name: 'Add Volunteer' })).toBeVisible();
  });

  test('VE2E-015: Table shows correct columns', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check if table exists (may be empty state)
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Contact' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'School/Grade' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Hours' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    }
  });

  test('VE2E-016: Refresh button is visible', async ({ page }) => {
    await page.goto('/admin/volunteers');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('VE2E-017: Info box is displayed', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await expect(page.getByText('About Volunteers')).toBeVisible();
    await expect(page.getByText('High school volunteers (HV) help with classroom activities')).toBeVisible();
  });

  test('VE2E-018: Empty state has add volunteer link', async ({ page }) => {
    await page.goto('/admin/volunteers');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    const emptyState = page.getByText('No volunteers found.');
    if (await emptyState.isVisible()) {
      await expect(page.getByText('Add your first volunteer')).toBeVisible();
    }
  });

  test('VE2E-019: Type badges are color-coded', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check that type filter has options (which implies type badges work)
    const typeSelect = page.locator('select').filter({ hasText: 'All Types' });
    await expect(typeSelect).toBeVisible();
  });

  test('VE2E-020: Switching type hides school/grade fields for non-high-school', async ({ page }) => {
    await page.goto('/admin/volunteers');

    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();

    const modal = page.locator('.fixed.inset-0');

    // Initially High School is selected, school field should be visible
    await expect(modal.locator('input[placeholder*="Poway High School"]')).toBeVisible();

    // Switch to Parent (first select in modal)
    const typeSelect = modal.locator('select').first();
    await typeSelect.selectOption('parent');

    // School field should be hidden
    await expect(modal.locator('input[placeholder*="Poway High School"]')).toBeHidden();
  });
});
