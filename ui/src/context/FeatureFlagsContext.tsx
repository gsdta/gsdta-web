"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  FeatureFlagsConfig,
  FeatureDescriptions,
  FeatureFlagRole,
  AdminFeature,
  TeacherFeature,
  ParentFeature,
} from "@/types/featureFlags";

// Default feature flags (all enabled)
const DEFAULT_FLAGS: FeatureFlagsConfig = {
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
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

const DEFAULT_DESCRIPTIONS: FeatureDescriptions = {
  admin: {
    Students: "Manage student records, enrollments, and bulk operations",
    Teachers: "Manage teacher profiles, invitations, and assignments",
    Classes: "Manage class schedules, rosters, and configurations",
    Grades: "Manage grade levels and academic settings",
    Textbooks: "Manage textbook resources and materials",
    Volunteers: "Manage volunteer registrations and assignments",
    AttendanceAnalytics: "View attendance reports and analytics dashboard",
    HeroContent: "Manage homepage hero banners and announcements",
    FlashNews: "Manage scrolling news marquee announcements",
    Calendar: "Manage school calendar events",
  },
  teacher: {
    Classes: "View assigned classes and student rosters",
    Attendance: "Mark and manage student attendance",
    Messaging: "Send and receive messages with parents",
  },
  parent: {
    Students: "View linked student information and progress",
    StudentRegistration: "Register new students",
    Messaging: "Send and receive messages with teachers",
    Profile: "Manage personal profile information",
    Settings: "Manage account settings and preferences",
  },
};

interface FeatureFlagsContextValue {
  flags: FeatureFlagsConfig;
  descriptions: FeatureDescriptions;
  loading: boolean;
  error: string | null;
  isFeatureEnabled: (
    role: FeatureFlagRole,
    feature: AdminFeature | TeacherFeature | ParentFeature
  ) => boolean;
  refetch: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

// Cache for feature flags
const CACHE_KEY = "featureFlags:cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedFlags {
  flags: FeatureFlagsConfig;
  descriptions: FeatureDescriptions;
  timestamp: number;
}

function getCachedFlags(): CachedFlags | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedFlags;
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedFlags(flags: FeatureFlagsConfig, descriptions: FeatureDescriptions): void {
  if (typeof window === "undefined") return;
  try {
    const cache: CachedFlags = {
      flags,
      descriptions,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export function clearFeatureFlagsCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
}

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagsConfig>(DEFAULT_FLAGS);
  const [descriptions, setDescriptions] = useState<FeatureDescriptions>(DEFAULT_DESCRIPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = getCachedFlags();
      if (cached) {
        setFlags(cached.flags);
        setDescriptions(cached.descriptions);
        setLoading(false);
        return;
      }

      // Fetch from API (public endpoint that doesn't require auth)
      // For non-super-admins, we use a public endpoint that just returns the flags
      const res = await fetch("/api/v1/feature-flags", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        // If endpoint doesn't exist or fails, use defaults
        console.warn("Feature flags endpoint not available, using defaults");
        setFlags(DEFAULT_FLAGS);
        setDescriptions(DEFAULT_DESCRIPTIONS);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        const newFlags = data.data.flags || DEFAULT_FLAGS;
        const newDescriptions = data.data.descriptions || DEFAULT_DESCRIPTIONS;
        setFlags(newFlags);
        setDescriptions(newDescriptions);
        setCachedFlags(newFlags, newDescriptions);
      }
    } catch (err) {
      console.warn("Failed to fetch feature flags, using defaults:", err);
      setFlags(DEFAULT_FLAGS);
      setDescriptions(DEFAULT_DESCRIPTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isFeatureEnabled = useCallback(
    (
      role: FeatureFlagRole,
      feature: AdminFeature | TeacherFeature | ParentFeature
    ): boolean => {
      const roleFlags = flags[role];
      if (!roleFlags) return true; // Default to enabled if role not found

      const featureFlag = (roleFlags as Record<string, { enabled: boolean }>)[feature];
      if (!featureFlag) return true; // Default to enabled if feature not found

      return featureFlag.enabled;
    },
    [flags]
  );

  const refetch = useCallback(async () => {
    clearFeatureFlagsCache();
    await fetchFlags();
  }, [fetchFlags]);

  const value: FeatureFlagsContextValue = {
    flags,
    descriptions,
    loading,
    error,
    isFeatureEnabled,
    refetch,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagsProvider");
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureEnabled(
  role: FeatureFlagRole,
  feature: AdminFeature | TeacherFeature | ParentFeature
): boolean {
  const { isFeatureEnabled, loading } = useFeatureFlags();

  // While loading, default to enabled to avoid flicker
  if (loading) return true;

  return isFeatureEnabled(role, feature);
}
