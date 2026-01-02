import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssignment,
  getAssignmentById,
  getAssignmentsByClass,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  closeAssignment,
  getAssignmentSummary,
  verifyAssignmentTeacher,
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
          where: function whereInner(f2: string, o2: string, v2: unknown) {
            docs = docs.filter((doc) => {
              const data = doc.data();
              if (o2 === '==') {
                return data[f2] === v2;
              }
              return true;
            });
            const queryResult = {
              where: whereInner,
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
            return queryResult;
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

// ============================================
// Additional tests for uncovered functions
// ============================================

test('getAssignmentsByClass: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    classId: 'class-1',
    status: 'published',
    docStatus: 'active',
  });
  storage.set('assignments/a2', {
    classId: 'class-1',
    status: 'draft',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const assignments = await getAssignmentsByClass('class-1', 'published');

  assert.ok(Array.isArray(assignments));

  __setAdminDbForTests(null);
});

test('createAssignment: should throw when class not found', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  try {
    await createAssignment(
      {
        classId: 'nonexistent',
        title: 'Test',
        type: 'homework',
        maxPoints: 100,
        assignedDate: '2025-01-01',
        dueDate: '2025-01-08',
      },
      'teacher-uid',
      'Teacher Name'
    );
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    assert.ok((err as Error).message.includes('Class not found'));
  }

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('createAssignment: should use default weight when not provided', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'Class A', gradeId: 'g1', gradeName: 'Grade 1' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const assignment = await createAssignment(
    {
      classId: 'class-1',
      title: 'Test',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-01',
      dueDate: '2025-01-08',
      // No weight provided
    },
    'teacher-uid',
    'Teacher Name'
  );

  assert.ok(assignment.weight); // Should have default weight

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('createAssignment: should use custom weight when provided', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'Class A', gradeId: 'g1', gradeName: 'Grade 1' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const assignment = await createAssignment(
    {
      classId: 'class-1',
      title: 'Test',
      type: 'homework',
      maxPoints: 100,
      assignedDate: '2025-01-01',
      dueDate: '2025-01-08',
      weight: 2.0,
    },
    'teacher-uid',
    'Teacher Name'
  );

  assert.equal(assignment.weight, 2.0);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('getAssignments: should return assignments with filters', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    classId: 'class-1',
    type: 'homework',
    status: 'published',
    docStatus: 'active',
    dueDate: '2025-01-15',
  });
  storage.set('assignments/a2', {
    classId: 'class-2',
    type: 'quiz',
    status: 'draft',
    docStatus: 'active',
    dueDate: '2025-01-20',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignments({});

  assert.ok(result.assignments);
  assert.equal(result.total, 2);

  __setAdminDbForTests(null);
});

test('getAssignments: should filter by classId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', { classId: 'class-1', docStatus: 'active' });
  storage.set('assignments/a2', { classId: 'class-2', docStatus: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignments({ classId: 'class-1' });

  assert.equal(result.total, 1);

  __setAdminDbForTests(null);
});

test('getAssignments: should filter by type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', { type: 'homework', docStatus: 'active' });
  storage.set('assignments/a2', { type: 'quiz', docStatus: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignments({ type: 'homework' });

  assert.equal(result.total, 1);

  __setAdminDbForTests(null);
});

test('getAssignments: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', { status: 'published', docStatus: 'active' });
  storage.set('assignments/a2', { status: 'draft', docStatus: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignments({ status: 'published' });

  assert.equal(result.total, 1);

  __setAdminDbForTests(null);
});

test('updateAssignment: should return null for deleted assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    title: 'Test',
    docStatus: 'deleted',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await updateAssignment('a1', { title: 'New Title' }, 'uid', 'Name');

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('updateAssignment: should update all optional fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'Class A' });
  storage.set('assignments/a1', {
    classId: 'class-1',
    title: 'Original',
    description: 'Desc',
    type: 'homework',
    maxPoints: 100,
    weight: 1.0,
    assignedDate: '2025-01-01',
    dueDate: '2025-01-08',
    status: 'draft',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const updated = await updateAssignment(
    'a1',
    {
      title: 'Updated',
      description: 'New desc',
      type: 'quiz',
      maxPoints: 50,
      weight: 2.0,
      assignedDate: '2025-02-01',
      dueDate: '2025-02-08',
      status: 'published',
    },
    'editor-uid',
    'Editor'
  );

  assert.ok(updated);
  assert.equal(updated?.title, 'Updated');
  assert.equal(updated?.description, 'New desc');
  assert.equal(updated?.type, 'quiz');
  assert.equal(updated?.maxPoints, 50);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('deleteAssignment: should return false for already deleted assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', { docStatus: 'deleted' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await deleteAssignment('a1');

  assert.equal(result, false);

  __setAdminDbForTests(null);
});

test('publishAssignment: should change status to published', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'Class A' });
  storage.set('assignments/a1', {
    classId: 'class-1',
    status: 'draft',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await publishAssignment('a1', 'editor-uid', 'Editor');

  assert.ok(result);
  assert.equal(result?.status, 'published');

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('publishAssignment: should return null for nonexistent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await publishAssignment('nonexistent', 'uid', 'Name');

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('closeAssignment: should change status to closed', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', { name: 'Class A' });
  storage.set('assignments/a1', {
    classId: 'class-1',
    status: 'published',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await closeAssignment('a1', 'editor-uid', 'Editor');

  assert.ok(result);
  assert.equal(result?.status, 'closed');

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('closeAssignment: should return null for nonexistent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await closeAssignment('nonexistent', 'uid', 'Name');

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('getAssignmentSummary: should return null for nonexistent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignmentSummary('nonexistent', []);

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('getAssignmentSummary: should calculate stats with grades', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    title: 'Test Assignment',
    maxPoints: 100,
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const grades = [
    { pointsEarned: 80, maxPoints: 100 },
    { pointsEarned: 90, maxPoints: 100 },
    { pointsEarned: 70, maxPoints: 100 },
  ];

  const result = await getAssignmentSummary('a1', grades);

  assert.ok(result);
  assert.equal(result?.stats.totalStudents, 3);
  assert.equal(result?.stats.gradedCount, 3);
  assert.equal(result?.stats.highScore, 90);
  assert.equal(result?.stats.lowScore, 70);
  assert.equal(result?.stats.averageScore, 80);

  __setAdminDbForTests(null);
});

test('getAssignmentSummary: should handle empty grades', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    title: 'Test',
    maxPoints: 100,
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getAssignmentSummary('a1', []);

  assert.ok(result);
  assert.equal(result?.stats.totalStudents, 0);
  assert.equal(result?.stats.gradedCount, 0);
  assert.equal(result?.stats.averageScore, 0);
  assert.equal(result?.stats.lowScore, 0);

  __setAdminDbForTests(null);
});

test('getAssignmentSummary: should filter out ungraded entries', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    title: 'Test',
    maxPoints: 100,
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const grades = [
    { pointsEarned: 80, maxPoints: 100 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { pointsEarned: undefined as any, maxPoints: 100 }, // Ungraded
    { pointsEarned: 60, maxPoints: 100 },
  ];

  const result = await getAssignmentSummary('a1', grades);

  assert.ok(result);
  assert.equal(result?.stats.totalStudents, 3);
  assert.equal(result?.stats.gradedCount, 2);
  assert.equal(result?.stats.averageScore, 70);

  __setAdminDbForTests(null);
});

test('verifyAssignmentTeacher: should return false for nonexistent assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await verifyAssignmentTeacher('nonexistent', 'teacher-uid');

  assert.equal(result, false);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('verifyAssignmentTeacher: should return false for nonexistent class', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('assignments/a1', {
    classId: 'nonexistent-class',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await verifyAssignmentTeacher('a1', 'teacher-uid');

  assert.equal(result, false);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('verifyAssignmentTeacher: should return true for matching teacher', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', {
    name: 'Class A',
    teacherId: 'teacher-uid',
  });
  storage.set('assignments/a1', {
    classId: 'class-1',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await verifyAssignmentTeacher('a1', 'teacher-uid');

  assert.equal(result, true);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});

test('verifyAssignmentTeacher: should return false for non-matching teacher', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('classes/class-1', {
    name: 'Class A',
    teacherId: 'other-teacher',
  });
  storage.set('assignments/a1', {
    classId: 'class-1',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);

  const result = await verifyAssignmentTeacher('a1', 'teacher-uid');

  assert.equal(result, false);

  __setAdminDbForTests(null);
  setClassesDbForTests(null);
});
