import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { AuthHelper } from './auth-helper';
import { ApiHelper } from './api-helper';
import { getConfig, Config } from './config';

export interface CustomWorldParameters {
  baseUrl: string;
}

/**
 * Custom Cucumber World class with Playwright integration
 *
 * This class is instantiated for each scenario and provides:
 * - Browser/page management
 * - Authentication helpers
 * - API helpers
 * - Shared state between steps
 */
export class CustomWorld extends World<CustomWorldParameters> {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  authHelper!: AuthHelper;
  apiHelper!: ApiHelper;

  private config: Config;

  // Shared state for passing data between steps
  public state: Record<string, unknown> = {};

  constructor(options: IWorldOptions<CustomWorldParameters>) {
    super(options);
    this.config = getConfig();
  }

  /**
   * Initialize browser and helpers
   * Called in Before hook
   */
  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    // Set language cookie to English before creating context
    // This ensures the app renders in English (the app uses i18n:lang cookie/localStorage)
    const baseUrl = this.parameters.baseUrl || this.config.baseUrl;
    const urlObj = new URL(baseUrl);

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      baseURL: baseUrl,
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      storageState: {
        cookies: [{
          name: 'i18n:lang',
          value: 'en',
          domain: urlObj.hostname,
          path: '/',
          expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          httpOnly: false,
          secure: urlObj.protocol === 'https:',
          sameSite: 'Lax',
        }],
        origins: [{
          origin: baseUrl,
          localStorage: [{
            name: 'i18n:lang',
            value: 'en',
          }],
        }],
      },
    });

    this.page = await this.context.newPage();
    this.authHelper = new AuthHelper(this.page, this.config);
    this.apiHelper = new ApiHelper(this.config.baseUrl);

    // Set default timeout for page operations
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);
  }

  /**
   * Cleanup browser resources
   * Called in After hook
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
    }
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    const screenshot = await this.page.screenshot({
      fullPage: true,
      type: 'png',
    });
    return screenshot;
  }

  /**
   * Get the current page URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(urlPattern?: RegExp): Promise<void> {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern, { timeout: 20000 });
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Get the Firebase auth token from the browser's sessionStorage
   * Used for making authenticated API calls
   */
  async getAuthToken(): Promise<string> {
    // The token is stored in sessionStorage by the Firebase Auth SDK
    const token = await this.page.evaluate(() => {
      // Try to get the Firebase ID token from sessionStorage
      // Firebase stores auth state in various places depending on persistence
      const storageKeys = Object.keys(sessionStorage);

      // Look for Firebase auth key patterns
      for (const key of storageKeys) {
        if (key.includes('firebase:authUser')) {
          try {
            const authData = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (authData.stsTokenManager?.accessToken) {
              return authData.stsTokenManager.accessToken;
            }
          } catch {
            continue;
          }
        }
      }

      // Also check localStorage
      const localStorageKeys = Object.keys(localStorage);
      for (const key of localStorageKeys) {
        if (key.includes('firebase:authUser')) {
          try {
            const authData = JSON.parse(localStorage.getItem(key) || '{}');
            if (authData.stsTokenManager?.accessToken) {
              return authData.stsTokenManager.accessToken;
            }
          } catch {
            continue;
          }
        }
      }

      return null;
    });

    if (!token) {
      throw new Error('No Firebase auth token found. User may not be logged in.');
    }

    return token;
  }
}

setWorldConstructor(CustomWorld);
