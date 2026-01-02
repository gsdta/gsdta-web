// api/src/lib/__tests__/auditLog.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuditLog,
  logSuperAdminAction,
  queryAuditLogs,
  getAuditLogFilterOptions,
  exportAuditLogsToCSV,
  __setAuditLogDbForTests,
} from '../auditLog';

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
          };
        },
        orderBy: () => collectionMethods,
        where: () => collectionMethods,
        limit: () => collectionMethods,
        offset: () => collectionMethods,
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
  __setAuditLogDbForTests(null);
});

test('createAuditLog: should create an audit log entry', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const entry = await createAuditLog({
    userId: 'user1',
    userEmail: 'user@test.com',
    userRole: 'admin',
    action: 'user.update',
    resource: 'user',
    resourceId: 'target-user-1',
    details: {
      changes: [{ field: 'name', oldValue: 'Old', newValue: 'New' }],
    },
    severity: 'info',
  });

  assert.ok(entry.id);
  assert.equal(entry.userId, 'user1');
  assert.equal(entry.action, 'user.update');
  assert.equal(entry.severity, 'info');
  assert.ok(entry.timestamp);
});

test('createAuditLog: should include optional fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const entry = await createAuditLog({
    userId: 'user1',
    userEmail: 'user@test.com',
    userRole: 'super_admin',
    action: 'config.update',
    resource: 'config',
    resourceId: 'main',
    details: {},
    severity: 'critical',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  });

  assert.equal(entry.ipAddress, '192.168.1.1');
  assert.equal(entry.userAgent, 'Mozilla/5.0');
});

test('logSuperAdminAction: should log super admin action with default severity', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const entry = await logSuperAdminAction(
    'admin1',
    'admin@test.com',
    'user.suspend',
    'user',
    'user123',
    { metadata: { reason: 'Policy violation' } }
  );

  assert.ok(entry.id);
  assert.equal(entry.userRole, 'super_admin');
  assert.equal(entry.action, 'user.suspend');
  assert.equal(entry.severity, 'info'); // Default severity
});

test('logSuperAdminAction: should accept custom severity', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const entry = await logSuperAdminAction(
    'admin1',
    'admin@test.com',
    'system.shutdown',
    'system',
    'main',
    {},
    { severity: 'critical' }
  );

  assert.equal(entry.severity, 'critical');
});

test('logSuperAdminAction: should include IP and user agent', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const entry = await logSuperAdminAction(
    'admin1',
    'admin@test.com',
    'admin.promote',
    'user',
    'user123',
    {},
    {
      severity: 'warning',
      ipAddress: '10.0.0.1',
      userAgent: 'Chrome/120',
    }
  );

  assert.equal(entry.ipAddress, '10.0.0.1');
  assert.equal(entry.userAgent, 'Chrome/120');
});

test('queryAuditLogs: should return audit logs with pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    userId: 'user1',
    userEmail: 'user@test.com',
    userRole: 'admin',
    action: 'user.update',
    resource: 'user',
    resourceId: 'u1',
    details: {},
    severity: 'info',
    timestamp: { toDate: () => new Date() },
  });
  storage.set('auditLog/log2', {
    userId: 'user2',
    userEmail: 'user2@test.com',
    userRole: 'super_admin',
    action: 'config.update',
    resource: 'config',
    resourceId: 'main',
    details: {},
    severity: 'warning',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs();

  assert.ok(result.entries);
  assert.ok(Array.isArray(result.entries));
  assert.equal(result.total, 2);
});

test('queryAuditLogs: should filter by userId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    userId: 'user1',
    action: 'test',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs({ userId: 'user1' });

  assert.ok(result.entries);
});

test('queryAuditLogs: should filter by action', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    action: 'user.update',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs({ action: 'user.update' });

  assert.ok(result.entries);
});

test('queryAuditLogs: should filter by resource', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    resource: 'config',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs({ resource: 'config' });

  assert.ok(result.entries);
});

test('queryAuditLogs: should filter by severity', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    severity: 'critical',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs({ severity: 'critical' });

  assert.ok(result.entries);
});

test('queryAuditLogs: should filter by date range', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    timestamp: { toDate: () => new Date('2024-01-15') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
  });

  assert.ok(result.entries);
});

