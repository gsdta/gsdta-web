/**
 * Admin Management Functions
 *
 * Functions for super-admin operations like promoting/demoting admins.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type AdminPromotion = {
  id: string;
  targetUserId: string;
  targetUserEmail: string;
  action: 'promote' | 'demote';
  previousRoles: string[];
  newRoles: string[];
  reason?: string;
  performedBy: string;
  performedByEmail: string;
  performedAt: Date;
};

export type AdminUser = {
  uid: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Get all users with admin role (including super_admin)
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  const db = getDb();

  // Get all users with 'admin' role
  const adminSnapshot = await db.collection('users')
    .where('roles', 'array-contains', 'admin')
    .get();

  // Get all users with 'super_admin' role
  const superAdminSnapshot = await db.collection('users')
    .where('roles', 'array-contains', 'super_admin')
    .get();

  // Combine and deduplicate
  const userMap = new Map<string, AdminUser>();

  const processSnapshot = (snapshot: FirebaseFirestore.QuerySnapshot) => {
    snapshot.docs.forEach(doc => {
      if (userMap.has(doc.id)) return;
      const data = doc.data();
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      const computedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

      userMap.set(doc.id, {
        uid: doc.id,
        email: data.email || '',
        name: computedName,
        firstName,
        lastName,
        roles: data.roles || [],
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      });
    });
  };

  processSnapshot(adminSnapshot);
  processSnapshot(superAdminSnapshot);

  return Array.from(userMap.values());
}

/**
 * Get user by UID
 */
export async function getUserById(uid: string): Promise<AdminUser | null> {
  const db = getDb();
  const doc = await db.collection('users').doc(uid).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  const firstName = data.firstName || '';
  const lastName = data.lastName || '';
  const computedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

  return {
    uid: doc.id,
    email: data.email || '',
    name: computedName,
    firstName,
    lastName,
    roles: data.roles || [],
    status: data.status || 'active',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  };
}

/**
 * Promote a user to admin role
 */
export async function promoteToAdmin(
  targetUid: string,
  performedBy: string,
  performedByEmail: string,
  reason?: string
): Promise<{ success: boolean; error?: string; promotion?: AdminPromotion }> {
  const db = getDb();
  const userRef = db.collection('users').doc(targetUid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { success: false, error: 'User not found' };
  }

  const userData = userDoc.data()!;
  const currentRoles: string[] = userData.roles || [];

  // Check if already an admin
  if (currentRoles.includes('admin') || currentRoles.includes('super_admin')) {
    return { success: false, error: 'User is already an admin' };
  }

  // Add admin role
  const newRoles = [...currentRoles, 'admin'];

  // Update user
  await userRef.update({
    roles: newRoles,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Record the promotion
  const promotionRef = db.collection('adminPromotions').doc();
  const promotionData = {
    targetUserId: targetUid,
    targetUserEmail: userData.email || '',
    action: 'promote' as const,
    previousRoles: currentRoles,
    newRoles,
    reason,
    performedBy,
    performedByEmail,
    performedAt: FieldValue.serverTimestamp(),
  };

  await promotionRef.set(promotionData);

  return {
    success: true,
    promotion: {
      id: promotionRef.id,
      ...promotionData,
      performedAt: new Date(),
    } as AdminPromotion,
  };
}

/**
 * Demote an admin (remove admin role)
 */
export async function demoteFromAdmin(
  targetUid: string,
  performedBy: string,
  performedByEmail: string,
  reason?: string
): Promise<{ success: boolean; error?: string; promotion?: AdminPromotion }> {
  const db = getDb();
  const userRef = db.collection('users').doc(targetUid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { success: false, error: 'User not found' };
  }

  const userData = userDoc.data()!;
  const currentRoles: string[] = userData.roles || [];

  // Cannot demote a super_admin
  if (currentRoles.includes('super_admin')) {
    return { success: false, error: 'Cannot demote a super admin' };
  }

  // Check if user has admin role
  if (!currentRoles.includes('admin')) {
    return { success: false, error: 'User is not an admin' };
  }

  // Remove admin role
  const newRoles = currentRoles.filter(r => r !== 'admin');

  // Ensure user has at least one role
  if (newRoles.length === 0) {
    newRoles.push('parent'); // Default fallback role
  }

  // Update user
  await userRef.update({
    roles: newRoles,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Record the demotion
  const promotionRef = db.collection('adminPromotions').doc();
  const promotionData = {
    targetUserId: targetUid,
    targetUserEmail: userData.email || '',
    action: 'demote' as const,
    previousRoles: currentRoles,
    newRoles,
    reason,
    performedBy,
    performedByEmail,
    performedAt: FieldValue.serverTimestamp(),
  };

  await promotionRef.set(promotionData);

  return {
    success: true,
    promotion: {
      id: promotionRef.id,
      ...promotionData,
      performedAt: new Date(),
    } as AdminPromotion,
  };
}

/**
 * Get all non-admin users (for promotion dropdown)
 */
export async function getNonAdminUsers(): Promise<AdminUser[]> {
  const db = getDb();

  // Get all active users
  const snapshot = await db.collection('users')
    .where('status', '==', 'active')
    .get();

  const users: AdminUser[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const roles: string[] = data.roles || [];

    // Exclude users who are already admin or super_admin
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return;
    }

    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    const computedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

    users.push({
      uid: doc.id,
      email: data.email || '',
      name: computedName,
      firstName,
      lastName,
      roles,
      status: data.status || 'active',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    });
  });

  return users;
}

/**
 * Get promotion history
 */
export async function getPromotionHistory(limit: number = 50): Promise<AdminPromotion[]> {
  const db = getDb();

  const snapshot = await db.collection('adminPromotions')
    .orderBy('performedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      targetUserId: data.targetUserId,
      targetUserEmail: data.targetUserEmail,
      action: data.action,
      previousRoles: data.previousRoles,
      newRoles: data.newRoles,
      reason: data.reason,
      performedBy: data.performedBy,
      performedByEmail: data.performedByEmail,
      performedAt: data.performedAt?.toDate?.() || new Date(),
    };
  });
}
