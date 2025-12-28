import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Assignment,
  AssignmentFilters,
  AssignmentListResponse,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentSummary,
} from '@/types/assignment';
import { ASSIGNMENT_CONSTANTS } from '@/types/assignment';
import { getClassById } from './firestoreClasses';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const ASSIGNMENTS_COLLECTION = 'assignments';

/**
 * Create an assignment
 */
export async function createAssignment(
  data: CreateAssignmentDto,
  teacherUid: string,
  teacherName: string
): Promise<Assignment> {
  const now = Timestamp.now();

  // Get class info for denormalization
  const classData = await getClassById(data.classId);
  if (!classData) {
    throw new Error(`Class not found: ${data.classId}`);
  }

  const db = getDb();
  const docRef = db.collection(ASSIGNMENTS_COLLECTION).doc();

  const assignmentData: Omit<Assignment, 'id'> = {
    classId: data.classId,
    className: classData.name,
    gradeId: classData.gradeId,
    gradeName: classData.gradeName,
    title: data.title,
    description: data.description,
    type: data.type,
    status: data.status || 'draft',
    maxPoints: data.maxPoints,
    weight: data.weight ?? ASSIGNMENT_CONSTANTS.DEFAULT_WEIGHT,
    assignedDate: data.assignedDate,
    dueDate: data.dueDate,
    createdBy: teacherUid,
    createdByName: teacherName,
    docStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(assignmentData);

  return {
    id: docRef.id,
    ...assignmentData,
  };
}

/**
 * Get assignment by ID
 */
export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const doc = await getDb().collection(ASSIGNMENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as Assignment;
}

/**
 * Get assignments for a class
 */
export async function getAssignmentsByClass(
  classId: string,
  status?: string
): Promise<Assignment[]> {
  let query = getDb()
    .collection(ASSIGNMENTS_COLLECTION)
    .where('classId', '==', classId)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('dueDate', 'desc');

  const snap = await query.get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Assignment[];
}

/**
 * Get assignments with filters
 */
export async function getAssignments(
  filters: AssignmentFilters
): Promise<AssignmentListResponse> {
  const {
    classId,
    type,
    status,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  let query = getDb()
    .collection(ASSIGNMENTS_COLLECTION)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  // Apply filters
  if (classId) {
    query = query.where('classId', '==', classId);
  }
  if (type) {
    query = query.where('type', '==', type);
  }
  if (status) {
    query = query.where('status', '==', status);
  }
  if (startDate) {
    query = query.where('assignedDate', '>=', startDate);
  }
  if (endDate) {
    query = query.where('dueDate', '<=', endDate);
  }

  // Order by due date descending
  query = query.orderBy('dueDate', 'desc');

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const assignments = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Assignment[];

  return {
    assignments,
    total,
  };
}

/**
 * Update an assignment
 */
export async function updateAssignment(
  id: string,
  data: UpdateAssignmentDto,
  editorUid: string,
  editorName: string
): Promise<Assignment | null> {
  const doc = await getDb().collection(ASSIGNMENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existingData = doc.data()!;
  if (existingData.docStatus === 'deleted') return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    updatedBy: editorUid,
    updatedByName: editorName,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.maxPoints !== undefined) updateData.maxPoints = data.maxPoints;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.assignedDate !== undefined) updateData.assignedDate = data.assignedDate;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.status !== undefined) updateData.status = data.status;

  await doc.ref.update(updateData);

  return getAssignmentById(id);
}

/**
 * Soft delete an assignment
 */
export async function deleteAssignment(id: string): Promise<boolean> {
  const doc = await getDb().collection(ASSIGNMENTS_COLLECTION).doc(id).get();

  if (!doc.exists) return false;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return false;

  await doc.ref.update({
    docStatus: 'deleted',
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Publish an assignment (change status to published)
 */
export async function publishAssignment(
  id: string,
  editorUid: string,
  editorName: string
): Promise<Assignment | null> {
  return updateAssignment(id, { status: 'published' }, editorUid, editorName);
}

/**
 * Close an assignment (change status to closed)
 */
export async function closeAssignment(
  id: string,
  editorUid: string,
  editorName: string
): Promise<Assignment | null> {
  return updateAssignment(id, { status: 'closed' }, editorUid, editorName);
}

/**
 * Get assignment summary with grade statistics
 * Note: This requires student grades to be fetched separately
 */
export async function getAssignmentSummary(
  assignmentId: string,
  grades: { pointsEarned: number; maxPoints: number }[]
): Promise<AssignmentSummary | null> {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) return null;

  const gradedGrades = grades.filter((g) => g.pointsEarned !== undefined);
  const totalStudents = grades.length;
  const gradedCount = gradedGrades.length;

  let averageScore = 0;
  let averagePercentage = 0;
  let highScore = 0;
  let lowScore = assignment.maxPoints;

  if (gradedCount > 0) {
    const totalPoints = gradedGrades.reduce((sum, g) => sum + g.pointsEarned, 0);
    averageScore = Math.round((totalPoints / gradedCount) * 10) / 10;
    averagePercentage = Math.round((averageScore / assignment.maxPoints) * 100);

    for (const grade of gradedGrades) {
      if (grade.pointsEarned > highScore) highScore = grade.pointsEarned;
      if (grade.pointsEarned < lowScore) lowScore = grade.pointsEarned;
    }
  }

  return {
    assignment,
    stats: {
      totalStudents,
      gradedCount,
      averageScore,
      averagePercentage,
      highScore,
      lowScore: gradedCount > 0 ? lowScore : 0,
    },
  };
}

/**
 * Verify teacher owns the assignment (via class assignment)
 */
export async function verifyAssignmentTeacher(
  assignmentId: string,
  teacherUid: string
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) return false;

  // Check if teacher is assigned to the class
  const classData = await getClassById(assignment.classId);
  if (!classData) return false;

  return classData.teacherId === teacherUid;
}
