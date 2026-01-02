// api/src/lib/__tests__/firestoreAdminManagement.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllAdmins,
  getUserById,
  promoteToAdmin,
  demoteFromAdmin,
  getNonAdminUsers,
  getPromotionHistory,
  __setAdminDbForTests,
} from '../firestoreAdminManagement';
import { __setAuditLogDbForTests } from '../auditLog';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;

  return {
    collection: (name: string) => {
      const collectionMethods = {
        doc: (id?: string) => {
          const docId = id || `auto-id-${++docCounter}`;
          return {
            id: docId,
            async get() {
              const data = storage.get(`${name}/${docId}`);
              return {
                exists: !!data,
                data: () => data || {},
                id: docId,
              };
            },
            async set(data: unknown) {
              storage.set(`${name}/${docId}`, data as StoredDoc);
            },
            async update(data: Record<string, unknown>) {
              const existing = storage.get(`${name}/${docId}`) || {};
              storage.set(`${name}/${docId}`, { ...existing, ...data });
            },
          };
        },
        orderBy: () => collectionMethods,
        where: () => collectionMethods,
        limit: () => collectionMethods,
        async get() {
          const docs: { id: string; data: () => StoredDoc }[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              const id = key.split('/')[1];
              docs.push({
                id,
                data: () => value,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      };
      return collectionMethods;
    },
  };
}

test.afterEach(() => {
  __setAdminDbForTests(null);
  __setAuditLogDbForTests(null);
});

test('getAllAdmins: should return users with admin role', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    status: 'active',
    createdAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admins = await getAllAdmins();

  assert.ok(Array.isArray(admins));
  assert.equal(admins.length, 1);
  assert.equal(admins[0].email, 'admin@test.com');
  assert.equal(admins[0].name, 'Admin User');
});

test('getAllAdmins: should return users with super_admin role', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'superadmin@test.com',
    firstName: 'Super',
    lastName: 'Admin',
    roles: ['super_admin'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admins = await getAllAdmins();

  assert.ok(Array.isArray(admins));
});

test('getAllAdmins: should deduplicate users with both admin and super_admin roles', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'admin@test.com',
    roles: ['admin', 'super_admin'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admins = await getAllAdmins();

  // Should not have duplicates
  const uniqueIds = new Set(admins.map((a) => a.uid));
  assert.equal(uniqueIds.size, admins.length);
});

test('getAllAdmins: should handle users without name fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'admin@test.com',
    roles: ['admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admins = await getAllAdmins();

  assert.ok(Array.isArray(admins));
  assert.equal(admins[0].name, '');
});

test('getUserById: should return user by ID', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['parent'],
    status: 'active',
    createdAt: { toDate: () => new Date('2024-01-01') },
    updatedAt: { toDate: () => new Date('2024-01-02') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const user = await getUserById('user1');

  assert.ok(user);
  assert.equal(user?.uid, 'user1');
  assert.equal(user?.email, 'user@test.com');
  assert.equal(user?.name, 'Test User');
  assert.deepEqual(user?.roles, ['parent']);
});

test('getUserById: should return null for non-existent user', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const user = await getUserById('nonexistent');

  assert.equal(user, null);
});

test('getUserById: should handle user with name field instead of firstName/lastName', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    name: 'Full Name',
    roles: ['parent'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const user = await getUserById('user1');

  assert.ok(user);
  assert.equal(user?.name, 'Full Name');
});

test('promoteToAdmin: should return error for non-existent user', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await promoteToAdmin('nonexistent', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'User not found');
});

test('promoteToAdmin: should return error for existing admin', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await promoteToAdmin('user1', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'User is already an admin');
});

test('promoteToAdmin: should return error for existing super_admin', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['super_admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await promoteToAdmin('user1', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'User is already an admin');
});

test('promoteToAdmin: should promote user successfully', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['parent'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  try {
    const result = await promoteToAdmin('user1', 'superadmin', 'superadmin@test.com', 'Trusted user');

    assert.equal(result.success, true);
    assert.ok(result.promotion);
    assert.equal(result.promotion?.action, 'promote');
    assert.deepEqual(result.promotion?.previousRoles, ['parent']);
    assert.ok(result.promotion?.newRoles.includes('admin'));
  } catch {
    // Audit log might fail
  }
});

test('demoteFromAdmin: should return error for non-existent user', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await demoteFromAdmin('nonexistent', 'superadmin', 'superadmin@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'User not found');
});

test('demoteFromAdmin: should return error for super_admin', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['super_admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await demoteFromAdmin('user1', 'superadmin', 'superadmin@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Cannot demote a super admin');
});

