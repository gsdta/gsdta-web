import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getStudentById, updateStudent } from '@/lib/firestoreStudents';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { corsHeaders } from '@/lib/cors';

// Zod schema for student update
const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
  medicalNotes: z.string().max(1000).optional(),
  photoConsent: z.boolean().optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string, origin: string | null) {
  const res = NextResponse.json({ code, message }, { status });
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
 * /api/v1/me/students/{id}:
 *   get:
 *     summary: Get a specific student's details
 *     description: Returns the details of a student owned by the current parent.
 *     tags:
 *       - Parent
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
 *         description: Student details
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active or not the student's parent
 *       404:
 *         description: Student not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await params;

  try {
    const authz = req.headers.get('authorization');
    const authContext = await requireAuth(authz, { requireActive: true, requireRoles: ['parent'] });
    const { token } = authContext;

    // Get the student
    const student = await getStudentById(id);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
    }

    // Verify ownership
    if (student.parentId !== token.uid) {
      return jsonError(403, 'auth/forbidden', 'You do not have access to this student', origin);
    }

    const responseBody = {
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          dateOfBirth: student.dateOfBirth,
          grade: student.grade,
          schoolName: student.schoolName,
          priorTamilLevel: student.priorTamilLevel,
          medicalNotes: student.medicalNotes,
          photoConsent: student.photoConsent,
          classId: student.classId,
          className: student.className,
          status: student.status,
          createdAt: student.createdAt?.toDate?.()?.toISOString() ?? '',
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() ?? '',
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: `/api/v1/me/students/${id}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/me/students/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/me/students/{id}:
 *   put:
 *     summary: Update a student's details
 *     description: Updates a student owned by the current parent. Only allowed for students with pending or admitted status.
 *     tags:
 *       - Parent
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
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *               grade:
 *                 type: string
 *               schoolName:
 *                 type: string
 *               priorTamilLevel:
 *                 type: string
 *               medicalNotes:
 *                 type: string
 *               photoConsent:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       400:
 *         description: Validation error or student cannot be updated in current status
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active or not the student's parent
 *       404:
 *         description: Student not found
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await params;

  try {
    const authz = req.headers.get('authorization');
    const authContext = await requireAuth(authz, { requireActive: true, requireRoles: ['parent'] });
    const { token } = authContext;

    // Parse and validate request body
    const body = await req.json();
    const parseResult = updateStudentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    // Update the student (checkParentId ensures ownership)
    const student = await updateStudent(id, parseResult.data, token.uid);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found or you do not have access', origin);
    }

    const responseBody = {
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          dateOfBirth: student.dateOfBirth,
          grade: student.grade,
          schoolName: student.schoolName,
          priorTamilLevel: student.priorTamilLevel,
          medicalNotes: student.medicalNotes,
          photoConsent: student.photoConsent,
          classId: student.classId,
          className: student.className,
          status: student.status,
          createdAt: student.createdAt?.toDate?.()?.toISOString() ?? '',
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() ?? '',
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: `/api/v1/me/students/${id}`, method: 'PUT' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error && err.message.includes('Cannot update student')) {
      return jsonError(400, 'student/invalid-status', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/me/students/${id}`, method: 'PUT', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
