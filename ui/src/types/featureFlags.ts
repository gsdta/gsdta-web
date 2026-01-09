/**
 * Feature Flags Types
 *
 * Shared types for feature flags used in the UI.
 */

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
};

export type RoleFeatureFlags<T extends string> = {
  [K in T]: FeatureFlag;
};

export type FeatureFlagsConfig = {
  admin: RoleFeatureFlags<AdminFeature>;
  teacher: RoleFeatureFlags<TeacherFeature>;
  parent: RoleFeatureFlags<ParentFeature>;
  updatedAt: string; // ISO string
  updatedBy: string;
};

export type FeatureDescriptions = {
  admin: Record<AdminFeature, string>;
  teacher: Record<TeacherFeature, string>;
  parent: Record<ParentFeature, string>;
};

export type FeatureFlagsResponse = {
  success: boolean;
  data: {
    flags: FeatureFlagsConfig;
    descriptions: FeatureDescriptions;
  };
};

// All admin features list
export const ADMIN_FEATURES: AdminFeature[] = [
  'Students',
  'Teachers',
  'Classes',
  'Grades',
  'Textbooks',
  'Volunteers',
  'AttendanceAnalytics',
  'HeroContent',
  'FlashNews',
  'Calendar',
];

// All teacher features list
export const TEACHER_FEATURES: TeacherFeature[] = [
  'Classes',
  'Attendance',
  'Messaging',
];

// All parent features list
export const PARENT_FEATURES: ParentFeature[] = [
  'Students',
  'StudentRegistration',
  'Messaging',
  'Profile',
  'Settings',
];
