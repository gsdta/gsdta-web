// api/src/lib/__tests__/firestoreStudents.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStudent,
  getStudentById,
  getStudentsByParentId,
  getAllStudents,
  updateStudent,
  adminUpdateStudent,
  admitStudent,
  assignClassToStudent,
  countStudentsByStatus,
  bulkCreateStudents,
  bulkAssignClass,
  __setAdminDbForTests,
} from '../firestoreStudents';
import { __setAdminDbForTests as setUsersDb } from '../firestoreUsers';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;
  let batchOps: { type: 'set' | 'update'; path: string; data: any }[] = [];

  const db = {
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
                ref: {
                  async update(updateData: Record<string, unknown>) {
                    const existing = storage.get(`${name}/${docId}`) || {};
                    storage.set(`${name}/${docId}`, { ...existing, ...updateData });
                  },
                },
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
        async add(data: unknown) {
          const id = `auto-id-${++docCounter}`;
          storage.set(`${name}/${id}`, data as StoredDoc);
          return { id };
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
    batch: () => ({
      set: (ref: any, data: any) => {
        batchOps.push({ type: 'set', path: ref.id, data });
      },
      update: (ref: any, data: any) => {
        batchOps.push({ type: 'update', path: ref.id, data });
      },
      async commit() {
        for (const op of batchOps) {
          if (op.type === 'set') {
            storage.set(`students/${op.path}`, op.data);
          } else {
            const existing = storage.get(`students/${op.path}`) || {};
            storage.set(`students/${op.path}`, { ...existing, ...op.data });
          }
        }
        batchOps = [];
      },
    }),
  };

  return db;
}

test.afterEach(() => {
  __setAdminDbForTests(null);
  setUsersDb(null);
});

test('createStudent: should create a new student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const student = await createStudent(
    'parent1',
    'parent@test.com',
    {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2015-01-01',
      gender: 'Boy',
      grade: '3rd',
      schoolName: 'Elementary School',
      priorTamilLevel: 'beginner',
      enrollingGrade: 'Grade 1',
    }
  );

  assert.ok(student.id);
  assert.equal(student.firstName, 'John');
  assert.equal(student.lastName, 'Doe');
  assert.equal(student.parentId, 'parent1');
  assert.equal(student.parentEmail, 'parent@test.com');
  assert.equal(student.status, 'pending');
});

test('createStudent: should handle all optional fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const student = await createStudent(
    'parent1',
    'parent@test.com',
    {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '2016-06-15',
      gender: 'Girl',
      grade: '2nd',
      schoolName: 'Test School',
      schoolDistrict: 'Test District',
      priorTamilLevel: 'intermediate',
      enrollingGrade: 'Grade 2',
      address: { street: '123 Main St', city: 'Test City', zipCode: '12345' },
      contacts: { mother: { name: 'Parent', phone: '555-1234' } },
      medicalNotes: 'None',
      photoConsent: true,
    }
  );

  assert.ok(student.id);
  assert.equal(student.schoolDistrict, 'Test District');
  assert.equal(student.photoConsent, true);
});

test('getStudentById: should return student by ID', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const student = await getStudentById('s1');

  assert.ok(student);
  assert.equal(student?.id, 's1');
  assert.equal(student?.firstName, 'John');
});

test('getStudentById: should return null for non-existent student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const student = await getStudentById('nonexistent');

  assert.equal(student, null);
});

test('getStudentsByParentId: should return students for parent', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentId: 'parent1',
    status: 'pending',
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
  });
  storage.set('students/s2', {
    firstName: 'Jane',
    lastName: 'Doe',
    parentId: 'parent1',
    status: 'active',
    classId: 'c1',
    className: 'Class 1',
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const students = await getStudentsByParentId('parent1');

  assert.ok(Array.isArray(students));
  assert.equal(students.length, 2);
  assert.ok(students[0].name);
});

test('getStudentsByParentId: should return empty array for parent with no students', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const students = await getStudentsByParentId('nonexistent');

  assert.ok(Array.isArray(students));
  assert.equal(students.length, 0);
});

