import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  AdminUpdateStudentDto,
  StudentListFilters,
  StudentListResponse,
  LinkedStudentView,
  StudentStatus,
} from '@/types/student';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const STUDENTS_COLLECTION = 'students';

/**
 * Create a new student (parent registration)
 */
export async function createStudent(
  parentId: string,
  parentEmail: string,
  data: CreateStudentDto
): Promise<Student> {
  const now = Timestamp.now();

  const studentData: Omit<Student, 'id'> = {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    parentId,
    parentEmail,
    grade: data.grade,
    schoolName: data.schoolName,
    priorTamilLevel: data.priorTamilLevel,
    medicalNotes: data.medicalNotes,
    photoConsent: data.photoConsent ?? false,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection(STUDENTS_COLLECTION).add(studentData);

  return {
    id: docRef.id,
    ...studentData,
  };
}

/**
 * Get a student by ID
 */
export async function getStudentById(id: string): Promise<Student | null> {
  const doc = await getDb().collection(STUDENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
  } as Student;
}

/**
 * Get students by parent ID (for parent's student list)
 */
export async function getStudentsByParentId(parentId: string): Promise<LinkedStudentView[]> {
  const snap = await getDb()
    .collection(STUDENTS_COLLECTION)
    .where('parentId', '==', parentId)
    .orderBy('createdAt', 'desc')
    .get();

  if (snap.empty) return [];

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      dateOfBirth: data.dateOfBirth ?? '',
      grade: data.grade,
      schoolName: data.schoolName,
      priorTamilLevel: data.priorTamilLevel,
      classId: data.classId,
      className: data.className,
      status: data.status ?? 'pending',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? '',
    } as LinkedStudentView;
  });
}

/**
 * Get all students with filters (for admin)
 */
