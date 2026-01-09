/**
 * Feature Flags
 *
 * Manage feature flags that allow super admins to enable/disable
 * UI features per role (admin, teacher, parent).
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logSuperAdminAction } from './auditLog';
import { AuthError } from './auth';

// Feature keys for each role
export type AdminFeature =
  | 'Students'
  | 'Teachers'
  | 'Classes'
  | 'Grades'
  | 'Textbooks'
  | 'Volunteers'
  | 'AttendanceAnalytics'
  | 'HeroContent'
  | 'FlashNews'
  | 'Calendar';

export type TeacherFeature =
  | 'Classes'
  | 'Attendance'
  | 'Messaging';

export type ParentFeature =
  | 'Students'
  | 'StudentRegistration'
  | 'Messaging'
  | 'Profile'
  | 'Settings';

export type FeatureFlagRole = 'admin' | 'teacher' | 'parent';

export type FeatureFlag = {
  enabled: boolean;
  description?: string;
};

export type RoleFeatureFlags<T extends string> = {
  [K in T]: FeatureFlag;
};

export type FeatureFlagsConfig = {
  admin: RoleFeatureFlags<AdminFeature>;
  teacher: RoleFeatureFlags<TeacherFeature>;
  parent: RoleFeatureFlags<ParentFeature>;
  updatedAt: Date;
  updatedBy: string;
};

// Feature descriptions for UI display
export const FEATURE_DESCRIPTIONS: Record<FeatureFlagRole, Record<string, string>> = {
  admin: {
    Students: 'Manage student records, enrollments, and bulk operations',
    Teachers: 'Manage teacher profiles, invitations, and assignments',
    Classes: 'Manage class schedules, rosters, and configurations',
    Grades: 'Manage grade levels and academic settings',
    Textbooks: 'Manage textbook resources and materials',
    Volunteers: 'Manage volunteer registrations and assignments',
    AttendanceAnalytics: 'View attendance reports and analytics dashboard',
    HeroContent: 'Manage homepage hero banners and announcements',
    FlashNews: 'Manage scrolling news marquee announcements',
    Calendar: 'Manage school calendar events',
  },
  teacher: {
    Classes: 'View assigned classes and student rosters',
    Attendance: 'Mark and manage student attendance',
    Messaging: 'Send and receive messages with parents',
  },
  parent: {
    Students: 'View linked student information and progress',
    StudentRegistration: 'Register new students',
    Messaging: 'Send and receive messages with teachers',
    Profile: 'Manage personal profile information',
    Settings: 'Manage account settings and preferences',
  },
};

// Default configuration with all features enabled
const DEFAULT_CONFIG: Omit<FeatureFlagsConfig, 'updatedAt' | 'updatedBy'> = {
  admin: {
    Students: { enabled: true },
    Teachers: { enabled: true },
    Classes: { enabled: true },
    Grades: { enabled: true },
    Textbooks: { enabled: true },
    Volunteers: { enabled: true },
    AttendanceAnalytics: { enabled: true },
    HeroContent: { enabled: true },
    FlashNews: { enabled: true },
    Calendar: { enabled: true },
  },
  teacher: {
    Classes: { enabled: true },
    Attendance: { enabled: true },
    Messaging: { enabled: true },
  },
  parent: {
    Students: { enabled: true },
    StudentRegistration: { enabled: true },
    Messaging: { enabled: true },
    Profile: { enabled: true },
    Settings: { enabled: true },
  },
};

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setFeatureFlagsDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

// In-memory cache for feature flags (5 minute TTL)
let cachedFlags: FeatureFlagsConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the feature flags cache (useful after updates)
 */
export function clearFeatureFlagsCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

/**
 * Get the current feature flags configuration
 */
