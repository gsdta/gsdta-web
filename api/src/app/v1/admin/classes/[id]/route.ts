import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getClassById, updateClass } from '@/lib/firestoreClasses';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for updating a class
const updateClassSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  gradeId: z.string().min(1).max(50).optional(),
  day: z.string().min(1).max(20).optional(),
  time: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  academicYear: z.string().max(20).optional(),
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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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
 * /api/v1/admin/classes/{id}:
 *   get:
 *     summary: Get class details (admin)
 *     description: Returns detailed information about a specific class.
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
 *         description: Class details
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
    await requireFeature('admin', 'Classes');

    const classData = await getClassById(id);

    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Format teachers for response
    const formattedTeachers = (classData.teachers || []).map((t) => ({
      ...t,
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
          teachers: formattedTeachers,
          // Legacy fields for backward compatibility
          level: classData.level,
          teacherId: classData.teacherId,
          teacherName: classData.teacherName,
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
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/classes/{id}:
 *   patch:
 *     summary: Update class (admin)
 *     description: Updates a class's information.
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
 *             properties:
 *               name:
 *                 type: string
 *               gradeId:
 *                 type: string
 *                 description: Reference to grades collection
 *               day:
 *                 type: string
 *               time:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               academicYear:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Class not found
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
    await requireFeature('admin', 'Classes');

    const body = await req.json();
    const parseResult = updateClassSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const classData = await updateClass(id, parseResult.data);

    if (!classData) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    // Format teachers for response
    const formattedTeachers = (classData.teachers || []).map((t) => ({
      ...t,
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
          teachers: formattedTeachers,
          // Legacy fields for backward compatibility
          level: classData.level,
          teacherId: classData.teacherId,
          teacherName: classData.teacherName,
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
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}`, method: 'PATCH' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    // Handle grade not found error
    if (err instanceof Error && err.message.includes('Grade not found')) {
      return jsonError(400, 'validation/invalid-grade', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/classes/${id}`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
