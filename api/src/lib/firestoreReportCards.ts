import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  ReportCard,
  ReportCardFilters,
  ReportCardListResponse,
  GenerateReportCardDto,
  UpdateReportCardDto,
  GradeBreakdown,
  AttendanceSummaryForReport,
  AcademicTerm,
} from '@/types/reportCard';
import { calculateLetterGrade } from '@/types/studentGrade';
import type { AssignmentType } from '@/types/assignment';
import { getAssignmentsByClass } from './firestoreAssignments';
import { getGradesByStudentAndClass } from './firestoreStudentGrades';
import { getClassById } from './firestoreClasses';
import { getStudentById } from './firestoreStudents';
import { getAttendanceRecords } from './firestoreAttendance';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const REPORT_CARDS_COLLECTION = 'reportCards';

/**
 * Generate a report card for a student
 */
export async function generateReportCard(
  data: GenerateReportCardDto,
  teacherUid: string,
  teacherName: string
): Promise<ReportCard> {
  const now = Timestamp.now();

  // Get class info
  const classData = await getClassById(data.classId);
  if (!classData) {
    throw new Error(`Class not found: ${data.classId}`);
  }

  // Get student info
  const student = await getStudentById(data.studentId);
  if (!student) {
    throw new Error(`Student not found: ${data.studentId}`);
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();

  // Check if report card already exists for this student/class/term/year
  const existingSnap = await getDb()
    .collection(REPORT_CARDS_COLLECTION)
    .where('studentId', '==', data.studentId)
    .where('classId', '==', data.classId)
    .where('term', '==', data.term)
    .where('academicYear', '==', data.academicYear)
    .where('docStatus', '==', 'active')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    // Update existing report card
    const existingDoc = existingSnap.docs[0];
    const updatedReportCard = await regenerateReportCardData(
      existingDoc.id,
      data,
      teacherUid,
      teacherName
    );
    return updatedReportCard!;
  }

  // Get grades and calculate breakdown
  const { gradeBreakdown, overallPercentage, totalPoints, maxPoints } =
    await calculateGradeBreakdown(data.studentId, data.classId);

  // Get attendance summary
  const attendance = await calculateAttendanceSummary(data.studentId, data.classId);

  const letterGrade = calculateLetterGrade(overallPercentage);

  const db = getDb();
  const docRef = db.collection(REPORT_CARDS_COLLECTION).doc();

  const reportCardData: Omit<ReportCard, 'id'> = {
    studentId: data.studentId,
    studentName,
    parentId: student.parentId || '',
    classId: data.classId,
    className: classData.name,
    gradeId: classData.gradeId,
    gradeName: classData.gradeName,
    term: data.term,
    academicYear: data.academicYear,
    overallPercentage,
    letterGrade,
    totalPoints,
    maxPoints,
    gradeBreakdown,
    attendance,
    teacherComments: data.teacherComments,
    conductGrade: data.conductGrade,
    status: 'draft',
    generatedBy: teacherUid,
    generatedByName: teacherName,
    docStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(reportCardData);

  return {
    id: docRef.id,
    ...reportCardData,
  };
}

/**
 * Regenerate report card data (recalculate grades and attendance)
 */
async function regenerateReportCardData(
  reportCardId: string,
  data: GenerateReportCardDto,
  teacherUid: string,
  teacherName: string
): Promise<ReportCard | null> {
  const now = Timestamp.now();

  const doc = await getDb().collection(REPORT_CARDS_COLLECTION).doc(reportCardId).get();
  if (!doc.exists) return null;

  // Get grades and calculate breakdown
  const { gradeBreakdown, overallPercentage, totalPoints, maxPoints } =
    await calculateGradeBreakdown(data.studentId, data.classId);

  // Get attendance summary
  const attendance = await calculateAttendanceSummary(data.studentId, data.classId);

  const letterGrade = calculateLetterGrade(overallPercentage);

  const updateData: Record<string, unknown> = {
    overallPercentage,
    letterGrade,
    totalPoints,
    maxPoints,
    gradeBreakdown,
    attendance,
    updatedBy: teacherUid,
    updatedByName: teacherName,
    updatedAt: now,
  };

  if (data.teacherComments !== undefined) {
    updateData.teacherComments = data.teacherComments;
  }
  if (data.conductGrade !== undefined) {
    updateData.conductGrade = data.conductGrade;
  }

  await doc.ref.update(updateData);

  return getReportCardById(reportCardId);
}

/**
 * Calculate grade breakdown by assignment type
 */
async function calculateGradeBreakdown(
  studentId: string,
  classId: string
): Promise<{
  gradeBreakdown: GradeBreakdown;
  overallPercentage: number;
  totalPoints: number;
  maxPoints: number;
}> {
  // Get all assignments for the class
  const assignments = await getAssignmentsByClass(classId);

  // Get all grades for the student in this class
  const grades = await getGradesByStudentAndClass(studentId, classId);

  // Create a map of assignmentId -> grade
  const gradeMap = new Map(grades.map((g) => [g.assignmentId, g]));

  // Initialize breakdown
  const breakdown: GradeBreakdown = {
    homework: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
    quiz: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
    test: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
    project: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
    classwork: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
    participation: { points: 0, maxPoints: 0, percentage: 0, count: 0 },
  };

  let totalPoints = 0;
  let maxPoints = 0;

  // Calculate breakdown
  for (const assignment of assignments) {
    if (assignment.status !== 'published' && assignment.status !== 'closed') continue;

    const grade = gradeMap.get(assignment.id);
    if (grade) {
      const type = assignment.type as AssignmentType;
      if (breakdown[type]) {
        breakdown[type].points += grade.pointsEarned;
        breakdown[type].maxPoints += grade.maxPoints;
        breakdown[type].count++;
        totalPoints += grade.pointsEarned;
        maxPoints += grade.maxPoints;
      }
    }
  }

  // Calculate percentages for each type
  for (const type of Object.keys(breakdown) as AssignmentType[]) {
    const b = breakdown[type];
    b.percentage = b.maxPoints > 0 ? Math.round((b.points / b.maxPoints) * 100 * 10) / 10 : 0;
  }

  const overallPercentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100 * 10) / 10 : 0;

  return {
    gradeBreakdown: breakdown,
    overallPercentage,
    totalPoints,
    maxPoints,
  };
}

