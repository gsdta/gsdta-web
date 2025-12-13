import { test, expect } from '@playwright/test';
import { loginAsParent } from '../helpers/auth';

/**
 * Parent Student Management E2E Tests
 *
 * These tests verify the parent student management UI functionality
 * with Firebase Auth emulator authentication.
 *
 * API-level student functionality is also covered by Cucumber tests in:
 * api/tests/e2e/features/parent-student-registration.feature
 */

test.describe('Parent Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
  });

  test('PE2E-002: Logged in parent sees students list', async ({ page }) => {
    await page.goto('/parent/students');
    await expect(page.getByRole('heading', { name: 'My Students' })).toBeVisible();
    
    // Check for seeded student (Arun Kumar belongs to parent@test.com in seed)
    await expect(page.getByText('Arun Kumar')).toBeVisible();
  });

  test('PE2E-003: Register new student link works', async ({ page }) => {
    await page.goto('/parent/students');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'My Students' })).toBeVisible();

    // Click the register link in the header
    await page.getByRole('link', { name: /Register New Student/i }).first().click();

    await expect(page).toHaveURL(/.*\/parent\/students\/register/);
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();
  });

  test('PE2E-004: Complete student registration flow', async ({ page }) => {
    await page.goto('/parent/students/register');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    // Fill required fields
    await page.fill('input[name="firstName"]', 'TestChild');
    await page.fill('input[name="lastName"]', 'Playwright');
    await page.fill('input[name="dateOfBirth"]', '2015-06-15');

    // Optional fields
    await page.fill('input[name="grade"]', '3rd Grade');
    await page.fill('input[name="schoolName"]', 'Test Elementary');

    // Submit the form
    await page.getByRole('button', { name: /Register Student/i }).click();

    // Should redirect to students list with success message (allow optional trailing slash)
    await expect(page).toHaveURL(/.*\/parent\/students\/?\?registered=true/);

    // Should see success message
    await expect(page.getByText(/Student registered successfully/i)).toBeVisible();

    // Should see new student in list
    await expect(page.getByText('TestChild Playwright')).toBeVisible();

    // New student should have Pending status
    await expect(page.getByText('Pending').first()).toBeVisible();
  });
});
