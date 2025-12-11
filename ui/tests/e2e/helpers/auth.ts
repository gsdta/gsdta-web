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
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  
  // Firebase Auth Emulator allows any email/password
  // Use consistent test credentials from seed script
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login (admin goes to /admin)
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  
  // Extra wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Login as teacher user in Firebase Auth Emulator
 */
export async function loginAsTeacher(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  
  await page.fill('input[type="email"]', 'teacher@test.com');
  await page.fill('input[type="password"]', 'teacher123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/teacher/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Login as parent user in Firebase Auth Emulator
 */
export async function loginAsParent(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  
  await page.fill('input[type="email"]', 'parent@test.com');
  await page.fill('input[type="password"]', 'parent123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/parent/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
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
