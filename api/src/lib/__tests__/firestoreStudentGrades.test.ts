import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOrUpdateGrade,
  getGradeById,
  getGradesByAssignment,
  getGradesByStudent,
  updateGrade,
  deleteGrade,
  getGradebook,
  __setAdminDbForTests,
} from '../firestoreStudentGrades';
import { __setAdminDbForTests as setClassesDbForTests } from '../firestoreClasses';
import { __setAdminDbForTests as setAssignmentsDbForTests } from '../firestoreAssignments';
import { __setAdminDbForTests as setStudentsDbForTests } from '../firestoreStudents';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map(), counterRef: { value: number } = { value: 0 }) {
  const makeDocRef = (collectionName: string, docId: string) => {
    const key = `${collectionName}/${docId}`;
    const docObj: {
      id: string;
      get: () => Promise<{ id: string; exists: boolean; data: () => StoredDoc | null; ref: typeof docObj }>;
      set: (data: unknown) => Promise<void>;
      update: (data: unknown) => Promise<void>;
    } = {
      id: docId,
      async get() {
        const data = storage.get(key);
        return {
          id: docId,
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
  };

  return {
    collection: (name: string) => ({
      doc: (uid?: string) => {
        const id = uid || `auto-id-${++counterRef.value}`;
        return makeDocRef(name, id);
      },
      where: (field: string, op: string, value: unknown) => {
        const buildQuery = (filters: Array<{ field: string; op: string; value: unknown }>) => {
          let docs = Array.from(storage.entries())
            .filter(([key]) => key.startsWith(`${name}/`))
            .map(([key, data]) => {
              const docId = key.replace(`${name}/`, '');
              const ref = makeDocRef(name, docId);
              return {
                id: docId,
                exists: true,
                data: () => data,
                ref,
              };
            });

          // Apply all filters
          for (const filter of filters) {
            docs = docs.filter((doc) => {
              const data = doc.data();
              if (filter.op === '==') {
                return data[filter.field] === filter.value;
              }
              return true;
            });
          }

          return {
            where: (f2: string, o2: string, v2: unknown) => {
              return buildQuery([...filters, { field: f2, op: o2, value: v2 }]);
            },
            limit: (n: number) => ({
              get: async () => ({ docs: docs.slice(0, n), empty: docs.length === 0 }),
            }),
            count: () => ({
              get: async () => ({ data: () => ({ count: docs.length }) }),
            }),
            offset: (n: number) => ({
              limit: (m: number) => ({
                get: async () => ({ docs: docs.slice(n, n + m) }),
              }),
            }),
            get: async () => ({ docs, empty: docs.length === 0 }),
          };
        };

        return buildQuery([{ field, op, value }]);
      },
    }),
  };
}

function setupTestDb() {
  const storage = new Map<string, StoredDoc>();
  const counter = { value: 0 };

  // Pre-populate with test data
  storage.set('classes/class-1', {
    name: 'KG Class A',
    gradeId: 'grade-kg',
    gradeName: 'KG',
    teacherId: 'teacher-1',
    status: 'active'
  });

  storage.set('students/student-1', {
    firstName: 'John',
    lastName: 'Doe',
    classId: 'class-1',
    parentId: 'parent-1',
    status: 'active',
  });

  storage.set('students/student-2', {
    firstName: 'Jane',
    lastName: 'Smith',
    classId: 'class-1',
    parentId: 'parent-2',
    status: 'active',
  });

  storage.set('assignments/assignment-1', {
    classId: 'class-1',
    title: 'Math Homework 1',
    type: 'homework',
    maxPoints: 100,
    status: 'published',
    assignedDate: '2025-01-06',
    dueDate: '2025-01-13',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage, counter)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);
  setAssignmentsDbForTests(fakeProvider);
  setStudentsDbForTests(fakeProvider);

  return { storage, counter };
}

function cleanupTestDb() {
  __setAdminDbForTests(null);
  setClassesDbForTests(null);
  setAssignmentsDbForTests(null);
  setStudentsDbForTests(null);
}

test('createOrUpdateGrade: should create a new grade for a student', async () => {
  setupTestDb();

  try {
    const grade = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );

    assert.ok(grade.id);
    assert.equal(grade.assignmentId, 'assignment-1');
    assert.equal(grade.studentId, 'student-1');
    assert.equal(grade.pointsEarned, 85);
    assert.equal(grade.maxPoints, 100);
    assert.equal(grade.percentage, 85);
    assert.equal(grade.letterGrade, 'B');
    assert.equal(grade.studentName, 'John Doe');
    assert.equal(grade.gradedBy, 'teacher-uid');
    assert.equal(grade.gradedByName, 'Teacher Name');
    assert.equal(grade.docStatus, 'active');
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should update existing grade for same student/assignment', async () => {
  setupTestDb();

  try {
    // Create initial grade
    const grade1 = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 70 },
      'teacher-uid',
      'Teacher Name'
    );

    // Update grade
    const grade2 = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 90 },
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(grade2.id, grade1.id); // Same grade updated
    assert.equal(grade2.pointsEarned, 90);
    assert.equal(grade2.percentage, 90);
    assert.equal(grade2.letterGrade, 'A');
    assert.ok(grade2.editHistory);
    assert.equal(grade2.editHistory!.length, 1);
    assert.equal(grade2.editHistory![0].previousPoints, 70);
    assert.equal(grade2.editHistory![0].newPoints, 90);
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should calculate letter grades correctly', async () => {
  setupTestDb();

  try {
    // A grade (90+)
    const gradeA = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 95 },
      'teacher-uid',
      'Teacher Name'
    );
    assert.equal(gradeA.letterGrade, 'A');

    // Clean up and re-setup for next test
  } finally {
    cleanupTestDb();
  }
});

