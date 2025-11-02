import { adminDb } from './firebaseAdmin';

export type UserProfile = {
  uid: string;
  email?: string;
  name?: string;
  roles: string[];
  status: string; // expected 'active' | 'suspended' | ...
  [key: string]: unknown;
};

// Test hook: allow overriding adminDb provider during tests without Jest module mocking
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Load a sanitized user profile from Firestore at users/{uid}.
 * Returns null if not found.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDb().collection('users').doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  // sanitize known fields and include uid
  const profile: UserProfile = {
    uid,
    email: typeof data.email === 'string' ? data.email : undefined,
    name: typeof data.name === 'string' ? data.name : undefined,
    roles: Array.isArray(data.roles) ? (data.roles as string[]) : [],
    status: typeof data.status === 'string' ? (data.status as string) : 'unknown',
  };
  return profile;
}

/**
 * Create a new user profile in Firestore.
 * Used for first-time parent signups.
 */
export async function createUserProfile(uid: string, email: string, name: string, roles: string[] = ['parent']): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    email,
    name,
    roles,
    status: 'active',
  };
  await getDb().collection('users').doc(uid).set(profile);
  return profile;
}
