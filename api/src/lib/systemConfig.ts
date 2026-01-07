/**
 * System Configuration
 *
 * Manage system-wide settings like maintenance mode and rate limits.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logSuperAdminAction } from './auditLog';

export type MaintenanceConfig = {
  enabled: boolean;
  message?: {
    en: string;
    ta: string;
  };
  startTime?: Date;
  endTime?: Date;
  allowedRoles?: string[];
};

export type RateLimitConfig = {
  inviteCreation: number;
  loginAttempts: number;
  apiGeneral: number;
};

export type BackupConfig = {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  retentionDays: number;
  lastBackupAt?: Date;
};

export type AttendanceConfig = {
  /** Number of days in the past that teachers can mark new attendance */
  markWindowDays: number;
  /** Number of days in the past that teachers can edit existing attendance */
  editWindowDays: number;
};

export type SystemConfig = {
  maintenance: MaintenanceConfig;
  rateLimits: RateLimitConfig;
  backup: BackupConfig;
  attendance: AttendanceConfig;
  updatedAt: Date;
  updatedBy: string;
};

// Default configuration
const DEFAULT_CONFIG: Omit<SystemConfig, 'updatedAt' | 'updatedBy'> = {
  maintenance: {
    enabled: false,
    allowedRoles: ['super_admin', 'admin'],
  },
  rateLimits: {
    inviteCreation: 10,
    loginAttempts: 5,
    apiGeneral: 100,
  },
  backup: {
    enabled: false,
    frequency: 'daily',
    retentionDays: 30,
  },
  attendance: {
    markWindowDays: 7, // Default: Teachers can mark attendance for past 7 days
    editWindowDays: 30, // Default: Teachers can edit attendance for past 30 days
  },
};

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setSystemConfigDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Get the current system configuration
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  const db = getDb();
  const doc = await db.collection('systemConfig').doc('main').get();

  if (!doc.exists) {
    // Return default config if not set
    return {
      ...DEFAULT_CONFIG,
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  const data = doc.data()!;
  return {
    maintenance: {
      enabled: data.maintenance?.enabled ?? false,
      message: data.maintenance?.message,
      startTime: data.maintenance?.startTime?.toDate?.(),
      endTime: data.maintenance?.endTime?.toDate?.(),
      allowedRoles: data.maintenance?.allowedRoles ?? ['super_admin', 'admin'],
    },
    rateLimits: {
      inviteCreation: data.rateLimits?.inviteCreation ?? DEFAULT_CONFIG.rateLimits.inviteCreation,
      loginAttempts: data.rateLimits?.loginAttempts ?? DEFAULT_CONFIG.rateLimits.loginAttempts,
      apiGeneral: data.rateLimits?.apiGeneral ?? DEFAULT_CONFIG.rateLimits.apiGeneral,
    },
    backup: {
      enabled: data.backup?.enabled ?? false,
      frequency: data.backup?.frequency ?? 'daily',
      retentionDays: data.backup?.retentionDays ?? 30,
      lastBackupAt: data.backup?.lastBackupAt?.toDate?.(),
    },
    attendance: {
      markWindowDays: data.attendance?.markWindowDays ?? DEFAULT_CONFIG.attendance.markWindowDays,
      editWindowDays: data.attendance?.editWindowDays ?? DEFAULT_CONFIG.attendance.editWindowDays,
    },
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    updatedBy: data.updatedBy ?? 'system',
  };
}

/**
 * Update system configuration
 */
export async function updateSystemConfig(
  updates: Partial<Omit<SystemConfig, 'updatedAt' | 'updatedBy'>>,
  updatedBy: string,
  updatedByEmail: string
): Promise<SystemConfig> {
  const db = getDb();
  const ref = db.collection('systemConfig').doc('main');

  // Get current config for audit log
  const currentConfig = await getSystemConfig();

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  };

  if (updates.maintenance !== undefined) {
    updateData.maintenance = {
      ...currentConfig.maintenance,
      ...updates.maintenance,
      startTime: updates.maintenance.startTime ?
        FieldValue.serverTimestamp() : currentConfig.maintenance.startTime,
    };
  }

  if (updates.rateLimits !== undefined) {
    updateData.rateLimits = {
      ...currentConfig.rateLimits,
      ...updates.rateLimits,
    };
  }

  if (updates.backup !== undefined) {
    updateData.backup = {
      ...currentConfig.backup,
      ...updates.backup,
    };
  }

  if (updates.attendance !== undefined) {
    updateData.attendance = {
      ...currentConfig.attendance,
      ...updates.attendance,
    };
  }

  await ref.set(updateData, { merge: true });

  // Log to audit
  await logSuperAdminAction(
    updatedBy,
    updatedByEmail,
    'config.update',
    'systemConfig',
    'main',
    {
      changes: Object.keys(updates).map(key => ({
        field: key,
        oldValue: (currentConfig as Record<string, unknown>)[key],
        newValue: (updates as Record<string, unknown>)[key],
      })),
    },
    { severity: updates.maintenance?.enabled ? 'critical' : 'warning' }
  );

  return getSystemConfig();
}

/**
 * Enable maintenance mode
 */
export async function enableMaintenanceMode(
  message: { en: string; ta: string },
  updatedBy: string,
  updatedByEmail: string,
  allowedRoles: string[] = ['super_admin', 'admin']
): Promise<SystemConfig> {
  return updateSystemConfig(
    {
      maintenance: {
        enabled: true,
        message,
        startTime: new Date(),
        allowedRoles,
      },
    },
    updatedBy,
    updatedByEmail
  );
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenanceMode(
  updatedBy: string,
  updatedByEmail: string
): Promise<SystemConfig> {
  return updateSystemConfig(
    {
      maintenance: {
        enabled: false,
        endTime: new Date(),
      },
    },
    updatedBy,
    updatedByEmail
  );
}

/**
 * Check if system is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<{
  enabled: boolean;
  message?: { en: string; ta: string };
  allowedRoles: string[];
}> {
  const config = await getSystemConfig();
  return {
    enabled: config.maintenance.enabled,
    message: config.maintenance.message,
    allowedRoles: config.maintenance.allowedRoles || ['super_admin', 'admin'],
  };
}

/**
 * Get attendance configuration
 * Returns the configured window for marking and editing attendance
 */
export async function getAttendanceConfig(): Promise<AttendanceConfig> {
  const config = await getSystemConfig();
  return config.attendance;
}