/**
 * Calculate attendance summary for report card
 */
async function calculateAttendanceSummary(
  studentId: string,
  classId: string
): Promise<AttendanceSummaryForReport> {
  const result = await getAttendanceRecords({
    studentId,
    classId,
    limit: 1000,
  });

  const summary: AttendanceSummaryForReport = {
    totalDays: result.records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0,
  };

  for (const record of result.records) {
    switch (record.status) {
      case 'present':
        summary.present++;
        break;
      case 'absent':
        summary.absent++;
        break;
      case 'late':
        summary.late++;
        break;
      case 'excused':
        summary.excused++;
        break;
    }
  }

  const attended = summary.present + summary.late;
  summary.attendanceRate = summary.totalDays > 0
    ? Math.round((attended / summary.totalDays) * 100)
    : 0;

  return summary;
}

/**
 * Get report card by ID
 */
export async function getReportCardById(id: string): Promise<ReportCard | null> {
  const doc = await getDb().collection(REPORT_CARDS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as ReportCard;
}

/**
 * Get report cards for a class
 */
export async function getReportCardsByClass(
  classId: string,
  term?: AcademicTerm,
  academicYear?: string
): Promise<ReportCard[]> {
  let query = getDb()
    .collection(REPORT_CARDS_COLLECTION)
    .where('classId', '==', classId)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  if (term) {
    query = query.where('term', '==', term);
  }
  if (academicYear) {
    query = query.where('academicYear', '==', academicYear);
  }

  const snap = await query.get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReportCard[];
}

/**
 * Get report cards for a student
 */
export async function getReportCardsByStudent(studentId: string): Promise<ReportCard[]> {
  const snap = await getDb()
    .collection(REPORT_CARDS_COLLECTION)
    .where('studentId', '==', studentId)
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReportCard[];
}

/**
 * Get published report cards for a student (parent view)
 */
export async function getPublishedReportCardsByStudent(studentId: string): Promise<ReportCard[]> {
  const snap = await getDb()
    .collection(REPORT_CARDS_COLLECTION)
    .where('studentId', '==', studentId)
    .where('status', '==', 'published')
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReportCard[];
}

/**
 * Get report cards with filters
 */
export async function getReportCards(
  filters: ReportCardFilters
): Promise<ReportCardListResponse> {
  const {
    classId,
    studentId,
    term,
    academicYear,
    status,
    limit = 50,
    offset = 0,
  } = filters;

  let query = getDb()
    .collection(REPORT_CARDS_COLLECTION)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  if (classId) {
    query = query.where('classId', '==', classId);
  }
  if (studentId) {
    query = query.where('studentId', '==', studentId);
  }
  if (term) {
    query = query.where('term', '==', term);
  }
  if (academicYear) {
    query = query.where('academicYear', '==', academicYear);
  }
  if (status) {
    query = query.where('status', '==', status);
  }

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const reportCards = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReportCard[];

  return {
    reportCards,
    total,
  };
}

/**
 * Update a report card
 */
export async function updateReportCard(
  id: string,
  data: UpdateReportCardDto,
  editorUid: string,
  editorName: string
): Promise<ReportCard | null> {
  const doc = await getDb().collection(REPORT_CARDS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existingData = doc.data()!;
  if (existingData.docStatus === 'deleted') return null;

  const now = Timestamp.now();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
    updatedBy: editorUid,
    updatedByName: editorName,
  };

  if (data.teacherComments !== undefined) {
    updateData.teacherComments = data.teacherComments;
  }
  if (data.conductGrade !== undefined) {
    updateData.conductGrade = data.conductGrade;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'published') {
      updateData.publishedAt = now;
    }
  }

  await doc.ref.update(updateData);

  return getReportCardById(id);
}