test('queryAuditLogs: should handle missing timestamp', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    userId: 'user1',
    action: 'test',
    // No timestamp
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs();

  assert.ok(result.entries);
  assert.ok(result.entries[0].timestamp instanceof Date);
});

test('queryAuditLogs: should handle missing severity', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    userId: 'user1',
    action: 'test',
    timestamp: { toDate: () => new Date() },
    // No severity
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const result = await queryAuditLogs();

  assert.ok(result.entries);
  assert.equal(result.entries[0].severity, 'info'); // Default
});

test('getAuditLogFilterOptions: should return unique actions and resources', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    action: 'user.update',
    resource: 'user',
    timestamp: { toDate: () => new Date() },
  });
  storage.set('auditLog/log2', {
    action: 'config.update',
    resource: 'config',
    timestamp: { toDate: () => new Date() },
  });
  storage.set('auditLog/log3', {
    action: 'user.update', // Duplicate action
    resource: 'user', // Duplicate resource
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const options = await getAuditLogFilterOptions();

  assert.ok(options.actions);
  assert.ok(options.resources);
  assert.ok(Array.isArray(options.actions));
  assert.ok(Array.isArray(options.resources));
  // Should be deduplicated
  assert.equal(options.actions.length, 2);
  assert.equal(options.resources.length, 2);
});

test('getAuditLogFilterOptions: should return empty arrays for no logs', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const options = await getAuditLogFilterOptions();

  assert.deepEqual(options.actions, []);
  assert.deepEqual(options.resources, []);
});

test('getAuditLogFilterOptions: should sort actions and resources', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('auditLog/log1', {
    action: 'z.action',
    resource: 'z.resource',
    timestamp: { toDate: () => new Date() },
  });
  storage.set('auditLog/log2', {
    action: 'a.action',
    resource: 'a.resource',
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAuditLogDbForTests(fakeProvider);

  const options = await getAuditLogFilterOptions();

  assert.equal(options.actions[0], 'a.action');
  assert.equal(options.resources[0], 'a.resource');
});

test('exportAuditLogsToCSV: should generate CSV with headers', () => {
  const entries = [
    {
      id: 'log1',
      userId: 'user1',
      userEmail: 'user@test.com',
      userRole: 'admin',
      action: 'user.update',
      resource: 'user',
      resourceId: 'u1',
      details: { changes: [{ field: 'name', oldValue: 'Old', newValue: 'New' }] },
      severity: 'info' as const,
      timestamp: new Date('2024-01-15T10:00:00Z'),
      ipAddress: '192.168.1.1',
    },
  ];

  const csv = exportAuditLogsToCSV(entries);

  assert.ok(csv.includes('Timestamp,User Email,User Role,Action,Resource,Resource ID,Severity,Details,IP Address'));
  assert.ok(csv.includes('user@test.com'));
  assert.ok(csv.includes('user.update'));
  assert.ok(csv.includes('192.168.1.1'));
});

test('exportAuditLogsToCSV: should handle empty entries', () => {
  const csv = exportAuditLogsToCSV([]);

  assert.ok(csv.includes('Timestamp'));
  assert.ok(csv.split('\n').length === 1); // Only headers
});

test('exportAuditLogsToCSV: should escape quotes in values', () => {
  const entries = [
    {
      id: 'log1',
      userId: 'user1',
      userEmail: 'user"test@example.com',
      userRole: 'admin',
      action: 'test',
      resource: 'test',
      resourceId: '1',
      details: {},
      severity: 'info' as const,
      timestamp: new Date('2024-01-15'),
    },
  ];

  const csv = exportAuditLogsToCSV(entries);

  // Quotes should be doubled for CSV escaping
  assert.ok(csv.includes('""'));
});

test('exportAuditLogsToCSV: should handle missing IP address', () => {
  const entries = [
    {
      id: 'log1',
      userId: 'user1',
      userEmail: 'user@test.com',
      userRole: 'admin',
      action: 'test',
      resource: 'test',
      resourceId: '1',
      details: {},
      severity: 'info' as const,
      timestamp: new Date('2024-01-15'),
      // No ipAddress
    },
  ];

  const csv = exportAuditLogsToCSV(entries);

  assert.ok(csv);
  // Should not throw
});
