import { test, expect } from '@playwright/test';
import { loginAsParent } from '../helpers/auth';

/**
 * Parent Dashboard E2E Tests
 *
 * These tests verify the parent dashboard UI functionality
 * with Firebase Auth emulator authentication.
 */

test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
  });

  test('PDE2E-001: Dashboard displays welcome message', async ({ page }) => {
    await page.goto('/parent');
    await expect(page.getByText(/Welcome back/)).toBeVisible();
  });

  test('PDE2E-002: Dashboard shows Register Student quick action', async ({ page }) => {
    await page.goto('/parent');

    const registerLink = page.getByRole('link', { name: /Register Student/i }).first();
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/parent/students/register');
  });

  test('PDE2E-003: Register Student quick action navigates correctly', async ({ page }) => {
    await page.goto('/parent');

    // Click the Register Student quick action (not the empty state one)
    const registerLink = page.getByRole('link', { name: /Register Student/i }).first();
    await registerLink.click();

    await expect(page).toHaveURL(/.*\/parent\/students\/register/);
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();
  });

  test('PDE2E-004: Dashboard shows all quick action links', async ({ page }) => {
    await page.goto('/parent');

    // Check all quick actions are present
    await expect(page.getByRole('link', { name: /Register Student/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /My Students/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /My Profile/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Settings/i })).toBeVisible();
  });

  test('PDE2E-005: My Students quick action navigates correctly', async ({ page }) => {
    await page.goto('/parent');

    await page.getByRole('link', { name: /My Students/i }).click();

    await expect(page).toHaveURL(/.*\/parent\/students/);
    await expect(page.getByRole('heading', { name: 'My Students' })).toBeVisible();
  });

  test('PDE2E-006: Dashboard shows student statistics', async ({ page }) => {
    await page.goto('/parent');

    // Check stats cards are present
    await expect(page.getByText('Linked Students')).toBeVisible();
    await expect(page.getByText('Active Students')).toBeVisible();
    await expect(page.getByText('Profile Status')).toBeVisible();
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
});
