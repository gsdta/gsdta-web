import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin singleton initializer (idempotent)
 * - In emulator mode: No credentials needed, connects via env vars
 * - In production: Uses Application Default Credentials or service account
 * - Project ID is read from env or falls back to known project.
 */
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-gsdta';

let app: App | null = null;

// Test hook: allow resetting the singleton for tests
export function __resetAppForTests() {
  app = null;
}

/**
 * Normalize Firestore emulator host to use IPv4 address
 * This fixes IPv6 connection issues in CI environments
 */
export function normalizeEmulatorHost(host: string | undefined): string | undefined {
  if (!host) return host;
  if (host.includes('127.0.0.1')) return host;
  return host.replace('localhost', '127.0.0.1');
}

export function getAdminApp(): App {
  if (app) return app;
  
  if (getApps().length) {
    app = getApps()[0]!;
  } else {
    const isEmulator = !!(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
    
    if (isEmulator) {
      // In emulator mode, initialize without credentials
      // Firebase Admin SDK will auto-detect emulator via env vars

      // Force IPv4 for Firestore emulator to avoid IPv6 connection issues in CI
      const normalizedHost = normalizeEmulatorHost(process.env.FIRESTORE_EMULATOR_HOST);
      if (normalizedHost) {
        process.env.FIRESTORE_EMULATOR_HOST = normalizedHost;
      }

      console.log(`[Firebase Admin] Connecting to emulators (project: ${DEFAULT_PROJECT_ID})`);
      console.log(`  - Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set'}`);
      console.log(`  - Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
      app = initializeApp({ projectId: DEFAULT_PROJECT_ID });
    } else {
      // Production: Use Application Default Credentials or explicit service account
      console.log(`[Firebase Admin] Connecting to production Firebase (project: ${DEFAULT_PROJECT_ID})`);
      
      // If GOOGLE_APPLICATION_CREDENTIALS is set, Firebase Admin SDK will use it automatically
      // Otherwise, it will try Application Default Credentials (e.g., from GCP metadata server)
      app = initializeApp({ projectId: DEFAULT_PROJECT_ID });
    }
  }
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => {
  const db = getFirestore(getAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Ignore error if settings already locked
  }
  return db;
};

