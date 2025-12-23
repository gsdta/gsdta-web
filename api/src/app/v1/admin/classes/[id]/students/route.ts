import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getStudentsByClassId, bulkAssignStudentsToClass } from '@/lib/firestoreStudents';
import { getClassById } from '@/lib/firestoreClasses';
import { randomUUID } from 'crypto';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bulkAssignSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, 'At least one student ID is required'),
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
 * /api/v1/admin/classes/{id}/students:
 *   get:
 *     summary: Get all students enrolled in a class
 *     description: Returns the class details and list of enrolled students
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
 *     responses:
 *       200:
 *         description: Class roster retrieved successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Class not found
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

    // Get class details
    const classData = await getClassById(id);
    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Get enrolled students
    const students = await getStudentsByClassId(id);

    const responseBody = {
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          gradeId: classData.gradeId,
          gradeName: classData.gradeName,
          capacity: classData.capacity,
          enrolled: classData.enrolled,
        },
        students: students.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: `${s.firstName} ${s.lastName}`,
          grade: s.grade,
          status: s.status,
          parentEmail: s.parentEmail,
        })),
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students`, method: 'GET', count: students.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/classes/{id}/students:
 *   post:
 *     summary: Bulk assign students to a class
 *     description: Assigns multiple admitted students to a class and changes their status to active
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Students assigned successfully
 *       400:
 *         description: Validation error or capacity exceeded
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Class not found
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    // Parse and validate request body
    const body = await req.json();
    const parseResult = bulkAssignSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { studentIds } = parseResult.data;

    // Get class details
    const classData = await getClassById(id);
    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Check class capacity
    const newEnrolled = classData.enrolled + studentIds.length;
    if (newEnrolled > classData.capacity) {
      return jsonError(
        400,
        'class/capacity-exceeded',
        `Cannot assign ${studentIds.length} students. Only ${classData.capacity - classData.enrolled} spots available.`,
        origin
      );
    }

    // Check if class is active
    if (classData.status !== 'active') {
      return jsonError(400, 'class/inactive', 'Cannot assign students to inactive class', origin);
    }

    // Bulk assign students
    await bulkAssignStudentsToClass(id, classData.name, studentIds);

    // Get updated roster
    const students = await getStudentsByClassId(id);

    const responseBody = {
      success: true,
      message: `${studentIds.length} student(s) assigned successfully`,
      data: {
        assignedCount: studentIds.length,
        class: {
          id: classData.id,
          name: classData.name,
          enrolled: newEnrolled,
        },
        students: students.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: `${s.firstName} ${s.lastName}`,
          status: s.status,
        })),
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students`, method: 'POST', assignedCount: studentIds.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error && (err.message.includes('admitted') || err.message.includes('pending') || err.message.includes('grade') || err.message.includes('status'))) {
      return jsonError(400, 'student/invalid-status', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}/students`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
