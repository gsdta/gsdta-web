import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializePlatform,
  PlatformAdapter,
  StorageAdapter,
  AuthTokenProvider,
  NetworkAdapter,
} from '@gsdta/shared-core';

// Environment variables (Expo uses EXPO_PUBLIC_ prefix)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.gsdta.com';

/**
 * Storage adapter using React Native AsyncStorage
 */
const storageAdapter: StorageAdapter = {
  get: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage get error:', error);
      return null;
    }
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage set error:', error);
    }
  },
  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage remove error:', error);
    }
  },
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
    }
  },
};

/**
 * Token getter function - will be set by AuthProvider
 */
let tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the token getter function (called by AuthProvider after Firebase init)
 */
export function setMobileAuthTokenGetter(
  getter: () => Promise<string | null>
): void {
  tokenGetter = getter;
}

/**
 * Auth token provider for mobile
 */
const authTokenProvider: AuthTokenProvider = {
  getToken: async (): Promise<string | null> => {
    if (!tokenGetter) {
      console.warn('Mobile auth token getter not set');
      return null;
    }
    return tokenGetter();
  },
};

/**
 * Network adapter using React Native's fetch
 */
const networkAdapter: NetworkAdapter = {
  fetch: globalThis.fetch.bind(globalThis),
  baseUrl: API_BASE_URL,
};

/**
 * Combined mobile platform adapter
 */
const mobileAdapter: PlatformAdapter = {
  storage: storageAdapter,
  auth: authTokenProvider,
  network: networkAdapter,
};

/**
 * Initialize the mobile platform adapter.
 * Call this once at app startup (in root layout).
 */
export function initializeMobilePlatform(): void {
  initializePlatform(mobileAdapter);
}

export { mobileAdapter };
