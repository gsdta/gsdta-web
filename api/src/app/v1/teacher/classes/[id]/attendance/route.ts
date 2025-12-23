import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { AuthError } from '@/lib/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { getClassById } from '@/lib/firestoreClasses';
import { Timestamp } from 'firebase-admin/firestore';

const ATTENDANCE_COLLECTION = 'attendance';

// Schema for attendance records
const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

const saveAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  records: z.array(attendanceRecordSchema).min(1),
});

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy: string;
  markedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * GET /api/v1/teacher/classes/[id]/attendance?date=YYYY-MM-DD
 * Get attendance records for a class on a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request.headers.get('authorization'), {
      requireRoles: ['teacher', 'admin'],
    });

    const { id: classId } = await params;
    const teacherId = auth.profile.uid;

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get class
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Verify teacher is assigned (unless admin)
    const isAdmin = auth.profile.roles?.includes('admin');
    const isAssigned =
      classDoc.teachers.some((t) => t.teacherId === teacherId) ||
      classDoc.teacherId === teacherId;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this class' },
        { status: 403 }
      );
    }

    // Query attendance records for this class and date
    const snapshot = await adminDb()
      .collection(ATTENDANCE_COLLECTION)
      .where('classId', '==', classId)
      .where('date', '==', date)
      .get();

    const records = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: data.studentId,
        status: data.status,
        notes: data.notes || '',
        markedBy: data.markedBy,
        markedByName: data.markedByName,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        classId,
        date,
        records,
        total: records.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/teacher/classes/[id]/attendance
 * Save/update attendance records for a class
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request.headers.get('authorization'), {
      requireRoles: ['teacher', 'admin'],
    });

    const { id: classId } = await params;
    const teacherId = auth.profile.uid;
    const teacherName = auth.profile.name || auth.profile.email || 'Unknown Teacher';

    // Parse and validate body
    const body = await request.json();
    const validation = saveAttendanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { date, records } = validation.data;

    // Get class
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Verify teacher is assigned (unless admin)
    const isAdmin = auth.profile.roles?.includes('admin');
    const isAssigned =
      classDoc.teachers.some((t) => t.teacherId === teacherId) ||
      classDoc.teacherId === teacherId;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this class' },
        { status: 403 }
      );
    }

    // Delete existing attendance for this class/date (we'll replace all records)
    const existingSnap = await adminDb()
      .collection(ATTENDANCE_COLLECTION)
      .where('classId', '==', classId)
      .where('date', '==', date)
      .get();

    const batch = adminDb().batch();

    // Delete existing records
    existingSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Create new records
    const now = Timestamp.now();
    const newRecords: AttendanceRecord[] = [];

    for (const record of records) {
      const docRef = adminDb().collection(ATTENDANCE_COLLECTION).doc();
      const attendanceData = {
        studentId: record.studentId,
        classId,
        date,
        status: record.status,
        notes: record.notes || '',
        markedBy: teacherId,
        markedByName: teacherName,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(docRef, attendanceData);
      newRecords.push({ id: docRef.id, ...attendanceData });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      data: {
        classId,
        date,
        records: newRecords.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          status: r.status,
          notes: r.notes,
        })),
        savedCount: newRecords.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('Error saving attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save attendance' },
      { status: 500 }
    );
  }
}
