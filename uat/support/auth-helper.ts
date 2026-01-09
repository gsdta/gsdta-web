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
 * Log credentials for debugging (test users only)
 */
function logCredential(label: string, value: string | undefined): void {
  if (!value) {
    console.log(`[AUTH] ${label}: <EMPTY/UNDEFINED>`);
  } else {
    console.log(`[AUTH] ${label}: "${value}"`);
  }
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
  private firebaseApp: FirebaseApp | null = null;
  private auth: Auth | null = null;

  constructor(page: Page, config: Config) {
    this.page = page;
    this.config = config;
    // Firebase is initialized lazily when auth is actually needed
  }

  /**
   * Lazily initialize Firebase when needed
   * This allows shakeout tests (public pages only) to run without Firebase credentials
   */
  private ensureFirebaseInitialized(): void {
    if (!this.firebaseApp) {
      this.firebaseApp = initializeApp({
        apiKey: this.config.firebaseApiKey,
        authDomain: this.config.firebaseAuthDomain,
        projectId: this.config.firebaseProjectId,
      });
      this.auth = getAuth(this.firebaseApp);
    }
  }

  /**
   * Login via UI (simulates real user flow)
   * This is the preferred method for UAT as it tests the actual login experience
   */
  async loginViaUI(email: string, password: string): Promise<void> {
    console.log(`[AUTH] ========== LOGIN ATTEMPT START ==========`);
    console.log(`[AUTH] Email: "${email}"`);
    console.log(`[AUTH] Password: "${password}"`);
    console.log(`[AUTH] Password length: ${password?.length || 0}`);
    console.log(`[AUTH] Password char codes: ${password ? Array.from(password).map(c => c.charCodeAt(0)).join(',') : 'N/A'}`);
    console.log(`[AUTH] Current URL before navigation: ${this.page.url()}`);

    // Set up network request/response logging
    const apiResponses: { url: string; status: number; body: string }[] = [];

    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('identitytoolkit') || url.includes('securetoken')) {
        console.log(`[AUTH] >> REQUEST: ${request.method()} ${url}`);
        const postData = request.postData();
        if (postData) {
          // Mask password in logs but show structure
          const sanitized = postData.replace(/"password":"[^"]*"/, '"password":"***"');
          console.log(`[AUTH]    Body: ${sanitized}`);
        }
      }
    });

    this.page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('identitytoolkit') || url.includes('securetoken')) {
        const status = response.status();
        console.log(`[AUTH] << RESPONSE: ${status} ${url}`);
        try {
          const body = await response.text();
          // Truncate long responses
          const truncated = body.length > 500 ? body.substring(0, 500) + '...' : body;
          console.log(`[AUTH]    Body: ${truncated}`);
          apiResponses.push({ url, status, body: truncated });
        } catch (e) {
          console.log(`[AUTH]    Body: (could not read)`);
        }
      }
    });

    // Listen for ALL console messages
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning' || text.includes('Auth') || text.includes('Firebase') || text.includes('login')) {
        console.log(`[AUTH] Browser ${type}: ${text}`);
      }
    });

    // Listen for page errors
    this.page.on('pageerror', (error) => {
      console.log(`[AUTH] Page error: ${error.message}`);
    });

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

    // Wait for form to be fully interactive (React hydration)
    await this.page.waitForTimeout(500);
    console.log('[AUTH] Form stabilization wait complete');

    // Clear and fill in credentials with explicit waits for stability
    console.log('[AUTH] Filling in credentials...');

    // Fill email with explicit focus and verification
    const emailInput = this.page.locator('input[type="email"]');
    await emailInput.click();
    await emailInput.fill('');  // Clear first
    await emailInput.fill(email);
    const emailValue = await emailInput.inputValue();
    console.log(`[AUTH] Email input value after fill: "${emailValue}"`);
    console.log(`[AUTH] Email match: ${emailValue === email}`);

    // Fill password with explicit focus
    const passwordInput = this.page.locator('input[type="password"]');
    await passwordInput.click();
    await passwordInput.fill('');  // Clear first
    await passwordInput.fill(password);
    const passwordValue = await passwordInput.inputValue();
    console.log(`[AUTH] Password input value after fill: "${passwordValue}"`);
    console.log(`[AUTH] Password match: ${passwordValue === password}`);
    console.log('[AUTH] Credentials filled');

    // Verify email wasn't cleared (sometimes happens with React forms)
    const finalEmailValue = await emailInput.inputValue();
    if (!finalEmailValue) {
      console.log('[AUTH] WARNING: Email field was cleared, refilling...');
      await emailInput.fill(email);
      const refillValue = await emailInput.inputValue();
      console.log(`[AUTH] Email after refill: "${refillValue}"`);
    }

    // Click sign in button and wait for navigation
    console.log('[AUTH] Clicking submit button...');
    const submitButton = this.page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    console.log(`[AUTH] Submit button text: "${buttonText}"`);

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
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[AUTH] [${elapsed}s] Current URL: ${currentUrl}`);

      // Check for error messages on page - multiple selectors
      const errorSelectors = [
        '[class*="error"]',
        '[class*="Error"]',
        '[role="alert"]',
        '.text-red-500',
        '.text-red-600',
        '[data-testid="error"]',
      ];

      for (const selector of errorSelectors) {
        const errorElement = this.page.locator(selector).first();
        if (await errorElement.isVisible().catch(() => false)) {
          const errorText = await errorElement.textContent();
          if (errorText && errorText.trim()) {
            console.log(`[AUTH] Error element (${selector}): "${errorText.trim()}"`);
          }
        }
      }

      // Check if we've reached the expected URL
      if (/\/(admin|teacher|parent)/.test(currentUrl)) {
        console.log(`[AUTH] Successfully navigated to: ${currentUrl}`);
        break;
      }

      // Check if still on signin page
      if (currentUrl.includes('/signin')) {
        console.log('[AUTH] Still on signin page, checking page content...');

        // Get all visible text content for error detection
        const bodyText = await this.page.locator('body').innerText();
        const errorKeywords = ['Invalid', 'incorrect', 'failed', 'error', 'wrong', 'denied', 'unauthorized'];
        for (const keyword of errorKeywords) {
          if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
            // Find the line containing the keyword
            const lines = bodyText.split('\n').filter(l => l.toLowerCase().includes(keyword.toLowerCase()));
            if (lines.length > 0) {
              console.log(`[AUTH] Found "${keyword}" in page: ${lines[0].trim().substring(0, 100)}`);
            }
          }
        }
      }
    }

    const finalUrl = this.page.url();
    console.log(`[AUTH] Final URL: ${finalUrl}`);
    console.log(`[AUTH] API responses captured: ${apiResponses.length}`);
    apiResponses.forEach((r, i) => {
      console.log(`[AUTH] API Response ${i + 1}: ${r.status} ${r.url}`);
    });

    if (!/\/(admin|teacher|parent)/.test(finalUrl)) {
      // Take a screenshot for debugging
      const screenshot = await this.page.screenshot();
      console.log('[AUTH] Login failed - URL did not change to expected dashboard');
      console.log(`[AUTH] Screenshot captured (${screenshot.length} bytes)`);

      // Log full page HTML for debugging
      const pageHtml = await this.page.content();
      console.log(`[AUTH] Page HTML length: ${pageHtml.length}`);

      // Extract just the main content area
      const mainContent = await this.page.locator('main, [role="main"], .container, #__next').first().innerHTML().catch(() => '');
      if (mainContent) {
        console.log(`[AUTH] Main content (first 1000 chars): ${mainContent.substring(0, 1000)}`);
      }

      console.log(`[AUTH] ========== LOGIN ATTEMPT FAILED ==========`);
      throw new Error(`Login failed: Expected URL to contain /admin, /teacher, or /parent, but got ${finalUrl}`);
    }

    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded');
    console.log('[AUTH] Login complete, page stabilized');
    console.log(`[AUTH] ========== LOGIN ATTEMPT SUCCESS ==========`);
  }

  /**
   * Login via Firebase SDK and inject session
   * Faster than UI login, useful for test setup when you need
   * to be logged in but don't need to test the login flow
   */
  async loginViaSDK(email: string, password: string): Promise<UserCredential> {
    this.ensureFirebaseInitialized();
    const credential = await signInWithEmailAndPassword(
      this.auth!,
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
    logCredential('Admin email', this.config.adminEmail);
    logCredential('Admin password', this.config.adminPassword);
    validateRoleCredentials(this.config, 'admin');
    await this.loginViaUI(this.config.adminEmail, this.config.adminPassword);
  }

  /**
   * Login as teacher user via UI
   */
  async loginAsTeacher(): Promise<void> {
    console.log('[AUTH] loginAsTeacher() called');
    logCredential('Teacher email', this.config.teacherEmail);
    logCredential('Teacher password', this.config.teacherPassword);
    validateRoleCredentials(this.config, 'teacher');
    await this.loginViaUI(this.config.teacherEmail, this.config.teacherPassword);
  }

  /**
   * Login as parent user via UI
   */
  async loginAsParent(): Promise<void> {
    console.log('[AUTH] loginAsParent() called');
    logCredential('Parent email', this.config.parentEmail);
    logCredential('Parent password', this.config.parentPassword);
    validateRoleCredentials(this.config, 'parent');
    await this.loginViaUI(this.config.parentEmail, this.config.parentPassword);
  }

  /**
   * Login as super admin user via UI
   */
  async loginAsSuperAdmin(): Promise<void> {
    console.log('[AUTH] loginAsSuperAdmin() called');
    logCredential('Super Admin email', this.config.superAdminEmail);
    logCredential('Super Admin password', this.config.superAdminPassword);

    // Validate credentials exist
    if (!this.config.superAdminEmail || !this.config.superAdminPassword) {
      throw new Error(
        'Missing super admin credentials: UAT_SUPER_ADMIN_EMAIL or UAT_SUPER_ADMIN_PASSWORD is not set.\n' +
          'Please check your environment configuration or CI secrets.'
      );
    }

    await this.loginViaUI(
      this.config.superAdminEmail,
      this.config.superAdminPassword
    );
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    console.log('[AUTH] logout() called');
    console.log(`[AUTH] Current URL before logout: ${this.page.url()}`);

    // Sign out from Firebase SDK (only if initialized)
    if (this.auth) {
      console.log('[AUTH] Signing out from Firebase SDK...');
      await signOut(this.auth);
      console.log('[AUTH] Firebase SDK signOut complete');
    }

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