export async function getAllStudents(filters: StudentListFilters = {}): Promise<StudentListResponse> {
  const { status = 'all', search, parentId, classId, gradeId, unassigned, limit = 50, offset = 0 } = filters;

  let query = getDb().collection(STUDENTS_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (parentId) {
    query = query.where('parentId', '==', parentId);
  }
  if (classId) {
    query = query.where('classId', '==', classId);
  }
  if (gradeId) {
    query = query.where('grade', '==', gradeId);
  }

  // Order by creation date (newest first)
  query = query.orderBy('createdAt', 'desc');

  // Get total count (before pagination)
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  let students = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Student;
  });

  // Apply in-memory filters (Firestore limitations)
  
  // Filter unassigned students (no classId)
  if (unassigned) {
    students = students.filter((s) => !s.classId);
  }

  // Apply search filter in memory (Firestore doesn't support full-text search)
  if (search) {
    const searchLower = search.toLowerCase();
    students = students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(searchLower) ||
        s.lastName.toLowerCase().includes(searchLower) ||
        (s.parentEmail?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  return {
    students,
    total: unassigned || search ? students.length : total, // Recalculate if in-memory filtering applied
    limit,
    offset,
  };
}

/**
 * Update a student (for parent - limited fields)
 */
export async function updateStudent(
  id: string,
  data: UpdateStudentDto,
  checkParentId?: string
): Promise<Student | null> {
  const doc = await getDb().collection(STUDENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existing = doc.data() as Student;

  // If checkParentId provided, verify ownership
  if (checkParentId && existing.parentId !== checkParentId) {
    return null;
  }

  // Only allow updates to pending or admitted students
  if (!['pending', 'admitted'].includes(existing.status)) {
    throw new Error('Cannot update student in current status');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.schoolName !== undefined) updateData.schoolName = data.schoolName;
  if (data.priorTamilLevel !== undefined) updateData.priorTamilLevel = data.priorTamilLevel;
  if (data.medicalNotes !== undefined) updateData.medicalNotes = data.medicalNotes;
  if (data.photoConsent !== undefined) updateData.photoConsent = data.photoConsent;

  await doc.ref.update(updateData);

  return getStudentById(id);
}

/**
 * Update a student (for admin - all fields)
 */
export async function adminUpdateStudent(
  id: string,
  data: AdminUpdateStudentDto
): Promise<Student | null> {
  const doc = await getDb().collection(STUDENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.schoolName !== undefined) updateData.schoolName = data.schoolName;
  if (data.priorTamilLevel !== undefined) updateData.priorTamilLevel = data.priorTamilLevel;
  if (data.medicalNotes !== undefined) updateData.medicalNotes = data.medicalNotes;
  if (data.photoConsent !== undefined) updateData.photoConsent = data.photoConsent;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.classId !== undefined) updateData.classId = data.classId;
  if (data.className !== undefined) updateData.className = data.className;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await doc.ref.update(updateData);

  return getStudentById(id);
}

/**
 * Admit a student (admin action)
 */
export async function admitStudent(
  id: string,
  adminId: string
): Promise<Student | null> {
  const doc = await getDb().collection(STUDENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existing = doc.data() as Student;

  // Only allow admitting pending students
  if (existing.status !== 'pending') {
    throw new Error('Can only admit students with pending status');
  }

  const updateData = {
    status: 'admitted' as StudentStatus,
    admittedAt: Timestamp.now(),
    admittedBy: adminId,
    updatedAt: Timestamp.now(),
  };

  await doc.ref.update(updateData);

  return getStudentById(id);
}

/**
 * Assign a class to a student (admin action)
 */
export async function assignClassToStudent(
  id: string,
  classId: string,
  className: string
): Promise<Student | null> {
  const doc = await getDb().collection(STUDENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existing = doc.data() as Student;

  // Only allow assigning class to admitted or active students
  if (!['admitted', 'active'].includes(existing.status)) {
    throw new Error('Can only assign class to admitted or active students');
  }

  const updateData: Record<string, unknown> = {
    classId,
    className,
    updatedAt: Timestamp.now(),
  };

  // If student was admitted, change to active when assigning class
  if (existing.status === 'admitted') {
    updateData.status = 'active';
  }

  await doc.ref.update(updateData);

  return getStudentById(id);
}

/**
 * Count students by status (for admin dashboard)
 */
export async function countStudentsByStatus(): Promise<Record<StudentStatus, number>> {
  const statuses: StudentStatus[] = ['pending', 'admitted', 'active', 'inactive', 'withdrawn'];
  const counts: Record<StudentStatus, number> = {
    pending: 0,
    admitted: 0,
    active: 0,
    inactive: 0,
    withdrawn: 0,
  };

  for (const status of statuses) {
    const snap = await getDb()
      .collection(STUDENTS_COLLECTION)
      .where('status', '==', status)
      .count()
      .get();
    counts[status] = snap.data().count;
  }

  return counts;
}

/**
 * Get students by class ID (for class roster)
 */
export async function getStudentsByClassId(classId: string): Promise<Student[]> {
  const snap = await getDb()
    .collection(STUDENTS_COLLECTION)
    .where('classId', '==', classId)
    .where('status', 'in', ['active', 'admitted'])
    .orderBy('lastName')
    .orderBy('firstName')
    .get();

  if (snap.empty) return [];

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Student;
  });
}

/**
 * Bulk assign students to a class (admin action)
 */
export async function bulkAssignStudentsToClass(
  classId: string,
  className: string,
  studentIds: string[]
): Promise<void> {
  const batch = getDb().batch();

  for (const studentId of studentIds) {
    const studentRef = getDb().collection(STUDENTS_COLLECTION).doc(studentId);
    
    // Get student to validate
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists) {
      throw new Error(`Student ${studentId} not found`);
    }

    const student = studentDoc.data() as Student;

    // Only allow assigning class to admitted or active students
    if (!['admitted', 'active'].includes(student.status)) {
      throw new Error(`Cannot assign class to student ${studentId} with status ${student.status}`);
    }

    // Update student with class assignment
    const updateData: Record<string, unknown> = {
      classId,
      className,
      updatedAt: Timestamp.now(),
    };

    // If student was admitted, change to active when assigning class
    if (student.status === 'admitted') {
      updateData.status = 'active';
    }

    batch.update(studentRef, updateData);
  }

  // Update class enrolled count
  const classRef = getDb().collection('classes').doc(classId);
  batch.update(classRef, {
    enrolled: FieldValue.increment(studentIds.length),
    updatedAt: Timestamp.now(),
  });

  await batch.commit();
}

/**
 * Remove a student from a class (admin action)
 */
export async function removeStudentFromClass(
  studentId: string,
  classId: string
): Promise<Student | null> {
  const batch = getDb().batch();

  // Update student
  const studentRef = getDb().collection(STUDENTS_COLLECTION).doc(studentId);
  const studentDoc = await studentRef.get();
  
  if (!studentDoc.exists) {
    throw new Error(`Student ${studentId} not found`);
  }

  const student = studentDoc.data() as Student;

  // Change status back to admitted if was active
  const updateData: Record<string, unknown> = {
    classId: FieldValue.delete(),
    className: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  };

  if (student.status === 'active') {
    updateData.status = 'admitted';
  }

  batch.update(studentRef, updateData);

  // Decrement class enrolled count
  const classRef = getDb().collection('classes').doc(classId);
  batch.update(classRef, {
    enrolled: FieldValue.increment(-1),
    updatedAt: Timestamp.now(),
  });

  await batch.commit();

  return getStudentById(studentId);
}
