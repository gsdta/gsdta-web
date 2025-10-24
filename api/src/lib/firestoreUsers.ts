import { adminDb } from './firebaseAdmin';

export type UserProfile = {
  uid: string;
  email?: string;
  name?: string;
  roles: string[];
  status: string; // expected 'active' | 'suspended' | ...
  [key: string]: unknown;
};

/**
 * Load a sanitized user profile from Firestore at users/{uid}.
 * Returns null if not found.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb().collection('users').doc(uid).get();
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

