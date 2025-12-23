import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getStudentById, adminUpdateStudent } from '@/lib/firestoreStudents';
import { corsHeaders } from '@/lib/cors';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zod schema for admin student update
const adminUpdateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
  medicalNotes: z.string().max(1000).optional(),
  photoConsent: z.boolean().optional(),
  status: z.enum(['pending', 'admitted', 'active', 'inactive', 'withdrawn']).optional(),
  classId: z.string().optional(),
  className: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

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
 * /api/v1/admin/students/{id}:
 *   get:
 *     summary: Get student details (admin)
 *     description: Returns detailed information about a specific student.
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
 *         description: Student details
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
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
    await requireAuth(authz, { requireRoles: ['admin'] });

    const student = await getStudentById(id);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
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
          parentId: student.parentId,
          parentEmail: student.parentEmail,
          grade: student.grade,
          schoolName: student.schoolName,
          priorTamilLevel: student.priorTamilLevel,
          medicalNotes: student.medicalNotes,
          photoConsent: student.photoConsent,
          classId: student.classId,
          className: student.className,
          status: student.status,
          notes: student.notes,
          createdAt: student.createdAt?.toDate?.()?.toISOString() ?? '',
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() ?? '',
          admittedAt: student.admittedAt?.toDate?.()?.toISOString(),
          admittedBy: student.admittedBy,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/students/{id}:
 *   patch:
 *     summary: Update student (admin)
 *     description: Updates a student's information. Admin can update all fields including status.
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
 *               status:
 *                 type: string
 *                 enum: [pending, admitted, active, inactive, withdrawn]
 *               classId:
 *                 type: string
 *               className:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student updated
 *       400:
 *         description: Validation error
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

    const body = await req.json();
    const parseResult = adminUpdateStudentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const student = await adminUpdateStudent(id, parseResult.data);

    if (!student) {
      return jsonError(404, 'student/not-found', 'Student not found', origin);
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
          parentId: student.parentId,
          parentEmail: student.parentEmail,
          grade: student.grade,
          schoolName: student.schoolName,
          priorTamilLevel: student.priorTamilLevel,
          medicalNotes: student.medicalNotes,
          photoConsent: student.photoConsent,
          classId: student.classId,
          className: student.className,
          status: student.status,
          notes: student.notes,
          createdAt: student.createdAt?.toDate?.()?.toISOString() ?? '',
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() ?? '',
          admittedAt: student.admittedAt?.toDate?.()?.toISOString(),
          admittedBy: student.admittedBy,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}`, method: 'PATCH' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/students/${id}`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
