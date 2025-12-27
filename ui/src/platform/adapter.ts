/**
 * Web Platform Adapter
 *
 * Provides platform-specific implementations for the shared-core library
 * when running in a web browser environment.
 */

import {
  type PlatformAdapter,
  type StorageAdapter,
  type AuthTokenProvider,
  type NetworkAdapter,
  initializePlatform,
} from "@gsdta/shared-core";

// ============================================================================
// Storage Adapter (sessionStorage with localStorage fallback)
// ============================================================================

const webStorage: StorageAdapter = {
  async get(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage might be full or disabled
    }
  },

  async remove(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.clear();
    } catch {
      // Ignore errors
    }
  },
};

// ============================================================================
// Auth Token Provider (settable, updated by AuthProvider)
// ============================================================================

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

/**
 * Set the auth token getter function.
 * Called by AuthProvider when authentication state is established.
 */
export function setWebAuthTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

const webAuth: AuthTokenProvider = {
  async getToken(): Promise<string | null> {
    if (!tokenGetter) return null;
    try {
      return await tokenGetter();
    } catch {
      return null;
    }
  },
};

// ============================================================================
// Network Adapter
// ============================================================================

// Determine base URL based on environment
const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW !== "false";
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE_URL = !USE_MSW && !RAW_BASE ? "/api" : RAW_BASE;

const webNetwork: NetworkAdapter = {
  fetch: typeof window !== "undefined"
    ? window.fetch.bind(window)
    : globalThis.fetch.bind(globalThis),
  baseUrl: BASE_URL,
};

// ============================================================================
// Platform Adapter
// ============================================================================

const webPlatformAdapter: PlatformAdapter = {
  storage: webStorage,
  auth: webAuth,
  network: webNetwork,
};

/**
 * Initialize the web platform.
 * Call this early in your app (e.g., in _app.tsx or layout.tsx).
 */
export function initializeWebPlatform(): void {
  initializePlatform(webPlatformAdapter);
}

// Export for testing or direct access
export { webStorage, webAuth, webNetwork, webPlatformAdapter };
