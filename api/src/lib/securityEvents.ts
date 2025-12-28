/**
 * Security Events System
 *
 * Track security-related events like failed logins and unauthorized access.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type SecurityEventType =
  | 'login_failed'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity';

export type SecurityEvent = {
  id: string;
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
};

export type CreateSecurityEventParams = Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>;

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setSecurityEventsDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  params: Omit<CreateSecurityEventParams, 'resolved'>
): Promise<SecurityEvent> {
  const db = getDb();
  const ref = db.collection('securityEvents').doc();

  const event = {
    ...params,
    resolved: false,
    timestamp: FieldValue.serverTimestamp(),
  };

  await ref.set(event);

  return {
    id: ref.id,
    ...params,
    resolved: false,
    timestamp: new Date(),
  };
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ipAddress: string,
  userAgent: string,
  reason: string
): Promise<SecurityEvent> {
  return logSecurityEvent({
    type: 'login_failed',
    email,
    ipAddress,
    userAgent,
    details: { reason },
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  ipAddress: string,
  userAgent: string,
  endpoint: string,
  limit: number
): Promise<SecurityEvent> {
  return logSecurityEvent({
    type: 'rate_limit_exceeded',
    ipAddress,
    userAgent,
    details: { endpoint, limit },
  });
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  userId: string | undefined,
  email: string | undefined,
  ipAddress: string,
  userAgent: string,
  resource: string,
  requiredRole: string
): Promise<SecurityEvent> {
  return logSecurityEvent({
    type: 'unauthorized_access',
    userId,
    email,
    ipAddress,
    userAgent,
    details: { resource, requiredRole },
  });
}

export type SecurityEventQuery = {
  type?: SecurityEventType;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

/**
 * Query security events
 */
export async function querySecurityEvents(query: SecurityEventQuery = {}): Promise<{
  events: SecurityEvent[];
  total: number;
}> {
  const db = getDb();
  const { limit = 50, offset = 0 } = query;

  // Build base query
  let firestoreQuery = db.collection('securityEvents')
    .orderBy('timestamp', 'desc');

  // Apply filters
  if (query.type) {
    firestoreQuery = firestoreQuery.where('type', '==', query.type);
  }
  if (query.resolved !== undefined) {
    firestoreQuery = firestoreQuery.where('resolved', '==', query.resolved);
  }
  if (query.startDate) {
    firestoreQuery = firestoreQuery.where('timestamp', '>=', query.startDate);
  }
  if (query.endDate) {
    firestoreQuery = firestoreQuery.where('timestamp', '<=', query.endDate);
  }

  // Get total count
  const countSnapshot = await firestoreQuery.count().get();
  const total = countSnapshot.data().count;

  // Apply pagination
  const snapshot = await firestoreQuery
    .limit(limit)
    .offset(offset)
    .get();

  const events: SecurityEvent[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      details: data.details || {},
      timestamp: data.timestamp?.toDate?.() || new Date(),
      resolved: data.resolved || false,
      resolvedAt: data.resolvedAt?.toDate?.(),
      resolvedBy: data.resolvedBy,
      resolution: data.resolution,
    };
  });

  return { events, total };
}

/**
 * Get security event statistics
 */
export async function getSecurityStats(): Promise<{
  failedLogins24h: number;
  rateLimitExceeded24h: number;
  unauthorizedAccess24h: number;
  unresolvedEvents: number;
}> {
  const db = getDb();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get counts for different event types in last 24 hours
  const [failedLogins, rateLimits, unauthorized, unresolved] = await Promise.all([
    db.collection('securityEvents')
      .where('type', '==', 'login_failed')
      .where('timestamp', '>=', twentyFourHoursAgo)
      .count()
      .get(),
    db.collection('securityEvents')
      .where('type', '==', 'rate_limit_exceeded')
      .where('timestamp', '>=', twentyFourHoursAgo)
      .count()
      .get(),
    db.collection('securityEvents')
      .where('type', '==', 'unauthorized_access')
      .where('timestamp', '>=', twentyFourHoursAgo)
      .count()
      .get(),
    db.collection('securityEvents')
      .where('resolved', '==', false)
      .count()
      .get(),
  ]);

  return {
    failedLogins24h: failedLogins.data().count,
    rateLimitExceeded24h: rateLimits.data().count,
    unauthorizedAccess24h: unauthorized.data().count,
    unresolvedEvents: unresolved.data().count,
  };
}

/**
 * Resolve a security event
 */
export async function resolveSecurityEvent(
  eventId: string,
  resolvedBy: string,
  resolution: string
): Promise<SecurityEvent | null> {
  const db = getDb();
  const ref = db.collection('securityEvents').doc(eventId);
  const doc = await ref.get();

  if (!doc.exists) return null;

  await ref.update({
    resolved: true,
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy,
    resolution,
  });

  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type,
    userId: data.userId,
    email: data.email,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: data.details || {},
    timestamp: data.timestamp?.toDate?.() || new Date(),
    resolved: true,
    resolvedAt: new Date(),
    resolvedBy,
    resolution,
  };
}