test('getAllStudents: should return all students with pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'pending',
  });
  storage.set('students/s2', {
    firstName: 'Jane',
    lastName: 'Smith',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents();

  assert.ok(result.students);
  assert.ok(Array.isArray(result.students));
  assert.equal(result.total, 2);
});

test('getAllStudents: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', { firstName: 'John', status: 'pending' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ status: 'pending' });

  assert.ok(result.students);
});

test('getAllStudents: should filter by parentId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', { firstName: 'John', parentId: 'p1', status: 'pending' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ parentId: 'p1' });

  assert.ok(result.students);
});

test('getAllStudents: should filter by classId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', { firstName: 'John', classId: 'c1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ classId: 'c1' });

  assert.ok(result.students);
});

test('getAllStudents: should apply search filter', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentEmail: 'parent@test.com',
    status: 'pending',
  });
  storage.set('students/s2', {
    firstName: 'Jane',
    lastName: 'Smith',
    parentEmail: 'other@test.com',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ search: 'John' });

  assert.equal(result.students.length, 1);
});

test('getAllStudents: should search by parentEmail', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentEmail: 'unique@test.com',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ search: 'unique' });

  assert.equal(result.students.length, 1);
});

test('updateStudent: should update student fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentId: 'parent1',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateStudent('s1', { firstName: 'Johnny' });

  assert.ok(updated);
  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.firstName, 'Johnny');
});

test('updateStudent: should return null for non-existent student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateStudent('nonexistent', { firstName: 'Test' });

  assert.equal(updated, null);
});

test('updateStudent: should verify parent ownership when checkParentId provided', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentId: 'parent1',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  // Different parent ID should fail
  const updated = await updateStudent('s1', { firstName: 'Johnny' }, 'parent2');

  assert.equal(updated, null);
});

test('updateStudent: should allow parent to update their own student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    parentId: 'parent1',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateStudent('s1', { firstName: 'Johnny' }, 'parent1');

  assert.ok(updated);
});

test('updateStudent: should throw error for non-updatable status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    parentId: 'parent1',
    status: 'withdrawn',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await assert.rejects(
    () => updateStudent('s1', { firstName: 'Johnny' }),
    /Cannot update student in current status/
  );
});

test('updateStudent: should update all provided fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2015-01-01',
    grade: '3rd',
    schoolName: 'Old School',
    priorTamilLevel: 'beginner',
    medicalNotes: '',
    photoConsent: false,
    parentId: 'parent1',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await updateStudent('s1', {
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '2016-01-01',
    grade: '4th',
    schoolName: 'New School',
    priorTamilLevel: 'intermediate',
    medicalNotes: 'Allergies',
    photoConsent: true,
  });

  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.firstName, 'Jane');
  assert.equal(storedData.grade, '4th');
  assert.equal(storedData.photoConsent, true);
});

test('adminUpdateStudent: should update student with admin fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await adminUpdateStudent('s1', {
    status: 'admitted',
    classId: 'c1',
    className: 'Class 1',
    notes: 'Admin notes',
  });

  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.status, 'admitted');
  assert.equal(storedData.classId, 'c1');
  assert.equal(storedData.notes, 'Admin notes');
});

test('adminUpdateStudent: should return null for non-existent student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await adminUpdateStudent('nonexistent', { status: 'admitted' });

  assert.equal(updated, null);
});

test('admitStudent: should admit pending student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admitted = await admitStudent('s1', 'admin1');

  assert.ok(admitted);
  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.status, 'admitted');
  assert.equal(storedData.admittedBy, 'admin1');
});

test('admitStudent: should return null for non-existent student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const admitted = await admitStudent('nonexistent', 'admin1');

  assert.equal(admitted, null);
});

test('admitStudent: should throw error for non-pending student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await assert.rejects(
    () => admitStudent('s1', 'admin1'),
    /Can only admit students with pending status/
  );
});

test('assignClassToStudent: should assign class to admitted student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    status: 'admitted',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const assigned = await assignClassToStudent('s1', 'c1', 'Class 1');

  assert.ok(assigned);
  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.classId, 'c1');
  assert.equal(storedData.className, 'Class 1');
  assert.equal(storedData.status, 'active'); // Should transition to active
});

