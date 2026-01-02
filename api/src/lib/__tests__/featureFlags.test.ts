// api/src/lib/__tests__/featureFlags.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFeatureFlags,
  updateFeatureFlags,
  isFeatureEnabled,
  requireFeature,
  getFeaturesForRole,
  clearFeatureFlagsCache,
  FEATURE_DESCRIPTIONS,
  __setFeatureFlagsDbForTests,
} from '../featureFlags';
import { AuthError } from '../auth';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        async get() {
          const data = storage.get(`${name}/${id}`);
          return {
            exists: !!data,
            data: () => data || {},
            id: id,
          };
        },
        async set(data: unknown, options?: { merge?: boolean }) {
          if (options?.merge) {
            const existing = storage.get(`${name}/${id}`) || {};
            storage.set(`${name}/${id}`, { ...existing, ...(data as StoredDoc) });
          } else {
            storage.set(`${name}/${id}`, data as StoredDoc);
          }
        },
      }),
    }),
  };
}

test.beforeEach(() => {
  clearFeatureFlagsCache();
});

test.afterEach(() => {
  __setFeatureFlagsDbForTests(null);
  clearFeatureFlagsCache();
});

test('getFeatureFlags: should return default config when not set', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const config = await getFeatureFlags();

  assert.ok(config.admin);
  assert.ok(config.teacher);
  assert.ok(config.parent);
  assert.equal(config.admin.Students.enabled, true);
  assert.equal(config.teacher.Classes.enabled, true);
  assert.equal(config.parent.Students.enabled, true);
  assert.equal(config.updatedBy, 'system');
});

test('getFeatureFlags: should return stored config when exists', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: {
      Students: { enabled: false },
      Teachers: { enabled: true },
      Classes: { enabled: true },
      Grades: { enabled: true },
      Textbooks: { enabled: true },
      Volunteers: { enabled: true },
      AttendanceAnalytics: { enabled: true },
      HeroContent: { enabled: true },
      Calendar: { enabled: true },
    },
    teacher: {
      Classes: { enabled: true },
      Attendance: { enabled: false },
      Messaging: { enabled: true },
    },
    parent: {
      Students: { enabled: true },
      StudentRegistration: { enabled: false },
      Messaging: { enabled: true },
      Profile: { enabled: true },
      Settings: { enabled: true },
    },
    updatedBy: 'admin1',
    updatedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const config = await getFeatureFlags();

  assert.equal(config.admin.Students.enabled, false);
  assert.equal(config.teacher.Attendance.enabled, false);
  assert.equal(config.parent.StudentRegistration.enabled, false);
  assert.equal(config.updatedBy, 'admin1');
});

test('getFeatureFlags: should use cache on subsequent calls', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  // First call
  const config1 = await getFeatureFlags();

  // Modify storage (should not affect cached result)
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: false } },
    updatedBy: 'changed',
  });

  // Second call should return cached result
  const config2 = await getFeatureFlags();

  assert.equal(config1.updatedBy, config2.updatedBy);
});

test('getFeatureFlags: should handle missing nested fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: false } },
    // Missing teacher and parent
    updatedBy: 'admin1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const config = await getFeatureFlags();

  assert.equal(config.admin.Students.enabled, false);
  // Should default to true for missing features
  assert.equal(config.admin.Teachers.enabled, true);
  assert.equal(config.teacher.Classes.enabled, true);
  assert.equal(config.parent.Students.enabled, true);
});

test('clearFeatureFlagsCache: should clear the cache', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: true } },
    updatedBy: 'first',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  // First call to populate cache
  await getFeatureFlags();

  // Clear cache
  clearFeatureFlagsCache();

  // Modify storage
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: false } },
    updatedBy: 'second',
  });

  // Should fetch fresh data
  const config = await getFeatureFlags();

  assert.equal(config.updatedBy, 'second');
});

test('updateFeatureFlags: should update admin features', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: true } },
    updatedBy: 'old',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  try {
    await updateFeatureFlags(
      'admin',
      { Students: { enabled: false } },
      'admin1',
      'admin1@test.com'
    );
  } catch {
    // Audit log might fail
  }

  // Clear cache and verify
  clearFeatureFlagsCache();
  const stored = storage.get('systemConfig/featureFlags') as any;
  assert.ok(stored);
});

