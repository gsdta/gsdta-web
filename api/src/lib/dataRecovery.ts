/**
 * Data Recovery Library
 *
 * Manage soft-deleted data and emergency user suspension.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logSuperAdminAction } from './auditLog';

export type DeletedDataEntry = {
  id: string;
  collection: string;
  originalId: string;
  data: Record<string, unknown>;
  deletedAt: Date;
  deletedBy: string;
  deletedByEmail: string;
  expiresAt: Date;
  restored?: boolean;
  restoredAt?: Date;
  restoredBy?: string;
};

export type SuspensionRecord = {
  id: string;
  userId: string;
  userEmail: string;
  reason: string;
  severity: 'warning' | 'temporary' | 'permanent';
  suspendedBy: string;
  suspendedByEmail: string;
  suspendedAt: Date;
  expiresAt?: Date;
  lifted?: boolean;
  liftedAt?: Date;
  liftedBy?: string;
  liftReason?: string;
};

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setDataRecoveryDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const RETENTION_DAYS = 90; // Keep deleted data for 90 days

/**
 * Archive data before deletion (soft delete)
 */
export async function archiveBeforeDelete(
  collection: string,
  documentId: string,
  data: Record<string, unknown>,
  deletedBy: string,
  deletedByEmail: string
): Promise<DeletedDataEntry> {
  const db = getDb();
  const ref = db.collection('deletedData').doc();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

  const entryData = {
    collection,
    originalId: documentId,
    data,
    deletedBy,
    deletedByEmail,
    deletedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    restored: false,
  };

  await ref.set(entryData);

  return {
    id: ref.id,
    collection,
    originalId: documentId,
    data,
    deletedBy,
    deletedByEmail,
    deletedAt: new Date(),
    expiresAt,
  };
}

/**
 * Query deleted data
 */
export async function queryDeletedData(options: {
  collection?: string;
  limit?: number;
  offset?: number;
  includeRestored?: boolean;
}): Promise<{ entries: DeletedDataEntry[]; total: number }> {
  const db = getDb();
  let query = db.collection('deletedData').orderBy('deletedAt', 'desc');

  if (options.collection) {
    query = query.where('collection', '==', options.collection);
  }

  if (!options.includeRestored) {
    query = query.where('restored', '==', false);
  }

  // Get total count first
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  // Apply pagination
  if (options.offset && options.offset > 0) {
    const skipSnapshot = await query.limit(options.offset).get();
    if (!skipSnapshot.empty) {
      const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
      query = query.startAfter(lastDoc);
    }
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  const entries: DeletedDataEntry[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      collection: data.collection,
      originalId: data.originalId,
      data: data.data,
      deletedAt: data.deletedAt?.toDate?.() ?? new Date(),
      deletedBy: data.deletedBy,
      deletedByEmail: data.deletedByEmail,
      expiresAt: data.expiresAt?.toDate?.() ?? new Date(),
      restored: data.restored ?? false,
      restoredAt: data.restoredAt?.toDate?.(),
      restoredBy: data.restoredBy,
    };
  });

  return { entries, total };
}

/**
 * Restore deleted data
 */
export async function restoreDeletedData(
  deletedDataId: string,
  restoredBy: string,
  restoredByEmail: string
): Promise<{ success: boolean; entry?: DeletedDataEntry; error?: string }> {
  const db = getDb();
  const deletedRef = db.collection('deletedData').doc(deletedDataId);
  const deletedDoc = await deletedRef.get();

  if (!deletedDoc.exists) {
    return { success: false, error: 'Deleted data entry not found' };
  }

  const deletedData = deletedDoc.data()!;

  if (deletedData.restored) {
    return { success: false, error: 'Data has already been restored' };
  }

  // Check if original document still exists
  const originalRef = db.collection(deletedData.collection).doc(deletedData.originalId);
  const originalDoc = await originalRef.get();

  if (originalDoc.exists) {
    return {
      success: false,
      error: 'A document with this ID already exists in the collection',
    };
  }

  // Restore the data
  await originalRef.set(deletedData.data);

  // Mark as restored
  await deletedRef.update({
    restored: true,
    restoredAt: FieldValue.serverTimestamp(),
    restoredBy,
  });

  // Log to audit
  await logSuperAdminAction(
    restoredBy,
    restoredByEmail,
    'data.restore',
    deletedData.collection,
    deletedData.originalId,
    {
      metadata: {
        deletedDataId,
        originalCollection: deletedData.collection,
        deletedBy: deletedData.deletedBy,
        deletedAt: deletedData.deletedAt?.toDate?.()?.toISOString(),
      },
    },
    { severity: 'warning' }
  );

  return {
    success: true,
    entry: {
      id: deletedDataId,
      collection: deletedData.collection,
      originalId: deletedData.originalId,
      data: deletedData.data,
      deletedAt: deletedData.deletedAt?.toDate?.() ?? new Date(),
      deletedBy: deletedData.deletedBy,
      deletedByEmail: deletedData.deletedByEmail,
      expiresAt: deletedData.expiresAt?.toDate?.() ?? new Date(),
      restored: true,
      restoredAt: new Date(),
      restoredBy,
    },
  };
}

