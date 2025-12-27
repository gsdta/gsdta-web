import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import { getAllStudents } from '@/lib/firestoreStudents';
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
 * /api/v1/teacher/classes/{classId}/roster:
 *   get:
 *     summary: Get student roster for a class
 *     description: Returns the list of students enrolled in a class. Teacher must be assigned to the class.
 *     tags:
 *       - Teacher - Roster
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: The class ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by student name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, all]
 *         description: Filter by student status (default: active)
 *     responses:
 *       200:
 *         description: List of students in the class
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
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           status:
 *                             type: string
 *                     total:
 *                       type: integer
 *                     class:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
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

    // Verify teacher is assigned to this class
    const { classData, role } = await verifyTeacherAssignment(token.uid, classId);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || 'active';

    // Get students in this class
    const result = await getAllStudents({
      classId,
      status: status as 'active' | 'all',
      search,
      limit: 100, // Classes typically don't have more than this
    });

    // Format students for response (limit exposed data for privacy)
    const formattedStudents = result.students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName} ${s.lastName}`.trim(),
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      grade: s.grade,
      status: s.status,
      // Contact info for teachers (emergency situations)
      contacts: s.contacts,
      medicalNotes: s.medicalNotes,
    }));

    const responseBody = {
      success: true,
      data: {
        students: formattedStudents,
        total: formattedStudents.length,
        class: {
          id: classData.id,
          name: classData.name,
          gradeName: classData.gradeName,
          day: classData.day,
          time: classData.time,
          teacherRole: role,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/roster`, method: 'GET', count: formattedStudents.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/roster`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