test('assignClassToStudent: should assign class to active student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    status: 'active',
    classId: 'c1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const assigned = await assignClassToStudent('s1', 'c2', 'Class 2');

  assert.ok(assigned);
  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.classId, 'c2');
  assert.equal(storedData.status, 'active'); // Should remain active
});

test('assignClassToStudent: should return null for non-existent student', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const assigned = await assignClassToStudent('nonexistent', 'c1', 'Class 1');

  assert.equal(assigned, null);
});

test('assignClassToStudent: should throw error for pending student', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await assert.rejects(
    () => assignClassToStudent('s1', 'c1', 'Class 1'),
    /Can only assign class to admitted or active students/
  );
});

test('countStudentsByStatus: should count students by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', { status: 'pending' });
  storage.set('students/s2', { status: 'admitted' });
  storage.set('students/s3', { status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const counts = await countStudentsByStatus();

  assert.ok('pending' in counts);
  assert.ok('admitted' in counts);
  assert.ok('active' in counts);
  assert.ok('inactive' in counts);
  assert.ok('withdrawn' in counts);
});

test('bulkCreateStudents: should return empty result for empty input', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await bulkCreateStudents([]);

  assert.equal(result.success, 0);
  assert.equal(result.failed, 0);
  assert.equal(result.total, 0);
});

test('bulkCreateStudents: should fail when parent not found and createParents is false', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await bulkCreateStudents(
    [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01',
        gender: 'Boy',
        parentEmail: 'unknown@test.com',
        grade: '3rd',
        priorTamilLevel: 'beginner',
        enrollingGrade: 'Grade 1',
        photoConsent: false,
      },
    ],
    false
  );

  assert.equal(result.success, 0);
  assert.equal(result.failed, 1);
  assert.ok(result.errors.length > 0);
});

test('bulkCreateStudents: should create students when parent exists', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/parent1', {
    uid: 'parent1',
    email: 'parent@test.com',
    roles: ['parent'],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await bulkCreateStudents(
    [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01',
        gender: 'Boy',
        parentEmail: 'parent@test.com',
        grade: '3rd',
        priorTamilLevel: 'beginner',
        enrollingGrade: 'Grade 1',
        photoConsent: false,
      },
    ],
    false
  );

  assert.equal(result.success, 1);
  assert.equal(result.failed, 0);
});

test('bulkAssignClass: should return empty result for empty input', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass([], 'c1', 'Class 1');

  assert.deepEqual(result.updated, []);
  assert.deepEqual(result.failed, []);
});

test('bulkAssignClass: should fail for non-existent students', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['nonexistent'], 'c1', 'Class 1');

  assert.equal(result.updated.length, 0);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].reason, 'Student not found');
});

test('bulkAssignClass: should fail for students with invalid status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'pending',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['s1'], 'c1', 'Class 1');

  assert.equal(result.updated.length, 0);
  assert.equal(result.failed.length, 1);
  assert.ok(result.failed[0].reason.includes('Invalid status'));
});

test('bulkAssignClass: should assign class to admitted students', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'admitted',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['s1'], 'c1', 'Class 1');

  assert.equal(result.updated.length, 1);
  assert.equal(result.failed.length, 0);

  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.classId, 'c1');
  assert.equal(storedData.status, 'active');
});

test('bulkAssignClass: should assign class to active students', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'active',
    classId: 'c1',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['s1'], 'c2', 'Class 2');

  assert.equal(result.updated.length, 1);
  assert.equal(result.failed.length, 0);

  const storedData = storage.get('students/s1') as any;
  assert.equal(storedData.classId, 'c2');
});

test('bulkAssignClass: should handle multiple students', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', { firstName: 'John', lastName: 'Doe', status: 'admitted' });
  storage.set('students/s2', { firstName: 'Jane', lastName: 'Smith', status: 'active' });
  storage.set('students/s3', { firstName: 'Bob', lastName: 'Brown', status: 'pending' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['s1', 's2', 's3'], 'c1', 'Class 1');

  assert.equal(result.updated.length, 2);
  assert.equal(result.failed.length, 1);
});

// ============================================
// Tests for createParents=true and error handling
// ============================================

