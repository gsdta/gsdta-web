import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { unassignClassFromStudent, getStudentById } from '@/lib/firestoreStudents';
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
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
 * /api/v1/admin/students/{id}/unassign-class:
 *   patch:
 *     summary: Remove a student from their current class (admin)
 *     description: |
 *       Removes a student's class assignment and decrements the class enrollment count.
 *       Only active students can be unassigned.
 *       The student remains active but without a class assignment.
 *     tags:
 *       - Admin - Students
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student unassigned from class successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       type: object
 *       400:
 *         description: Student not active or not assigned to any class
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Student not found
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Students');

    // Check if student exists
    const existingStudent = await getStudentById(id);
    if (!existingStudent) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Perform the unassignment
    const student = await unassignClassFromStudent(id);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    const responseBody = {
      success: true,
      message: 'Student unassigned from class successfully',
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          status: student.status,
          classId: student.classId,
          className: student.className,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({
      requestId,
      path: `/api/v1/admin/students/${id}/unassign-class`,
      method: 'PATCH',
    }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof Error) {
      // Handle specific error messages from unassignClassFromStudent
      if (err.message.includes('active')) {
        return jsonError(400, 'unassign/invalid-status', err.message, origin);
      }
      if (err.message.includes('not assigned')) {
        return jsonError(400, 'unassign/not-assigned', err.message, origin);
      }
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/unassign-class`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
