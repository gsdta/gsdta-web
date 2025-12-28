import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceListResponse,
  AttendanceSummary,
  AttendanceByDate,
  StudentAttendanceSummary,
  AttendanceEditHistory,
  CreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceAnalytics,
  AttendanceTrendPoint,
  ClassComparison,
  ChronicAbsentee,
  AnalyticsFilters,
  ChronicAbsenteeFilters,
} from '@/types/attendance';
import { ATTENDANCE_CONSTANTS } from '@/types/attendance';
import { getClassById } from './firestoreClasses';
import { getStudentById } from './firestoreStudents';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Create attendance records for a class session (bulk)
 */
export async function createAttendanceRecords(
  classId: string,
  date: string,
  records: CreateAttendanceDto[],
  teacherUid: string,
  teacherName: string
): Promise<AttendanceRecord[]> {
  const now = Timestamp.now();

  // Get class info for denormalization
  const classData = await getClassById(classId);
  if (!classData) {
    throw new Error(`Class not found: ${classId}`);
  }

  const db = getDb();
  const batch = db.batch();
  const createdRecords: AttendanceRecord[] = [];

  for (const record of records) {
    // Get student info for denormalization
    const student = await getStudentById(record.studentId);
    if (!student) {
      throw new Error(`Student not found: ${record.studentId}`);
    }

    const docRef = db.collection(ATTENDANCE_COLLECTION).doc();
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    const attendanceData: Omit<AttendanceRecord, 'id'> = {
      classId,
      className: classData.name,
      date,
      studentId: record.studentId,
      studentName,
      status: record.status,
      arrivalTime: record.arrivalTime,
      notes: record.notes,
      recordedBy: teacherUid,
      recordedByName: teacherName,
      recordedAt: now,
      docStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    batch.set(docRef, attendanceData);

    createdRecords.push({
      id: docRef.id,
      ...attendanceData,
    });
  }

  await batch.commit();

  return createdRecords;
}

/**
 * Get attendance record by ID
 */
export async function getAttendanceById(id: string): Promise<AttendanceRecord | null> {
  const doc = await getDb().collection(ATTENDANCE_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as AttendanceRecord;
}

/**
 * Get attendance records by class and date
 */
export async function getAttendanceByClassAndDate(
  classId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const snap = await getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('classId', '==', classId)
    .where('date', '==', date)
    .where('docStatus', '==', 'active')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];
}

/**
 * Get attendance records with filters
 */
export async function getAttendanceRecords(
  filters: AttendanceFilters
): Promise<AttendanceListResponse> {
  const {
    classId,
    studentId,
    date,
    startDate,
    endDate,
    status,
    recordedBy,
    limit = 50,
    offset = 0,
  } = filters;

  let query = getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  // Apply filters
  if (classId) {
    query = query.where('classId', '==', classId);
  }
  if (studentId) {
    query = query.where('studentId', '==', studentId);
  }
  if (date) {
    query = query.where('date', '==', date);
  }
  if (startDate && endDate) {
    query = query.where('date', '>=', startDate).where('date', '<=', endDate);
  } else if (startDate) {
    query = query.where('date', '>=', startDate);
  } else if (endDate) {
    query = query.where('date', '<=', endDate);
  }
  if (status) {
    query = query.where('status', '==', status);
  }
  if (recordedBy) {
    query = query.where('recordedBy', '==', recordedBy);
  }

  // Order by date descending
  query = query.orderBy('date', 'desc');

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const records = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];

  return {
    records,
    total,
    limit,
    offset,
  };
}

/**
 * Update an attendance record
 */
