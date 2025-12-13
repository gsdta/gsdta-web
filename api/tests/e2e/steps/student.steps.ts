import { Given } from '@cucumber/cucumber';
import { adminDb } from '../../../src/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const STUDENTS_COLLECTION = 'students';
const CLASSES_COLLECTION = 'classes';

Given('there is a student with id {string} with status {string}', async function (id: string, status: string) {
  const db = adminDb();
  await db.collection(STUDENTS_COLLECTION).doc(id).set({
    id,
    firstName: 'Test',
    lastName: 'Student',
    dateOfBirth: '2015-01-01',
    grade: '1st Grade',
    status,
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});

Given('there is a student with id {string} belonging to parent {string}', async function (id: string, parentId: string) {
  const db = adminDb();
  // Determine parent email based on ID (simple mapping for tests)
  let parentEmail = 'parent@test.com';
  if (parentId === 'parent-test-002') parentEmail = 'parent2@test.com';

  await db.collection(STUDENTS_COLLECTION).doc(id).set({
    id,
    firstName: 'Test',
    lastName: 'Student',
    dateOfBirth: '2015-01-01',
    grade: '1st Grade',
    status: 'pending',
    parentId,
    parentEmail,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});

Given('the class {string} has {int} students enrolled', async function (classId: string, count: number) {
  const db = adminDb();
  await db.collection(CLASSES_COLLECTION).doc(classId).set({
    id: classId,
    name: 'Test Class',
    gradeId: 'test-grade-id',
    gradeName: 'Beginner',
    status: 'active',
    enrolled: count,
    capacity: 20,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
});