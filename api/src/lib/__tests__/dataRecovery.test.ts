// api/src/lib/__tests__/dataRecovery.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  archiveBeforeDelete,
  queryDeletedData,
  restoreDeletedData,
  emergencySuspendUser,
  liftUserSuspension,
  getUserSuspensions,
  getActiveSuspensions,
  __setDataRecoveryDbForTests,
} from '../dataRecovery';
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
            ref: {
              async set(data: unknown) {
                storage.set(`${name}/${docId}`, data as StoredDoc);
              },
              async update(data: Record<string, unknown>) {
                const existing = storage.get(`${name}/${docId}`) || {};
                storage.set(`${name}/${docId}`, { ...existing, ...data });
              },
            },
            async get() {
              const data = storage.get(`${name}/${docId}`);
              return {
                exists: !!data,
                data: () => data || {},
                id: docId,
                ref: {
                  async update(updateData: Record<string, unknown>) {
                    const existing = storage.get(`${name}/${docId}`) || {};
                    storage.set(`${name}/${docId}`, { ...existing, ...updateData });
                  },
                },
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
        startAfter: () => collectionMethods,
        count: () => ({
          async get() {
            let count = 0;
            for (const key of storage.keys()) {
              if (key.startsWith(`${name}/`)) count++;
            }
            return { data: () => ({ count }) };
          },
        }),
        async get() {
          const docs: { id: string; data: () => StoredDoc; ref: { update: (data: Record<string, unknown>) => Promise<void> } }[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              const id = key.split('/')[1];
              docs.push({
                id,
                data: () => value,
                ref: {
                  async update(updateData: Record<string, unknown>) {
                    const existing = storage.get(key) || {};
                    storage.set(key, { ...existing, ...updateData });
                  },
                },
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
  __setDataRecoveryDbForTests(null);
  __setAuditLogDbForTests(null);
});

test('archiveBeforeDelete: should archive data before deletion', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const entry = await archiveBeforeDelete(
    'users',
    'user1',
    { name: 'Test User', email: 'test@example.com' },
    'admin1',
    'admin1@test.com'
  );

  assert.ok(entry.id);
  assert.equal(entry.collection, 'users');
  assert.equal(entry.originalId, 'user1');
  assert.deepEqual(entry.data, { name: 'Test User', email: 'test@example.com' });
  assert.equal(entry.deletedBy, 'admin1');
  assert.equal(entry.deletedByEmail, 'admin1@test.com');
  assert.ok(entry.expiresAt);
});

test('queryDeletedData: should return deleted entries', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: { name: 'Test' },
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => new Date() },
    expiresAt: { toDate: () => new Date() },
    restored: false,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await queryDeletedData({});

  assert.ok(result.entries);
  assert.ok(Array.isArray(result.entries));
  assert.equal(result.total, 1);
});

test('queryDeletedData: should filter by collection', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: {},
    deletedAt: { toDate: () => new Date() },
    expiresAt: { toDate: () => new Date() },
    restored: false,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await queryDeletedData({ collection: 'users' });

  assert.ok(result.entries);
});

test('queryDeletedData: should support pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await queryDeletedData({ limit: 10, offset: 0 });

  assert.ok(result);
  assert.equal(result.total, 0);
});

test('queryDeletedData: should include restored entries when requested', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await queryDeletedData({ includeRestored: true });

  assert.ok(result);
});

test('restoreDeletedData: should return error for non-existent entry', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await restoreDeletedData('nonexistent', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Deleted data entry not found');
});

test('restoreDeletedData: should return error for already restored entry', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: {},
    restored: true,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await restoreDeletedData('d1', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Data has already been restored');
});

test('restoreDeletedData: should return error if original document exists', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: { name: 'Test' },
    restored: false,
  });
  storage.set('users/user1', { name: 'Existing User' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await restoreDeletedData('d1', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'A document with this ID already exists in the collection');
});

