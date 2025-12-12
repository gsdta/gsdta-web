import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Admin Class Management E2E Tests
 *
 * These tests verify the admin class management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * NOTE: Some tests are skipped as they require UI implementation.
 * API-level class functionality is covered by Cucumber tests.
 */

test.describe('Admin Class Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip('CE2E-002: Admin sees all classes', async ({ page }) => {
    await page.goto('/admin/classes');
    await expect(page.getByRole('heading', { name: 'Classes' })).toBeVisible();
    
    // Check for seeded classes
    await expect(page.getByText('Tamil Beginners')).toBeVisible();
  });

  test.skip('CE2E-004: Complete class creation flow', async ({ page }) => {
    await page.goto('/admin/classes');
    // Click create class button (link)
    await page.click('text=Create Class');
    
    await expect(page).toHaveURL(/.*\/admin\/classes\/create/);
    
    await page.fill('input[name="name"]', 'Playwright Test Class');
    await page.selectOption('select[name="level"]', 'Beginner');
    await page.selectOption('select[name="day"]', 'Sunday');
    await page.fill('input[name="time"]', '2pm - 4pm');
    await page.fill('input[name="capacity"]', '15');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/admin\/classes/);
    await expect(page.getByText('Playwright Test Class')).toBeVisible();
  });
});
