/**
 * Audit Logging System
 *
 * Comprehensive audit trail for super-admin actions.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditLogEntry = {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;        // e.g., 'admin.promote', 'admin.demote', 'user.suspend'
  resource: string;      // e.g., 'user', 'config', 'class'
  resourceId: string;
  details: {
    changes?: { field: string; oldValue: unknown; newValue: unknown }[];
    metadata?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: AuditSeverity;
};

export type CreateAuditLogParams = Omit<AuditLogEntry, 'id' | 'timestamp'>;

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAuditLogDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<AuditLogEntry> {
  const db = getDb();
  const ref = db.collection('auditLog').doc();

  const entry = {
    ...params,
    timestamp: FieldValue.serverTimestamp(),
  };

  await ref.set(entry);

  return {
    id: ref.id,
    ...params,
    timestamp: new Date(),
  };
}

/**
 * Log a super-admin action
 */
export async function logSuperAdminAction(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  resourceId: string,
  details: AuditLogEntry['details'],
  options: {
    severity?: AuditSeverity;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<AuditLogEntry> {
  return createAuditLog({
    userId,
    userEmail,
    userRole: 'super_admin',
    action,
    resource,
    resourceId,
    details,
    severity: options.severity || 'info',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });
}

export type AuditLogQuery = {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<{
  entries: AuditLogEntry[];
  total: number;
}> {
  const db = getDb();
  const { limit = 50, offset = 0 } = query;

  // Build base query
  let firestoreQuery = db.collection('auditLog')
    .orderBy('timestamp', 'desc');

  // Apply filters
  if (query.userId) {
    firestoreQuery = firestoreQuery.where('userId', '==', query.userId);
  }
  if (query.action) {
    firestoreQuery = firestoreQuery.where('action', '==', query.action);
  }
  if (query.resource) {
    firestoreQuery = firestoreQuery.where('resource', '==', query.resource);
  }
  if (query.severity) {
    firestoreQuery = firestoreQuery.where('severity', '==', query.severity);
  }
  if (query.startDate) {
    firestoreQuery = firestoreQuery.where('timestamp', '>=', query.startDate);
  }
  if (query.endDate) {
    firestoreQuery = firestoreQuery.where('timestamp', '<=', query.endDate);
  }

  // Get total count (without pagination)
  const countSnapshot = await firestoreQuery.count().get();
  const total = countSnapshot.data().count;

  // Apply pagination
  const snapshot = await firestoreQuery
    .limit(limit)
    .offset(offset)
    .get();

  const entries: AuditLogEntry[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      userEmail: data.userEmail,
      userRole: data.userRole,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: data.timestamp?.toDate?.() || new Date(),
      severity: data.severity || 'info',
    };
  });

  return { entries, total };
}

/**
 * Get distinct values for filter dropdowns
 */
export async function getAuditLogFilterOptions(): Promise<{
  actions: string[];
  resources: string[];
}> {
  const db = getDb();

  // Get recent logs to extract unique values
  const snapshot = await db.collection('auditLog')
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get();

  const actions = new Set<string>();
  const resources = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.action) actions.add(data.action);
    if (data.resource) resources.add(data.resource);
  });

  return {
    actions: Array.from(actions).sort(),
    resources: Array.from(resources).sort(),
  };
}

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(entries: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'User Email',
    'User Role',
    'Action',
    'Resource',
    'Resource ID',
    'Severity',
    'Details',
    'IP Address',
  ];

  const rows = entries.map(entry => [
    entry.timestamp.toISOString(),
    entry.userEmail,
    entry.userRole,
    entry.action,
    entry.resource,
    entry.resourceId,
    entry.severity,
    JSON.stringify(entry.details),
    entry.ipAddress || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