test('getGradeById: should return grade when exists', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 80 },
      'teacher-uid',
      'Teacher Name'
    );

    const fetched = await getGradeById(created.id);

    assert.ok(fetched);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.pointsEarned, 80);
  } finally {
    cleanupTestDb();
  }
});

test('getGradeById: should return null for non-existent grade', async () => {
  setupTestDb();

  try {
    const result = await getGradeById('non-existent-id');
    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('getGradesByAssignment: should return all grades for an assignment', async () => {
  setupTestDb();

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );

    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-2', pointsEarned: 92 },
      'teacher-uid',
      'Teacher Name'
    );

    const grades = await getGradesByAssignment('assignment-1');

    assert.equal(grades.length, 2);
  } finally {
    cleanupTestDb();
  }
});

test('getGradesByStudent: should return all grades for a student', async () => {
  const { storage, counter } = setupTestDb();

  // Add second assignment
  storage.set('assignments/assignment-2', {
    classId: 'class-1',
    title: 'Quiz 1',
    type: 'quiz',
    maxPoints: 50,
    status: 'published',
    assignedDate: '2025-01-10',
    dueDate: '2025-01-10',
    docStatus: 'active',
  });

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );

    await createOrUpdateGrade(
      'assignment-2',
      { studentId: 'student-1', pointsEarned: 45 },
      'teacher-uid',
      'Teacher Name'
    );

    const grades = await getGradesByStudent('student-1');

    assert.equal(grades.length, 2);
  } finally {
    cleanupTestDb();
  }
});

test('updateGrade: should update grade fields', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 75 },
      'teacher-uid',
      'Teacher Name'
    );

    const updated = await updateGrade(
      created.id,
      { pointsEarned: 88, feedback: 'Great improvement!', editReason: 'Recalculated' },
      'editor-uid',
      'Editor Name'
    );

    assert.ok(updated);
    assert.equal(updated.pointsEarned, 88);
    assert.equal(updated.feedback, 'Great improvement!');
    assert.equal(updated.lastEditedBy, 'editor-uid');
    assert.equal(updated.lastEditedByName, 'Editor Name');
    assert.ok(updated.editHistory);
    assert.equal(updated.editHistory!.length, 1);
    assert.equal(updated.editHistory![0].reason, 'Recalculated');
  } finally {
    cleanupTestDb();
  }
});

test('updateGrade: should return null for non-existent grade', async () => {
  setupTestDb();

  try {
    const result = await updateGrade(
      'non-existent-id',
      { pointsEarned: 100 },
      'admin-uid',
      'Admin Name'
    );

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('deleteGrade: should soft delete grade', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 80 },
      'teacher-uid',
      'Teacher Name'
    );

    const deleted = await deleteGrade(created.id);
    assert.equal(deleted, true);

    // Should not be retrievable after deletion
    const fetched = await getGradeById(created.id);
    assert.equal(fetched, null);
  } finally {
    cleanupTestDb();
  }
});

test('deleteGrade: should return false for non-existent grade', async () => {
  setupTestDb();

  try {
    const result = await deleteGrade('non-existent-id');
    assert.equal(result, false);
  } finally {
    cleanupTestDb();
  }
});
