import { Given, After } from '@cucumber/cucumber';
import { adminDb } from '../../../src/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const STUDENTS_COLLECTION = 'students';
const CLASSES_COLLECTION = 'classes';
const GRADES_COLLECTION = 'grades';

// Track test data created during each scenario for cleanup
let testDataIds: {
  students: string[];
  classes: string[];
  grades: string[];
} = {
  students: [],
  classes: [],
  grades: [],
};

// Clean up test data after each scenario
After(async function () {
  const db = adminDb();
  const batch = db.batch();
  
  // Delete test students
  for (const studentId of testDataIds.students) {
    batch.delete(db.collection(STUDENTS_COLLECTION).doc(studentId));
  }
  
  // Delete test classes
  for (const classId of testDataIds.classes) {
    batch.delete(db.collection(CLASSES_COLLECTION).doc(classId));
  }
  
  // Delete test grades
  for (const gradeId of testDataIds.grades) {
    batch.delete(db.collection(GRADES_COLLECTION).doc(gradeId));
  }
  
  // Commit deletions
  if (testDataIds.students.length > 0 || testDataIds.classes.length > 0 || testDataIds.grades.length > 0) {
    await batch.commit();
  }
  
  // Reset tracking
  testDataIds = {
    students: [],
    classes: [],
    grades: [],
  };
});

Given('there is a grade with id {string} and name {string}', async function (id: string, name: string) {
  const db = adminDb();
  await db.collection(GRADES_COLLECTION).doc(id).set({
    id,
    name,
    displayName: name,
    order: 1,
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  testDataIds.grades.push(id);
});

Given('there is a class with id {string} for grade {string} with capacity {int}', async function (
  classId: string,
  gradeId: string,
  capacity: number
) {
  const db = adminDb();
  
  // Get grade name
  const gradeDoc = await db.collection(GRADES_COLLECTION).doc(gradeId).get();
  const gradeName = gradeDoc.exists ? gradeDoc.data()!.name : 'Unknown Grade';
  
  await db.collection(CLASSES_COLLECTION).doc(classId).set({
    id: classId,
    name: `Tamil ${gradeName} Class`,
    gradeId,
    gradeName,
    day: 'Saturday',
    time: '10:00 AM',
    capacity,
    enrolled: 0,
    status: 'active',
    teachers: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  testDataIds.classes.push(classId);
});

Given('there is an inactive class with id {string} for grade {string}', async function (
  classId: string,
  gradeId: string
) {
  const db = adminDb();
  
  const gradeDoc = await db.collection(GRADES_COLLECTION).doc(gradeId).get();
  const gradeName = gradeDoc.exists ? gradeDoc.data()!.name : 'Unknown Grade';
  
  await db.collection(CLASSES_COLLECTION).doc(classId).set({
    id: classId,
    name: `Tamil ${gradeName} Inactive Class`,
    gradeId,
    gradeName,
    day: 'Saturday',
    time: '10:00 AM',
    capacity: 20,
    enrolled: 0,
    status: 'inactive',
    teachers: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  testDataIds.classes.push(classId);
});

Given('there is an admitted student with id {string} in grade {string}', async function (
  studentId: string,
  grade: string
) {
  const db = adminDb();
  await db.collection(STUDENTS_COLLECTION).doc(studentId).set({
    id: studentId,
    firstName: 'Test',
    lastName: `Student-${studentId}`,
    dateOfBirth: '2015-01-01',
    grade,
    status: 'admitted',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    photoConsent: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    admittedAt: Timestamp.now(),
    admittedBy: 'admin-uid',
  });
  testDataIds.students.push(studentId);
});

Given('there is a pending student with id {string} in grade {string}', async function (
  studentId: string,
  grade: string
) {
  const db = adminDb();
  await db.collection(STUDENTS_COLLECTION).doc(studentId).set({
    id: studentId,
    firstName: 'Pending',
    lastName: `Student-${studentId}`,
    dateOfBirth: '2015-01-01',
    grade,
    status: 'pending',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    photoConsent: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  testDataIds.students.push(studentId);
});

Given('student {string} is assigned to class {string}', async function (
  studentId: string,
  classId: string
) {
  const db = adminDb();
  
  // Get class details
  const classDoc = await db.collection(CLASSES_COLLECTION).doc(classId).get();
  if (!classDoc.exists) {
    throw new Error(`Class ${classId} not found`);
  }
  
  const classData = classDoc.data()!;
  const className = classData.name;
  
  // Update student
  await db.collection(STUDENTS_COLLECTION).doc(studentId).update({
    classId,
    className,
    status: 'active',
    updatedAt: Timestamp.now(),
  });
  
  // Update class enrolled count
  await db.collection(CLASSES_COLLECTION).doc(classId).update({
    enrolled: (classData.enrolled || 0) + 1,
    updatedAt: Timestamp.now(),
  });
});
