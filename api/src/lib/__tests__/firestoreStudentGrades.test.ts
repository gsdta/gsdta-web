import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOrUpdateGrade,
  bulkCreateGrades,
  getGradeById,
  getGradesByAssignment,
  getGradesByStudent,
  getGradesByStudentAndClass,
  getGrades,
  updateGrade,
  deleteGrade,
  getGradebook,
  calculateStudentClassGrade,
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

          const queryResult = {
            where: (f2: string, o2: string, v2: unknown) => {
              return buildQuery([...filters, { field: f2, op: o2, value: v2 }]);
            },
            orderBy: () => queryResult,
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

          return queryResult;
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

// ============================================
// createOrUpdateGrade edge cases
// ============================================

test('createOrUpdateGrade: should throw when assignment not found', async () => {
  setupTestDb();

  try {
    await createOrUpdateGrade(
      'non-existent-assignment',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok((err as Error).message.includes('Assignment not found'));
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should throw when class not found', async () => {
  const { storage } = setupTestDb();
  // Create assignment with non-existent class
  storage.set('assignments/assignment-bad-class', {
    classId: 'non-existent-class',
    title: 'Bad Assignment',
    type: 'homework',
    maxPoints: 100,
    status: 'published',
    docStatus: 'active',
  });

  try {
    await createOrUpdateGrade(
      'assignment-bad-class',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok((err as Error).message.includes('Class not found'));
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should throw when student not found', async () => {
  setupTestDb();

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'non-existent-student', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok((err as Error).message.includes('Student not found'));
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should include feedback when provided', async () => {
  setupTestDb();

  try {
    const grade = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85, feedback: 'Great work!' },
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(grade.feedback, 'Great work!');
  } finally {
    cleanupTestDb();
  }
});

test('createOrUpdateGrade: should limit edit history entries', async () => {
  setupTestDb();

  try {
    // Create initial grade
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 1 },
      'teacher-uid',
      'Teacher Name'
    );

    // Update many times to exceed MAX_EDIT_HISTORY (50)
    for (let i = 2; i <= 55; i++) {
      await createOrUpdateGrade(
        'assignment-1',
        { studentId: 'student-1', pointsEarned: i },
        'teacher-uid',
        'Teacher Name'
      );
    }

    const grade = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 100 },
      'teacher-uid',
      'Teacher Name'
    );

    // Edit history should be limited to 50
    assert.ok(grade.editHistory);
    assert.ok(grade.editHistory!.length <= 50);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// bulkCreateGrades tests
// ============================================

test('bulkCreateGrades: should create multiple grades', async () => {
  setupTestDb();

  try {
    const grades = await bulkCreateGrades(
      'assignment-1',
      [
        { studentId: 'student-1', pointsEarned: 85 },
        { studentId: 'student-2', pointsEarned: 92 },
      ],
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(grades.length, 2);
    assert.equal(grades[0].studentId, 'student-1');
    assert.equal(grades[0].pointsEarned, 85);
    assert.equal(grades[1].studentId, 'student-2');
    assert.equal(grades[1].pointsEarned, 92);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getGradesByStudentAndClass tests
// ============================================

test('getGradesByStudentAndClass: should return grades for student in class', async () => {
  const { storage } = setupTestDb();

  // Add second assignment
  storage.set('assignments/assignment-2', {
    classId: 'class-1',
    title: 'Quiz 1',
    type: 'quiz',
    maxPoints: 50,
    status: 'published',
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

    const grades = await getGradesByStudentAndClass('student-1', 'class-1');

    assert.equal(grades.length, 2);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getGrades with filters tests
// ============================================

test('getGrades: should return paginated grades', async () => {
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

    const result = await getGrades({ limit: 1, offset: 0 });

    assert.ok(result.grades.length <= 1);
    assert.ok(result.total >= 2);
  } finally {
    cleanupTestDb();
  }
});

test('getGrades: should filter by assignmentId', async () => {
  const { storage } = setupTestDb();

  storage.set('assignments/assignment-2', {
    classId: 'class-1',
    title: 'Quiz 1',
    type: 'quiz',
    maxPoints: 50,
    status: 'published',
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

    const result = await getGrades({ assignmentId: 'assignment-1' });

    assert.ok(result.grades.every(g => g.assignmentId === 'assignment-1'));
  } finally {
    cleanupTestDb();
  }
});

test('getGrades: should filter by studentId', async () => {
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

    const result = await getGrades({ studentId: 'student-1' });

    assert.ok(result.grades.every(g => g.studentId === 'student-1'));
  } finally {
    cleanupTestDb();
  }
});

test('getGrades: should filter by classId', async () => {
  setupTestDb();

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );

    const result = await getGrades({ classId: 'class-1' });

    assert.ok(result.grades.every(g => g.classId === 'class-1'));
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// updateGrade edge cases
// ============================================

test('updateGrade: should return null for deleted grade', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 75 },
      'teacher-uid',
      'Teacher Name'
    );

    await deleteGrade(created.id);

    const result = await updateGrade(
      created.id,
      { pointsEarned: 88 },
      'editor-uid',
      'Editor Name'
    );

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('updateGrade: should update feedback only', async () => {
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
      { feedback: 'New feedback' },
      'editor-uid',
      'Editor Name'
    );

    assert.ok(updated);
    assert.equal(updated.pointsEarned, 75); // Unchanged
    assert.equal(updated.feedback, 'New feedback');
  } finally {
    cleanupTestDb();
  }
});

test('updateGrade: should limit edit history entries', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 1 },
      'teacher-uid',
      'Teacher Name'
    );

    // Update many times to exceed MAX_EDIT_HISTORY (50)
    let lastGrade = created;
    for (let i = 2; i <= 55; i++) {
      const updated = await updateGrade(
        created.id,
        { pointsEarned: i },
        'editor-uid',
        'Editor Name'
      );
      if (updated) lastGrade = updated;
    }

    // Edit history should be limited to 50
    assert.ok(lastGrade.editHistory);
    assert.ok(lastGrade.editHistory!.length <= 50);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// deleteGrade edge cases
// ============================================

test('deleteGrade: should return false for already deleted grade', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 80 },
      'teacher-uid',
      'Teacher Name'
    );

    await deleteGrade(created.id);
    const result = await deleteGrade(created.id);

    assert.equal(result, false);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getGradeById edge cases
// ============================================

test('getGradeById: should return null for deleted grade', async () => {
  setupTestDb();

  try {
    const created = await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 80 },
      'teacher-uid',
      'Teacher Name'
    );

    await deleteGrade(created.id);
    const result = await getGradeById(created.id);

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getGradebook tests
// ============================================

test('getGradebook: should return null for non-existent class', async () => {
  setupTestDb();

  try {
    const result = await getGradebook('non-existent-class');
    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('getGradebook: should return gradebook for class', async () => {
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

    const gradebook = await getGradebook('class-1');

    assert.ok(gradebook);
    assert.equal(gradebook.classId, 'class-1');
    assert.equal(gradebook.className, 'KG Class A');
    assert.ok(Array.isArray(gradebook.students));
    assert.ok(Array.isArray(gradebook.assignments));
    assert.ok(typeof gradebook.classAverage === 'number');
  } finally {
    cleanupTestDb();
  }
});

test('getGradebook: should calculate student averages', async () => {
  const { storage } = setupTestDb();

  // Add second assignment
  storage.set('assignments/assignment-2', {
    classId: 'class-1',
    title: 'Quiz 1',
    type: 'quiz',
    maxPoints: 50,
    status: 'published',
    docStatus: 'active',
  });

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 80 },
      'teacher-uid',
      'Teacher Name'
    );

    await createOrUpdateGrade(
      'assignment-2',
      { studentId: 'student-1', pointsEarned: 40 },
      'teacher-uid',
      'Teacher Name'
    );

    const gradebook = await getGradebook('class-1');

    assert.ok(gradebook);
    const student1Row = gradebook.students.find(s => s.studentId === 'student-1');
    assert.ok(student1Row);
    // 80/100 + 40/50 = 120/150 = 80%
    assert.equal(student1Row.averagePercentage, 80);
    assert.equal(student1Row.letterGrade, 'B');
    assert.equal(student1Row.totalPoints, 120);
    assert.equal(student1Row.maxPoints, 150);
  } finally {
    cleanupTestDb();
  }
});

test('getGradebook: should sort students by name', async () => {
  setupTestDb();

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-2', pointsEarned: 92 },
      'teacher-uid',
      'Teacher Name'
    );

    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 85 },
      'teacher-uid',
      'Teacher Name'
    );

    const gradebook = await getGradebook('class-1');

    assert.ok(gradebook);
    // Students should be sorted by name (Jane Smith before John Doe)
    if (gradebook.students.length >= 2) {
      const names = gradebook.students.map(s => s.studentName);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepEqual(names, sortedNames);
    }
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// calculateStudentClassGrade tests
// ============================================

test('calculateStudentClassGrade: should calculate overall grade', async () => {
  const { storage } = setupTestDb();

  storage.set('assignments/assignment-2', {
    classId: 'class-1',
    title: 'Quiz 1',
    type: 'quiz',
    maxPoints: 50,
    status: 'published',
    docStatus: 'active',
  });

  try {
    await createOrUpdateGrade(
      'assignment-1',
      { studentId: 'student-1', pointsEarned: 90 },
      'teacher-uid',
      'Teacher Name'
    );

    await createOrUpdateGrade(
      'assignment-2',
      { studentId: 'student-1', pointsEarned: 45 },
      'teacher-uid',
      'Teacher Name'
    );

    const result = await calculateStudentClassGrade('student-1', 'class-1');

    // 90/100 + 45/50 = 135/150 = 90%
    assert.equal(result.percentage, 90);
    assert.equal(result.letterGrade, 'A');
    assert.equal(result.totalPoints, 135);
    assert.equal(result.maxPoints, 150);
    assert.equal(result.gradeCount, 2);
  } finally {
    cleanupTestDb();
  }
});

test('calculateStudentClassGrade: should return zero for no grades', async () => {
  setupTestDb();

  try {
    const result = await calculateStudentClassGrade('student-1', 'class-1');

    assert.equal(result.percentage, 0);
    assert.equal(result.letterGrade, 'F');
    assert.equal(result.totalPoints, 0);
    assert.equal(result.maxPoints, 0);
    assert.equal(result.gradeCount, 0);
  } finally {
    cleanupTestDb();
  }
});