test('bulkCreateStudents: should create parent accounts when createParents is true', async () => {
  const storage = new Map<string, StoredDoc>();
  // No parent exists initially

  // Enhanced mock that supports user creation
  let docCounter = 0;
  const db = {
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
        add: async (data: unknown) => {
          const id = `auto-id-${++docCounter}`;
          storage.set(`${name}/${id}`, data as StoredDoc);
          return { id };
        },
        where: () => ({
          where: () => collectionMethods,
          orderBy: () => collectionMethods,
          limit: (n: number) => ({
            get: async () => {
              // Return empty - no parent found
              const docs: any[] = [];
              for (const [key, value] of storage.entries()) {
                if (key.startsWith(`${name}/`)) {
                  docs.push({
                    id: key.split('/')[1],
                    data: () => value,
                  });
                }
              }
              return { empty: docs.length === 0, docs: docs.slice(0, n) };
            },
          }),
          get: async () => {
            const docs: any[] = [];
            for (const [key, value] of storage.entries()) {
              if (key.startsWith(`${name}/`)) {
                docs.push({
                  id: key.split('/')[1],
                  data: () => value,
                });
              }
            }
            return { empty: docs.length === 0, docs };
          },
        }),
        orderBy: () => collectionMethods,
        limit: () => collectionMethods,
        async get() {
          const docs: any[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              docs.push({
                id: key.split('/')[1],
                data: () => value,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      };
      return collectionMethods;
    },
    batch: () => ({
      set: () => {},
      update: () => {},
      async commit() {
        // Success
      },
    }),
  };

  const fakeProvider = (() => db) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await bulkCreateStudents(
    [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01',
        gender: 'Boy',
        parentEmail: 'newparent@test.com',
        grade: '3rd',
        priorTamilLevel: 'beginner',
        enrollingGrade: 'Grade 1',
        photoConsent: false,
      },
    ],
    true // createParents = true
  );

  // Should have created parent and student
  assert.ok(result.createdParents.includes('newparent@test.com'));
});

// Create a mock that fails on batch.commit()
function makeFakeDbWithBatchError(storage: Map<string, StoredDoc> = new Map()) {
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
        where: () => ({
          limit: () => ({
            get: async () => {
              const docs: any[] = [];
              for (const [key, value] of storage.entries()) {
                if (key.startsWith(`${name}/`)) {
                  docs.push({
                    id: key.split('/')[1],
                    data: () => value,
                  });
                }
              }
              return { empty: docs.length === 0, docs };
            },
          }),
          get: async () => {
            const docs: any[] = [];
            for (const [key, value] of storage.entries()) {
              if (key.startsWith(`${name}/`)) {
                docs.push({
                  id: key.split('/')[1],
                  data: () => value,
                });
              }
            }
            return { empty: docs.length === 0, docs };
          },
        }),
        orderBy: () => collectionMethods,
        limit: () => collectionMethods,
        async get() {
          const docs: any[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              docs.push({
                id: key.split('/')[1],
                data: () => value,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      };
      return collectionMethods;
    },
    batch: () => ({
      set: () => {},
      update: () => {},
      async commit() {
        throw new Error('Batch commit failed');
      },
    }),
  };
}

test('bulkCreateStudents: should handle batch commit failure', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('users/parent1', {
    uid: 'parent1',
    email: 'parent@test.com',
    roles: ['parent'],
  });

  const fakeProvider = (() => makeFakeDbWithBatchError(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);
  setUsersDb(fakeProvider);

  const result = await bulkCreateStudents(
    [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01',
        gender: 'Boy',
        parentEmail: 'parent@test.com',
        grade: '3rd',
        priorTamilLevel: 'beginner',
        enrollingGrade: 'Grade 1',
        photoConsent: false,
      },
    ],
    false
  );

  // Should fail due to batch commit error
  assert.equal(result.success, 0);
  assert.equal(result.failed, 1);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].errors[0].message.includes('Batch write failed'));
});

