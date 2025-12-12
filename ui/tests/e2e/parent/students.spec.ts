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

  test.skip('PE2E-003: Register new student link works', async ({ page }) => {
    await page.goto('/parent/students');
    const registerLinks = await page.getByRole('link', { name: /Register New Student/i }).all();
    // Use the first one (header)
    await registerLinks[0].click();
    
    await expect(page).toHaveURL(/.*\/parent\/students\/register/);
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();
  });

  test.skip('PE2E-004: Complete student registration flow', async ({ page }) => {
    await page.goto('/parent/students/register');
    
    await page.fill('input[name="firstName"]', 'TestChild');
    await page.fill('input[name="lastName"]', 'Playwright');
    await page.fill('input[name="dateOfBirth"]', '2015-06-15');
    // Optional fields
    await page.fill('input[name="grade"]', '3rd Grade');
    
    await page.click('button[type="submit"]');
    
    // Should redirect to students list
    await expect(page).toHaveURL(/.*\/parent\/students/);
    
    // Should see new student
    await expect(page.getByText('TestChild Playwright')).toBeVisible();
    
    // Find the badge for this student. Might need to be specific if multiple "Pending"
    // Ideally we'd scope to the card.
    // Simple check:
    await expect(page.getByText('Pending Review').first()).toBeVisible();
  });
});
