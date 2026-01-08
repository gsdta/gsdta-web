import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { assignClassToStudent, getStudentById } from '@/lib/firestoreStudents';
import { getClassById, incrementEnrolled } from '@/lib/firestoreClasses';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const assignClassSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
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
 * /api/v1/admin/students/{id}/assign-class:
 *   patch:
 *     summary: Assign a class to a student (admin)
 *     description: Assigns a class to an admitted student and changes status to active.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classId
 *             properties:
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class assigned successfully
 *       400:
 *         description: Validation error or student not in admitted/active status
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Student or class not found
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

    // Parse and validate request body
    const body = await req.json();
    const parseResult = assignClassSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { classId } = parseResult.data;

    // Check if student exists
    const existingStudent = await getStudentById(id);
    if (!existingStudent) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Check if class exists
    const classData = await getClassById(classId);
    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Check class capacity
    if (classData.enrolled >= classData.capacity) {
      return jsonError(400, 'class/full', 'Class is at full capacity', origin);
    }

    // Check if class is active
    if (classData.status !== 'active') {
      return jsonError(400, 'class/inactive', 'Cannot assign student to inactive class', origin);
    }

    // Assign the class to the student
    const student = await assignClassToStudent(id, classId, classData.name);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Increment the class enrolled count
    await incrementEnrolled(classId, 1);

    const responseBody = {
      success: true,
      message: 'Class assigned successfully',
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
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/assign-class`, method: 'PATCH', classId }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error && err.message.includes('admitted')) {
      return jsonError(400, 'student/invalid-status', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/assign-class`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