export async function updateAttendanceRecord(
  id: string,
  data: UpdateAttendanceDto,
  editorUid: string,
  editorName: string
): Promise<AttendanceRecord | null> {
  const doc = await getDb().collection(ATTENDANCE_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existingData = doc.data()!;
  if (existingData.docStatus === 'deleted') return null;

  // Check if edit is within allowed window
  const recordDate = new Date(existingData.date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > 7) {
    throw new Error('Cannot edit attendance records older than 7 days');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    lastEditedBy: editorUid,
    lastEditedByName: editorName,
    lastEditedAt: Timestamp.now(),
  };

  // Track edit history if status changed
  if (data.status !== undefined && data.status !== existingData.status) {
    const editEntry: AttendanceEditHistory = {
      previousStatus: existingData.status,
      newStatus: data.status,
      editedBy: editorUid,
      editedByName: editorName,
      editedAt: Timestamp.now(),
      reason: data.editReason,
    };

    const editHistory = existingData.editHistory || [];
    editHistory.push(editEntry);
    updateData.editHistory = editHistory;
    updateData.status = data.status;
  }

  if (data.arrivalTime !== undefined) updateData.arrivalTime = data.arrivalTime;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await doc.ref.update(updateData);

  return getAttendanceById(id);
}

/**
 * Soft delete an attendance record
 */
export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  const doc = await getDb().collection(ATTENDANCE_COLLECTION).doc(id).get();

  if (!doc.exists) return false;

  await doc.ref.update({
    docStatus: 'deleted',
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Calculate attendance summary for a class on a specific date
 */
export async function getAttendanceSummary(
  classId: string,
  date: string
): Promise<AttendanceSummary | null> {
  const records = await getAttendanceByClassAndDate(classId, date);

  if (records.length === 0) return null;

  const classData = await getClassById(classId);
  if (!classData) return null;

  const summary: AttendanceSummary = {
    date,
    classId,
    className: classData.name,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: records.length,
    attendanceRate: 0,
  };

  for (const record of records) {
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

  // Calculate attendance rate (present + late counts as attended)
  const attended = summary.present + summary.late;
  summary.attendanceRate = summary.total > 0 ? Math.round((attended / summary.total) * 100) : 0;

  return summary;
}

/**
 * Get attendance history grouped by date for a class
 */
export async function getAttendanceHistory(
  classId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 30
): Promise<AttendanceByDate[]> {
  const filters: AttendanceFilters = {
    classId,
    startDate,
    endDate,
    limit: 1000, // Get all records, we'll group them
  };

  const result = await getAttendanceRecords(filters);

  // Group by date
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const record of result.records) {
    const existing = byDate.get(record.date) || [];
    existing.push(record);
    byDate.set(record.date, existing);
  }

  // Convert to AttendanceByDate array
  const history: AttendanceByDate[] = [];
  for (const [date, records] of byDate.entries()) {
    const summary = await getAttendanceSummary(classId, date);
    if (summary) {
      history.push({
        date,
        summary,
        records,
      });
    }
  }

  // Sort by date descending and limit
  history.sort((a, b) => b.date.localeCompare(a.date));

  return history.slice(0, limit);
}

/**
 * Get attendance summary for a student across all classes
 */
export async function getStudentAttendanceSummary(
  studentId: string
): Promise<StudentAttendanceSummary | null> {
  const student = await getStudentById(studentId);
  if (!student) return null;

  const result = await getAttendanceRecords({ studentId, limit: 1000 });

  const summary: StudentAttendanceSummary = {
    studentId,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    totalSessions: result.records.length,
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
  summary.attendanceRate =
    summary.totalSessions > 0 ? Math.round((attended / summary.totalSessions) * 100) : 0;

  return summary;
}

/**
 * Check if attendance already exists for a class on a date
 */
export async function attendanceExistsForDate(
  classId: string,
  date: string
): Promise<boolean> {
  const records = await getAttendanceByClassAndDate(classId, date);
  return records.length > 0;
}

/**
 * Delete all attendance records for a class on a date (soft delete)
 */
export async function deleteAttendanceForDate(
  classId: string,
  date: string
): Promise<number> {
  const records = await getAttendanceByClassAndDate(classId, date);

  if (records.length === 0) return 0;

  const db = getDb();
  const batch = db.batch();

  for (const record of records) {
    const docRef = db.collection(ATTENDANCE_COLLECTION).doc(record.id);
    batch.update(docRef, {
      docStatus: 'deleted',
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();

  return records.length;
}

// ============================================
// Analytics Functions
// ============================================

/**
 * Get attendance analytics for a date range
 */
export async function getAttendanceAnalytics(
  filters: AnalyticsFilters
): Promise<AttendanceAnalytics> {
  const { dateRange, classId, gradeId } = filters;

  // Build query
  let query = getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('date', '>=', dateRange.startDate)
    .where('date', '<=', dateRange.endDate) as FirebaseFirestore.Query;

  if (classId) {
    query = query.where('classId', '==', classId);
  }

  const snap = await query.get();
  const records = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];

  // If gradeId filter, we need to filter in memory (since gradeId is in classes collection)
  let filteredRecords = records;
  if (gradeId && !classId) {
    // Get classes for this grade
    const classesSnap = await getDb()
      .collection('classes')
      .where('gradeId', '==', gradeId)
      .where('status', '==', 'active')
      .get();
    const gradeClassIds = new Set(classesSnap.docs.map((doc) => doc.id));
    filteredRecords = records.filter((r) => gradeClassIds.has(r.classId));
  }

  // Calculate overall stats
  const overallStats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0,
  };

  for (const record of filteredRecords) {
    switch (record.status) {
      case 'present':
        overallStats.present++;
        break;
      case 'absent':
        overallStats.absent++;
        break;
      case 'late':
        overallStats.late++;
        break;
      case 'excused':
        overallStats.excused++;
        break;
    }
  }

  const totalRecords = filteredRecords.length;
  const attended = overallStats.present + overallStats.late;
  overallStats.attendanceRate = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;

  // Calculate trend data (group by date)
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const record of filteredRecords) {
    const existing = byDate.get(record.date) || [];
    existing.push(record);
    byDate.set(record.date, existing);
  }

  const trendData: AttendanceTrendPoint[] = [];
  for (const [date, dateRecords] of byDate.entries()) {
    const point: AttendanceTrendPoint = {
      date,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: dateRecords.length,
      attendanceRate: 0,
    };

    for (const record of dateRecords) {
      switch (record.status) {
        case 'present':
          point.present++;
          break;
        case 'absent':
          point.absent++;
          break;
        case 'late':
          point.late++;
          break;
        case 'excused':
          point.excused++;
          break;
      }
    }

    const pointAttended = point.present + point.late;
    point.attendanceRate = point.total > 0 ? Math.round((pointAttended / point.total) * 100) : 0;
    trendData.push(point);
  }

  // Sort by date
  trendData.sort((a, b) => a.date.localeCompare(b.date));

  // Count unique sessions (unique dates)
  const uniqueDates = new Set(filteredRecords.map((r) => r.date));

  return {
    dateRange,
    totalSessions: uniqueDates.size,
    totalStudentRecords: totalRecords,
    overallStats,
    trendData,
  };
}

/**
 * Get class comparison for a date range
 */
export async function getClassComparison(
  filters: AnalyticsFilters
): Promise<ClassComparison[]> {
  const { dateRange, gradeId } = filters;

  // Get all active classes
  let classQuery = getDb()
    .collection('classes')
    .where('status', '==', 'active') as FirebaseFirestore.Query;

  if (gradeId) {
    classQuery = classQuery.where('gradeId', '==', gradeId);
  }

  const classesSnap = await classQuery.get();
  const classes = classesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Get all attendance records for the date range
  const attSnap = await getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('date', '>=', dateRange.startDate)
    .where('date', '<=', dateRange.endDate)
    .get();

  const allRecords = attSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];

  // Group by class
  const byClass = new Map<string, AttendanceRecord[]>();
  for (const record of allRecords) {
    const existing = byClass.get(record.classId) || [];
    existing.push(record);
    byClass.set(record.classId, existing);
  }

  // Build comparison data
  const comparisons: ClassComparison[] = [];

  for (const classDoc of classes) {
    const classData = classDoc as { id: string; name: string; gradeId?: string };
    const classRecords = byClass.get(classData.id) || [];

    if (classRecords.length === 0) continue; // Skip classes with no attendance

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendanceRate: 0,
    };

    const uniqueStudents = new Set<string>();
    const uniqueDates = new Set<string>();

    for (const record of classRecords) {
      uniqueStudents.add(record.studentId);
      uniqueDates.add(record.date);

      switch (record.status) {
        case 'present':
          stats.present++;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          break;
        case 'excused':
          stats.excused++;
          break;
      }
    }

    const totalRecords = classRecords.length;
    const attended = stats.present + stats.late;
    stats.attendanceRate = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;

    comparisons.push({
      classId: classData.id,
      className: classData.name,
      gradeId: classData.gradeId,
      totalSessions: uniqueDates.size,
      totalStudents: uniqueStudents.size,
      stats,
    });
  }

  // Sort by attendance rate ascending (worst first)
  comparisons.sort((a, b) => a.stats.attendanceRate - b.stats.attendanceRate);

  return comparisons;
}

/**
 * Get chronic absentees (students below attendance threshold)
 */
export async function getChronicAbsentees(
  filters: ChronicAbsenteeFilters
): Promise<{ absentees: ChronicAbsentee[]; total: number }> {
  const {
    dateRange,
    classId,
    gradeId,
    threshold = ATTENDANCE_CONSTANTS.CHRONIC_ABSENTEE_THRESHOLD,
    limit = 50,
    offset = 0,
  } = filters;

  // Get all attendance records for the date range
  let query = getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('date', '>=', dateRange.startDate)
    .where('date', '<=', dateRange.endDate) as FirebaseFirestore.Query;

  if (classId) {
    query = query.where('classId', '==', classId);
  }

  const snap = await query.get();
  let records = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];

  // Filter by grade if needed
  if (gradeId && !classId) {
    const classesSnap = await getDb()
      .collection('classes')
      .where('gradeId', '==', gradeId)
      .where('status', '==', 'active')
      .get();
    const gradeClassIds = new Set(classesSnap.docs.map((doc) => doc.id));
    records = records.filter((r) => gradeClassIds.has(r.classId));
  }

  // Group by student
  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
    const existing = byStudent.get(record.studentId) || [];
    existing.push(record);
    byStudent.set(record.studentId, existing);
  }

  // Calculate attendance for each student
  const studentStats: ChronicAbsentee[] = [];

  for (const [studentId, studentRecords] of byStudent.entries()) {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    let lastAttendedDate: string | undefined;
    let studentName = '';
    let latestClassId = '';
    let latestClassName = '';

    // Sort records by date to find last attended
    const sortedRecords = [...studentRecords].sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    for (const record of sortedRecords) {
      studentName = record.studentName;
      if (!latestClassId) {
        latestClassId = record.classId;
        latestClassName = record.className;
      }

      switch (record.status) {
        case 'present':
          stats.present++;
          if (!lastAttendedDate) lastAttendedDate = record.date;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          if (!lastAttendedDate) lastAttendedDate = record.date;
          break;
        case 'excused':
          stats.excused++;
          break;
      }
    }

    const totalSessions = studentRecords.length;
    const attended = stats.present + stats.late;
    const attendanceRate =
      totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

    // Only include if below threshold
    if (attendanceRate < threshold) {
      studentStats.push({
        studentId,
        studentName,
        classId: latestClassId,
        className: latestClassName,
        totalSessions,
        ...stats,
        attendanceRate,
        lastAttendedDate,
      });
    }
  }

  // Sort by attendance rate (worst first)
  studentStats.sort((a, b) => a.attendanceRate - b.attendanceRate);

  const total = studentStats.length;
  const paginated = studentStats.slice(offset, offset + limit);

  return {
    absentees: paginated,
    total,
  };
}

/**
 * Export attendance records for CSV/JSON export
 */
export async function exportAttendanceRecords(filters: {
  dateRange: { startDate: string; endDate: string };
  classId?: string;
  studentId?: string;
}): Promise<AttendanceRecord[]> {
  const { dateRange, classId, studentId } = filters;

  let query = getDb()
    .collection(ATTENDANCE_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('date', '>=', dateRange.startDate)
    .where('date', '<=', dateRange.endDate) as FirebaseFirestore.Query;

  if (classId) {
    query = query.where('classId', '==', classId);
  }

  if (studentId) {
    query = query.where('studentId', '==', studentId);
  }

  query = query.orderBy('date', 'desc');

  const snap = await query.get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[];
}