export async function getFeatureFlags(): Promise<FeatureFlagsConfig> {
  // Check cache
  if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFlags;
  }

  const db = getDb();
  const doc = await db.collection('systemConfig').doc('featureFlags').get();

  if (!doc.exists) {
    // Return default config if not set
    const defaultResult: FeatureFlagsConfig = {
      ...DEFAULT_CONFIG,
      updatedAt: new Date(),
      updatedBy: 'system',
    };
    cachedFlags = defaultResult;
    cacheTimestamp = Date.now();
    return defaultResult;
  }

  const data = doc.data()!;

  const result: FeatureFlagsConfig = {
    admin: {
      Students: { enabled: data.admin?.Students?.enabled ?? true },
      Teachers: { enabled: data.admin?.Teachers?.enabled ?? true },
      Classes: { enabled: data.admin?.Classes?.enabled ?? true },
      Grades: { enabled: data.admin?.Grades?.enabled ?? true },
      Textbooks: { enabled: data.admin?.Textbooks?.enabled ?? true },
      Volunteers: { enabled: data.admin?.Volunteers?.enabled ?? true },
      AttendanceAnalytics: { enabled: data.admin?.AttendanceAnalytics?.enabled ?? true },
      HeroContent: { enabled: data.admin?.HeroContent?.enabled ?? true },
      FlashNews: { enabled: data.admin?.FlashNews?.enabled ?? true },
      Calendar: { enabled: data.admin?.Calendar?.enabled ?? true },
    },
    teacher: {
      Classes: { enabled: data.teacher?.Classes?.enabled ?? true },
      Attendance: { enabled: data.teacher?.Attendance?.enabled ?? true },
      Messaging: { enabled: data.teacher?.Messaging?.enabled ?? true },
    },
    parent: {
      Students: { enabled: data.parent?.Students?.enabled ?? true },
      StudentRegistration: { enabled: data.parent?.StudentRegistration?.enabled ?? true },
      Messaging: { enabled: data.parent?.Messaging?.enabled ?? true },
      Profile: { enabled: data.parent?.Profile?.enabled ?? true },
      Settings: { enabled: data.parent?.Settings?.enabled ?? true },
    },
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    updatedBy: data.updatedBy ?? 'system',
  };

  cachedFlags = result;
  cacheTimestamp = Date.now();
  return result;
}

/**
 * Update feature flags for a specific role
 */
export async function updateFeatureFlags(
  role: FeatureFlagRole,
  updates: Record<string, { enabled: boolean }>,
  updatedBy: string,
  updatedByEmail: string
): Promise<FeatureFlagsConfig> {
  const db = getDb();
  const ref = db.collection('systemConfig').doc('featureFlags');

  // Get current config for audit log
  const currentConfig = await getFeatureFlags();

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  };

  // Merge updates with current role config
  const currentRoleFlags = currentConfig[role];
  updateData[role] = {
    ...currentRoleFlags,
    ...updates,
  };

  await ref.set(updateData, { merge: true });

  // Clear cache after update
  clearFeatureFlagsCache();

  // Log to audit
  const changes = Object.entries(updates).map(([feature, newValue]) => ({
    field: `${role}.${feature}`,
    oldValue: (currentRoleFlags as Record<string, FeatureFlag>)[feature]?.enabled,
    newValue: newValue.enabled,
  }));

  await logSuperAdminAction(
    updatedBy,
    updatedByEmail,
    'featureFlags.update',
    'featureFlags',
    role,
    { changes },
    { severity: 'warning' }
  );

  return getFeatureFlags();
}

/**
 * Check if a specific feature is enabled for a role
 */
export async function isFeatureEnabled(
  role: FeatureFlagRole,
  feature: string
): Promise<boolean> {
  const config = await getFeatureFlags();
  const roleFlags = config[role] as Record<string, FeatureFlag>;

  // If feature doesn't exist in config, default to enabled
  if (!roleFlags || !(feature in roleFlags)) {
    return true;
  }

  return roleFlags[feature].enabled;
}

/**
 * Require a feature to be enabled, throw AuthError if disabled
 * Use this in API routes to block access to disabled features
 */
export async function requireFeature(
  role: FeatureFlagRole,
  feature: string
): Promise<void> {
  const enabled = await isFeatureEnabled(role, feature);
  if (!enabled) {
    throw new AuthError(
      403,
      'feature/disabled',
      `The ${feature} feature is currently disabled`
    );
  }
}

/**
 * Get all features for a role with their descriptions
 */
export function getFeaturesForRole(role: FeatureFlagRole): Array<{
  key: string;
  description: string;
}> {
  const descriptions = FEATURE_DESCRIPTIONS[role];
  return Object.entries(descriptions).map(([key, description]) => ({
    key,
    description,
  }));
}