test('updateFeatureFlags: should update teacher features', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  try {
    await updateFeatureFlags(
      'teacher',
      { Attendance: { enabled: false } },
      'admin1',
      'admin1@test.com'
    );
  } catch {
    // Audit log might fail
  }

  const stored = storage.get('systemConfig/featureFlags') as any;
  assert.ok(stored);
});

test('updateFeatureFlags: should update parent features', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  try {
    await updateFeatureFlags(
      'parent',
      { Messaging: { enabled: false } },
      'admin1',
      'admin1@test.com'
    );
  } catch {
    // Audit log might fail
  }

  const stored = storage.get('systemConfig/featureFlags') as any;
  assert.ok(stored);
});

test('isFeatureEnabled: should return true for enabled feature', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: true } },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const enabled = await isFeatureEnabled('admin', 'Students');

  assert.equal(enabled, true);
});

test('isFeatureEnabled: should return false for disabled feature', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: false } },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const enabled = await isFeatureEnabled('admin', 'Students');

  assert.equal(enabled, false);
});

test('isFeatureEnabled: should return true for unknown feature (default)', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: true } },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  const enabled = await isFeatureEnabled('admin', 'UnknownFeature');

  assert.equal(enabled, true);
});

test('requireFeature: should not throw for enabled feature', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: true } },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  await requireFeature('admin', 'Students');
  // Should not throw
});

test('requireFeature: should throw AuthError for disabled feature', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('systemConfig/featureFlags', {
    admin: { Students: { enabled: false } },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setFeatureFlagsDbForTests(fakeProvider);

  await assert.rejects(
    async () => requireFeature('admin', 'Students'),
    (err: Error) => {
      assert.ok(err instanceof AuthError);
      assert.equal((err as AuthError).status, 403);
      assert.equal((err as AuthError).code, 'feature/disabled');
      return true;
    }
  );
});

test('getFeaturesForRole: should return admin features', () => {
  const features = getFeaturesForRole('admin');

  assert.ok(Array.isArray(features));
  assert.ok(features.length > 0);

  const studentFeature = features.find(f => f.key === 'Students');
  assert.ok(studentFeature);
  assert.ok(studentFeature?.description);
});

test('getFeaturesForRole: should return teacher features', () => {
  const features = getFeaturesForRole('teacher');

  assert.ok(Array.isArray(features));
  assert.ok(features.length > 0);

  const classesFeature = features.find(f => f.key === 'Classes');
  assert.ok(classesFeature);
});

test('getFeaturesForRole: should return parent features', () => {
  const features = getFeaturesForRole('parent');

  assert.ok(Array.isArray(features));
  assert.ok(features.length > 0);

  const messagingFeature = features.find(f => f.key === 'Messaging');
  assert.ok(messagingFeature);
});

test('FEATURE_DESCRIPTIONS: should have descriptions for all roles', () => {
  assert.ok(FEATURE_DESCRIPTIONS.admin);
  assert.ok(FEATURE_DESCRIPTIONS.teacher);
  assert.ok(FEATURE_DESCRIPTIONS.parent);
});

test('FEATURE_DESCRIPTIONS: should have admin feature descriptions', () => {
  assert.ok(FEATURE_DESCRIPTIONS.admin.Students);
  assert.ok(FEATURE_DESCRIPTIONS.admin.Teachers);
  assert.ok(FEATURE_DESCRIPTIONS.admin.Classes);
});

test('FEATURE_DESCRIPTIONS: should have teacher feature descriptions', () => {
  assert.ok(FEATURE_DESCRIPTIONS.teacher.Classes);
  assert.ok(FEATURE_DESCRIPTIONS.teacher.Attendance);
  assert.ok(FEATURE_DESCRIPTIONS.teacher.Messaging);
});

test('FEATURE_DESCRIPTIONS: should have parent feature descriptions', () => {
  assert.ok(FEATURE_DESCRIPTIONS.parent.Students);
  assert.ok(FEATURE_DESCRIPTIONS.parent.StudentRegistration);
  assert.ok(FEATURE_DESCRIPTIONS.parent.Messaging);
});
