// api/src/lib/__tests__/firestoreStudents.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getStudentsByClassId,
  bulkAssignStudentsToClass,
  removeStudentFromClass,
  __setAdminDbForTests as setStudentsDb
} from '../firestoreStudents';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  const batchOps: Array<{ type: string; collection: string; id: string; data: any }> = [];
  
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        async get() {
          const data = storage.get(`${name}/${id}`);
          return {
            exists: !!data,
            data: () => data || {},
            id: id,
            ref: {
              update: async (updateData: Record<string, unknown>) => {
                const existing = storage.get(`${name}/${id}`) || {};
                const merged = { ...existing };
                for (const [key, value] of Object.entries(updateData)) {
                  if (value && typeof value === 'object' && (value as any)._type === 'increment') {
                    const current = (merged[key] as number) || 0;
                    merged[key] = current + (value as any).value;
                  } else {
                    merged[key] = value;
                  }
                }
                storage.set(`${name}/${id}`, merged);
              }
            }
          };
        },
        async set(data: unknown) {
          storage.set(`${name}/${id}`, data as StoredDoc);
        },
      }),
      where: (field: string, op: string, value: any) => ({
        where: (field2: string, op2: string, value2: any) => ({
          orderBy: (field3: string) => ({
            orderBy: (field4: string) => ({
              get: async () => {
                const docs: any[] = [];
                for (const [key, data] of storage.entries()) {
                  if (key.startsWith(`${name}/`)) {
                    const fieldValue = (data as any)[field];
                    const fieldValue2 = (data as any)[field2];
                    
                    let matches = false;
                    if (op === '==') {
                      if (op2 === 'in') {
                        matches = fieldValue === value && (value2 as any[]).includes(fieldValue2);
                      } else {
                        matches = fieldValue === value && fieldValue2 === value2;
                      }
                    }
                    
                    if (matches) {
                      docs.push({
                        id: key.split('/')[1],
                        data: () => data
                      });
                    }
                  }
                }
                return { docs, empty: docs.length === 0 };
              }
            })
          })
        })
      })
    }),
    batch: () => ({
      update: (ref: any, data: any) => {
        batchOps.push({ type: 'update', collection: ref._collection, id: ref._id, data });
      },
      commit: async () => {
        for (const op of batchOps) {
          const existing = storage.get(`${op.collection}/${op.id}`) || {};
          const merged = { ...existing };
          for (const [key, value] of Object.entries(op.data)) {
            if (value && typeof value === 'object' && (value as any)._type === 'increment') {
              const current = (merged[key] as number) || 0;
              merged[key] = current + (value as any).value;
            } else {
              merged[key] = value;
            }
          }
          storage.set(`${op.collection}/${op.id}`, merged);
        }
        batchOps.length = 0;
      }
    })
  };
}

// Mock FieldValue for tests
const mockFieldValue = {
  increment: (value: number) => ({ _type: 'increment', value })
};

// Mock Timestamp
const mockTimestamp = {
  now: () => ({ seconds: Date.now() / 1000 })
};

// Inject mocks into the module (we need to mock the imports)
// Since we can't easily mock imports in node:test, we'll structure tests differently

test('getStudentsByClassId: should return students in a class', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setStudentsDb(fakeProvider);

  // Seed students
  storage.set('students/s1', { 
    id: 's1', 
    firstName: 'John', 
    lastName: 'Doe', 
    classId: 'class-1',
    status: 'active'
  });
  storage.set('students/s2', { 
    id: 's2', 
    firstName: 'Jane', 
    lastName: 'Smith', 
    classId: 'class-1',
    status: 'active'
  });
  storage.set('students/s3', { 
    id: 's3', 
    firstName: 'Bob', 
    lastName: 'Johnson', 
    classId: 'class-2',
    status: 'active'
  });

  const students = await getStudentsByClassId('class-1');

  assert.equal(students.length, 2, 'Should return 2 students from class-1');
  assert.equal(students[0].firstName, 'John');
  assert.equal(students[1].firstName, 'Jane');
});

test('getStudentsByClassId: should return empty array if no students', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setStudentsDb(fakeProvider);

  const students = await getStudentsByClassId('class-999');

  assert.equal(students.length, 0, 'Should return empty array');
});

test('getStudentsByClassId: should filter by status', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setStudentsDb(fakeProvider);

  // Seed students with different statuses
  storage.set('students/s1', { 
    id: 's1', 
    firstName: 'Active', 
    lastName: 'Student', 
    classId: 'class-1',
    status: 'active'
  });
  storage.set('students/s2', { 
    id: 's2', 
    firstName: 'Inactive', 
    lastName: 'Student', 
    classId: 'class-1',
    status: 'inactive'
  });
  storage.set('students/s3', { 
    id: 's3', 
    firstName: 'Admitted', 
    lastName: 'Student', 
    classId: 'class-1',
    status: 'admitted'
  });

  const students = await getStudentsByClassId('class-1');

  // Should only return active and admitted students
  assert.equal(students.length, 2, 'Should return only active/admitted students');
  assert.ok(students.some(s => s.status === 'active'));
  assert.ok(students.some(s => s.status === 'admitted'));
  assert.ok(!students.some(s => s.status === 'inactive'));
});

test.describe('bulkAssignStudentsToClass', () => {
  test('should throw if student not found', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setStudentsDb(fakeProvider);

    await assert.rejects(
      async () => {
        await bulkAssignStudentsToClass('class-1', 'Tamil Grade 1', ['nonexistent-student']);
      },
      /Student nonexistent-student not found/
    );
  });

  test('should throw if student has invalid status', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setStudentsDb(fakeProvider);

    // Seed student with pending status
    storage.set('students/s1', { 
      id: 's1', 
      firstName: 'Pending', 
      lastName: 'Student', 
      status: 'pending'
    });

    await assert.rejects(
      async () => {
        await bulkAssignStudentsToClass('class-1', 'Tamil Grade 1', ['s1']);
      },
      /Cannot assign class to student s1 with status pending/
    );
  });
});

test.describe('removeStudentFromClass', () => {
  test('should throw if student not found', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setStudentsDb(fakeProvider);

    await assert.rejects(
      async () => {
        await removeStudentFromClass('nonexistent-student', 'class-1');
      },
      /Student nonexistent-student not found/
    );
  });
});

// Reset after tests
test.afterEach(() => {
  setStudentsDb(null);
});
