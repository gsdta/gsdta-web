import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Grade,
  CreateGradeDto,
  UpdateGradeDto,
  GradeListFilters,
  GradeListResponse,
  GradeOption,
} from '@/types/grade';
import { DEFAULT_GRADES } from '@/types/grade';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const GRADES_COLLECTION = 'grades';

/**
 * Create a new grade with custom ID
 */
export async function createGrade(data: CreateGradeDto, adminId?: string): Promise<Grade> {
  const now = Timestamp.now();

  const gradeData: Omit<Grade, 'id'> = {
    name: data.name,
    displayName: data.displayName,
    displayOrder: data.displayOrder,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };

  // Use custom ID from DTO
  await getDb().collection(GRADES_COLLECTION).doc(data.id).set(gradeData);

  return {
    id: data.id,
    ...gradeData,
  };
}

/**
 * Get a grade by ID
 */
export async function getGradeById(id: string): Promise<Grade | null> {
  const doc = await getDb().collection(GRADES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
  } as Grade;
}

/**
 * Get all grades with filters
 */
export async function getAllGrades(filters: GradeListFilters = {}): Promise<GradeListResponse> {
  const { status = 'all' } = filters;

  let query = getDb().collection(GRADES_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  // Order by displayOrder
  query = query.orderBy('displayOrder', 'asc');

  const snap = await query.get();

  const grades = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Grade;
  });

  return {
    grades,
    total: grades.length,
  };
}

/**
 * Get active grades as options (for dropdowns)
 */
export async function getActiveGradeOptions(): Promise<GradeOption[]> {
  const snap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('status', '==', 'active')
    .orderBy('displayOrder', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      displayName: data.displayName,
      displayOrder: data.displayOrder,
    } as GradeOption;
  });
}

/**
 * Update a grade
 */
export async function updateGrade(id: string, data: UpdateGradeDto): Promise<Grade | null> {
  const doc = await getDb().collection(GRADES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
  if (data.status !== undefined) updateData.status = data.status;

  await doc.ref.update(updateData);

  return getGradeById(id);
}

/**
 * Seed default grades (idempotent - only creates if not exists)
 * Returns the number of grades created
 */
export async function seedDefaultGrades(adminId?: string): Promise<{ created: number; skipped: number }> {
  const now = Timestamp.now();
  let created = 0;
  let skipped = 0;

  for (const grade of DEFAULT_GRADES) {
    const existingDoc = await getDb().collection(GRADES_COLLECTION).doc(grade.id).get();

    if (existingDoc.exists) {
      skipped++;
      continue;
    }

    const gradeData: Omit<Grade, 'id'> = {
      name: grade.name,
      displayName: grade.displayName,
      displayOrder: grade.displayOrder,
      status: grade.status,
      createdAt: now,
      updatedAt: now,
      createdBy: adminId,
    };

    await getDb().collection(GRADES_COLLECTION).doc(grade.id).set(gradeData);
    created++;
  }

  return { created, skipped };
}

/**
 * Check if grades have been seeded
 */
export async function areGradesSeeded(): Promise<boolean> {
  const snap = await getDb().collection(GRADES_COLLECTION).limit(1).get();
  return !snap.empty;
}
