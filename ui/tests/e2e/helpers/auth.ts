import { Page, BrowserContext } from '@playwright/test';

/**
 * Authentication helper for E2E tests with Firebase Auth Emulator
 *
 * Test credentials (from seed-emulator.js):
 *   SuperAdmin: superadmin@test.com / superadmin123
 *   Admin:      admin@test.com      / admin123
 *   Teacher:    teacher@test.com    / teacher123
 *   Parent:     parent@test.com     / parent123
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
  // Set up response listener to capture /api/v1/me response for debugging
  const apiResponses: { url: string; status: number; body?: string }[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/me') || url.includes('identitytoolkit')) {
      try {
        const body = await response.text().catch(() => '');
        apiResponses.push({ url, status: response.status(), body: body.substring(0, 200) });
      } catch {
        apiResponses.push({ url, status: response.status() });
      }
    }
  });

  const isCI = !!process.env.CI;
  const maxAttempts = isCI ? 3 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Go to signin page (Firebase mode login)
    await page.goto('/signin', { waitUntil: 'networkidle' });

    // Wait for login form to be ready
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

    // Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Click the email sign-in button and wait for either navigation or API response
    await page.click('button[type="submit"]');

    try {
      // Wait for redirect after login - use a longer timeout and handle errors
      await page.waitForURL(expectedUrlPattern, { timeout: 20000 });

      // Extra wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      return;
    } catch {
      // Check if there's an auth error message on the page
      const errorAlert = page.locator('[role="alert"]');
      const count = await errorAlert.count();
      const visibleTexts: string[] = [];
      if (count > 0) {
        const texts = await errorAlert.allInnerTexts();
        for (let i = 0; i < count; i++) {
          if (await errorAlert.nth(i).isVisible()) {
            visibleTexts.push(texts[i]);
          }
        }
      }

      const joinedAlerts = visibleTexts.join(' | ');
      const isNetworkFailed = joinedAlerts.includes('auth/network-request-failed');

      if (isNetworkFailed && attempt < maxAttempts) {
        console.warn(`Login attempt ${attempt} failed with auth/network-request-failed. Retrying...`);
        await page.waitForTimeout(2000 * attempt);
        continue;
      }

      // Log API responses for debugging (only on final failure)
      console.error('API responses during login attempt:', JSON.stringify(apiResponses, null, 2));
      console.error('Current URL:', page.url());

      if (visibleTexts.length > 0) {
        throw new Error(`Login failed with alerts: ${joinedAlerts}. API responses: ${JSON.stringify(apiResponses)}`);
      }
      throw new Error(`Login timeout. Current URL: ${page.url()}. API responses: ${JSON.stringify(apiResponses)}`);
    }
  }

  throw new Error(`Login failed after ${maxAttempts} attempts. Current URL: ${page.url()}. API responses: ${JSON.stringify(apiResponses)}`);
}

/**
 * Login as super admin user in Firebase Auth Emulator
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await loginWithCredentials(page, 'superadmin@test.com', 'superadmin123', /\/admin/);
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
