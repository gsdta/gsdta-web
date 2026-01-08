import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import { getAttendanceById, updateAttendanceRecord } from '@/lib/firestoreAttendance';
import { getAttendanceConfig } from '@/lib/systemConfig';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for updating attendance
const updateAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
  arrivalTime: z.string().optional(),
  notes: z.string().max(500).optional(),
  editReason: z.string().max(200).optional(),
});

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return origin;
    }
    return null;
  }
  const prodAllowed = new Set<string>([
    'https://gsdta.com',
    'https://www.gsdta.com',
    'https://app.gsdta.com',
    'https://app.qa.gsdta.com',
  ]);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonError(status: number, code: string, message: string, origin: string | null) {
  const res = NextResponse.json({ success: false, code, message }, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * GET /api/v1/teacher/classes/{classId}/attendance/{recordId}
 * Get a single attendance record
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; recordId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, recordId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Attendance');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get the record
    const record = await getAttendanceById(recordId);

    if (!record) {
      return jsonError(404, 'attendance/not-found', 'Attendance record not found', origin);
    }

    // Verify the record belongs to this class
    if (record.classId !== classId) {
      return jsonError(404, 'attendance/not-found', 'Attendance record not found in this class', origin);
    }

    const formattedRecord = {
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      date: record.date,
      status: record.status,
      arrivalTime: record.arrivalTime,
      notes: record.notes,
      recordedBy: record.recordedBy,
      recordedByName: record.recordedByName,
      recordedAt: record.recordedAt?.toDate?.()?.toISOString() ?? '',
      lastEditedBy: record.lastEditedBy,
      lastEditedByName: record.lastEditedByName,
      lastEditedAt: record.lastEditedAt?.toDate?.()?.toISOString() ?? null,
      editHistory: record.editHistory?.map((h) => ({
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        editedBy: h.editedBy,
        editedByName: h.editedByName,
        editedAt: h.editedAt?.toDate?.()?.toISOString() ?? '',
        reason: h.reason,
      })),
    };

    const responseBody = {
      success: true,
      data: { record: formattedRecord },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance/${recordId}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * PUT /api/v1/teacher/classes/{classId}/attendance/{recordId}
 * Update a single attendance record
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; recordId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, recordId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Attendance');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get the existing record to verify it belongs to this class
    const existingRecord = await getAttendanceById(recordId);
    if (!existingRecord) {
      return jsonError(404, 'attendance/not-found', 'Attendance record not found', origin);
    }
    if (existingRecord.classId !== classId) {
      return jsonError(404, 'attendance/not-found', 'Attendance record not found in this class', origin);
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = updateAttendanceSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    // Get configurable edit window from system config
    const attendanceConfig = await getAttendanceConfig();
    const editWindowDays = attendanceConfig.editWindowDays;

    // Update the record
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();
    const updatedRecord = await updateAttendanceRecord(
      recordId,
      parseResult.data,
      token.uid,
      teacherName,
      editWindowDays
    );

    if (!updatedRecord) {
      return jsonError(404, 'attendance/not-found', 'Attendance record not found', origin);
    }

    const formattedRecord = {
      id: updatedRecord.id,
      studentId: updatedRecord.studentId,
      studentName: updatedRecord.studentName,
      date: updatedRecord.date,
      status: updatedRecord.status,
      arrivalTime: updatedRecord.arrivalTime,
      notes: updatedRecord.notes,
      recordedBy: updatedRecord.recordedBy,
      recordedByName: updatedRecord.recordedByName,
      recordedAt: updatedRecord.recordedAt?.toDate?.()?.toISOString() ?? '',
      lastEditedBy: updatedRecord.lastEditedBy,
      lastEditedByName: updatedRecord.lastEditedByName,
      lastEditedAt: updatedRecord.lastEditedAt?.toDate?.()?.toISOString() ?? null,
    };

    const responseBody = {
      success: true,
      data: { record: formattedRecord },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance/${recordId}`, method: 'PUT' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    // Handle specific errors
    if (err instanceof Error) {
      if (err.message.includes('older than') && err.message.includes('days')) {
        return jsonError(400, 'attendance/edit-window-expired', err.message, origin);
      }
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance/${recordId}`, method: 'PUT', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
