import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { removeStudentFromClass, getStudentById } from '@/lib/firestoreStudents';
import { getClassById } from '@/lib/firestoreClasses';
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
 * /api/v1/admin/classes/{id}/students/{studentId}:
 *   delete:
 *     summary: Remove a student from a class
 *     description: Unassigns a student from a class and changes status back to admitted
 *     tags:
 *       - Admin - Classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student removed from class successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Student or class not found
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id, studentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    // Check if student exists
    const student = await getStudentById(studentId);
    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Check if class exists
    const classData = await getClassById(id);
    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Verify student is in this class
    if (student.classId !== id) {
      return jsonError(400, 'student/not-in-class', 'Student is not enrolled in this class', origin);
    }

    // Remove student from class
    await removeStudentFromClass(studentId, id);

    const responseBody = {
      success: true,
      message: 'Student removed from class successfully',
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
        },
        class: {
          id: classData.id,
          name: classData.name,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students/${studentId}`, method: 'DELETE' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students/${studentId}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
