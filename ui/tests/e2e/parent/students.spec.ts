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

  // ============================================
  // 2025-26 New Fields E2E Tests
  // ============================================

  test('PE2E-010: Registration form shows all new field sections', async ({ page }) => {
    await page.goto('/parent/students/register');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    // Check for new sections
    await expect(page.getByText('Student Information')).toBeVisible();
    await expect(page.getByText('School Information')).toBeVisible();
    await expect(page.getByText('Home Address')).toBeVisible();
    await expect(page.getByText('Parent/Guardian Information')).toBeVisible();
    await expect(page.getByText('Additional Information')).toBeVisible();
  });

  test('PE2E-011: Gender dropdown has correct options', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    const genderSelect = page.locator('select[name="gender"]');
    await expect(genderSelect).toBeVisible();

    // Check options exist (options are hidden until dropdown is opened, use toBeAttached)
    await expect(genderSelect.locator('option')).toHaveCount(4);
    await expect(genderSelect.locator('option', { hasText: 'Boy' })).toBeAttached();
    await expect(genderSelect.locator('option', { hasText: 'Girl' })).toBeAttached();
    await expect(genderSelect.locator('option', { hasText: 'Other' })).toBeAttached();
  });

  test('PE2E-012: School district dropdown has San Diego area districts', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    const districtSelect = page.locator('select[name="schoolDistrict"]');
    await expect(districtSelect).toBeVisible();

    // Check for common districts (options are hidden until dropdown is opened, use toBeAttached)
    await expect(districtSelect.locator('option', { hasText: 'Poway Unified School District' })).toBeAttached();
    await expect(districtSelect.locator('option', { hasText: 'San Diego Unified School District' })).toBeAttached();
  });

  test('PE2E-013: Address fields can be filled', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    // Fill address fields
    await page.fill('#street', '12345 Main Street');
    await page.fill('#city', 'San Diego');
    await page.fill('#zipCode', '92128');

    // Verify values
    await expect(page.locator('#street')).toHaveValue('12345 Main Street');
    await expect(page.locator('#city')).toHaveValue('San Diego');
    await expect(page.locator('#zipCode')).toHaveValue('92128');
  });

  test('PE2E-014: Parent contact fields for mother and father', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    // Check for parent sections
    await expect(page.getByText("Mother's Information")).toBeVisible();
    await expect(page.getByText("Father's Information")).toBeVisible();

    // Fill mother's info (first set of parent fields)
    const nameInputs = page.getByPlaceholder('First Last');
    const emailInputs = page.getByPlaceholder('email@example.com');
    const phoneInputs = page.getByPlaceholder('(858) 555-1234');

    await nameInputs.nth(0).fill('Priya Kumar');
    await emailInputs.nth(0).fill('priya@example.com');
    await phoneInputs.nth(0).fill('8585551234');

    // Fill father's info (second set)
    await nameInputs.nth(1).fill('Raj Kumar');
    await emailInputs.nth(1).fill('raj@example.com');
    await phoneInputs.nth(1).fill('8585555678');

    // Verify values
    await expect(nameInputs.nth(0)).toHaveValue('Priya Kumar');
    await expect(nameInputs.nth(1)).toHaveValue('Raj Kumar');
  });

  test('PE2E-015: Complete registration with all new fields', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    // Required fields
    await page.fill('input[name="firstName"]', 'NewStudent');
    await page.fill('input[name="lastName"]', 'AllFields');
    await page.fill('input[name="dateOfBirth"]', '2016-03-20');

    // New fields - Gender
    await page.selectOption('select[name="gender"]', 'Boy');

    // School info
    await page.fill('input[name="schoolName"]', 'Poway Elementary');
    await page.selectOption('select[name="schoolDistrict"]', 'Poway Unified School District');
    await page.fill('input[name="grade"]', '3rd Grade');

    // Address
    await page.fill('#street', '12345 Main Street');
    await page.fill('#city', 'San Diego');
    await page.fill('#zipCode', '92128');

    // Mother's contact
    const nameInputs = page.getByPlaceholder('First Last');
    const emailInputs = page.getByPlaceholder('email@example.com');
    await nameInputs.nth(0).fill('Test Mom');
    await emailInputs.nth(0).fill('testmom@example.com');

    // Medical notes
    await page.fill('textarea[name="medicalNotes"]', 'No known allergies');

    // Photo consent
    await page.check('input[name="photoConsent"]');

    // Submit
    await page.getByRole('button', { name: /Register Student/i }).click();

    // Should redirect successfully
    await expect(page).toHaveURL(/.*\/parent\/students\/?\?registered=true/);
    await expect(page.getByText(/Student registered successfully/i)).toBeVisible();
    await expect(page.getByText('NewStudent AllFields')).toBeVisible();
  });

  test('PE2E-016: Medical notes textarea is visible and editable', async ({ page }) => {
    await page.goto('/parent/students/register');
    await expect(page.getByRole('heading', { name: 'Register New Student' })).toBeVisible();

    const medicalNotes = page.locator('textarea[name="medicalNotes"]');
    await expect(medicalNotes).toBeVisible();

    await medicalNotes.fill('Peanut allergy, uses EpiPen');
    await expect(medicalNotes).toHaveValue('Peanut allergy, uses EpiPen');
  });
});
