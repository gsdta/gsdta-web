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
} from '@/types/attendance';
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
