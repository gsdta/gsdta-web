import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Textbook,
  CreateTextbookDto,
  UpdateTextbookDto,
  TextbookListFilters,
  TextbookListResponse,
} from '@/types/textbook';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const TEXTBOOKS_COLLECTION = 'textbooks';

/**
 * Create a new textbook
 */
export async function createTextbook(data: CreateTextbookDto, adminId?: string): Promise<Textbook> {
  const now = Timestamp.now();

  const textbookData: Omit<Textbook, 'id'> = {
    gradeId: data.gradeId,
    itemNumber: data.itemNumber,
    name: data.name,
    type: data.type,
    semester: data.semester,
    pageCount: data.pageCount,
    copies: data.copies,
    unitCost: data.unitCost,
    academicYear: data.academicYear,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };

  const docRef = await getDb().collection(TEXTBOOKS_COLLECTION).add(textbookData);

  return {
    id: docRef.id,
    ...textbookData,
  };
}

/**
 * Get a textbook by ID
 */
export async function getTextbookById(id: string): Promise<Textbook | null> {
  const doc = await getDb().collection(TEXTBOOKS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
  } as Textbook;
}

/**
 * Get all textbooks with filters
 */
export async function getAllTextbooks(filters: TextbookListFilters = {}): Promise<TextbookListResponse> {
  const { gradeId, type, academicYear, status = 'all', limit = 100, offset = 0 } = filters;

  let query = getDb().collection(TEXTBOOKS_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (gradeId) {
    query = query.where('gradeId', '==', gradeId);
  }
  if (type) {
    query = query.where('type', '==', type);
  }
  if (academicYear) {
    query = query.where('academicYear', '==', academicYear);
  }

  // Order by grade and name
  query = query.orderBy('gradeId', 'asc').orderBy('name', 'asc');

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const textbooks = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Textbook;
  });

  return {
    textbooks,
    total,
  };
}

/**
 * Update a textbook
 */
export async function updateTextbook(id: string, data: UpdateTextbookDto): Promise<Textbook | null> {
  const doc = await getDb().collection(TEXTBOOKS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.gradeId !== undefined) updateData.gradeId = data.gradeId;
  if (data.itemNumber !== undefined) updateData.itemNumber = data.itemNumber;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.semester !== undefined) updateData.semester = data.semester;
  if (data.pageCount !== undefined) updateData.pageCount = data.pageCount;
  if (data.copies !== undefined) updateData.copies = data.copies;
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
  if (data.status !== undefined) updateData.status = data.status;

  await doc.ref.update(updateData);

  return getTextbookById(id);
}

/**
 * Delete a textbook (soft delete by setting status to inactive)
 */
export async function deleteTextbook(id: string): Promise<boolean> {
  const doc = await getDb().collection(TEXTBOOKS_COLLECTION).doc(id).get();

  if (!doc.exists) return false;

  await doc.ref.update({
    status: 'inactive',
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Update textbook inventory (adjust copies count)
 */
export async function updateTextbookInventory(
  id: string,
  copies: number,
  reason?: string
): Promise<Textbook | null> {
  const doc = await getDb().collection(TEXTBOOKS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  await doc.ref.update({
    copies,
    updatedAt: Timestamp.now(),
  });

  return getTextbookById(id);
}

/**
 * Get textbooks by grade ID
 */
export async function getTextbooksByGrade(gradeId: string): Promise<Textbook[]> {
  const snap = await getDb()
    .collection(TEXTBOOKS_COLLECTION)
    .where('gradeId', '==', gradeId)
    .where('status', '==', 'active')
    .orderBy('type', 'asc')
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Textbook;
  });
}
