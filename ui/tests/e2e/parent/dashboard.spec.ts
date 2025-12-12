import { test, expect } from '@playwright/test';
import { loginAsParent, setEnglishLanguage } from '../helpers/auth';

/**
 * Parent Dashboard E2E Tests
 *
 * These tests verify the parent dashboard UI functionality
 * with Firebase Auth emulator authentication.
 */

test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ page, context }) => {
    await setEnglishLanguage(page, context);
    await loginAsParent(page);
  });

  test('PDE2E-001: Dashboard displays welcome message', async ({ page }) => {
    await page.goto('/parent');
    await expect(page.getByText(/Welcome back/)).toBeVisible();
  });

  test('PDE2E-002: Dashboard shows Register Student quick action', async ({ page }) => {
    await page.goto('/parent');

    // Find the Register Student link in the Quick Actions grid (the one with blue styling)
    // The sidebar link has class containing "text-gray-700", the quick action has "text-blue-900"
    const registerLink = page.locator('a[href*="/parent/students/register"]').filter({ hasText: 'Add a new student' });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toContainText('Register Student');
  });

  test('PDE2E-003: Register Student quick action navigates correctly', async ({ page }) => {
    await page.goto('/parent');

    // Click the Register Student quick action in main content
    const mainContent = page.locator('main');
    const registerLink = mainContent.getByRole('link', { name: /Register Student/i }).first();
    await registerLink.click();

    await expect(page).toHaveURL(/.*\/parent\/students\/register/);
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();
  });

  test('PDE2E-004: Dashboard shows all quick action links', async ({ page }) => {
    await page.goto('/parent');

    // Check quick actions in main content area
    const mainContent = page.locator('main');
    await expect(mainContent.getByRole('link', { name: /Register Student/i }).first()).toBeVisible();
    await expect(mainContent.getByRole('link', { name: /My Students/i }).first()).toBeVisible();
    await expect(mainContent.getByRole('link', { name: /My Profile/i }).first()).toBeVisible();
    await expect(mainContent.getByRole('link', { name: /Settings/i }).first()).toBeVisible();
  });

  test('PDE2E-005: My Students quick action navigates correctly', async ({ page }) => {
    await page.goto('/parent');

    // Click My Students in main content area
    const mainContent = page.locator('main');
    await mainContent.getByRole('link', { name: /My Students/i }).first().click();

    await expect(page).toHaveURL(/.*\/parent\/students/);
    await expect(page.getByRole('heading', { name: 'My Students' })).toBeVisible();
  });

  test('PDE2E-006: Dashboard shows student statistics', async ({ page }) => {
    await page.goto('/parent');

    // Check stats cards are present - use exact match to avoid multiple matches
    await expect(page.getByText('Linked Students', { exact: true })).toBeVisible();
    await expect(page.getByText('Active Students', { exact: true })).toBeVisible();
    await expect(page.getByText('Profile Status', { exact: true })).toBeVisible();
  });

  test('PDE2E-007: Dashboard shows seeded student preview', async ({ page }) => {
    await page.goto('/parent');

    // Wait for student data to load (seeded student Arun Kumar)
    await expect(page.getByText('Arun Kumar')).toBeVisible({ timeout: 10000 });

    // Should show "Your Students" section with View all link
    await expect(page.getByText('Your Students')).toBeVisible();
    await expect(page.getByRole('link', { name: /View all/ })).toBeVisible();
  });

  test('PDE2E-008: View all link navigates to students page', async ({ page }) => {
    await page.goto('/parent');

    // Wait for students to load
    await expect(page.getByText('Your Students')).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: /View all/ }).click();

    await expect(page).toHaveURL(/.*\/parent\/students/);
  });

  test('PDE2E-009: Sidebar navigation is visible', async ({ page }) => {
    await page.goto('/parent');

    // Check sidebar has navigation section headings (h2 elements)
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('heading', { name: 'Students' })).toBeVisible();
    await expect(sidebar.getByRole('heading', { name: 'Account' })).toBeVisible();
  });

  test('PDE2E-010: Sidebar Register Student link works', async ({ page }) => {
    await page.goto('/parent');

    // Click Register Student in sidebar
    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: /Register Student/i }).click();

    await expect(page).toHaveURL(/.*\/parent\/students\/register/);
  });
});
