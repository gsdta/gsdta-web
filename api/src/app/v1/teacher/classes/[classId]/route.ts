import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
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
 * /api/v1/teacher/classes/{classId}:
 *   get:
 *     summary: Get details of a specific class assigned to the teacher
 *     description: Returns detailed information about a class the teacher is assigned to.
 *     tags:
 *       - Teacher - Classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: The class ID
 *     responses:
 *       200:
 *         description: Class details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     class:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         gradeName:
 *                           type: string
 *                         day:
 *                           type: string
 *                         time:
 *                           type: string
 *                         capacity:
 *                           type: integer
 *                         enrolled:
 *                           type: integer
 *                         teacherRole:
 *                           type: string
 *                           enum: [primary, assistant]
 *                         teachers:
 *                           type: array
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Teacher not assigned to this class
 *       404:
 *         description: Class not found
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
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    const { classData, role } = await verifyTeacherAssignment(token.uid, classId);

    // Format teachers for response (hide assignedBy for non-admin)
    const formattedTeachers = (classData.teachers || []).map((t) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      role: t.role,
      assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const responseBody = {
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          gradeId: classData.gradeId || '',
          gradeName: classData.gradeName || classData.level || '',
          day: classData.day,
          time: classData.time,
          capacity: classData.capacity,
          enrolled: classData.enrolled,
          available: classData.capacity - classData.enrolled,
          teacherRole: role,
          teachers: formattedTeachers,
          status: classData.status,
          academicYear: classData.academicYear,
          createdAt: classData.createdAt?.toDate?.()?.toISOString() ?? '',
          updatedAt: classData.updatedAt?.toDate?.()?.toISOString() ?? '',
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