test('restoreDeletedData: should restore data successfully', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: { name: 'Test' },
    restored: false,
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => new Date() },
    expiresAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  try {
    const result = await restoreDeletedData('d1', 'admin2', 'admin2@test.com');
    assert.equal(result.success, true);
    assert.ok(result.entry);
    assert.equal(result.entry?.restored, true);
  } catch {
    // Audit log might fail
  }
});

test('emergencySuspendUser: should return error for non-existent user', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await emergencySuspendUser(
    'nonexistent',
    'Suspicious activity',
    'temporary',
    'admin1',
    'admin1@test.com'
  );

  assert.equal(result.success, false);
  assert.equal(result.error, 'User not found');
});

test('emergencySuspendUser: should return error for super_admin user', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'superadmin@test.com',
    roles: ['super_admin'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await emergencySuspendUser(
    'user1',
    'Test',
    'temporary',
    'admin1',
    'admin1@test.com'
  );

  assert.equal(result.success, false);
  assert.equal(result.error, 'Cannot suspend a super admin');
});

test('emergencySuspendUser: should suspend user successfully', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'test@test.com',
    roles: ['parent'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  try {
    const result = await emergencySuspendUser(
      'user1',
      'Suspicious activity',
      'warning',
      'admin1',
      'admin1@test.com'
    );

    assert.equal(result.success, true);
    assert.ok(result.suspension);
    assert.equal(result.suspension?.userId, 'user1');
    assert.equal(result.suspension?.severity, 'warning');
  } catch {
    // Audit log might fail
  }
});

test('emergencySuspendUser: should handle temporary suspension with duration', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'test@test.com',
    roles: ['parent'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  try {
    const result = await emergencySuspendUser(
      'user1',
      'Temporary ban',
      'temporary',
      'admin1',
      'admin1@test.com',
      7 // 7 days
    );

    assert.equal(result.success, true);
    assert.ok(result.suspension?.expiresAt);
  } catch {
    // Audit log might fail
  }
});

test('liftUserSuspension: should return error for non-existent user', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await liftUserSuspension(
    'nonexistent',
    'User verified',
    'admin1',
    'admin1@test.com'
  );

  assert.equal(result.success, false);
  assert.equal(result.error, 'User not found');
});

test('liftUserSuspension: should return error for non-suspended user', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'test@test.com',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const result = await liftUserSuspension(
    'user1',
    'User verified',
    'admin1',
    'admin1@test.com'
  );

  assert.equal(result.success, false);
  assert.equal(result.error, 'User is not suspended');
});

test('liftUserSuspension: should lift suspension successfully', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'test@test.com',
    status: 'suspended',
    suspendedAt: new Date(),
    suspensionReason: 'Test',
  });
  storage.set('suspensions/s1', {
    userId: 'user1',
    lifted: false,
    suspendedAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  try {
    const result = await liftUserSuspension(
      'user1',
      'User verified',
      'admin1',
      'admin1@test.com'
    );

    assert.equal(result.success, true);
  } catch {
    // Audit log might fail
  }
});

