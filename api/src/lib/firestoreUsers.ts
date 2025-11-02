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

/**
 * Ensure a user profile exists and contains the given role; set status to active.
 * If profile doesn't exist, it will be created with provided email/name and the role.
 */
export async function ensureUserHasRole(uid: string, email: string, name: string, role: string): Promise<UserProfile> {
  const ref = getDb().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    // Create fresh profile with the role
    const created = await createUserProfile(uid, email, name, [role]);
    return created;
  }
  const data = (snap.data() || {}) as Partial<UserProfile>;
  const roles = Array.isArray(data.roles) ? [...new Set([...(data.roles as string[]), role])] : [role];
  const updated: Partial<UserProfile> = {
    email: email || data.email,
    name: name || data.name,
    roles,
    status: 'active',
  };
  await ref.set(updated, { merge: true });
  // return merged view
  return {
    uid,
    email: (updated.email as string | undefined) ?? data.email,
    name: (updated.name as string | undefined) ?? data.name,
    roles,
    status: 'active',
  } as UserProfile;
}
