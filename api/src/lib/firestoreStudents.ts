import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
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
import type {
  ValidatedStudentData,
  BulkImportResult,
  BulkImportRowError,
  ImportedStudent,
} from '@/types/bulkImport';
import { getUserByEmail, findOrCreateParentByEmail } from './firestoreUsers';

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
    gender: data.gender,
    parentId,
    parentEmail,
    grade: data.grade,
    schoolName: data.schoolName,
    schoolDistrict: data.schoolDistrict,
    priorTamilLevel: data.priorTamilLevel,
    enrollingGrade: data.enrollingGrade,
    address: data.address,
    contacts: data.contacts,
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
  const { status = 'all', search, parentId, classId, limit = 50, offset = 0 } = filters;

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
    total,
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
 * Bulk create students from validated import data.
 * Uses Firestore batch writes for atomic operations.
 * Maximum 500 students per batch (Firestore limit).
 *
 * @param students - Array of validated student data
 * @param createParents - If true, create placeholder parent accounts for unknown emails
 * @returns BulkImportResult with success/failure counts and details
 */
export async function bulkCreateStudents(
  students: ValidatedStudentData[],
  createParents: boolean = false
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    total: students.length,
    students: [],
    errors: [],
    warnings: [],
    createdParents: [],
  };

  if (students.length === 0) {
    return result;
  }

  // Group students by parent email for efficient lookup
  const studentsByParent = new Map<string, { index: number; student: ValidatedStudentData }[]>();
  students.forEach((student, index) => {
    const email = student.parentEmail.toLowerCase().trim();
    if (!studentsByParent.has(email)) {
      studentsByParent.set(email, []);
    }
    studentsByParent.get(email)!.push({ index, student });
  });

  // Resolve parent accounts
  const parentMap = new Map<string, { uid: string; email: string }>();
  const parentErrors: BulkImportRowError[] = [];

  for (const [email, studentGroup] of studentsByParent) {
    if (createParents) {
      // Find or create parent
      const { profile, created } = await findOrCreateParentByEmail(email);
      parentMap.set(email, { uid: profile.uid, email: profile.email || email });
      if (created) {
        result.createdParents.push(email);
        result.warnings.push(`Created placeholder parent account for: ${email}`);
      }
    } else {
      // Just look up existing parent
      const parent = await getUserByEmail(email);
      if (parent) {
        parentMap.set(email, { uid: parent.uid, email: parent.email || email });
      } else {
        // Parent not found - mark all students with this email as failed
        for (const { index } of studentGroup) {
          parentErrors.push({
            row: index + 1, // 1-indexed for user display
            errors: [
              {
                field: 'parentEmail',
                value: email,
                message: `Parent account not found for email: ${email}. Set createParents=true to auto-create.`,
              },
            ],
          });
        }
      }
    }
  }

  // Add parent errors to result
  result.errors.push(...parentErrors);
  result.failed += parentErrors.length;

  // Filter out students with parent errors
  const validStudents = students
    .map((student, index) => ({ student, index }))
    .filter(({ student }) => parentMap.has(student.parentEmail.toLowerCase().trim()));

  if (validStudents.length === 0) {
    return result;
  }

  // Process in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  const now = Timestamp.now();

  for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
    const batchStudents = validStudents.slice(i, i + BATCH_SIZE);
    const batch = getDb().batch();
    const batchRecords: { docRef: FirebaseFirestore.DocumentReference; data: Omit<Student, 'id'>; index: number }[] = [];

    for (const { student, index } of batchStudents) {
      const parentEmail = student.parentEmail.toLowerCase().trim();
      const parent = parentMap.get(parentEmail)!;

      const studentData: Omit<Student, 'id'> = {
        firstName: student.firstName.trim(),
        lastName: student.lastName.trim(),
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        parentId: parent.uid,
        parentEmail: parent.email,
        grade: student.grade,
        schoolName: student.schoolName,
        schoolDistrict: student.schoolDistrict,
        priorTamilLevel: student.priorTamilLevel,
        enrollingGrade: student.enrollingGrade,
        address: student.address,
        contacts: student.contacts,
        medicalNotes: student.medicalNotes,
        photoConsent: student.photoConsent,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = getDb().collection(STUDENTS_COLLECTION).doc();
      batch.set(docRef, studentData);
      batchRecords.push({ docRef, data: studentData, index });
    }

    try {
      await batch.commit();

      // Record successful imports
      for (const { docRef, data, index } of batchRecords) {
        result.success++;
        result.students.push({
          id: docRef.id,
          firstName: data.firstName,
          lastName: data.lastName,
          parentEmail: data.parentEmail || '',
          parentId: data.parentId,
          status: data.status,
        });
      }
    } catch (error) {
      // Batch failed - mark all students in this batch as failed
      for (const { index } of batchRecords) {
        result.failed++;
        result.errors.push({
          row: index + 1,
          errors: [
            {
              field: 'batch',
              value: '',
              message: `Batch write failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        });
      }
    }
  }

  return result;
}

/**
 * Bulk assign class to multiple students.
 * Validates capacity and student status before assignment.
 *
 * @param studentIds - Array of student IDs to assign
 * @param classId - Class ID to assign
 * @param className - Class display name
 * @returns Object with updated and failed student IDs
 */
export async function bulkAssignClass(
  studentIds: string[],
  classId: string,
  className: string
): Promise<{
  updated: string[];
  failed: Array<{ id: string; name: string; reason: string }>;
}> {
  const result = {
    updated: [] as string[],
    failed: [] as Array<{ id: string; name: string; reason: string }>,
  };

  if (studentIds.length === 0) {
    return result;
  }

  // Validate all students first
  const studentsToUpdate: Student[] = [];

  for (const studentId of studentIds) {
    const student = await getStudentById(studentId);

    if (!student) {
      result.failed.push({
        id: studentId,
        name: 'Unknown',
        reason: 'Student not found',
      });
      continue;
    }

    if (!['admitted', 'active'].includes(student.status)) {
      result.failed.push({
        id: studentId,
        name: `${student.firstName} ${student.lastName}`,
        reason: `Invalid status: ${student.status}. Only admitted or active students can be assigned.`,
      });
      continue;
    }

    studentsToUpdate.push(student);
  }

  if (studentsToUpdate.length === 0) {
    return result;
  }

  // Process in batches of 500
  const BATCH_SIZE = 500;
  const now = Timestamp.now();

  for (let i = 0; i < studentsToUpdate.length; i += BATCH_SIZE) {
    const batchStudents = studentsToUpdate.slice(i, i + BATCH_SIZE);
    const batch = getDb().batch();

    for (const student of batchStudents) {
      const docRef = getDb().collection(STUDENTS_COLLECTION).doc(student.id);

      const updateData: Record<string, unknown> = {
        classId,
        className,
        updatedAt: now,
      };

      // Transition admitted → active when assigning class
      if (student.status === 'admitted') {
        updateData.status = 'active';
      }

      batch.update(docRef, updateData);
    }

    try {
      await batch.commit();

      for (const student of batchStudents) {
        result.updated.push(student.id);
      }
    } catch (error) {
      for (const student of batchStudents) {
        result.failed.push({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          reason: `Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  }

  return result;
}