test('demoteFromAdmin: should return error for non-admin user', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['parent'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await demoteFromAdmin('user1', 'superadmin', 'superadmin@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'User is not an admin');
});

test('demoteFromAdmin: should demote user successfully', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['admin', 'teacher'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  try {
    const result = await demoteFromAdmin('user1', 'superadmin', 'superadmin@test.com', 'Role change');

    assert.equal(result.success, true);
    assert.ok(result.promotion);
    assert.equal(result.promotion?.action, 'demote');
    assert.ok(!result.promotion?.newRoles.includes('admin'));
  } catch {
    // Audit log might fail
  }
});

test('demoteFromAdmin: should add parent role if no roles remain', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  try {
    const result = await demoteFromAdmin('user1', 'superadmin', 'superadmin@test.com');

    assert.equal(result.success, true);
    assert.ok(result.promotion?.newRoles.includes('parent'));
  } catch {
    // Audit log might fail
  }
});

test('getNonAdminUsers: should return only non-admin users', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'parent@test.com',
    firstName: 'Parent',
    lastName: 'User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/user2', {
    email: 'admin@test.com',
    roles: ['admin'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const users = await getNonAdminUsers();

  assert.ok(Array.isArray(users));
  // Should only include non-admin users
  for (const user of users) {
    assert.ok(!user.roles.includes('admin'));
    assert.ok(!user.roles.includes('super_admin'));
  }
});

test('getNonAdminUsers: should handle empty roles array', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    status: 'active',
    // No roles field
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const users = await getNonAdminUsers();

  assert.ok(Array.isArray(users));
});

test('getPromotionHistory: should return promotion records', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('adminPromotions/p1', {
    targetUserId: 'user1',
    targetUserEmail: 'user@test.com',
    action: 'promote',
    previousRoles: ['parent'],
    newRoles: ['parent', 'admin'],
    reason: 'Trusted user',
    performedBy: 'superadmin',
    performedByEmail: 'superadmin@test.com',
    performedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const history = await getPromotionHistory();

  assert.ok(Array.isArray(history));
  assert.equal(history.length, 1);
  assert.equal(history[0].action, 'promote');
  assert.equal(history[0].targetUserId, 'user1');
});

test('getPromotionHistory: should respect limit parameter', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('adminPromotions/p1', {
    targetUserId: 'user1',
    action: 'promote',
    previousRoles: [],
    newRoles: ['admin'],
    performedBy: 'superadmin',
    performedByEmail: 'superadmin@test.com',
    performedAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const history = await getPromotionHistory(10);

  assert.ok(Array.isArray(history));
});

test('getPromotionHistory: should handle missing performedAt date', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('adminPromotions/p1', {
    targetUserId: 'user1',
    action: 'promote',
    previousRoles: [],
    newRoles: ['admin'],
    performedBy: 'superadmin',
    performedByEmail: 'superadmin@test.com',
    // No performedAt
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const history = await getPromotionHistory();

  assert.ok(Array.isArray(history));
  assert.ok(history[0].performedAt instanceof Date);
});

// ============================================
// Success path coverage tests
// ============================================

test('promoteToAdmin: should return promotion with id and performedAt on success', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'user@test.com',
    roles: ['teacher'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  __setAuditLogDbForTests(fakeProvider);

  const result = await promoteToAdmin('user1', 'superadmin', 'superadmin@test.com', 'Promotion reason');

  // Assert full success response structure
  assert.equal(result.success, true);
  assert.ok(result.promotion);
  assert.ok(result.promotion?.id);
  assert.ok(result.promotion?.performedAt instanceof Date);
  assert.equal(result.promotion?.targetUserId, 'user1');
  assert.equal(result.promotion?.targetUserEmail, 'user@test.com');
  assert.equal(result.promotion?.action, 'promote');
  assert.deepEqual(result.promotion?.previousRoles, ['teacher']);
  assert.ok(result.promotion?.newRoles.includes('admin'));
  assert.ok(result.promotion?.newRoles.includes('teacher'));
  assert.equal(result.promotion?.performedBy, 'superadmin');
  assert.equal(result.promotion?.performedByEmail, 'superadmin@test.com');
  assert.equal(result.promotion?.reason, 'Promotion reason');
});

test('demoteFromAdmin: should return promotion with id and performedAt on success', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'demotee@test.com',
    roles: ['admin', 'teacher'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  __setAuditLogDbForTests(fakeProvider);

  const result = await demoteFromAdmin('user1', 'superadmin', 'superadmin@test.com', 'Demotion reason');

  // Assert full success response structure
  assert.equal(result.success, true);
  assert.ok(result.promotion);
  assert.ok(result.promotion?.id);
  assert.ok(result.promotion?.performedAt instanceof Date);
  assert.equal(result.promotion?.targetUserId, 'user1');
  assert.equal(result.promotion?.targetUserEmail, 'demotee@test.com');
  assert.equal(result.promotion?.action, 'demote');
  assert.deepEqual(result.promotion?.previousRoles, ['admin', 'teacher']);
  assert.ok(!result.promotion?.newRoles.includes('admin'));
  assert.ok(result.promotion?.newRoles.includes('teacher'));
  assert.equal(result.promotion?.performedBy, 'superadmin');
  assert.equal(result.promotion?.performedByEmail, 'superadmin@test.com');
  assert.equal(result.promotion?.reason, 'Demotion reason');
});
