import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { transferClassForStudent, getStudentById } from '@/lib/firestoreStudents';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const transferClassSchema = z.object({
  newClassId: z.string().min(1, 'New class ID is required'),
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
 * /api/v1/admin/students/{id}/transfer-class:
 *   patch:
 *     summary: Transfer a student to a different class (admin)
 *     description: |
 *       Transfers an active student from their current class to a new class.
 *       Updates enrollment counts for both the old and new classes.
 *       Only active students can be transferred.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newClassId
 *             properties:
 *               newClassId:
 *                 type: string
 *                 description: ID of the class to transfer the student to
 *     responses:
 *       200:
 *         description: Student transferred successfully
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
 *                     previousClassId:
 *                       type: string
 *                     previousClassName:
 *                       type: string
 *                     newClassId:
 *                       type: string
 *                     newClassName:
 *                       type: string
 *       400:
 *         description: Validation error, student not active, or class at capacity
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
    const parseResult = transferClassSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { newClassId } = parseResult.data;

    // Check if student exists
    const existingStudent = await getStudentById(id);
    if (!existingStudent) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Perform the transfer
    const result = await transferClassForStudent(id, newClassId);

    const responseBody = {
      success: true,
      message: 'Student transferred successfully',
      data: {
        student: {
          id: result.student.id,
          firstName: result.student.firstName,
          lastName: result.student.lastName,
          name: `${result.student.firstName} ${result.student.lastName}`,
          status: result.student.status,
          classId: result.student.classId,
          className: result.student.className,
        },
        previousClassId: result.previousClassId,
        previousClassName: result.previousClassName,
        newClassId: result.newClassId,
        newClassName: result.newClassName,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({
      requestId,
      path: `/api/v1/admin/students/${id}/transfer-class`,
      method: 'PATCH',
      newClassId,
      previousClassId: result.previousClassId,
    }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error) {
      // Handle specific error messages from transferClassForStudent
      if (err.message.includes('not found')) {
        return jsonError(404, 'not-found', err.message, origin);
      }
      if (err.message.includes('active') || err.message.includes('capacity') || err.message.includes('inactive')) {
        return jsonError(400, 'transfer/invalid', err.message, origin);
      }
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}/transfer-class`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
