// filepath: c:\projects\gsdta\gsdta-web\api\src\lib\__tests__\firestoreUsers.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserProfile, __setAdminDbForTests } from '../firestoreUsers';

function makeFakeDb() {
  return {
    collection: (_name: string) => ({
      doc: (_uid: string) => ({
        async get() {
          return { exists: false, data: () => null } as const;
        },
        async set(_data: unknown) {
          // no-op for test
        },
      }),
    }),
  };
}

test('createUserProfile: should create a parent profile with default roles', async () => {
  const fakeProvider = (() => makeFakeDb()) as unknown as Parameters<typeof __setAdminDbForTests>[0];
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
  const fakeProvider = (() => makeFakeDb()) as unknown as Parameters<typeof __setAdminDbForTests>[0];
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
  const fakeProvider = (() => makeFakeDb()) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  const profile = await createUserProfile('test-uid-789', 'parent@example.com', 'Parent User');
  assert.deepEqual(profile.roles, ['parent']);
  assert.equal(profile.status, 'active');
  __setAdminDbForTests(null);
});
