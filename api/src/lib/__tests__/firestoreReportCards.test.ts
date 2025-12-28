import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateReportCard,
  getReportCardById,
  getReportCardsByClass,
  getReportCardsByStudent,
  updateReportCard,
  publishReportCard,
  deleteReportCard,
  __setAdminDbForTests,
} from '../firestoreReportCards';
import { __setAdminDbForTests as setClassesDbForTests } from '../firestoreClasses';
import { __setAdminDbForTests as setAssignmentsDbForTests } from '../firestoreAssignments';
import { __setAdminDbForTests as setStudentsDbForTests } from '../firestoreStudents';
import { __setAdminDbForTests as setGradesDbForTests } from '../firestoreStudentGrades';
import { __setAdminDbForTests as setAttendanceDbForTests } from '../firestoreAttendance';

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
        const buildQuery = (filters: Array<{ field: string; op: string; value: unknown }>) => {
          let docs = Array.from(storage.entries())
            .filter(([key]) => key.startsWith(`${name}/`))
            .map(([key, data]) => ({
              id: key.replace(`${name}/`, ''),
              exists: true,
              data: () => data,
            }));

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
            orderBy: () => ({
              get: async () => ({ docs }),
              count: () => ({
                get: async () => ({ data: () => ({ count: docs.length }) }),
              }),
              offset: (n: number) => ({
                limit: (m: number) => ({
                  get: async () => ({ docs: docs.slice(n, n + m) }),
                }),
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

  // Add published assignments
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

  // Add grades for student-1
  storage.set('studentGrades/grade-1', {
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    classId: 'class-1',
    pointsEarned: 85,
    maxPoints: 100,
    docStatus: 'active',
  });

  storage.set('studentGrades/grade-2', {
    assignmentId: 'assignment-2',
    studentId: 'student-1',
    classId: 'class-1',
    pointsEarned: 45,
    maxPoints: 50,
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage, counter)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);
  setAssignmentsDbForTests(fakeProvider);
  setStudentsDbForTests(fakeProvider);
  setGradesDbForTests(fakeProvider);
  setAttendanceDbForTests(fakeProvider);

  return { storage, counter };
}

function cleanupTestDb() {
  __setAdminDbForTests(null);
  setClassesDbForTests(null);
  setAssignmentsDbForTests(null);
  setStudentsDbForTests(null);
  setGradesDbForTests(null);
  setAttendanceDbForTests(null);
}

test('generateReportCard: should generate a report card for a student', async () => {
  setupTestDb();

  try {
    const reportCard = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
        teacherComments: 'Excellent progress!',
        conductGrade: 'A',
      },
      'teacher-uid',
      'Teacher Name'
    );

    assert.ok(reportCard.id);
    assert.equal(reportCard.classId, 'class-1');
    assert.equal(reportCard.studentId, 'student-1');
    assert.equal(reportCard.studentName, 'John Doe');
    assert.equal(reportCard.term, 'semester1');
    assert.equal(reportCard.academicYear, '2024-2025');
    assert.equal(reportCard.status, 'draft');
    assert.equal(reportCard.teacherComments, 'Excellent progress!');
    assert.equal(reportCard.conductGrade, 'A');
    assert.equal(reportCard.generatedBy, 'teacher-uid');
    assert.equal(reportCard.generatedByName, 'Teacher Name');
    assert.equal(reportCard.docStatus, 'active');
    assert.ok(reportCard.gradeBreakdown);
    assert.ok(reportCard.attendance);
  } finally {
    cleanupTestDb();
  }
});

test('generateReportCard: should update existing report card for same student/class/term', async () => {
  setupTestDb();

  try {
    // Create initial report card
    const rc1 = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
        teacherComments: 'Good start!',
      },
      'teacher-uid',
      'Teacher Name'
    );

    // Generate again for same student/class/term
    const rc2 = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
        teacherComments: 'Updated comments!',
      },
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(rc2.id, rc1.id); // Same report card updated
    assert.equal(rc2.teacherComments, 'Updated comments!');
  } finally {
    cleanupTestDb();
  }
});

test('getReportCardById: should return report card when exists', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const fetched = await getReportCardById(created.id);

    assert.ok(fetched);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.studentId, 'student-1');
  } finally {
    cleanupTestDb();
  }
});

test('getReportCardById: should return null for non-existent report card', async () => {
  setupTestDb();

  try {
    const result = await getReportCardById('non-existent-id');
    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('getReportCardsByClass: should return report cards for a class', async () => {
  setupTestDb();

  try {
    await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-2',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const reportCards = await getReportCardsByClass('class-1');

    assert.equal(reportCards.length, 2);
  } finally {
    cleanupTestDb();
  }
});

test('getReportCardsByStudent: should return report cards for a student', async () => {
  setupTestDb();

  try {
    await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const reportCards = await getReportCardsByStudent('student-1');

    assert.equal(reportCards.length, 1);
    assert.equal(reportCards[0].studentId, 'student-1');
  } finally {
    cleanupTestDb();
  }
});

test('updateReportCard: should update report card fields', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const updated = await updateReportCard(
      created.id,
      {
        teacherComments: 'Updated comments',
        conductGrade: 'B',
      },
      'editor-uid',
      'Editor Name'
    );

    assert.ok(updated);
    assert.equal(updated.teacherComments, 'Updated comments');
    assert.equal(updated.conductGrade, 'B');
    assert.equal(updated.updatedBy, 'editor-uid');
    assert.equal(updated.updatedByName, 'Editor Name');
  } finally {
    cleanupTestDb();
  }
});

test('updateReportCard: should return null for non-existent report card', async () => {
  setupTestDb();

  try {
    const result = await updateReportCard(
      'non-existent-id',
      { teacherComments: 'Test' },
      'admin-uid',
      'Admin Name'
    );

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

test('publishReportCard: should publish a report card', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(created.status, 'draft');

    const published = await publishReportCard(created.id, 'teacher-uid', 'Teacher Name');

    assert.ok(published);
    assert.equal(published.status, 'published');
    assert.ok(published.publishedAt);
  } finally {
    cleanupTestDb();
  }
});

test('deleteReportCard: should soft delete report card', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const deleted = await deleteReportCard(created.id);
    assert.equal(deleted, true);

    // Should not be retrievable after deletion
    const fetched = await getReportCardById(created.id);
    assert.equal(fetched, null);
  } finally {
    cleanupTestDb();
  }
});

test('deleteReportCard: should return false for non-existent report card', async () => {
  setupTestDb();

  try {
    const result = await deleteReportCard('non-existent-id');
    assert.equal(result, false);
  } finally {
    cleanupTestDb();
  }
});
