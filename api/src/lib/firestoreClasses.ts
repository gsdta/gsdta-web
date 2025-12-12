import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  Class,
  CreateClassDto,
  UpdateClassDto,
  ClassListFilters,
  ClassListResponse,
  ClassOption,
  ClassStatus,
} from '@/types/class';

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

  const classData: Omit<Class, 'id'> = {
    name: data.name,
    level: data.level,
    day: data.day,
    time: data.time,
    capacity: data.capacity,
    enrolled: 0,
    teacherId: data.teacherId,
    teacherName: data.teacherName,
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
  const { status = 'all', level, teacherId, limit = 50, offset = 0 } = filters;

  let query = getDb().collection(CLASSES_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (level) {
    query = query.where('level', '==', level);
  }
  if (teacherId) {
    query = query.where('teacherId', '==', teacherId);
  }

  // Order by name
  query = query.orderBy('name', 'asc');

  // Get total count (before pagination)
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const classes = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Class;
  });

  return {
    classes,
    total,
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
      level: data.level,
      day: data.day,
      time: data.time,
      capacity: data.capacity,
      enrolled: data.enrolled ?? 0,
      available: data.capacity - (data.enrolled ?? 0),
      status: data.status,
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
  if (data.level !== undefined) updateData.level = data.level;
  if (data.day !== undefined) updateData.day = data.day;
  if (data.time !== undefined) updateData.time = data.time;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.teacherId !== undefined) updateData.teacherId = data.teacherId;
  if (data.teacherName !== undefined) updateData.teacherName = data.teacherName;
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
