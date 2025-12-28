import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { AuthError } from '@/lib/auth';
import { bulkAssignClass } from '@/lib/firestoreStudents';
import { getClassById, incrementEnrolled } from '@/lib/firestoreClasses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS helpers
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonResponse(data: unknown, status: number, origin: string | null) {
  const res = NextResponse.json(data, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonError(status: number, code: string, message: string, origin: string | null) {
  return jsonResponse({ success: false, code, message }, status, origin);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Request body schema
const bulkAssignClassSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, 'At least one student ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
});

/**
 * @swagger
 * /api/v1/admin/students/bulk-assign-class:
 *   post:
 *     summary: Bulk assign class to multiple students
 *     description: |
 *       Assign multiple students to a single class. Requires admin role.
 *       Students must be in 'admitted' or 'active' status.
 *       Class must have sufficient capacity for all students.
 *     tags:
 *       - Admin - Students
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *               - classId
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs to assign
 *               classId:
 *                 type: string
 *                 description: Class ID to assign students to
 *     responses:
 *       200:
 *         description: Assignment completed
 *       400:
 *         description: Invalid request or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');

  try {
    // Require admin role
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Students');

    // Parse request body
    const body = await req.json();
    const parseResult = bulkAssignClassSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonError(
        400,
        'INVALID_REQUEST',
        parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        origin
      );
    }

    const { studentIds, classId } = parseResult.data;

    // Validate class exists and has capacity
    const classInfo = await getClassById(classId);
    if (!classInfo) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    if (classInfo.status !== 'active') {
      return jsonError(400, 'CLASS_INACTIVE', 'Cannot assign students to an inactive class', origin);
    }

    const availableCapacity = classInfo.capacity - classInfo.enrolled;
    if (availableCapacity < studentIds.length) {
      return jsonError(
        400,
        'INSUFFICIENT_CAPACITY',
        `Class only has ${availableCapacity} available slots but ${studentIds.length} students requested`,
        origin
      );
    }

    // Perform bulk assignment
    const result = await bulkAssignClass(studentIds, classId, classInfo.name);

    // Update class enrolled count
    if (result.updated.length > 0) {
      await incrementEnrolled(classId, result.updated.length);
    }

    return jsonResponse(
      {
        success: result.failed.length === 0,
        updated: result.updated,
        failed: result.failed,
        enrolledCount: result.updated.length,
        message:
          result.failed.length === 0
            ? `Successfully assigned ${result.updated.length} student(s) to ${classInfo.name}`
            : `Assigned ${result.updated.length} student(s), ${result.failed.length} failed`,
      },
      result.failed.length === 0 ? 200 : 207, // 207 Multi-Status for partial success
      origin
    );
  } catch (error) {
    console.error('Bulk assign class error:', error);

    if (error instanceof AuthError) {
      return jsonError(error.status, error.code, error.message, origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}
