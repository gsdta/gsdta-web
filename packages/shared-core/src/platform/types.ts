/**
 * Platform Adapter Types
 *
 * These interfaces define the contract between shared code and platform-specific implementations.
 * Web and mobile platforms provide their own implementations of these interfaces.
 */

/**
 * Storage adapter for persisting data.
 * Web: Uses sessionStorage/localStorage
 * Mobile: Uses AsyncStorage or similar
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Auth token provider for API authentication.
 * Web: Gets token from Firebase Web SDK
 * Mobile: Gets token from React Native Firebase
 */
export interface AuthTokenProvider {
  getToken(): Promise<string | null>;
  onTokenChange?(callback: (token: string | null) => void): () => void;
}

/**
 * Network adapter for HTTP requests.
 * Allows platforms to customize fetch behavior and base URL.
 */
export interface NetworkAdapter {
  fetch: typeof globalThis.fetch;
  baseUrl: string;
}

/**
 * Combined platform adapter that must be configured at app startup.
 * All shared code uses this adapter for platform-specific operations.
 */
export interface PlatformAdapter {
  storage: StorageAdapter;
  auth: AuthTokenProvider;
  network: NetworkAdapter;
}

// Singleton storage for the platform adapter
let platformAdapter: PlatformAdapter | null = null;

/**
 * Initialize the platform adapter. Must be called once at app startup.
 * @param adapter - Platform-specific implementation of PlatformAdapter
 */
export function initializePlatform(adapter: PlatformAdapter): void {
  platformAdapter = adapter;
}

/**
 * Get the current platform adapter.
 * @throws Error if platform has not been initialized
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!platformAdapter) {
    throw new Error(
      "Platform not initialized. Call initializePlatform() before using shared-core."
    );
  }
  return platformAdapter;
}

/**
 * Check if platform has been initialized.
 */
export function isPlatformInitialized(): boolean {
  return platformAdapter !== null;
}

/**
 * Reset platform adapter (useful for testing).
 */
export function resetPlatform(): void {
  platformAdapter = null;
}
