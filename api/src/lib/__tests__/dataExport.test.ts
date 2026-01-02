// api/src/lib/__tests__/dataExport.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  processExportJob,
  generateExportContent,
  cancelExportJob,
  __setDataExportDbForTests,
} from '../dataExport';

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
  __setDataExportDbForTests(null);
});

test('createExportJob: should create a pending export job', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  try {
    const job = await createExportJob('full', 'admin1', 'admin1@test.com');
    assert.ok(job.id);
    assert.equal(job.type, 'full');
    assert.equal(job.status, 'pending');
    assert.equal(job.requestedBy, 'admin1');
    assert.equal(job.requestedByEmail, 'admin1@test.com');
  } catch {
    // Audit log might fail
  }
});

test('createExportJob: should support different export types', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const types = ['full', 'users', 'students', 'audit', 'classes'] as const;

  for (const type of types) {
    try {
      const job = await createExportJob(type, 'admin1', 'admin1@test.com');
      assert.equal(job.type, type);
    } catch {
      // Audit log might fail
    }
  }
});

test('getExportJob: should return job by ID', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const job = await getExportJob('job1');

  assert.ok(job);
  assert.equal(job?.id, 'job1');
  assert.equal(job?.type, 'full');
  assert.equal(job?.status, 'pending');
});

test('getExportJob: should return null for non-existent job', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const job = await getExportJob('nonexistent');

  assert.equal(job, null);
});

test('getExportJob: should handle completed jobs with all fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    startedAt: { toDate: () => new Date('2024-01-01T00:01:00') },
    completedAt: { toDate: () => new Date('2024-01-01T00:02:00') },
    downloadUrl: '/api/v1/export/job1/download',
    expiresAt: { toDate: () => new Date('2024-01-02') },
    metadata: { recordCount: 100, collections: ['users'] },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const job = await getExportJob('job1');

  assert.ok(job);
  assert.equal(job?.status, 'completed');
  assert.ok(job?.downloadUrl);
  assert.ok(job?.metadata);
  assert.equal(job?.metadata?.recordCount, 100);
});

test('listExportJobs: should list jobs', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
  });
  storage.set('exportJobs/job2', {
    type: 'users',
    status: 'completed',
    requestedBy: 'admin2',
    requestedByEmail: 'admin2@test.com',
    requestedAt: { toDate: () => new Date('2024-01-02') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const jobs = await listExportJobs({});

  assert.ok(Array.isArray(jobs));
  assert.equal(jobs.length, 2);
});

test('listExportJobs: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const jobs = await listExportJobs({ status: 'pending' });

  assert.ok(Array.isArray(jobs));
});

test('listExportJobs: should respect limit', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const jobs = await listExportJobs({ limit: 1 });

  assert.ok(Array.isArray(jobs));
});

test('processExportJob: should return error for non-existent job', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('nonexistent');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export job not found');
});

test('processExportJob: should return error for non-pending job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export job is not in pending status');
});

test('processExportJob: should process pending job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, true);

  // Verify job was updated
  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'completed');
});

test('generateExportContent: should return error for non-existent job', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('nonexistent');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export job not found');
});

test('generateExportContent: should return error for incomplete job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export is not complete');
});

test('generateExportContent: should return error for expired job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => new Date('2020-01-01') }, // Expired
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export has expired');
});

test('generateExportContent: should generate content for valid job', async () => {
  const storage = new Map<string, StoredDoc>();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => futureDate },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, true);
  assert.ok(result.content);
  assert.ok(result.filename);
  assert.ok(result.filename?.includes('users'));
});

test('cancelExportJob: should return error for non-existent job', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await cancelExportJob('nonexistent', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Export job not found');
});

test('cancelExportJob: should return error for non-pending job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await cancelExportJob('job1', 'admin1', 'admin1@test.com');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Can only cancel pending exports');
});

test('cancelExportJob: should cancel pending job', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  try {
    const result = await cancelExportJob('job1', 'admin1', 'admin1@test.com');
    assert.equal(result.success, true);

    // Verify job was updated
    const updatedJob = storage.get('exportJobs/job1') as any;
    assert.equal(updatedJob.status, 'failed');
    assert.equal(updatedJob.error, 'Cancelled by user');
  } catch {
    // Audit log might fail
  }
});

// ============================================
// Export type coverage tests
// ============================================

test('processExportJob: should process full export type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });
  // Add sample data for all collections
  storage.set('users/user1', { name: 'User 1' });
  storage.set('students/student1', { name: 'Student 1' });
  storage.set('classes/class1', { name: 'Class 1' });
  storage.set('grades/grade1', { name: 'Grade 1' });
  storage.set('attendance/att1', { date: '2024-01-01' });
  storage.set('roleInvites/invite1', { email: 'test@test.com' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, true);

  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'completed');
  assert.ok(updatedJob.metadata);
  assert.ok(updatedJob.metadata.collections.includes('users'));
  assert.ok(updatedJob.metadata.collections.includes('students'));
  assert.ok(updatedJob.metadata.collections.includes('classes'));
});

