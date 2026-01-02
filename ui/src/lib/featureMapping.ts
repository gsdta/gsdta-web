/**
 * Feature Mapping
 *
 * Maps URL paths to feature names for navigation filtering.
 */

import type {
  AdminFeature,
  TeacherFeature,
  ParentFeature,
  FeatureFlagRole,
} from "@/types/featureFlags";

// Admin path to feature mapping
export const adminFeatureMap: Record<string, AdminFeature> = {
  // Students
  "/admin/students": "Students",
  "/admin/students/import": "Students",
  "/admin/students/assign-class": "Students",

  // Teachers
  "/admin/users/teachers": "Teachers",
  "/admin/users/teachers/list": "Teachers",
  "/admin/teachers": "Teachers",
  "/admin/teachers/invite": "Teachers",
  "/admin/teachers/assign": "Teachers",

  // Classes
  "/admin/classes": "Classes",
  "/admin/classes/create": "Classes",

  // Grades
  "/admin/grades": "Grades",

  // Textbooks
  "/admin/textbooks": "Textbooks",

  // Volunteers
  "/admin/volunteers": "Volunteers",

  // Attendance Analytics
  "/admin/attendance/analytics": "AttendanceAnalytics",

  // Hero Content
  "/admin/content/hero": "HeroContent",

  // Calendar
  "/admin/calendar": "Calendar",
  "/admin/calendar/new": "Calendar",
};

// Teacher path to feature mapping
export const teacherFeatureMap: Record<string, TeacherFeature> = {
  // Classes
  "/teacher/classes": "Classes",

  // Attendance
  "/teacher/attendance": "Attendance",
  "/teacher/attendance/mark": "Attendance",

  // Messaging
  "/teacher/messages": "Messaging",
};

// Parent path to feature mapping
export const parentFeatureMap: Record<string, ParentFeature> = {
  // Students
  "/parent/students": "Students",

  // Student Registration
  "/parent/students/register": "StudentRegistration",

  // Messaging
  "/parent/messages": "Messaging",

  // Profile
  "/parent/profile": "Profile",

  // Settings
  "/parent/settings": "Settings",
};

/**
 * Get the feature name for a given path and role
 * Returns null if path doesn't map to a feature
 */
export function getFeatureFromPath(
  role: FeatureFlagRole,
  path: string
): AdminFeature | TeacherFeature | ParentFeature | null {
  const map =
    role === "admin"
      ? adminFeatureMap
      : role === "teacher"
        ? teacherFeatureMap
        : parentFeatureMap;

  // Strip query parameters from path
  const cleanPath = path.split("?")[0];

  // Check exact match first
  if (cleanPath in map) {
    return map[cleanPath] as AdminFeature | TeacherFeature | ParentFeature;
  }

  // Check prefix match (for dynamic routes like /admin/classes/[id]/edit)
  for (const [routePath, feature] of Object.entries(map)) {
    if (cleanPath.startsWith(routePath + "/")) {
      return feature as AdminFeature | TeacherFeature | ParentFeature;
    }
  }

  return null;
}

// Union type for all features
type AllFeatures = AdminFeature | TeacherFeature | ParentFeature;

/**
 * Check if a navigation item should be shown based on feature flags
 */
export function shouldShowNavItem(
  role: FeatureFlagRole,
  href: string,
  isFeatureEnabled: (
    role: FeatureFlagRole,
    feature: AllFeatures
  ) => boolean
): boolean {
  const feature = getFeatureFromPath(role, href);

  // If path doesn't map to a feature, always show it
  if (!feature) {
    return true;
  }

  return isFeatureEnabled(role, feature);
}

/**
 * Filter navigation items based on feature flags
 */
export function filterNavItems<T extends { href: string }>(
  items: T[],
  role: FeatureFlagRole,
  isFeatureEnabled: (role: FeatureFlagRole, feature: AllFeatures) => boolean
): T[] {
  return items.filter((item) => shouldShowNavItem(role, item.href, isFeatureEnabled));
}

/**
 * Filter navigation sections (groups with items)
 */
export function filterNavSections<
  T extends { items: Array<{ href: string }> }
>(
  sections: T[],
  role: FeatureFlagRole,
  isFeatureEnabled: (role: FeatureFlagRole, feature: AllFeatures) => boolean
): T[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items, role, isFeatureEnabled),
    }))
    .filter((section) => section.items.length > 0) as T[];
}
