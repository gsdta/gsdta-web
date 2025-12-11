import { Page } from '@playwright/test';

/**
 * Authentication helper for E2E tests with Firebase Auth Emulator
 */

/**
 * Login as admin user in Firebase Auth Emulator
 * Creates a test admin user if needed and logs in
 */
export async function loginAsAdmin(page: Page) {
  // Go to login page
  await page.goto('/login');
  
  // Firebase Auth Emulator allows any email/password
  // Use consistent test credentials
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(/\/(admin|teacher|parent)/);
}

/**
 * Login as teacher user in Firebase Auth Emulator
 */
export async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  
  await page.fill('input[type="email"]', 'teacher@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/teacher/);
}

/**
 * Login as parent user in Firebase Auth Emulator
 */
export async function loginAsParent(page: Page) {
  await page.goto('/login');
  
  await page.fill('input[type="email"]', 'parent@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/parent/);
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Click user menu/logout button
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  
  // Wait for redirect to home or login
  await page.waitForURL(/\/(login|\/)/);
}
