import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import {
  createRoleInvite,
  getInviteByToken,
  markInviteAccepted,
  isInviteUsable,
  generateToken,
  __setAdminDbForTests,
  type RoleInvite,
} from '../roleInvites';

type MockDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

type MockCollection = {
  doc: (id?: string) => MockDocRef;
  where: (field: string, op: string, value: unknown) => MockQuery;
};

type MockDocRef = {
  id: string;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
};

type MockQuery = {
  limit: (_n: number) => MockQuery;
  get: () => Promise<{ empty: boolean; docs: MockDoc[] }>;
};

function makeFakeDb(storedInvites: Map<string, Record<string, unknown>> = new Map()) {
  return {
    collection: (name: string) => {
      if (name !== 'roleInvites') throw new Error('Unexpected collection');

      const mockCollection: MockCollection = {
        doc: (id?: string) => {
          const docId = id || `mock-invite-${Date.now()}`;
          const mockDocRef: MockDocRef = {
            id: docId,
            set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
              if (options?.merge) {
                const existing = storedInvites.get(docId) || {};
                storedInvites.set(docId, { ...existing, ...data });
              } else {
                storedInvites.set(docId, data);
              }
            },
            get: async () => {
              const data = storedInvites.get(docId);
              return {
                exists: !!data,
                data: () => data || {},
              };
            },
          };
          return mockDocRef;
        },
        where: (field: string, op: string, value: unknown) => {
          const mockQuery: MockQuery = {
            limit: (_n: number) => mockQuery,
            get: async () => {
              const matches: MockDoc[] = [];
              for (const [id, data] of storedInvites.entries()) {
                if (field === 'token' && op === '==' && data.token === value) {
                  matches.push({ id, data: () => data });
                }
              }
              return {
                empty: matches.length === 0,
                docs: matches,
              };
            },
          };
          return mockQuery;
        },
      };
      return mockCollection;
    },
  };
}

test('generateToken: should generate a URL-safe base64 token', () => {
  const token = generateToken(32);
  assert.ok(token.length > 0);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(!token.includes('+'));
  assert.ok(!token.includes('/'));
  assert.ok(!token.includes('='));
});

test('generateToken: should generate unique tokens', () => {
  const token1 = generateToken(32);
  const token2 = generateToken(32);
  assert.notEqual(token1, token2);
});

test('createRoleInvite: should create a pending invite with token', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const invite = await createRoleInvite({
    email: 'teacher@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid-123',
    expiresInHours: 72,
  });

  assert.equal(invite.email, 'teacher@example.com');
  assert.equal(invite.role, 'teacher');
  assert.equal(invite.invitedBy, 'admin-uid-123');
  assert.equal(invite.status, 'pending');
  assert.ok(invite.token.length > 0);
  assert.ok(invite.id.startsWith('mock-invite-'));
  assert.ok(invite.expiresAt);
  assert.ok(invite.createdAt);

  __setAdminDbForTests(null);
});

test('createRoleInvite: should normalize email to lowercase', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const invite = await createRoleInvite({
    email: 'Teacher@Example.COM',
    role: 'teacher',
    invitedBy: 'admin-uid-123',
  });

  assert.equal(invite.email, 'teacher@example.com');

  __setAdminDbForTests(null);
});

test('createRoleInvite: should default to 72 hours expiration', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const beforeCreate = Date.now();
  const invite = await createRoleInvite({
    email: 'teacher@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid-123',
  });

  const expectedExpiry = beforeCreate + 72 * 60 * 60 * 1000;
  const actualExpiry = invite.expiresAt.toMillis();
  // Allow 1 second tolerance
  assert.ok(Math.abs(actualExpiry - expectedExpiry) < 1000);

  __setAdminDbForTests(null);
});

test('getInviteByToken: should find invite by token', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createRoleInvite({
    email: 'teacher@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid-123',
  });

  const found = await getInviteByToken(created.token);
  assert.ok(found);
  assert.equal(found.id, created.id);
  assert.equal(found.email, created.email);
  assert.equal(found.token, created.token);

  __setAdminDbForTests(null);
});

test('getInviteByToken: should return null if token not found', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const found = await getInviteByToken('nonexistent-token');
  assert.equal(found, null);

  __setAdminDbForTests(null);
});

test('markInviteAccepted: should update invite status to accepted', async () => {
  const storedInvites = new Map();
  const fakeProvider = (() => makeFakeDb(storedInvites)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const invite = await createRoleInvite({
    email: 'teacher@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid-123',
  });

  await markInviteAccepted(invite.id, 'teacher-uid-456');

  const stored = storedInvites.get(invite.id);
  assert.ok(stored);
  assert.equal(stored.status, 'accepted');
  assert.equal(stored.acceptedBy, 'teacher-uid-456');
  assert.ok(stored.acceptedAt instanceof Timestamp);

  __setAdminDbForTests(null);
});

test('isInviteUsable: should return true for pending, non-expired invite', () => {
  const now = Timestamp.now();
  const future = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

  const invite: RoleInvite = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid',
    status: 'pending',
    token: 'test-token',
    expiresAt: future,
    createdAt: now,
  };

  assert.equal(isInviteUsable(invite), true);
});

test('isInviteUsable: should return false for null invite', () => {
  assert.equal(isInviteUsable(null), false);
});

test('isInviteUsable: should return false for accepted invite', () => {
  const now = Timestamp.now();
  const future = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

  const invite: RoleInvite = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid',
    status: 'accepted',
    token: 'test-token',
    expiresAt: future,
    createdAt: now,
  };

  assert.equal(isInviteUsable(invite), false);
});

test('isInviteUsable: should return false for revoked invite', () => {
  const now = Timestamp.now();
  const future = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

  const invite: RoleInvite = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid',
    status: 'revoked',
    token: 'test-token',
    expiresAt: future,
    createdAt: now,
  };

  assert.equal(isInviteUsable(invite), false);
});

test('isInviteUsable: should return false for expired invite', () => {
  const now = Timestamp.now();
  const past = Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

  const invite: RoleInvite = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'teacher',
    invitedBy: 'admin-uid',
    status: 'pending',
    token: 'test-token',
    expiresAt: past,
    createdAt: past,
  };

  assert.equal(isInviteUsable(invite), false);
});

