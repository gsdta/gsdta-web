import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  Class,
  ClassTeacher,
  ClassTeacherRole,
  CreateClassDto,
  UpdateClassDto,
  ClassListFilters,
  ClassListResponse,
  ClassOption,
  ClassStatus,
  AssignTeacherDto,
} from '@/types/class';
import { getGradeById } from './firestoreGrades';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const CLASSES_COLLECTION = 'classes';

/**
 * Create a new class
 */
export async function createClass(data: CreateClassDto): Promise<Class> {
  const now = Timestamp.now();

  // Fetch grade info for denormalization
  const grade = await getGradeById(data.gradeId);
  if (!grade) {
    throw new Error(`Grade not found: ${data.gradeId}`);
  }

  const classData: Omit<Class, 'id'> = {
    name: data.name,
    gradeId: data.gradeId,
    gradeName: grade.name,
    day: data.day,
    time: data.time,
    capacity: data.capacity,
    enrolled: 0,
    teachers: [], // Initialize empty teachers array
    status: 'active',
    academicYear: data.academicYear,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection(CLASSES_COLLECTION).add(classData);

  return {
    id: docRef.id,
    ...classData,
  };
}

/**
 * Get a class by ID
 */
export async function getClassById(id: string): Promise<Class | null> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
  } as Class;
}

/**
 * Get all classes with filters
 */
export async function getAllClasses(filters: ClassListFilters = {}): Promise<ClassListResponse> {
  const { status = 'all', gradeId, teacherId, limit = 50, offset = 0 } = filters;

  let query = getDb().collection(CLASSES_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (gradeId) {
    query = query.where('gradeId', '==', gradeId);
  }
  // Note: filtering by teacherId now requires checking teachers array
  // This is a simplified filter that checks if any teacher matches
  // For complex teacher filtering, use a different approach

  // Order by name
  query = query.orderBy('name', 'asc');

  // Get total count (before pagination)
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  let classes = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Ensure teachers array exists (for backward compatibility)
      teachers: data.teachers || [],
    } as Class;
  });

  // Post-filter by teacherId if specified (checks teachers array)
  if (teacherId) {
    classes = classes.filter((cls) =>
      cls.teachers.some((t) => t.teacherId === teacherId) ||
      cls.teacherId === teacherId // Legacy field support
    );
  }

  return {
    classes,
    total: teacherId ? classes.length : total, // Adjust count if post-filtered
  };
}

/**
 * Get active classes as options (for dropdowns)
 */
export async function getActiveClassOptions(): Promise<ClassOption[]> {
  const snap = await getDb()
    .collection(CLASSES_COLLECTION)
    .where('status', '==', 'active')
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      gradeId: data.gradeId || '',
      gradeName: data.gradeName || data.level || '', // Fallback to level for legacy
      day: data.day,
      time: data.time,
      capacity: data.capacity,
      enrolled: data.enrolled ?? 0,
      available: data.capacity - (data.enrolled ?? 0),
      status: data.status,
      teachers: data.teachers || [],
    } as ClassOption;
  });
}

/**
 * Update a class
 */
export async function updateClass(id: string, data: UpdateClassDto): Promise<Class | null> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.gradeId !== undefined) {
    // Fetch grade info for denormalization when gradeId changes
    const grade = await getGradeById(data.gradeId);
    if (!grade) {
      throw new Error(`Grade not found: ${data.gradeId}`);
    }
    updateData.gradeId = data.gradeId;
    updateData.gradeName = grade.name;
  }
  if (data.day !== undefined) updateData.day = data.day;
  if (data.time !== undefined) updateData.time = data.time;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;

  await doc.ref.update(updateData);

  return getClassById(id);
}

/**
 * Increment enrolled count (when assigning student to class)
 */
