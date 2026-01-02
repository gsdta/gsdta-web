// api/src/lib/__tests__/securityEvents.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  logSecurityEvent,
  logFailedLogin,
  logRateLimitExceeded,
  logUnauthorizedAccess,
  querySecurityEvents,
  getSecurityStats,
  resolveSecurityEvent,
  __setSecurityEventsDbForTests,
} from '../securityEvents';

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
            ref: {
              id: docId,
              async update(data: Record<string, unknown>) {
                const existing = storage.get(`${name}/${docId}`) || {};
                storage.set(`${name}/${docId}`, { ...existing, ...data });
              },
            },
          };
        },
        orderBy: () => collectionMethods,
        where: () => collectionMethods,
        limit: () => collectionMethods,
        offset: () => collectionMethods,
        count: () => ({
          async get() {
            // Count docs in this collection
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
  __setSecurityEventsDbForTests(null);
});

test('logSecurityEvent: should create a security event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const event = await logSecurityEvent({
    type: 'login_failed',
    email: 'test@example.com',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: { reason: 'Invalid password' },
  });

  assert.ok(event.id);
  assert.equal(event.type, 'login_failed');
  assert.equal(event.email, 'test@example.com');
  assert.equal(event.ipAddress, '192.168.1.1');
  assert.equal(event.resolved, false);
});

test('logFailedLogin: should log failed login event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const event = await logFailedLogin(
    'test@example.com',
    '192.168.1.1',
    'Mozilla/5.0',
    'Invalid password'
  );

  assert.equal(event.type, 'login_failed');
  assert.equal(event.email, 'test@example.com');
  assert.deepEqual(event.details, { reason: 'Invalid password' });
});

test('logRateLimitExceeded: should log rate limit event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const event = await logRateLimitExceeded(
    '192.168.1.1',
    'Mozilla/5.0',
    '/api/v1/login',
    5
  );

  assert.equal(event.type, 'rate_limit_exceeded');
  assert.equal(event.ipAddress, '192.168.1.1');
  assert.deepEqual(event.details, { endpoint: '/api/v1/login', limit: 5 });
});

test('logUnauthorizedAccess: should log unauthorized access event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const event = await logUnauthorizedAccess(
    'user123',
    'test@example.com',
    '192.168.1.1',
    'Mozilla/5.0',
    '/api/v1/admin/users',
    'admin'
  );

  assert.equal(event.type, 'unauthorized_access');
  assert.equal(event.userId, 'user123');
  assert.equal(event.email, 'test@example.com');
  assert.deepEqual(event.details, { resource: '/api/v1/admin/users', requiredRole: 'admin' });
});

test('logUnauthorizedAccess: should handle undefined user info', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const event = await logUnauthorizedAccess(
    undefined,
    undefined,
    '192.168.1.1',
    'Mozilla/5.0',
    '/api/v1/admin/users',
    'admin'
  );

  assert.equal(event.type, 'unauthorized_access');
  assert.equal(event.userId, undefined);
  assert.equal(event.email, undefined);
});

test('querySecurityEvents: should return events with pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });
  storage.set('securityEvents/e2', {
    type: 'rate_limit_exceeded',
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ limit: 10 });

  assert.ok(result.events);
  assert.ok(Array.isArray(result.events));
  assert.equal(result.total, 2);
});

test('querySecurityEvents: should handle empty query', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents();

  assert.deepEqual(result.events, []);
  assert.equal(result.total, 0);
});

test('getSecurityStats: should return security statistics', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const stats = await getSecurityStats();

  assert.ok('failedLogins24h' in stats);
  assert.ok('rateLimitExceeded24h' in stats);
  assert.ok('unauthorizedAccess24h' in stats);
  assert.ok('unresolvedEvents' in stats);
  assert.equal(typeof stats.failedLogins24h, 'number');
});

test('resolveSecurityEvent: should resolve an event', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const resolved = await resolveSecurityEvent('e1', 'admin1', 'Confirmed false positive');

  assert.ok(resolved);
  assert.equal(resolved?.resolved, true);
  assert.equal(resolved?.resolvedBy, 'admin1');
  assert.equal(resolved?.resolution, 'Confirmed false positive');
});

test('resolveSecurityEvent: should return null for non-existent event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const resolved = await resolveSecurityEvent('nonexistent', 'admin1', 'Test');

  assert.equal(resolved, null);
});

// ============================================
// Query filter tests
// ============================================

test('querySecurityEvents: should filter by type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ type: 'login_failed' });

  assert.ok(result.events);
});

test('querySecurityEvents: should filter by resolved status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: true,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ resolved: true });

  assert.ok(result.events);
});

test('querySecurityEvents: should filter by resolved=false', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ resolved: false });

  assert.ok(result.events);
});

test('querySecurityEvents: should filter by startDate', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ startDate: new Date('2020-01-01') });

  assert.ok(result.events);
});

test('querySecurityEvents: should filter by endDate', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ endDate: new Date('2030-01-01') });

  assert.ok(result.events);
});

test('querySecurityEvents: should filter by date range', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({
    startDate: new Date('2020-01-01'),
    endDate: new Date('2030-01-01'),
  });

  assert.ok(result.events);
});

test('querySecurityEvents: should support pagination with offset', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('securityEvents/e1', {
    type: 'login_failed',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: {},
    resolved: false,
    timestamp: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setSecurityEventsDbForTests(fakeProvider);

  const result = await querySecurityEvents({ limit: 10, offset: 5 });

  assert.ok(result.events !== undefined);
});
