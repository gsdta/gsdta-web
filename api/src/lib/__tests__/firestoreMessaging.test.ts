import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConversationById,
  findConversation,
  createConversation,
  sendMessage,
  getConversationsForUser,
  getMessages,
  markMessagesAsRead,
  getUnreadCount,
  canAccessConversation,
  __setAdminDbForTests,
} from '../firestoreMessaging';

type StoredDoc = Record<string, unknown>;

// Mock Firestore Timestamp
const mockTimestamp = {
  now: () => ({
    toDate: () => new Date('2024-01-15T10:00:00Z'),
    toMillis: () => 1705312800000,
  }),
};

// Counter for auto-generated IDs
let autoIdCounter = 0;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  return {
    collection: (name: string) => ({
      doc: (docId: string) => ({
        async get() {
          const data = storage.get(`${name}/${docId}`);
          return {
            exists: !!data,
            id: docId,
            data: () => data || {},
            ref: { id: docId },
          };
        },
        async set(data: unknown, options?: { merge?: boolean }) {
          const key = `${name}/${docId}`;
          if (options?.merge && storage.has(key)) {
            const existing = storage.get(key)!;
            storage.set(key, { ...existing, ...(data as StoredDoc) });
          } else {
            storage.set(key, data as StoredDoc);
          }
        },
        async update(data: unknown) {
          const key = `${name}/${docId}`;
          const existing = storage.get(key);
          if (existing) {
            storage.set(key, { ...existing, ...(data as StoredDoc) });
          }
        },
      }),
      async add(data: unknown) {
        const docId = `auto-id-${++autoIdCounter}`;
        storage.set(`${name}/${docId}`, data as StoredDoc);
        return { id: docId };
      },
      where: (field: string, op: string, value: unknown) => {
        return createQuery(name, storage, [{ field, op, value }]);
      },
      orderBy: (field: string, direction?: string) => {
        return createQuery(name, storage, [], { field, direction: direction || 'asc' });
      },
    }),
    batch: () => {
      const operations: Array<{ type: string; ref: { id: string }; data?: unknown }> = [];
      return {
        update: (ref: { id: string }, data: unknown) => {
          operations.push({ type: 'update', ref, data });
        },
        commit: async () => {
          // Apply operations (simplified)
        },
      };
    },
  };
}

interface QueryFilter {
  field: string;
  op: string;
  value: unknown;
}

interface QueryOrder {
  field: string;
  direction: string;
}

function createQuery(
  collectionName: string,
  storage: Map<string, StoredDoc>,
  filters: QueryFilter[] = [],
  orderBy?: QueryOrder
) {
  const query = {
    where: (field: string, op: string, value: unknown) => {
      return createQuery(collectionName, storage, [...filters, { field, op, value }], orderBy);
    },
    orderBy: (field: string, direction?: string) => {
      return createQuery(collectionName, storage, filters, {
        field,
        direction: direction || 'asc',
      });
    },
    limit: (n: number) => {
      return { ...query, _limit: n };
    },
    offset: (n: number) => {
      return { ...query, _offset: n };
    },
    startAfter: () => {
      return query;
    },
    count: () => ({
      async get() {
        const docs = getFilteredDocs(collectionName, storage, filters);
        return { data: () => ({ count: docs.length }) };
      },
    }),
    async get() {
      const docs = getFilteredDocs(collectionName, storage, filters);
      return {
        empty: docs.length === 0,
        docs: docs.map((d) => ({
          id: d.id,
          exists: true,
          data: () => d.data,
          ref: { id: d.id },
        })),
      };
    },
  };
  return query;
}

function getFilteredDocs(
  collectionName: string,
  storage: Map<string, StoredDoc>,
  filters: QueryFilter[]
): Array<{ id: string; data: StoredDoc }> {
  const results: Array<{ id: string; data: StoredDoc }> = [];

  for (const [key, data] of storage.entries()) {
    if (!key.startsWith(`${collectionName}/`)) continue;
    const docId = key.replace(`${collectionName}/`, '');

    let matches = true;
    for (const filter of filters) {
      const fieldValue = data[filter.field];
      switch (filter.op) {
        case '==':
          if (fieldValue !== filter.value) matches = false;
          break;
        case '!=':
          if (fieldValue === filter.value) matches = false;
          break;
        case '>':
          if (typeof fieldValue !== 'number' || fieldValue <= (filter.value as number))
            matches = false;
          break;
        default:
          break;
      }
    }

    if (matches) {
      results.push({ id: docId, data });
    }
  }

  return results;
}