export async function incrementEnrolled(id: string, delta: number = 1): Promise<void> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(id).get();

  if (!doc.exists) {
    throw new Error('Class not found');
  }

  await doc.ref.update({
    enrolled: FieldValue.increment(delta),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Decrement enrolled count (when removing student from class)
 */
export async function decrementEnrolled(id: string): Promise<void> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(id).get();

  if (!doc.exists) {
    throw new Error('Class not found');
  }

  const data = doc.data()!;
  const currentEnrolled = data.enrolled ?? 0;

  // Prevent negative enrolled count
  const newEnrolled = Math.max(0, currentEnrolled - 1);

  await doc.ref.update({
    enrolled: newEnrolled,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Assign a teacher to a class
 */
export async function assignTeacherToClass(
  classId: string,
  teacherData: {
    teacherId: string;
    teacherName: string;
    teacherEmail?: string;
    role: ClassTeacherRole;
  },
  adminId: string
): Promise<Class | null> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(classId).get();

  if (!doc.exists) return null;

  const classData = doc.data()!;
  const teachers: ClassTeacher[] = classData.teachers || [];

  // Check if teacher is already assigned
  const existingIndex = teachers.findIndex((t) => t.teacherId === teacherData.teacherId);
  if (existingIndex !== -1) {
    throw new Error('Teacher is already assigned to this class');
  }

  // If assigning as primary, demote existing primary to assistant
  if (teacherData.role === 'primary') {
    const existingPrimaryIndex = teachers.findIndex((t) => t.role === 'primary');
    if (existingPrimaryIndex !== -1) {
      teachers[existingPrimaryIndex] = {
        ...teachers[existingPrimaryIndex],
        role: 'assistant',
      };
    }
  }

  // Add new teacher
  const newTeacher: ClassTeacher = {
    teacherId: teacherData.teacherId,
    teacherName: teacherData.teacherName,
    teacherEmail: teacherData.teacherEmail,
    role: teacherData.role,
    assignedAt: Timestamp.now(),
    assignedBy: adminId,
  };
  teachers.push(newTeacher);

  await doc.ref.update({
    teachers,
    updatedAt: Timestamp.now(),
  });

  return getClassById(classId);
}

/**
 * Remove a teacher from a class
 */
export async function removeTeacherFromClass(
  classId: string,
  teacherId: string
): Promise<Class | null> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(classId).get();

  if (!doc.exists) return null;

  const classData = doc.data()!;
  const teachers: ClassTeacher[] = classData.teachers || [];

  // Find and remove the teacher
  const teacherIndex = teachers.findIndex((t) => t.teacherId === teacherId);
  if (teacherIndex === -1) {
    throw new Error('Teacher is not assigned to this class');
  }

  teachers.splice(teacherIndex, 1);

  await doc.ref.update({
    teachers,
    updatedAt: Timestamp.now(),
  });

  return getClassById(classId);
}

/**
 * Update a teacher's role in a class
 */
export async function updateTeacherRole(
  classId: string,
  teacherId: string,
  newRole: ClassTeacherRole
): Promise<Class | null> {
  const doc = await getDb().collection(CLASSES_COLLECTION).doc(classId).get();

  if (!doc.exists) return null;

  const classData = doc.data()!;
  const teachers: ClassTeacher[] = classData.teachers || [];

  // Find the teacher
  const teacherIndex = teachers.findIndex((t) => t.teacherId === teacherId);
  if (teacherIndex === -1) {
    throw new Error('Teacher is not assigned to this class');
  }

  // If setting as primary, demote existing primary to assistant
  if (newRole === 'primary') {
    const existingPrimaryIndex = teachers.findIndex((t) => t.role === 'primary');
    if (existingPrimaryIndex !== -1 && existingPrimaryIndex !== teacherIndex) {
      teachers[existingPrimaryIndex] = {
        ...teachers[existingPrimaryIndex],
        role: 'assistant',
      };
    }
  }

  // Update the teacher's role
  teachers[teacherIndex] = {
    ...teachers[teacherIndex],
    role: newRole,
  };

  await doc.ref.update({
    teachers,
    updatedAt: Timestamp.now(),
  });

  return getClassById(classId);
}

/**
 * Get the primary teacher for a class
 */
export async function getPrimaryTeacher(classId: string): Promise<ClassTeacher | null> {
  const classDoc = await getClassById(classId);
  if (!classDoc) return null;

  const teachers = classDoc.teachers || [];
  return teachers.find((t) => t.role === 'primary') || null;
}

/**
 * Get all teachers assigned to a class
 */
export async function getClassTeachers(classId: string): Promise<ClassTeacher[]> {
  const classDoc = await getClassById(classId);
  if (!classDoc) return [];

  return classDoc.teachers || [];
}