/**
 * Emergency suspend a user
 */
export async function emergencySuspendUser(
  userId: string,
  reason: string,
  severity: 'warning' | 'temporary' | 'permanent',
  suspendedBy: string,
  suspendedByEmail: string,
  durationDays?: number
): Promise<{ success: boolean; suspension?: SuspensionRecord; error?: string }> {
  const db = getDb();

  // Get the user
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { success: false, error: 'User not found' };
  }

  const userData = userDoc.data()!;

  // Don't allow suspending super_admins
  if (userData.roles?.includes('super_admin')) {
    return { success: false, error: 'Cannot suspend a super admin' };
  }

  // Calculate expiry if temporary
  let expiresAt: Date | undefined;
  if (severity === 'temporary' && durationDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  }

  // Create suspension record
  const suspensionRef = db.collection('suspensions').doc();
  const suspensionData = {
    userId,
    userEmail: userData.email || '',
    reason,
    severity,
    suspendedBy,
    suspendedByEmail,
    suspendedAt: FieldValue.serverTimestamp(),
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    lifted: false,
  };

  // Update user status
  const previousStatus = userData.status;
  await userRef.update({
    status: 'suspended',
    suspendedAt: FieldValue.serverTimestamp(),
    suspensionReason: reason,
  });

  await suspensionRef.set(suspensionData);

  // Log to audit
  await logSuperAdminAction(
    suspendedBy,
    suspendedByEmail,
    'user.emergency_suspend',
    'users',
    userId,
    {
      metadata: {
        userEmail: userData.email,
        reason,
        severity,
        previousStatus,
        durationDays,
        expiresAt: expiresAt?.toISOString(),
      },
    },
    { severity: 'critical' }
  );

  return {
    success: true,
    suspension: {
      id: suspensionRef.id,
      userId,
      userEmail: userData.email || '',
      reason,
      severity,
      suspendedBy,
      suspendedByEmail,
      suspendedAt: new Date(),
      expiresAt,
      lifted: false,
    },
  };
}

/**
 * Lift a user suspension
 */
export async function liftUserSuspension(
  userId: string,
  liftReason: string,
  liftedBy: string,
  liftedByEmail: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  // Get the user
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { success: false, error: 'User not found' };
  }

  const userData = userDoc.data()!;

  if (userData.status !== 'suspended') {
    return { success: false, error: 'User is not suspended' };
  }

  // Find active suspension
  const suspensionSnapshot = await db
    .collection('suspensions')
    .where('userId', '==', userId)
    .where('lifted', '==', false)
    .orderBy('suspendedAt', 'desc')
    .limit(1)
    .get();

  if (!suspensionSnapshot.empty) {
    const suspensionDoc = suspensionSnapshot.docs[0];
    await suspensionDoc.ref.update({
      lifted: true,
      liftedAt: FieldValue.serverTimestamp(),
      liftedBy,
      liftReason,
    });
  }

  // Update user status
  await userRef.update({
    status: 'active',
    suspendedAt: FieldValue.delete(),
    suspensionReason: FieldValue.delete(),
  });

  // Log to audit
  await logSuperAdminAction(
    liftedBy,
    liftedByEmail,
    'user.lift_suspension',
    'users',
    userId,
    {
      metadata: {
        userEmail: userData.email,
        liftReason,
      },
    },
    { severity: 'warning' }
  );

  return { success: true };
}

/**
 * Get suspension history for a user
 */
export async function getUserSuspensions(userId: string): Promise<SuspensionRecord[]> {
  const db = getDb();

  const snapshot = await db
    .collection('suspensions')
    .where('userId', '==', userId)
    .orderBy('suspendedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      userEmail: data.userEmail,
      reason: data.reason,
      severity: data.severity,
      suspendedBy: data.suspendedBy,
      suspendedByEmail: data.suspendedByEmail,
      suspendedAt: data.suspendedAt?.toDate?.() ?? new Date(),
      expiresAt: data.expiresAt?.toDate?.(),
      lifted: data.lifted ?? false,
      liftedAt: data.liftedAt?.toDate?.(),
      liftedBy: data.liftedBy,
      liftReason: data.liftReason,
    };
  });
}

/**
 * Get all active suspensions
 */
export async function getActiveSuspensions(): Promise<SuspensionRecord[]> {
  const db = getDb();

  const snapshot = await db
    .collection('suspensions')
    .where('lifted', '==', false)
    .orderBy('suspendedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      userEmail: data.userEmail,
      reason: data.reason,
      severity: data.severity,
      suspendedBy: data.suspendedBy,
      suspendedByEmail: data.suspendedByEmail,
      suspendedAt: data.suspendedAt?.toDate?.() ?? new Date(),
      expiresAt: data.expiresAt?.toDate?.(),
      lifted: false,
    };
  });
}
