import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getAllClasses } from '@/lib/firestoreClasses';
import { getAllStudents } from '@/lib/firestoreStudents';
import { getTeacherClasses } from '@/lib/teacherGuard';
import { getAttendanceRecords, getAttendanceSummary } from '@/lib/firestoreAttendance';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * @swagger
 * /api/v1/teacher/dashboard:
 *   get:
 *     summary: Get teacher dashboard data
 *     description: Returns an overview of the teachers classes, student count, and recent attendance.
 *     tags:
 *       - Teacher - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User is not a teacher
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });

    // Get all active classes, then filter to teacher's assigned classes
    const result = await getAllClasses({ status: 'active' });
    const teacherClasses = getTeacherClasses(token.uid, result.classes);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = dayNames[new Date().getDay()];

    // Calculate total students across all assigned classes
    let totalStudents = 0;
    const classesWithStats = await Promise.all(
      teacherClasses.map(async (cls) => {
        const studentResult = await getAllStudents({ classId: cls.id, status: 'active', limit: 100 });
        totalStudents += studentResult.students.length;

        // Get today's attendance summary if it exists
        const attendanceSummary = await getAttendanceSummary(cls.id, today);

        return {
          id: cls.id,
          name: cls.name,
          gradeName: cls.gradeName || cls.level || '',
          day: cls.day,
          time: cls.time,
          teacherRole: cls.teacherRole,
          studentCount: studentResult.students.length,
          capacity: cls.capacity,
          todayAttendance: attendanceSummary ? {
            present: attendanceSummary.present,
            absent: attendanceSummary.absent,
            late: attendanceSummary.late,
            excused: attendanceSummary.excused,
            total: attendanceSummary.total,
            attendanceRate: attendanceSummary.attendanceRate,
          } : null,
          isToday: cls.day === todayDay,
        };
      })
    );

    // Get today's classes
    const todaysClasses = classesWithStats.filter((c) => c.isToday);

    // Get recent attendance records (last 7 days) across all teacher's classes
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const recentAttendancePromises = teacherClasses.map((cls) =>
      getAttendanceRecords({
        classId: cls.id,
        startDate,
        endDate: today,
        limit: 50,
      })
    );

    const recentAttendanceResults = await Promise.all(recentAttendancePromises);
    const recentAttendance = recentAttendanceResults
      .flatMap((r) => r.records)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        classId: r.classId,
        className: r.className,
        date: r.date,
        studentName: r.studentName,
        status: r.status,
      }));

    const responseBody = {
      success: true,
      data: {
        teacher: {
          uid: token.uid,
          name: profile.name || `${profile.firstName} ${profile.lastName}`.trim(),
          email: profile.email,
        },
        stats: {
          totalClasses: teacherClasses.length,
          totalStudents,
          classesToday: todaysClasses.length,
        },
        todaysSchedule: todaysClasses.map((c) => ({
          id: c.id,
          name: c.name,
          gradeName: c.gradeName,
          time: c.time,
          studentCount: c.studentCount,
          teacherRole: c.teacherRole,
          todayAttendance: c.todayAttendance,
        })),
        classes: classesWithStats.map((c) => ({
          id: c.id,
          name: c.name,
          gradeName: c.gradeName,
          day: c.day,
          time: c.time,
          teacherRole: c.teacherRole,
          studentCount: c.studentCount,
          capacity: c.capacity,
        })),
        recentAttendance,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: '/api/v1/teacher/dashboard', method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/teacher/dashboard', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