// Mock user profiles for testing
function setupMockUserProfile(storage: Map<string, StoredDoc>) {
  // Parent user
  storage.set('users/parent-uid-1', {
    uid: 'parent-uid-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });

  // Teacher user
  storage.set('users/teacher-uid-1', {
    uid: 'teacher-uid-1',
    email: 'teacher@test.com',
    name: 'Teacher User',
    roles: ['teacher'],
    status: 'active',
  });

  // Admin user (also counts as teacher)
  storage.set('users/admin-uid-1', {
    uid: 'admin-uid-1',
    email: 'admin@test.com',
    name: 'Admin User',
    roles: ['admin'],
    status: 'active',
  });
}

test('getConversationById: should return null for non-existent conversation', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationById('non-existent-id');
  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('getConversationById: should return conversation for existing ID', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent Name',
    teacherName: 'Teacher Name',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationById('conv-1');
  assert.ok(result);
  assert.equal(result.id, 'conv-1');
  assert.equal(result.parentId, 'parent-1');
  assert.equal(result.teacherId, 'teacher-1');

  __setAdminDbForTests(null);
});

test('findConversation: should return null when no conversation exists', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await findConversation('parent-1', 'teacher-1');
  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('findConversation: should return existing conversation', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent Name',
    teacherName: 'Teacher Name',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await findConversation('parent-1', 'teacher-1');
  assert.ok(result);
  assert.equal(result.parentId, 'parent-1');
  assert.equal(result.teacherId, 'teacher-1');

  __setAdminDbForTests(null);
});

test('canAccessConversation: should return false for non-existent conversation', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await canAccessConversation('non-existent', 'user-1');
  assert.equal(result.canAccess, false);
  assert.equal(result.role, undefined);

  __setAdminDbForTests(null);
});

test('canAccessConversation: should return true with parent role for parent', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await canAccessConversation('conv-1', 'parent-1');
  assert.equal(result.canAccess, true);
  assert.equal(result.role, 'parent');

  __setAdminDbForTests(null);
});

test('canAccessConversation: should return true with teacher role for teacher', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await canAccessConversation('conv-1', 'teacher-1');
  assert.equal(result.canAccess, true);
  assert.equal(result.role, 'teacher');

  __setAdminDbForTests(null);
});

test('canAccessConversation: should return false for non-participant', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await canAccessConversation('conv-1', 'other-user');
  assert.equal(result.canAccess, false);

  __setAdminDbForTests(null);
});

test('getConversationsForUser: should return empty list when no conversations', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('parent-1', 'parent');
  assert.equal(result.conversations.length, 0);
  assert.equal(result.total, 0);

  __setAdminDbForTests(null);
});

test('getConversationsForUser: should return conversations for parent', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent Name',
    teacherName: 'Teacher Name',
    lastMessageAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('parent-1', 'parent');
  assert.equal(result.conversations.length, 1);
  assert.equal(result.conversations[0].parentId, 'parent-1');

  __setAdminDbForTests(null);
});

test('getConversationsForUser: should return conversations for teacher', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent Name',
    teacherName: 'Teacher Name',
    lastMessageAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('teacher-1', 'teacher');
  assert.equal(result.conversations.length, 1);
  assert.equal(result.conversations[0].teacherId, 'teacher-1');

  __setAdminDbForTests(null);
});

test('getMessages: should return empty list when no messages', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getMessages('conv-1');
  assert.equal(result.messages.length, 0);
  assert.equal(result.hasMore, false);

  __setAdminDbForTests(null);
});

test('getMessages: should return messages for conversation', async () => {
  const storage = new Map();
  storage.set('messages/msg-1', {
    conversationId: 'conv-1',
    senderId: 'parent-1',
    senderName: 'Parent',
    senderRole: 'parent',
    content: 'Hello teacher',
    createdAt: { toDate: () => new Date() },
  });
  storage.set('messages/msg-2', {
    conversationId: 'conv-1',
    senderId: 'teacher-1',
    senderName: 'Teacher',
    senderRole: 'teacher',
    content: 'Hello parent',
    createdAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getMessages('conv-1');
  assert.equal(result.messages.length, 2);

  __setAdminDbForTests(null);
});

test('getUnreadCount: should return 0 when no unread messages', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 0,
    teacherUnreadCount: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getUnreadCount('parent-1', 'parent');
  assert.equal(result, 0);

  __setAdminDbForTests(null);
});

test('getUnreadCount: should return count of unread messages', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 3,
    teacherUnreadCount: 0,
  });
  storage.set('conversations/conv-2', {
    parentId: 'parent-1',
    teacherId: 'teacher-2',
    parentUnreadCount: 2,
    teacherUnreadCount: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getUnreadCount('parent-1', 'parent');
  assert.equal(result, 5);

  __setAdminDbForTests(null);
});