/**
 * Publish a report card
 */
export async function publishReportCard(
  id: string,
  editorUid: string,
  editorName: string
): Promise<ReportCard | null> {
  return updateReportCard(id, { status: 'published' }, editorUid, editorName);
}

/**
 * Bulk generate report cards for a class
 */
export async function bulkGenerateReportCards(
  classId: string,
  term: AcademicTerm,
  academicYear: string,
  teacherUid: string,
  teacherName: string,
  studentIds?: string[]
): Promise<ReportCard[]> {
  // Get class info
  const classData = await getClassById(classId);
  if (!classData) {
    throw new Error(`Class not found: ${classId}`);
  }

  // Get students in the class
  let students;
  if (studentIds && studentIds.length > 0) {
    // Use specific students
    students = [];
    for (const studentId of studentIds) {
      const student = await getStudentById(studentId);
      if (student) {
        students.push(student);
      }
    }
  } else {
    // Get all students in the class
    const studentsSnap = await getDb()
      .collection('students')
      .where('classId', '==', classId)
      .where('status', '==', 'active')
      .get();
    students = studentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  const results: ReportCard[] = [];

  for (const student of students) {
    const reportCard = await generateReportCard(
      {
        classId,
        studentId: student.id,
        term,
        academicYear,
      },
      teacherUid,
      teacherName
    );
    results.push(reportCard);
  }

  return results;
}

/**
 * Soft delete a report card
 */
export async function deleteReportCard(id: string): Promise<boolean> {
  const doc = await getDb().collection(REPORT_CARDS_COLLECTION).doc(id).get();

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
 * Verify parent can access report card
 */
export async function verifyReportCardParentAccess(
  reportCardId: string,
  parentUid: string
): Promise<boolean> {
  const reportCard = await getReportCardById(reportCardId);
  if (!reportCard) return false;

  // Check if parent owns this student
  return reportCard.parentId === parentUid;
}
