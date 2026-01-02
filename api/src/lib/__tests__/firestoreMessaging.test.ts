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
import { __setAdminDbForTests as setUsersDb } from '../firestoreUsers';
import { __setAdminDbForTests as setStudentsDb } from '../firestoreStudents';
import { __setAdminDbForTests as setClassesDb } from '../firestoreClasses';

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

test('getUnreadCount: should return teacher unread count', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 0,
    teacherUnreadCount: 4,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getUnreadCount('teacher-1', 'teacher');
  assert.equal(result, 4);

  __setAdminDbForTests(null);
});

// ============================================
// createConversation tests
// ============================================

test('createConversation: should throw error if initiator not found', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  try {
    await createConversation('nonexistent', 'parent', {
      targetUserId: 'teacher-1',
      initialMessage: 'Hello',
    });
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Initiator user not found'));
  }

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should throw error if target not found', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent',
    roles: ['parent'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  try {
    await createConversation('parent-1', 'parent', {
      targetUserId: 'nonexistent',
      initialMessage: 'Hello',
    });
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Target user not found'));
  }

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should throw error if parent targets non-teacher', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/parent-2', {
    uid: 'parent-2',
    email: 'parent2@test.com',
    name: 'Another Parent',
    roles: ['parent'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  try {
    await createConversation('parent-1', 'parent', {
      targetUserId: 'parent-2',
      initialMessage: 'Hello',
    });
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Target user is not a teacher'));
  }

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should throw error if teacher targets non-parent', async () => {
  const storage = new Map();
  storage.set('users/teacher-1', {
    uid: 'teacher-1',
    email: 'teacher@test.com',
    name: 'Teacher',
    roles: ['teacher'],
    status: 'active',
  });
  storage.set('users/teacher-2', {
    uid: 'teacher-2',
    email: 'teacher2@test.com',
    name: 'Another Teacher',
    roles: ['teacher'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  try {
    await createConversation('teacher-1', 'teacher', {
      targetUserId: 'teacher-2',
      initialMessage: 'Hello',
    });
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Target user is not a parent'));
  }

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should create conversation when parent initiates', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/teacher-1', {
    uid: 'teacher-1',
    email: 'teacher@test.com',
    name: 'Teacher User',
    roles: ['teacher'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await createConversation('parent-1', 'parent', {
    targetUserId: 'teacher-1',
    initialMessage: 'Hello teacher!',
  });

  assert.ok(result.conversation);
  assert.ok(result.message);
  assert.equal(result.conversation.parentId, 'parent-1');
  assert.equal(result.conversation.teacherId, 'teacher-1');
  assert.equal(result.message.content, 'Hello teacher!');
  assert.equal(result.message.senderRole, 'parent');

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should create conversation when teacher initiates', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/teacher-1', {
    uid: 'teacher-1',
    email: 'teacher@test.com',
    name: 'Teacher User',
    roles: ['teacher'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await createConversation('teacher-1', 'teacher', {
    targetUserId: 'parent-1',
    initialMessage: 'Hello parent!',
  });

  assert.ok(result.conversation);
  assert.ok(result.message);
  assert.equal(result.conversation.parentId, 'parent-1');
  assert.equal(result.conversation.teacherId, 'teacher-1');
  assert.equal(result.message.senderRole, 'teacher');

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: admin can message as teacher role', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/admin-1', {
    uid: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    roles: ['admin'],
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  // Parent can target admin since admin has teacher-like permissions
  const result = await createConversation('parent-1', 'parent', {
    targetUserId: 'admin-1',
    initialMessage: 'Question for admin',
  });

  assert.ok(result.conversation);
  assert.equal(result.conversation.teacherId, 'admin-1');

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should add to existing conversation', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/teacher-1', {
    uid: 'teacher-1',
    email: 'teacher@test.com',
    name: 'Teacher User',
    roles: ['teacher'],
    status: 'active',
  });
  // Existing conversation
  storage.set('conversations/existing-conv', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent User',
    teacherName: 'Teacher User',
    teacherUnreadCount: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await createConversation('parent-1', 'parent', {
    targetUserId: 'teacher-1',
    initialMessage: 'Follow up message',
  });

  assert.ok(result.conversation);
  assert.equal(result.conversation.id, 'existing-conv');
  assert.ok(result.message);

  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createConversation: should include student and class context', async () => {
  const storage = new Map();
  storage.set('users/parent-1', {
    uid: 'parent-1',
    email: 'parent@test.com',
    name: 'Parent User',
    roles: ['parent'],
    status: 'active',
  });
  storage.set('users/teacher-1', {
    uid: 'teacher-1',
    email: 'teacher@test.com',
    name: 'Teacher User',
    roles: ['teacher'],
    status: 'active',
  });
  storage.set('students/student-1', {
    firstName: 'John',
    lastName: 'Doe',
  });
  storage.set('classes/class-1', {
    name: 'Tamil 101',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);
  setStudentsDb(fakeProvider);
  setClassesDb(fakeProvider);

  const result = await createConversation('parent-1', 'parent', {
    targetUserId: 'teacher-1',
    initialMessage: 'About my child',
    studentId: 'student-1',
    classId: 'class-1',
  });

  assert.ok(result.conversation);
  assert.equal(result.conversation.studentName, 'John Doe');
  assert.equal(result.conversation.className, 'Tamil 101');

  __setAdminDbForTests(null);
  setUsersDb(null);
  setStudentsDb(null);
  setClassesDb(null);
});

// ============================================
// sendMessage tests
// ============================================

test('sendMessage: should throw error for non-existent conversation', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  try {
    await sendMessage('nonexistent', 'parent-1', 'parent', 'Hello');
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Conversation not found'));
  }

  __setAdminDbForTests(null);
});

test('sendMessage: should throw error for non-participant', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent',
    teacherName: 'Teacher',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  try {
    await sendMessage('conv-1', 'other-user', 'parent', 'Hello');
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('User is not a participant'));
  }

  __setAdminDbForTests(null);
});

test('sendMessage: should send message as parent', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent User',
    teacherName: 'Teacher User',
    teacherUnreadCount: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const message = await sendMessage('conv-1', 'parent-1', 'parent', 'Hello teacher!');

  assert.ok(message.id);
  assert.equal(message.content, 'Hello teacher!');
  assert.equal(message.senderRole, 'parent');
  assert.equal(message.senderName, 'Parent User');

  __setAdminDbForTests(null);
});

test('sendMessage: should send message as teacher', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentName: 'Parent User',
    teacherName: 'Teacher User',
    parentUnreadCount: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const message = await sendMessage('conv-1', 'teacher-1', 'teacher', 'Hello parent!');

  assert.ok(message.id);
  assert.equal(message.content, 'Hello parent!');
  assert.equal(message.senderRole, 'teacher');
  assert.equal(message.senderName, 'Teacher User');

  __setAdminDbForTests(null);
});

// ============================================
// markMessagesAsRead tests
// ============================================

test('markMessagesAsRead: should throw for non-existent conversation', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  try {
    await markMessagesAsRead('nonexistent', 'parent-1', 'parent');
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Conversation not found'));
  }

  __setAdminDbForTests(null);
});

test('markMessagesAsRead: should throw for non-participant', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 2,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  try {
    await markMessagesAsRead('conv-1', 'other-user', 'parent');
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('User is not a participant'));
  }

  __setAdminDbForTests(null);
});

test('markMessagesAsRead: should mark messages as read for parent', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 3,
  });
  storage.set('messages/msg-1', {
    conversationId: 'conv-1',
    senderId: 'teacher-1',
    readAt: null,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  await markMessagesAsRead('conv-1', 'parent-1', 'parent');

  const conv = storage.get('conversations/conv-1') as { parentUnreadCount: number };
  assert.equal(conv.parentUnreadCount, 0);

  __setAdminDbForTests(null);
});

test('markMessagesAsRead: should mark messages as read for teacher', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    teacherUnreadCount: 5,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  await markMessagesAsRead('conv-1', 'teacher-1', 'teacher');

  const conv = storage.get('conversations/conv-1') as { teacherUnreadCount: number };
  assert.equal(conv.teacherUnreadCount, 0);

  __setAdminDbForTests(null);
});

// ============================================
// getConversationsForUser additional tests
// ============================================

test('getConversationsForUser: should filter by unreadOnly for parent', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    parentUnreadCount: 0,
    lastMessageAt: { toDate: () => new Date() },
  });
  storage.set('conversations/conv-2', {
    parentId: 'parent-1',
    teacherId: 'teacher-2',
    parentUnreadCount: 3,
    lastMessageAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('parent-1', 'parent', { unreadOnly: true });

  assert.equal(result.total, 1);
  assert.equal(result.conversations[0].parentUnreadCount, 3);

  __setAdminDbForTests(null);
});

