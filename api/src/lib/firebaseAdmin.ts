import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin singleton initializer (idempotent)
 * - Uses Application Default Credentials in local/dev if available.
 * - Project ID is read from env or falls back to known project.
 */
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'playground-personal-474821';

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
  } else {
    app = initializeApp({ projectId: DEFAULT_PROJECT_ID });
  }
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