test('bulkAssignClass: should handle batch commit failure', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
    status: 'admitted',
  });

  const fakeProvider = (() => makeFakeDbWithBatchError(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await bulkAssignClass(['s1'], 'c1', 'Class 1');

  // Should fail due to batch commit error
  assert.equal(result.updated.length, 0);
  assert.equal(result.failed.length, 1);
  assert.ok(result.failed[0].reason.includes('Batch update failed'));
});

// ============================================
// Tests for search + pagination fix (Issue: search was applied AFTER pagination)
// ============================================

test('getAllStudents: search should return correct total count matching search results', async () => {
  const storage = new Map<string, StoredDoc>();
  // Create 10 students, only 3 have "Smith" in their name
  for (let i = 0; i < 10; i++) {
    const isSmith = i < 3;
    storage.set(`students/s${i}`, {
      firstName: isSmith ? 'John' : 'Jane',
      lastName: isSmith ? 'Smith' : 'Doe',
      parentEmail: `parent${i}@test.com`,
      status: 'pending',
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllStudents({ search: 'Smith' });

  // Total should match the number of search results, not the pre-search count
  assert.equal(result.total, 3, 'Total should be 3 (only Smith students)');
  assert.equal(result.students.length, 3, 'Should return all 3 Smith students');
});

test('getAllStudents: search with pagination should paginate search results correctly', async () => {
  const storage = new Map<string, StoredDoc>();
  // Create 100 students, 25 have "Smith" in their name
  for (let i = 0; i < 100; i++) {
    const isSmith = i < 25;
    storage.set(`students/s${i}`, {
      firstName: isSmith ? `John${i}` : `Jane${i}`,
      lastName: isSmith ? 'Smith' : 'Doe',
      parentEmail: `parent${i}@test.com`,
      status: 'pending',
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  // Request page 1 with limit 10
  const page1 = await getAllStudents({ search: 'Smith', limit: 10, offset: 0 });
  assert.equal(page1.total, 25, 'Total should be 25 (all Smith students)');
  assert.equal(page1.students.length, 10, 'Page 1 should have 10 students');

  // Request page 2 with limit 10
  const page2 = await getAllStudents({ search: 'Smith', limit: 10, offset: 10 });
  assert.equal(page2.total, 25, 'Total should still be 25');
  assert.equal(page2.students.length, 10, 'Page 2 should have 10 students');

  // Request page 3 with limit 10 (should only have 5 remaining)
  const page3 = await getAllStudents({ search: 'Smith', limit: 10, offset: 20 });
  assert.equal(page3.total, 25, 'Total should still be 25');
  assert.equal(page3.students.length, 5, 'Page 3 should have only 5 remaining students');
});

test('getAllStudents: search results should not include non-matching students from pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  // Create 60 students, only 5 have "Unique" in their name
  for (let i = 0; i < 60; i++) {
    const isUnique = i >= 55;
    storage.set(`students/s${i}`, {
      firstName: isUnique ? 'Unique' : 'Common',
      lastName: `Student${i}`,
      parentEmail: `parent${i}@test.com`,
      status: 'pending',
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  // Search for "Unique" with default pagination (limit 50)
  const result = await getAllStudents({ search: 'Unique' });

  // Should find all 5 "Unique" students, not limited by pagination
  assert.equal(result.total, 5, 'Total should be 5 (all Unique students)');
  assert.equal(result.students.length, 5, 'Should return all 5 Unique students');

  // Verify all returned students actually match the search
  for (const student of result.students) {
    assert.ok(
      student.firstName.toLowerCase().includes('unique') ||
      student.lastName.toLowerCase().includes('unique'),
      'Each returned student should match the search term'
    );
  }
});

test('getAllStudents: without search should use efficient Firestore pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  // Create 30 students (less than default limit of 50)
  for (let i = 0; i < 30; i++) {
    storage.set(`students/s${i}`, {
      firstName: `Student${i}`,
      lastName: 'Test',
      status: 'pending',
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  // Without search, should use Firestore's count and pagination
  // Note: Mock doesn't implement actual pagination, just verifies the query path
  const result = await getAllStudents({ limit: 50, offset: 0 });

  assert.equal(result.total, 30, 'Total should be 30 (all students)');
  assert.equal(result.limit, 50, 'Limit should be 50');
  assert.equal(result.offset, 0, 'Offset should be 0');
});
