import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssignment,
  getAssignmentById,
  getAssignmentsByClass,
  updateAssignment,
  deleteAssignment,
  __setAdminDbForTests,
} from '../firestoreAssignments';
import { __setAdminDbForTests as setClassesDbForTests } from '../firestoreClasses';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map(), counterRef: { value: number } = { value: 0 }) {
  return {
    collection: (name: string) => ({
      doc: (uid?: string) => {
        const id = uid || `auto-id-${++counterRef.value}`;
        const key = `${name}/${id}`;
        const docObj = {
          id,
          async get() {
            const data = storage.get(key);
            return {
              id,
              exists: !!data,
              data: () => data || null,
              ref: docObj,
            };
          },
          async set(data: unknown) {
            storage.set(key, data as StoredDoc);
          },
          async update(data: unknown) {
            const existing = storage.get(key);
            if (existing) {
              storage.set(key, { ...existing, ...(data as StoredDoc) });
            }
          },
        };
        return docObj;
      },
      where: (field: string, op: string, value: unknown) => {
        let docs = Array.from(storage.entries())
          .filter(([key]) => key.startsWith(`${name}/`))
          .map(([key, data]) => ({
            id: key.replace(`${name}/`, ''),
            exists: true,
            data: () => data,
          }));

        // Apply filter
        docs = docs.filter((doc) => {
          const data = doc.data();
          if (data.docStatus === 'deleted') return false;
          if (op === '==') {
            return data[field] === value;
          }
          return true;
        });

        return {
          where: (f2: string, o2: string, v2: unknown) => {
            docs = docs.filter((doc) => {
              const data = doc.data();
              if (o2 === '==') {
                return data[f2] === v2;
              }
              return true;
            });
            return {
              orderBy: () => ({
                get: async () => ({ docs }),
                count: () => ({
                  get: async () => ({ data: () => ({ count: docs.length }) }),
                }),
                offset: () => ({
                  limit: () => ({
                    get: async () => ({ docs }),
                  }),
                }),
              }),
            };
          },
          orderBy: () => ({
            get: async () => ({ docs }),
            count: () => ({
              get: async () => ({ data: () => ({ count: docs.length }) }),
            }),
            offset: () => ({
              limit: () => ({
                get: async () => ({ docs }),
              }),
            }),
          }),
        };
      },
    }),
  };
}

test('createAssignment: should create an assignment with required fields', async () => {
  const storage = new Map<string, StoredDoc>();
  // Pre-populate with a class
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const assignment = await createAssignment(
    {
      classId: 'class-1',
      title: 'Math Homework 1',
      description: 'Complete pages 1-5',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-06',
      dueDate: '2025-01-13',
    },
    'teacher-uid',
    'Teacher Name'
  );

  assert.ok(assignment.id);
  assert.equal(assignment.title, 'Math Homework 1');
  assert.equal(assignment.type, 'homework');
  assert.equal(assignment.maxPoints, 100);
  assert.equal(assignment.status, 'draft');
  assert.equal(assignment.classId, 'class-1');
  assert.equal(assignment.createdBy, 'teacher-uid');
  assert.equal(assignment.createdByName, 'Teacher Name');
  assert.equal(assignment.docStatus, 'active');

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('getAssignmentById: should return assignment when exists', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const created = await createAssignment(
    {
      classId: 'class-1',
      title: 'Quiz 1',
      type: 'quiz',
      maxPoints: 50,
      assignedDate: '2025-01-10',
      dueDate: '2025-01-10',
    },
    'teacher-uid',
    'Teacher Name'
  );

  const fetched = await getAssignmentById(created.id);

  assert.ok(fetched);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.title, 'Quiz 1');
  assert.equal(fetched.type, 'quiz');

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('getAssignmentById: should return null for non-existent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await getAssignmentById('non-existent-id');

  assert.equal(result, null);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('getAssignmentById: should return null for deleted assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const created = await createAssignment(
    {
      classId: 'class-1',
      title: 'To Delete',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-01',
      dueDate: '2025-01-08',
    },
    'teacher-uid',
    'Teacher Name'
  );

  await deleteAssignment(created.id);

  const fetched = await getAssignmentById(created.id);

  assert.equal(fetched, null);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('updateAssignment: should update assignment fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const created = await createAssignment(
    {
      classId: 'class-1',
      title: 'Original Title',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-01',
      dueDate: '2025-01-08',
    },
    'teacher-uid',
    'Teacher Name'
  );

  const updated = await updateAssignment(
    created.id,
    {
      title: 'Updated Title',
      maxPoints: 150,
      status: 'published',
    },
    'editor-uid',
    'Editor Name'
  );

  assert.ok(updated);
  assert.equal(updated.title, 'Updated Title');
  assert.equal(updated.maxPoints, 150);
  assert.equal(updated.status, 'published');
  assert.equal(updated.updatedBy, 'editor-uid');
  assert.equal(updated.updatedByName, 'Editor Name');

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('updateAssignment: should return null for non-existent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await updateAssignment(
    'non-existent-id',
    { title: 'New Title' },
    'admin-uid',
    'Admin Name'
  );

  assert.equal(result, null);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('deleteAssignment: should soft delete assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const created = await createAssignment(
    {
      classId: 'class-1',
      title: 'To Be Deleted',
      type: 'test',
      maxPoints: 100,
      assignedDate: '2025-01-15',
      dueDate: '2025-01-15',
    },
    'teacher-uid',
    'Teacher Name'
  );

  const deleted = await deleteAssignment(created.id);

  assert.equal(deleted, true);

  // Verify the assignment is no longer retrievable
  const fetched = await getAssignmentById(created.id);
  assert.equal(fetched, null);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('deleteAssignment: should return false for non-existent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await deleteAssignment('non-existent-id');

  assert.equal(result, false);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('getAssignmentsByClass: should return assignments for a class', async () => {
  const storage = new Map<string, StoredDoc>();
  const counter = { value: 0 };
  storage.set('classes/class-1', { name: 'KG Class A', gradeId: 'grade-kg', gradeName: 'KG', teacherId: 'teacher-1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage, counter)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  // Create multiple assignments
  await createAssignment(
    {
      classId: 'class-1',
      title: 'Assignment 1',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-01',
      dueDate: '2025-01-08',
    },
    'teacher-uid',
    'Teacher Name'
  );

  await createAssignment(
    {
      classId: 'class-1',
      title: 'Assignment 2',
      type: 'quiz',
      maxPoints: 50,
      assignedDate: '2025-01-05',
      dueDate: '2025-01-05',
    },
    'teacher-uid',
    'Teacher Name'
  );

  const assignments = await getAssignmentsByClass('class-1');

  assert.equal(assignments.length, 2);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});
