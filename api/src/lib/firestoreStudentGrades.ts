import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  StudentGrade,
  GradeFilters,
  GradeListResponse,
  CreateGradeDto,
  UpdateGradeDto,
  GradebookRow,
  GradebookView,
  GradeEditHistory,
} from '@/types/studentGrade';
import { calculateLetterGrade, GRADE_CONSTANTS } from '@/types/studentGrade';
import { getAssignmentById, getAssignmentsByClass } from './firestoreAssignments';
import { getClassById } from './firestoreClasses';
import { getStudentById } from './firestoreStudents';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const GRADES_COLLECTION = 'studentGrades';

/**
 * Create or update a grade for a student on an assignment
 */
export async function createOrUpdateGrade(
  assignmentId: string,
  data: CreateGradeDto,
  teacherUid: string,
  teacherName: string
): Promise<StudentGrade> {
  const now = Timestamp.now();

  // Get assignment info
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment not found: ${assignmentId}`);
  }

  // Get class info
  const classData = await getClassById(assignment.classId);
  if (!classData) {
    throw new Error(`Class not found: ${assignment.classId}`);
  }

  // Get student info
  const student = await getStudentById(data.studentId);
  if (!student) {
    throw new Error(`Student not found: ${data.studentId}`);
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const percentage = Math.round((data.pointsEarned / assignment.maxPoints) * 100 * 10) / 10;
  const letterGrade = calculateLetterGrade(percentage);

  // Check if grade already exists
  const existingSnap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('assignmentId', '==', assignmentId)
    .where('studentId', '==', data.studentId)
    .where('docStatus', '==', 'active')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    // Update existing grade
    const existingDoc = existingSnap.docs[0];
    const existingData = existingDoc.data() as StudentGrade;

    const editEntry: GradeEditHistory = {
      previousPoints: existingData.pointsEarned,
      newPoints: data.pointsEarned,
      editedBy: teacherUid,
      editedByName: teacherName,
      editedAt: now,
    };

    const editHistory = existingData.editHistory || [];
    editHistory.push(editEntry);

    // Keep only last N entries
    while (editHistory.length > GRADE_CONSTANTS.MAX_EDIT_HISTORY) {
      editHistory.shift();
    }

    const updateData = {
      pointsEarned: data.pointsEarned,
      percentage,
      letterGrade,
      feedback: data.feedback,
      gradedAt: now,
      gradedBy: teacherUid,
      gradedByName: teacherName,
      lastEditedBy: teacherUid,
      lastEditedByName: teacherName,
      lastEditedAt: now,
      editHistory,
      updatedAt: now,
    };

    await existingDoc.ref.update(updateData);

    // Merge the data, ensuring id comes first to avoid duplicate key error
    const { id: _existingId, ...restExisting } = existingData;
    return {
      id: existingDoc.id,
      ...restExisting,
      ...updateData,
    } as StudentGrade;
  }

  // Create new grade
  const db = getDb();
  const docRef = db.collection(GRADES_COLLECTION).doc();

  const gradeData: Omit<StudentGrade, 'id'> = {
    assignmentId,
    assignmentTitle: assignment.title,
    classId: assignment.classId,
    className: classData.name,
    studentId: data.studentId,
    studentName,
    pointsEarned: data.pointsEarned,
    maxPoints: assignment.maxPoints,
    percentage,
    letterGrade,
    feedback: data.feedback,
    gradedAt: now,
    gradedBy: teacherUid,
    gradedByName: teacherName,
    docStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(gradeData);

  return {
    id: docRef.id,
    ...gradeData,
  };
}

/**
 * Bulk create/update grades for an assignment
 */
export async function bulkCreateGrades(
  assignmentId: string,
  grades: CreateGradeDto[],
  teacherUid: string,
  teacherName: string
): Promise<StudentGrade[]> {
  const results: StudentGrade[] = [];

  for (const grade of grades) {
    const result = await createOrUpdateGrade(assignmentId, grade, teacherUid, teacherName);
    results.push(result);
  }

  return results;
}

/**
 * Get grade by ID
 */
export async function getGradeById(id: string): Promise<StudentGrade | null> {
  const doc = await getDb().collection(GRADES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as StudentGrade;
}

/**
 * Get grades for an assignment
 */
export async function getGradesByAssignment(assignmentId: string): Promise<StudentGrade[]> {
  const snap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('assignmentId', '==', assignmentId)
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentGrade[];
}

/**
 * Get grades for a student
 */
export async function getGradesByStudent(studentId: string): Promise<StudentGrade[]> {
  const snap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('studentId', '==', studentId)
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentGrade[];
}

/**
 * Get grades for a student in a class
 */
export async function getGradesByStudentAndClass(
  studentId: string,
  classId: string
): Promise<StudentGrade[]> {
  const snap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('studentId', '==', studentId)
    .where('classId', '==', classId)
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentGrade[];
}

/**
 * Get grades with filters
 */
export async function getGrades(filters: GradeFilters): Promise<GradeListResponse> {
  const { assignmentId, studentId, classId, limit = 50, offset = 0 } = filters;

  let query = getDb()
    .collection(GRADES_COLLECTION)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  if (assignmentId) {
    query = query.where('assignmentId', '==', assignmentId);
  }
  if (studentId) {
    query = query.where('studentId', '==', studentId);
  }
  if (classId) {
    query = query.where('classId', '==', classId);
  }

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const grades = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentGrade[];

  return {
    grades,
    total,
  };
}

/**
 * Update a grade
 */
export async function updateGrade(
  id: string,
  data: UpdateGradeDto,
  editorUid: string,
  editorName: string
): Promise<StudentGrade | null> {
  const doc = await getDb().collection(GRADES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existingData = doc.data()! as StudentGrade;
  if (existingData.docStatus === 'deleted') return null;

  const now = Timestamp.now();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
    lastEditedBy: editorUid,
    lastEditedByName: editorName,
    lastEditedAt: now,
  };

  if (data.pointsEarned !== undefined) {
    // Track edit history
    const editEntry: GradeEditHistory = {
      previousPoints: existingData.pointsEarned,
      newPoints: data.pointsEarned,
      editedBy: editorUid,
      editedByName: editorName,
      editedAt: now,
      reason: data.editReason,
    };

    const editHistory = existingData.editHistory || [];
    editHistory.push(editEntry);

    while (editHistory.length > GRADE_CONSTANTS.MAX_EDIT_HISTORY) {
      editHistory.shift();
    }

    const percentage = Math.round((data.pointsEarned / existingData.maxPoints) * 100 * 10) / 10;

    updateData.pointsEarned = data.pointsEarned;
    updateData.percentage = percentage;
    updateData.letterGrade = calculateLetterGrade(percentage);
    updateData.editHistory = editHistory;
  }

  if (data.feedback !== undefined) {
    updateData.feedback = data.feedback;
  }

  await doc.ref.update(updateData);

  return getGradeById(id);
}

/**
 * Soft delete a grade
 */
export async function deleteGrade(id: string): Promise<boolean> {
  const doc = await getDb().collection(GRADES_COLLECTION).doc(id).get();

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
 * Get gradebook view for a class
 */
export async function getGradebook(classId: string): Promise<GradebookView | null> {
  // Get class info
  const classData = await getClassById(classId);
  if (!classData) return null;

  // Get published assignments for the class
  const assignments = await getAssignmentsByClass(classId, 'published');

  // Get all students in the class
  const studentsSnap = await getDb()
    .collection('students')
    .where('classId', '==', classId)
    .where('status', '==', 'active')
    .get();

  const students = studentsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Get all grades for the class
  const gradesSnap = await getDb()
    .collection(GRADES_COLLECTION)
    .where('classId', '==', classId)
    .where('docStatus', '==', 'active')
    .get();

  const allGrades = gradesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentGrade[];

  // Create a map of grades by studentId -> assignmentId -> grade
  const gradeMap = new Map<string, Map<string, StudentGrade>>();
  for (const grade of allGrades) {
    if (!gradeMap.has(grade.studentId)) {
      gradeMap.set(grade.studentId, new Map());
    }
    gradeMap.get(grade.studentId)!.set(grade.assignmentId, grade);
  }

  // Build gradebook rows
  const gradebookRows: GradebookRow[] = [];
  let classTotal = 0;
  let classCount = 0;

  for (const student of students) {
    const studentData = student as { id: string; firstName: string; lastName: string };
    const studentGrades = gradeMap.get(studentData.id) || new Map();

    const grades: Record<string, StudentGrade | null> = {};
    let totalPoints = 0;
    let maxPoints = 0;

    for (const assignment of assignments) {
      const grade = studentGrades.get(assignment.id) || null;
      grades[assignment.id] = grade;

      if (grade) {
        totalPoints += grade.pointsEarned;
        maxPoints += grade.maxPoints;
      }
    }

    const averagePercentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100 * 10) / 10 : 0;
    const letterGrade = calculateLetterGrade(averagePercentage);

    if (maxPoints > 0) {
      classTotal += averagePercentage;
      classCount++;
    }

    gradebookRows.push({
      studentId: studentData.id,
      studentName: `${studentData.firstName} ${studentData.lastName}`.trim(),
      grades,
      averagePercentage,
      letterGrade,
      totalPoints,
      maxPoints,
    });
  }

  // Sort by student name
  gradebookRows.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const classAverage = classCount > 0 ? Math.round((classTotal / classCount) * 10) / 10 : 0;

  return {
    classId,
    className: classData.name,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      maxPoints: a.maxPoints,
      dueDate: a.dueDate,
    })),
    students: gradebookRows,
    classAverage,
  };
}

/**
 * Calculate student's overall grade for a class
 */
export async function calculateStudentClassGrade(
  studentId: string,
  classId: string
): Promise<{
  percentage: number;
  letterGrade: string;
  totalPoints: number;
  maxPoints: number;
  gradeCount: number;
}> {
  const grades = await getGradesByStudentAndClass(studentId, classId);

  let totalPoints = 0;
  let maxPoints = 0;

  for (const grade of grades) {
    totalPoints += grade.pointsEarned;
    maxPoints += grade.maxPoints;
  }

  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100 * 10) / 10 : 0;

  return {
    percentage,
    letterGrade: calculateLetterGrade(percentage),
    totalPoints,
    maxPoints,
    gradeCount: grades.length,
  };
}