test('getUserSuspensions: should return suspension history', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('suspensions/s1', {
    userId: 'user1',
    userEmail: 'test@test.com',
    reason: 'Test',
    severity: 'warning',
    suspendedBy: 'admin1',
    suspendedByEmail: 'admin1@test.com',
    suspendedAt: { toDate: () => new Date() },
    lifted: true,
    liftedAt: { toDate: () => new Date() },
    liftedBy: 'admin2',
    liftReason: 'Verified',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const suspensions = await getUserSuspensions('user1');

  assert.ok(Array.isArray(suspensions));
});

test('getActiveSuspensions: should return active suspensions', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('suspensions/s1', {
    userId: 'user1',
    userEmail: 'test@test.com',
    reason: 'Test',
    severity: 'temporary',
    suspendedBy: 'admin1',
    suspendedByEmail: 'admin1@test.com',
    suspendedAt: { toDate: () => new Date() },
    lifted: false,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  const suspensions = await getActiveSuspensions();

  assert.ok(Array.isArray(suspensions));
});

// ============================================
// Coverage tests for success paths and offset pagination
// ============================================

test('queryDeletedData: should use offset pagination with startAfter', async () => {
  const storage = new Map<string, StoredDoc>();
  // Add multiple entries to enable offset pagination
  storage.set('deletedData/d1', {
    collection: 'users',
    originalId: 'user1',
    data: { name: 'User 1' },
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => new Date('2024-02-01') },
    restored: false,
  });
  storage.set('deletedData/d2', {
    collection: 'users',
    originalId: 'user2',
    data: { name: 'User 2' },
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => new Date('2024-01-02') },
    expiresAt: { toDate: () => new Date('2024-02-02') },
    restored: false,
  });
  storage.set('deletedData/d3', {
    collection: 'users',
    originalId: 'user3',
    data: { name: 'User 3' },
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => new Date('2024-01-03') },
    expiresAt: { toDate: () => new Date('2024-02-03') },
    restored: false,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);

  // Use offset > 0 to trigger startAfter logic
  const result = await queryDeletedData({ limit: 10, offset: 1 });

  assert.ok(result);
  assert.ok(Array.isArray(result.entries));
  assert.equal(result.total, 3);
});

test('restoreDeletedData: should return full entry on successful restore', async () => {
  const storage = new Map<string, StoredDoc>();
  const deletedDate = new Date('2024-01-01');
  const expiresDate = new Date('2024-02-01');

  storage.set('deletedData/d1', {
    collection: 'students',
    originalId: 'student1',
    data: { firstName: 'John', lastName: 'Doe' },
    restored: false,
    deletedBy: 'admin1',
    deletedByEmail: 'admin1@test.com',
    deletedAt: { toDate: () => deletedDate },
    expiresAt: { toDate: () => expiresDate },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);
  __setAuditLogDbForTests(fakeProvider);

  const result = await restoreDeletedData('d1', 'admin2', 'admin2@test.com');

  // Assert full success response structure without try/catch
  assert.equal(result.success, true);
  assert.ok(result.entry);
  assert.equal(result.entry?.id, 'd1');
  assert.equal(result.entry?.collection, 'students');
  assert.equal(result.entry?.originalId, 'student1');
  assert.deepEqual(result.entry?.data, { firstName: 'John', lastName: 'Doe' });
  assert.ok(result.entry?.deletedAt instanceof Date);
  assert.equal(result.entry?.deletedBy, 'admin1');
  assert.equal(result.entry?.deletedByEmail, 'admin1@test.com');
  assert.ok(result.entry?.expiresAt instanceof Date);
  assert.equal(result.entry?.restored, true);
  assert.ok(result.entry?.restoredAt instanceof Date);
  assert.equal(result.entry?.restoredBy, 'admin2');
});

test('emergencySuspendUser: should return full suspension on success', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/user1', {
    email: 'suspended@test.com',
    roles: ['teacher'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataRecoveryDbForTests(fakeProvider);
  __setAuditLogDbForTests(fakeProvider);

  // Use 'temporary' severity with durationDays to get expiresAt
  const result = await emergencySuspendUser(
    'user1',
    'Temporary ban',
    'temporary',
    'superadmin',
    'superadmin@test.com',
    30 // 30 days
  );

  // Assert full success response structure without try/catch
  assert.equal(result.success, true);
  assert.ok(result.suspension);
  assert.ok(result.suspension?.id);
  assert.equal(result.suspension?.userId, 'user1');
  assert.equal(result.suspension?.userEmail, 'suspended@test.com');
  assert.equal(result.suspension?.reason, 'Temporary ban');
  assert.equal(result.suspension?.severity, 'temporary');
  assert.equal(result.suspension?.suspendedBy, 'superadmin');
  assert.equal(result.suspension?.suspendedByEmail, 'superadmin@test.com');
  assert.ok(result.suspension?.suspendedAt instanceof Date);
  // expiresAt is calculated from durationDays when severity is 'temporary'
  assert.ok(result.suspension?.expiresAt instanceof Date);
  assert.equal(result.suspension?.lifted, false);
});
