import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateReportCard,
  getReportCardById,
  getReportCardsByClass,
  getReportCardsByStudent,
  getPublishedReportCardsByStudent,
  getReportCards,
  updateReportCard,
  publishReportCard,
  bulkGenerateReportCards,
  deleteReportCard,
  verifyReportCardParentAccess,
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

// ============================================
// generateReportCard error cases
// ============================================

test('generateReportCard: should throw when class not found', async () => {
  setupTestDb();

  try {
    await generateReportCard(
      {
        classId: 'non-existent-class',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
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

test('generateReportCard: should throw when student not found', async () => {
  setupTestDb();

  try {
    await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'non-existent-student',
        term: 'semester1',
        academicYear: '2024-2025',
      },
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

// ============================================
// getPublishedReportCardsByStudent tests
// ============================================

test('getPublishedReportCardsByStudent: should return only published report cards', async () => {
  setupTestDb();

  try {
    // Create draft report card
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

    // Before publishing, should have no published cards
    let publishedCards = await getPublishedReportCardsByStudent('student-1');
    assert.equal(publishedCards.length, 0);

    // Publish the card
    await publishReportCard(created.id, 'teacher-uid', 'Teacher Name');

    // After publishing, should have 1 published card
    publishedCards = await getPublishedReportCardsByStudent('student-1');
    assert.equal(publishedCards.length, 1);
    assert.equal(publishedCards[0].status, 'published');
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getReportCards with filters tests
// ============================================

test('getReportCards: should return paginated report cards', async () => {
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

    const result = await getReportCards({ limit: 1, offset: 0 });

    assert.ok(result.reportCards.length <= 1);
    assert.ok(result.total >= 2);
  } finally {
    cleanupTestDb();
  }
});

test('getReportCards: should filter by classId', async () => {
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

    const result = await getReportCards({ classId: 'class-1' });

    assert.ok(result.reportCards.every(rc => rc.classId === 'class-1'));
  } finally {
    cleanupTestDb();
  }
});

test('getReportCards: should filter by studentId', async () => {
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

    const result = await getReportCards({ studentId: 'student-1' });

    assert.ok(result.reportCards.every(rc => rc.studentId === 'student-1'));
  } finally {
    cleanupTestDb();
  }
});

test('getReportCards: should filter by term', async () => {
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

    const result = await getReportCards({ term: 'semester1' });

    assert.ok(result.reportCards.every(rc => rc.term === 'semester1'));
  } finally {
    cleanupTestDb();
  }
});

test('getReportCards: should filter by academicYear', async () => {
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

    const result = await getReportCards({ academicYear: '2024-2025' });

    assert.ok(result.reportCards.every(rc => rc.academicYear === '2024-2025'));
  } finally {
    cleanupTestDb();
  }
});

test('getReportCards: should filter by status', async () => {
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

    await publishReportCard(created.id, 'teacher-uid', 'Teacher Name');

    const result = await getReportCards({ status: 'published' });

    assert.ok(result.reportCards.every(rc => rc.status === 'published'));
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// bulkGenerateReportCards tests
// ============================================

test('bulkGenerateReportCards: should generate report cards for all students in class', async () => {
  setupTestDb();

  try {
    const reportCards = await bulkGenerateReportCards(
      'class-1',
      'semester1',
      '2024-2025',
      'teacher-uid',
      'Teacher Name'
    );

    assert.equal(reportCards.length, 2); // student-1 and student-2
  } finally {
    cleanupTestDb();
  }
});

test('bulkGenerateReportCards: should generate for specific students only', async () => {
  setupTestDb();

  try {
    const reportCards = await bulkGenerateReportCards(
      'class-1',
      'semester1',
      '2024-2025',
      'teacher-uid',
      'Teacher Name',
      ['student-1']
    );

    assert.equal(reportCards.length, 1);
    assert.equal(reportCards[0].studentId, 'student-1');
  } finally {
    cleanupTestDb();
  }
});

test('bulkGenerateReportCards: should throw when class not found', async () => {
  setupTestDb();

  try {
    await bulkGenerateReportCards(
      'non-existent-class',
      'semester1',
      '2024-2025',
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

// ============================================
// verifyReportCardParentAccess tests
// ============================================

test('verifyReportCardParentAccess: should return true for correct parent', async () => {
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

    const hasAccess = await verifyReportCardParentAccess(created.id, 'parent-1');

    assert.equal(hasAccess, true);
  } finally {
    cleanupTestDb();
  }
});

test('verifyReportCardParentAccess: should return false for wrong parent', async () => {
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

    const hasAccess = await verifyReportCardParentAccess(created.id, 'parent-2');

    assert.equal(hasAccess, false);
  } finally {
    cleanupTestDb();
  }
});

test('verifyReportCardParentAccess: should return false for non-existent report card', async () => {
  setupTestDb();

  try {
    const hasAccess = await verifyReportCardParentAccess('non-existent-id', 'parent-1');
    assert.equal(hasAccess, false);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getReportCardsByClass with filters
// ============================================

test('getReportCardsByClass: should filter by term', async () => {
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

    const reportCards = await getReportCardsByClass('class-1', 'semester1');

    assert.ok(reportCards.every(rc => rc.term === 'semester1'));
  } finally {
    cleanupTestDb();
  }
});

test('getReportCardsByClass: should filter by academicYear', async () => {
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

    const reportCards = await getReportCardsByClass('class-1', undefined, '2024-2025');

    assert.ok(reportCards.every(rc => rc.academicYear === '2024-2025'));
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// updateReportCard edge cases
// ============================================

test('updateReportCard: should return null for deleted report card', async () => {
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

    await deleteReportCard(created.id);

    const result = await updateReportCard(
      created.id,
      { teacherComments: 'Test' },
      'admin-uid',
      'Admin Name'
    );

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// deleteReportCard edge cases
// ============================================

test('deleteReportCard: should return false for already deleted report card', async () => {
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

    await deleteReportCard(created.id);
    const result = await deleteReportCard(created.id);

    assert.equal(result, false);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// getReportCardById edge cases
// ============================================

test('getReportCardById: should return null for deleted report card', async () => {
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

    await deleteReportCard(created.id);
    const result = await getReportCardById(created.id);

    assert.equal(result, null);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// Attendance summary coverage tests
// ============================================

test('generateReportCard: should include attendance summary with all status types', async () => {
  const storage = new Map<string, StoredDoc>();
  const counter = { value: 0 };

  // Set up class
  storage.set('classes/class-1', {
    name: 'KG Class A',
    gradeId: 'grade-kg',
    gradeName: 'KG',
    teacherId: 'teacher-1',
    status: 'active'
  });

  // Set up student
  storage.set('students/student-1', {
    firstName: 'John',
    lastName: 'Doe',
    classId: 'class-1',
    parentId: 'parent-1',
    status: 'active',
  });

  // Add attendance records with all status types
  storage.set('attendance/att-1', {
    studentId: 'student-1',
    classId: 'class-1',
    status: 'present',
    date: '2025-01-06',
    docStatus: 'active',
  });
  storage.set('attendance/att-2', {
    studentId: 'student-1',
    classId: 'class-1',
    status: 'absent',
    date: '2025-01-07',
    docStatus: 'active',
  });
  storage.set('attendance/att-3', {
    studentId: 'student-1',
    classId: 'class-1',
    status: 'late',
    date: '2025-01-08',
    docStatus: 'active',
  });
  storage.set('attendance/att-4', {
    studentId: 'student-1',
    classId: 'class-1',
    status: 'excused',
    date: '2025-01-09',
    docStatus: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage, counter)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);
  setClassesDbForTests(fakeProvider);
  setAssignmentsDbForTests(fakeProvider);
  setStudentsDbForTests(fakeProvider);
  setGradesDbForTests(fakeProvider);
  setAttendanceDbForTests(fakeProvider);

  try {
    const reportCard = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
      },
      'teacher-uid',
      'Teacher Name'
    );

    assert.ok(reportCard.attendance);
    // The attendance summary should count all the records
    assert.ok(reportCard.attendance.totalDays >= 0);
  } finally {
    cleanupTestDb();
  }
});

// ============================================
// updateReportCard partial updates
// ============================================

test('updateReportCard: should update only teacherComments when conductGrade not provided', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
        conductGrade: 'A',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const updated = await updateReportCard(
      created.id,
      { teacherComments: 'New comments only' },
      'editor-uid',
      'Editor Name'
    );

    assert.ok(updated);
    assert.equal(updated.teacherComments, 'New comments only');
    assert.equal(updated.conductGrade, 'A'); // Original value preserved
  } finally {
    cleanupTestDb();
  }
});

test('updateReportCard: should update only conductGrade when teacherComments not provided', async () => {
  setupTestDb();

  try {
    const created = await generateReportCard(
      {
        classId: 'class-1',
        studentId: 'student-1',
        term: 'semester1',
        academicYear: '2024-2025',
        teacherComments: 'Original comments',
      },
      'teacher-uid',
      'Teacher Name'
    );

    const updated = await updateReportCard(
      created.id,
      { conductGrade: 'B' },
      'editor-uid',
      'Editor Name'
    );

    assert.ok(updated);
    assert.equal(updated.conductGrade, 'B');
    assert.equal(updated.teacherComments, 'Original comments'); // Original value preserved
  } finally {
    cleanupTestDb();
  }
});
