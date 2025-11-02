// filepath: c:\projects\gsdta\gsdta-web\api\src\lib\__tests__\firestoreUsers.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserProfile, ensureUserHasRole, getUserProfile, __setAdminDbForTests } from '../firestoreUsers';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  return {
    collection: (name: string) => ({
      doc: (uid: string) => ({
        async get() {
          const data = storage.get(`${name}/${uid}`);
          return {
            exists: !!data,
            data: () => data || {},
          };
        },
        async set(data: unknown, options?: { merge?: boolean }) {
          const key = `${name}/${uid}`;
          if (options?.merge && storage.has(key)) {
            const existing = storage.get(key)!;
            storage.set(key, { ...existing, ...data as StoredDoc });
          } else {
            storage.set(key, data as StoredDoc);
          }
        },
      }),
    }),
  };
}

test('createUserProfile: should create a parent profile with default roles', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  const profile = await createUserProfile('test-uid-123', 'test@example.com', 'Test User');
  assert.deepEqual(profile, {
    uid: 'test-uid-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['parent'],
    status: 'active',
  });
  __setAdminDbForTests(null);
});

test('createUserProfile: should create a profile with custom roles', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  const profile = await createUserProfile('test-uid-456', 'admin@example.com', 'Admin User', ['admin']);
  assert.deepEqual(profile, {
    uid: 'test-uid-456',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
    status: 'active',
  });
  __setAdminDbForTests(null);
});

test('createUserProfile: should create profile with parent role by default', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  const profile = await createUserProfile('test-uid-789', 'parent@example.com', 'Parent User');
  assert.deepEqual(profile.roles, ['parent']);
  assert.equal(profile.status, 'active');
  __setAdminDbForTests(null);
});

test('ensureUserHasRole: should create new profile if user does not exist', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const profile = await ensureUserHasRole('new-uid-123', 'teacher@example.com', 'Teacher Name', 'teacher');

  assert.equal(profile.uid, 'new-uid-123');
  assert.equal(profile.email, 'teacher@example.com');
  assert.equal(profile.name, 'Teacher Name');
  assert.deepEqual(profile.roles, ['teacher']);
  assert.equal(profile.status, 'active');

  __setAdminDbForTests(null);
});

test('ensureUserHasRole: should add role to existing user profile', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  // Create initial profile with parent role
  await createUserProfile('existing-uid', 'user@example.com', 'Existing User', ['parent']);

  // Add teacher role
  const updatedProfile = await ensureUserHasRole('existing-uid', 'user@example.com', 'Existing User', 'teacher');

  assert.equal(updatedProfile.uid, 'existing-uid');
  assert.ok(updatedProfile.roles.includes('parent'));
  assert.ok(updatedProfile.roles.includes('teacher'));
  assert.equal(updatedProfile.roles.length, 2);
  assert.equal(updatedProfile.status, 'active');

  __setAdminDbForTests(null);
});

test('ensureUserHasRole: should not duplicate roles', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  // Create initial profile with teacher role
  await createUserProfile('teacher-uid', 'teacher@example.com', 'Teacher', ['teacher']);

  // Try to add teacher role again
  const profile = await ensureUserHasRole('teacher-uid', 'teacher@example.com', 'Teacher', 'teacher');

  assert.equal(profile.roles.length, 1);
  assert.deepEqual(profile.roles, ['teacher']);

  __setAdminDbForTests(null);
});

test('ensureUserHasRole: should set status to active even if previously suspended', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  // Create suspended user
  storage.set('users/suspended-uid', {
    uid: 'suspended-uid',
    email: 'user@example.com',
    name: 'User',
    roles: ['parent'],
    status: 'suspended',
  });

  // Ensure role (should reactivate)
  const profile = await ensureUserHasRole('suspended-uid', 'user@example.com', 'User', 'parent');

  assert.equal(profile.status, 'active');

  __setAdminDbForTests(null);
});

test('getUserProfile: should return null for non-existent user', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const profile = await getUserProfile('non-existent-uid');
  assert.equal(profile, null);

  __setAdminDbForTests(null);
});

test('getUserProfile: should return profile for existing user', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  // Create user
  await createUserProfile('test-uid', 'test@example.com', 'Test User', ['parent']);

  // Get profile
  const profile = await getUserProfile('test-uid');
  assert.ok(profile);
  assert.equal(profile.uid, 'test-uid');
  assert.equal(profile.email, 'test@example.com');
  assert.deepEqual(profile.roles, ['parent']);

  __setAdminDbForTests(null);
});
