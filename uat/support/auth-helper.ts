import { Page } from 'playwright';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  Auth,
  UserCredential,
} from 'firebase/auth';
import { Config, validateRoleCredentials } from './config';

/**
 * Mask sensitive data for logging (show first 3 chars + length)
 */
function maskSensitive(value: string | undefined): string {
  if (!value) return '<empty>';
  if (value.length <= 3) return '***';
  return `${value.substring(0, 3)}...[${value.length} chars]`;
}

/**
 * Authentication helper for UAT tests against live QA Firebase
 *
 * Provides methods for:
 * - UI-based login (simulates real user flow)
 * - SDK-based login (faster, for test setup)
 * - Role-specific login shortcuts
 */
export class AuthHelper {
  private page: Page;
  private config: Config;
  private firebaseApp: FirebaseApp;
  private auth: Auth;

  constructor(page: Page, config: Config) {
    this.page = page;
    this.config = config;

    // Initialize Firebase with QA credentials
    this.firebaseApp = initializeApp({
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
    });

    this.auth = getAuth(this.firebaseApp);
  }

  /**
   * Login via UI (simulates real user flow)
   * This is the preferred method for UAT as it tests the actual login experience
   */
  async loginViaUI(email: string, password: string): Promise<void> {
    console.log(`[AUTH] Starting login for: ${email}`);
    console.log(`[AUTH] Current URL before navigation: ${this.page.url()}`);

    // Navigate to signin page
    console.log('[AUTH] Navigating to /signin...');
    await this.page.goto('/signin', { waitUntil: 'domcontentloaded' });
    console.log(`[AUTH] After navigation, URL: ${this.page.url()}`);

    // Wait for login form to be ready
    console.log('[AUTH] Waiting for email input field...');
    await this.page.waitForSelector('input[type="email"]', {
      state: 'visible',
      timeout: 15000,
    });
    console.log('[AUTH] Email input found');

    // Clear and fill in credentials
    console.log('[AUTH] Filling in credentials...');
    await this.page.locator('input[type="email"]').clear();
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').clear();
    await this.page.locator('input[type="password"]').fill(password);
    console.log('[AUTH] Credentials filled');

    // Click sign in button and wait for navigation
    console.log('[AUTH] Clicking submit button...');
    const submitButton = this.page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    console.log(`[AUTH] Submit button text: "${buttonText}"`);

    // Listen for console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[AUTH] Console error: ${msg.text()}`);
      }
    });

    // Click and start waiting for URL change
    await submitButton.click();
    console.log('[AUTH] Submit button clicked, waiting for URL change...');

    // Wait with periodic URL checks for better debugging
    const startTime = Date.now();
    const maxWait = 45000;
    const checkInterval = 3000;

    while (Date.now() - startTime < maxWait) {
      await this.page.waitForTimeout(checkInterval);
      const currentUrl = this.page.url();
      console.log(`[AUTH] Current URL after ${Math.round((Date.now() - startTime) / 1000)}s: ${currentUrl}`);

      // Check for error messages on page
      const errorElement = await this.page.locator('[class*="error"], [class*="Error"], [role="alert"]').first();
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        console.log(`[AUTH] Error message found on page: "${errorText}"`);
      }

      // Check if we've reached the expected URL
      if (/\/(admin|teacher|parent)/.test(currentUrl)) {
        console.log(`[AUTH] Successfully navigated to: ${currentUrl}`);
        break;
      }

      // Check if still on signin page
      if (currentUrl.includes('/signin')) {
        console.log('[AUTH] Still on signin page, checking for errors...');

        // Look for specific error messages
        const pageContent = await this.page.content();
        if (pageContent.includes('Invalid') || pageContent.includes('incorrect') || pageContent.includes('failed')) {
          console.log('[AUTH] Page contains error keywords');
        }
      }
    }

    const finalUrl = this.page.url();
    console.log(`[AUTH] Final URL: ${finalUrl}`);

    if (!/\/(admin|teacher|parent)/.test(finalUrl)) {
      // Take a screenshot for debugging
      const screenshot = await this.page.screenshot();
      console.log('[AUTH] Login failed - URL did not change to expected dashboard');
      console.log(`[AUTH] Screenshot captured (${screenshot.length} bytes)`);
      throw new Error(`Login failed: Expected URL to contain /admin, /teacher, or /parent, but got ${finalUrl}`);
    }

    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded');
    console.log('[AUTH] Login complete, page stabilized');
  }

  /**
   * Login via Firebase SDK and inject session
   * Faster than UI login, useful for test setup when you need
   * to be logged in but don't need to test the login flow
   */
  async loginViaSDK(email: string, password: string): Promise<UserCredential> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    const idToken = await credential.user.getIdToken();

    // Inject auth state into browser storage
    await this.page.evaluate(
      ({ uid, email, token }) => {
        // This mimics how the app stores Firebase auth state
        const authKey = `firebase:authUser:${token.substring(0, 20)}`;
        localStorage.setItem(
          authKey,
          JSON.stringify({
            uid,
            email,
            stsTokenManager: {
              accessToken: token,
            },
          })
        );
      },
      { uid: credential.user.uid, email, token: idToken }
    );

    // Reload to apply auth state
    await this.page.reload({ waitUntil: 'networkidle' });

    return credential;
  }

  /**
   * Login as admin user via UI
   */
  async loginAsAdmin(): Promise<void> {
    console.log('[AUTH] loginAsAdmin() called');
    console.log(`[AUTH] Admin email: ${maskSensitive(this.config.adminEmail)}`);
    console.log(`[AUTH] Admin password: ${maskSensitive(this.config.adminPassword)}`);
    validateRoleCredentials(this.config, 'admin');
    await this.loginViaUI(this.config.adminEmail, this.config.adminPassword);
  }

  /**
   * Login as teacher user via UI
   */
  async loginAsTeacher(): Promise<void> {
    console.log('[AUTH] loginAsTeacher() called');
    console.log(`[AUTH] Teacher email: ${maskSensitive(this.config.teacherEmail)}`);
    console.log(`[AUTH] Teacher password: ${maskSensitive(this.config.teacherPassword)}`);
    validateRoleCredentials(this.config, 'teacher');
    await this.loginViaUI(this.config.teacherEmail, this.config.teacherPassword);
  }

  /**
   * Login as parent user via UI
   */
  async loginAsParent(): Promise<void> {
    console.log('[AUTH] loginAsParent() called');
    console.log(`[AUTH] Parent email: ${maskSensitive(this.config.parentEmail)}`);
    console.log(`[AUTH] Parent password: ${maskSensitive(this.config.parentPassword)}`);
    validateRoleCredentials(this.config, 'parent');
    await this.loginViaUI(this.config.parentEmail, this.config.parentPassword);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    console.log('[AUTH] logout() called');
    console.log(`[AUTH] Current URL before logout: ${this.page.url()}`);

    // Sign out from Firebase SDK
    console.log('[AUTH] Signing out from Firebase SDK...');
    await signOut(this.auth);
    console.log('[AUTH] Firebase SDK signOut complete');

    // Navigate to logout page
    console.log('[AUTH] Navigating to /logout...');
    await this.page.goto('/logout', { waitUntil: 'domcontentloaded' });
    console.log(`[AUTH] After /logout navigation, URL: ${this.page.url()}`);

    // Wait for redirect to home or signin
    console.log('[AUTH] Waiting for redirect to /signin or home...');
    await this.page.waitForURL(/\/(signin|$)/, { timeout: 10000 });
    console.log(`[AUTH] Logout complete, final URL: ${this.page.url()}`);
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    return (
      !currentUrl.includes('/signin') &&
      !currentUrl.includes('/login') &&
      (currentUrl.includes('/admin') ||
        currentUrl.includes('/teacher') ||
        currentUrl.includes('/parent'))
    );
  }

  /**
   * Get current user's role based on URL
   */
  async getCurrentRole(): Promise<'admin' | 'teacher' | 'parent' | null> {
    const url = this.page.url();
    if (url.includes('/admin')) return 'admin';
    if (url.includes('/teacher')) return 'teacher';
    if (url.includes('/parent')) return 'parent';
    return null;
  }
}