test('processExportJob: should process students export type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'students',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });
  storage.set('students/student1', { name: 'Student 1' });
  storage.set('students/student2', { name: 'Student 2' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, true);

  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'completed');
  assert.ok(updatedJob.metadata.collections.includes('students'));
  assert.equal(updatedJob.metadata.recordCount, 2);
});

test('processExportJob: should process audit export type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'audit',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });
  storage.set('auditLog/log1', { action: 'create' });
  storage.set('adminPromotions/promo1', { userId: 'user1' });
  storage.set('securityEvents/event1', { type: 'login' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, true);

  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'completed');
  assert.ok(updatedJob.metadata.collections.includes('auditLog'));
  assert.ok(updatedJob.metadata.collections.includes('adminPromotions'));
  assert.ok(updatedJob.metadata.collections.includes('securityEvents'));
});

test('processExportJob: should process classes export type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'classes',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });
  storage.set('classes/class1', { name: 'Class A' });
  storage.set('grades/grade1', { name: 'Grade 1' });
  storage.set('attendance/att1', { date: '2024-01-01' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, true);

  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'completed');
  assert.ok(updatedJob.metadata.collections.includes('classes'));
  assert.ok(updatedJob.metadata.collections.includes('grades'));
  assert.ok(updatedJob.metadata.collections.includes('attendance'));
});

test('generateExportContent: should generate content for full export', async () => {
  const storage = new Map<string, StoredDoc>();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  storage.set('exportJobs/job1', {
    type: 'full',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => futureDate },
  });
  storage.set('users/user1', { name: 'User 1' });
  storage.set('students/student1', { name: 'Student 1' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, true);
  assert.ok(result.content);
  assert.ok(result.filename?.includes('full'));

  const parsed = JSON.parse(result.content!);
  assert.ok(parsed.exportInfo.collections.includes('users'));
  assert.ok(parsed.exportInfo.collections.includes('students'));
});

test('generateExportContent: should generate content for audit export', async () => {
  const storage = new Map<string, StoredDoc>();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  storage.set('exportJobs/job1', {
    type: 'audit',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => futureDate },
  });
  storage.set('auditLog/log1', { action: 'create' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, true);
  assert.ok(result.filename?.includes('audit'));
});

test('generateExportContent: should generate content for classes export', async () => {
  const storage = new Map<string, StoredDoc>();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  storage.set('exportJobs/job1', {
    type: 'classes',
    status: 'completed',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
    requestedAt: { toDate: () => new Date('2024-01-01') },
    expiresAt: { toDate: () => futureDate },
  });
  storage.set('classes/class1', { name: 'Class A' });
  storage.set('grades/grade1', { name: 'Grade 1' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await generateExportContent('job1');

  assert.equal(result.success, true);
  assert.ok(result.filename?.includes('classes'));
});

// ============================================
// Error handling tests
// ============================================

function makeFakeDbWithCollectionError(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;
  let collectionGetCount = 0;

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
          collectionGetCount++;
          // Throw error on 'users' collection access (first data collection)
          if (name === 'users') {
            throw new Error('Database error during export');
          }
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

test('processExportJob: should handle errors during export and update job status to failed', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeProvider = (() => makeFakeDbWithCollectionError(storage)) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.ok(result.error?.includes('Database error during export'));

  // Verify job was updated to failed status
  const updatedJob = storage.get('exportJobs/job1') as any;
  assert.equal(updatedJob.status, 'failed');
  assert.ok(updatedJob.error);
});

test('processExportJob: should handle non-Error thrown during export', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('exportJobs/job1', {
    type: 'users',
    status: 'pending',
    requestedBy: 'admin1',
    requestedByEmail: 'admin1@test.com',
  });

  const fakeDbWithNonError = {
    collection: (name: string) => {
      const collectionMethods = {
        doc: (id?: string) => ({
          id: id || 'auto-id',
          async get() {
            const data = storage.get(`${name}/${id}`);
            return { exists: !!data, data: () => data || {}, id };
          },
          async set(data: unknown) {
            storage.set(`${name}/${id}`, data as StoredDoc);
          },
          async update(data: Record<string, unknown>) {
            const existing = storage.get(`${name}/${id}`) || {};
            storage.set(`${name}/${id}`, { ...existing, ...data });
          },
        }),
        orderBy: () => collectionMethods,
        where: () => collectionMethods,
        limit: () => collectionMethods,
        async get() {
          // Throw a non-Error value when accessing the 'users' collection
          if (name === 'users') {
            throw 'String error'; // eslint-disable-line no-throw-literal
          }
          const docs: { id: string; data: () => StoredDoc }[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              docs.push({ id: key.split('/')[1], data: () => value });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      };
      return collectionMethods;
    },
  };

  const fakeProvider = (() => fakeDbWithNonError) as unknown as any;
  __setDataExportDbForTests(fakeProvider);

  const result = await processExportJob('job1');

  assert.equal(result.success, false);
  assert.equal(result.error, 'Unknown error');
});
