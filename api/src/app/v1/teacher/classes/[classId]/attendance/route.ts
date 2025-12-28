import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import {
  createAttendanceRecords,
  getAttendanceRecords,
  getAttendanceSummary,
  attendanceExistsForDate,
} from '@/lib/firestoreAttendance';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for marking attendance
const markAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      arrivalTime: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1, 'At least one attendance record is required'),
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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * GET /api/v1/teacher/classes/{classId}/attendance
 * Get attendance history for a class
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Attendance');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const result = await getAttendanceRecords({
      classId,
      date,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Format records for response
    const formattedRecords = result.records.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      date: r.date,
      status: r.status,
      arrivalTime: r.arrivalTime,
      notes: r.notes,
      recordedBy: r.recordedBy,
      recordedByName: r.recordedByName,
      recordedAt: r.recordedAt?.toDate?.()?.toISOString() ?? '',
      lastEditedBy: r.lastEditedBy,
      lastEditedByName: r.lastEditedByName,
      lastEditedAt: r.lastEditedAt?.toDate?.()?.toISOString() ?? null,
    }));

    // Get summary if viewing a specific date
    let summary = null;
    if (date) {
      summary = await getAttendanceSummary(classId, date);
    }

    const responseBody = {
      success: true,
      data: {
        records: formattedRecords,
        total: result.total,
        limit,
        offset,
        summary,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance`, method: 'GET', count: formattedRecords.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * POST /api/v1/teacher/classes/{classId}/attendance
 * Mark attendance for a class
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Attendance');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Parse and validate request body
    const body = await req.json();
    const parseResult = markAttendanceSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { date, records } = parseResult.data;

    // Check if attendance already exists for this date
    const exists = await attendanceExistsForDate(classId, date);
    if (exists) {
      return jsonError(409, 'attendance/already-exists', `Attendance for ${date} already exists. Please edit individual records instead.`, origin);
    }

    // Validate date is not in the future
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (attendanceDate > today) {
      return jsonError(400, 'validation/invalid-date', 'Cannot mark attendance for future dates', origin);
    }

    // Validate date is within 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (attendanceDate < sevenDaysAgo) {
      return jsonError(400, 'validation/date-too-old', 'Cannot mark attendance for dates older than 7 days', origin);
    }

    // Create attendance records
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();
    const createdRecords = await createAttendanceRecords(
      classId,
      date,
      records,
      token.uid,
      teacherName
    );

    // Format records for response
    const formattedRecords = createdRecords.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      date: r.date,
      status: r.status,
      arrivalTime: r.arrivalTime,
      notes: r.notes,
      recordedBy: r.recordedBy,
      recordedByName: r.recordedByName,
    }));

    const responseBody = {
      success: true,
      data: {
        records: formattedRecords,
        count: formattedRecords.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance`, method: 'POST', count: createdRecords.length }));
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
      if (err.message.includes('not found')) {
        return jsonError(404, 'resource/not-found', err.message, origin);
      }
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/attendance`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