test('getConversationsForUser: should filter by unreadOnly for teacher', async () => {
  const storage = new Map();
  storage.set('conversations/conv-1', {
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    teacherUnreadCount: 0,
    lastMessageAt: { toDate: () => new Date() },
  });
  storage.set('conversations/conv-2', {
    parentId: 'parent-2',
    teacherId: 'teacher-1',
    teacherUnreadCount: 2,
    lastMessageAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('teacher-1', 'teacher', { unreadOnly: true });

  assert.equal(result.total, 1);

  __setAdminDbForTests(null);
});

test('getConversationsForUser: should apply pagination', async () => {
  const storage = new Map();
  for (let i = 1; i <= 5; i++) {
    storage.set(`conversations/conv-${i}`, {
      parentId: 'parent-1',
      teacherId: `teacher-${i}`,
      lastMessageAt: { toDate: () => new Date() },
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getConversationsForUser('parent-1', 'parent', { limit: 2, offset: 0 });

  // Total should reflect all conversations, regardless of pagination
  assert.equal(result.total, 5);
  // Conversations should be returned (limit applied at db level)
  assert.ok(result.conversations.length > 0);

  __setAdminDbForTests(null);
});

// ============================================
// getMessages additional tests
// ============================================

test('getMessages: should indicate hasMore when more messages exist', async () => {
  const storage = new Map();
  for (let i = 1; i <= 55; i++) {
    storage.set(`messages/msg-${i}`, {
      conversationId: 'conv-1',
      senderId: 'parent-1',
      content: `Message ${i}`,
      createdAt: { toDate: () => new Date() },
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getMessages('conv-1', { limit: 50 });

  assert.equal(result.hasMore, true);
  assert.equal(result.messages.length, 50);

  __setAdminDbForTests(null);
});

test('getMessages: should handle before parameter', async () => {
  const storage = new Map();
  storage.set('messages/msg-1', {
    conversationId: 'conv-1',
    content: 'First',
    createdAt: { toDate: () => new Date('2024-01-01') },
  });
  storage.set('messages/msg-2', {
    conversationId: 'conv-1',
    content: 'Second',
    createdAt: { toDate: () => new Date('2024-01-02') },
  });
  storage.set('messages/msg-3', {
    conversationId: 'conv-1',
    content: 'Third',
    createdAt: { toDate: () => new Date('2024-01-03') },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getMessages('conv-1', { before: 'msg-3' });

  assert.ok(Array.isArray(result.messages));

  __setAdminDbForTests(null);
});

test('getMessages: should handle non-existent before message', async () => {
  const storage = new Map();
  storage.set('messages/msg-1', {
    conversationId: 'conv-1',
    content: 'First',
    createdAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<
    typeof __setAdminDbForTests
  >[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getMessages('conv-1', { before: 'nonexistent' });

  assert.ok(Array.isArray(result.messages));

  __setAdminDbForTests(null);
});
