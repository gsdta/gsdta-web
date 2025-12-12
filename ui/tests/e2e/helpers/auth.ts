import { Page, BrowserContext } from '@playwright/test';

/**
 * Authentication helper for E2E tests with Firebase Auth Emulator
 *
 * Test credentials (from seed-emulator.js):
 *   Admin:   admin@test.com   / admin123
 *   Teacher: teacher@test.com / teacher123
 *   Parent:  parent@test.com  / parent123
 */

/**
 * Set English language for the page
 */
export async function setEnglishLanguage(page: Page, context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('i18n:lang', 'en');
      window.sessionStorage.clear();
    } catch {}
  });
}

/**
 * Login with email/password via Firebase Auth Emulator
 * Uses the /signin page which is the Firebase mode login page
 */
async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp
): Promise<void> {
  // Go to signin page (Firebase mode login)
  await page.goto('/signin', { waitUntil: 'networkidle' });

  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click the email sign-in button
  await page.click('button[type="submit"]');

  // Wait for redirect after login - use a longer timeout and handle errors
  try {
    await page.waitForURL(expectedUrlPattern, { timeout: 20000 });
  } catch (error) {
    // Check if there's an auth error message on the page
    const errorAlert = page.locator('role=alert');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      throw new Error(`Login failed: ${errorText}`);
    }
    throw error;
  }

  // Extra wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Login as admin user in Firebase Auth Emulator
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginWithCredentials(page, 'admin@test.com', 'admin123', /\/admin/);
}

/**
 * Login as teacher user in Firebase Auth Emulator
 */
export async function loginAsTeacher(page: Page): Promise<void> {
  await loginWithCredentials(page, 'teacher@test.com', 'teacher123', /\/teacher/);
}

/**
 * Login as parent user in Firebase Auth Emulator
 */
export async function loginAsParent(page: Page): Promise<void> {
  await loginWithCredentials(page, 'parent@test.com', 'parent123', /\/parent/);
}

/**
 * Logout current user via the /logout page
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/logout', { waitUntil: 'networkidle' });
  // Wait for redirect to home or signin
  await page.waitForURL(/\/(signin|$)/, { timeout: 10000 });
}

/**
 * Check if user is currently logged in by checking for redirect behavior
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Try to access a protected route - if redirected to signin, not logged in
  const currentUrl = page.url();
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Give time for redirect
  const newUrl = page.url();

  // Restore original page
  if (currentUrl !== newUrl) {
    await page.goto(currentUrl, { waitUntil: 'networkidle' });
  }

  return !newUrl.includes('/signin') && !newUrl.includes('/login');
}
