import { adminDb } from './firebaseAdmin';

// Address type for user profile
export type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

// Notification preferences
export type NotificationPreferences = {
  email: boolean;
  sms: boolean;
};

export type UserProfile = {
  uid: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string; // expected 'active' | 'suspended' | ...
  // Extended profile fields
  phone?: string;
  address?: Address;
  preferredLanguage?: 'en' | 'ta';
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

// Type for profile update payload (subset of UserProfile)
export type ProfileUpdateData = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  preferredLanguage?: 'en' | 'ta';
  notificationPreferences?: NotificationPreferences;
};

// Student type for parent's linked students
export type LinkedStudent = {
  id: string;
  name: string;
  grade?: string;
  schoolName?: string;
  enrollmentDate?: string;
  status: string;
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
    firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
    roles: Array.isArray(data.roles) ? (data.roles as string[]) : [],
    status: typeof data.status === 'string' ? (data.status as string) : 'unknown',
    // Extended profile fields
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    address: data.address && typeof data.address === 'object' ? data.address as Address : undefined,
    preferredLanguage: data.preferredLanguage === 'en' || data.preferredLanguage === 'ta' ? data.preferredLanguage : undefined,
    notificationPreferences: data.notificationPreferences && typeof data.notificationPreferences === 'object'
      ? data.notificationPreferences as NotificationPreferences
      : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
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

/**
 * Update a user's profile with new data.
 * Only updates the fields provided in the data object.
 * Returns the updated profile.
 */
export async function updateUserProfile(uid: string, data: ProfileUpdateData): Promise<UserProfile | null> {
  const ref = getDb().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage;
  if (data.notificationPreferences !== undefined) updateData.notificationPreferences = data.notificationPreferences;

  await ref.set(updateData, { merge: true });

  // Return the full updated profile
  return getUserProfile(uid);
}

/**
 * Get students linked to a parent by their parentId.
 * Queries the students collection where parentId matches.
 */
export async function getStudentsByParentId(parentId: string): Promise<LinkedStudent[]> {
  const snap = await getDb()
    .collection('students')
    .where('parentId', '==', parentId)
    .get();

  if (snap.empty) return [];

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: typeof data.name === 'string' ? data.name : 'Unknown',
      grade: typeof data.grade === 'string' ? data.grade : undefined,
      schoolName: typeof data.schoolName === 'string' ? data.schoolName : undefined,
      enrollmentDate: typeof data.enrollmentDate === 'string' ? data.enrollmentDate : undefined,
      status: typeof data.status === 'string' ? data.status : 'unknown',
    };
  });
}
