import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { admitStudent, getStudentById } from '@/lib/firestoreStudents';
import { randomUUID } from 'crypto';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * /api/v1/admin/students/{id}/admit:
 *   patch:
 *     summary: Admit a student (admin)
 *     description: Changes a student's status from pending to admitted.
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
 *     responses:
 *       200:
 *         description: Student admitted successfully
 *       400:
 *         description: Student is not in pending status
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
    const authContext = await requireAuth(authz, { requireRoles: ['admin'] });
    const { token } = authContext;

    // Check if student exists
    const existingStudent = await getStudentById(id);
    if (!existingStudent) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Admit the student
    const student = await admitStudent(id, token.uid);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    const responseBody = {
      success: true,
      message: 'Student admitted successfully',
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          status: student.status,
          admittedAt: student.admittedAt?.toDate?.()?.toISOString(),
          admittedBy: student.admittedBy,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/admit`, method: 'PATCH', adminId: token.uid }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof Error && err.message.includes('pending')) {
      return jsonError(400, 'student/invalid-status', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/admit`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
