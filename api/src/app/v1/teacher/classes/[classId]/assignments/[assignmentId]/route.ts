import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import {
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  verifyAssignmentTeacher,
} from '@/lib/firestoreAssignments';
import { ASSIGNMENT_CONSTANTS } from '@/types/assignment';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for updating an assignment
const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(ASSIGNMENT_CONSTANTS.VALID_TYPES).optional(),
  maxPoints: z.number()
    .min(ASSIGNMENT_CONSTANTS.MIN_POINTS)
    .max(ASSIGNMENT_CONSTANTS.MAX_POINTS)
    .optional(),
  weight: z.number().min(0).max(10).optional(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  status: z.enum(ASSIGNMENT_CONSTANTS.VALID_STATUSES).optional(),
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
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
 * GET /api/v1/teacher/classes/{classId}/assignments/{assignmentId}
 * Get a specific assignment
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, assignmentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get assignment
    const assignment = await getAssignmentById(assignmentId);

    if (!assignment) {
      return jsonError(404, 'resource/not-found', 'Assignment not found', origin);
    }

    // Verify assignment belongs to this class
    if (assignment.classId !== classId) {
      return jsonError(404, 'resource/not-found', 'Assignment not found in this class', origin);
    }

    const responseBody = {
      success: true,
      data: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        status: assignment.status,
        maxPoints: assignment.maxPoints,
        weight: assignment.weight,
        assignedDate: assignment.assignedDate,
        dueDate: assignment.dueDate,
        className: assignment.className,
        createdBy: assignment.createdBy,
        createdByName: assignment.createdByName,
        createdAt: assignment.createdAt?.toDate?.()?.toISOString() ?? '',
        updatedAt: assignment.updatedAt?.toDate?.()?.toISOString() ?? '',
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * PUT /api/v1/teacher/classes/{classId}/assignments/{assignmentId}
 * Update an assignment
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, assignmentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Verify assignment belongs to teacher's class
    const isOwner = await verifyAssignmentTeacher(assignmentId, token.uid);
    if (!isOwner) {
      return jsonError(403, 'auth/forbidden', 'Not authorized to update this assignment', origin);
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = updateAssignmentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const data = parseResult.data;

    // If both dates provided, validate due date is not before assigned date
    if (data.assignedDate && data.dueDate && data.dueDate < data.assignedDate) {
      return jsonError(400, 'validation/invalid-dates', 'Due date cannot be before assigned date', origin);
    }

    // Update assignment
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();
    const updated = await updateAssignment(assignmentId, data, token.uid, teacherName);

    if (!updated) {
      return jsonError(404, 'resource/not-found', 'Assignment not found', origin);
    }

    const responseBody = {
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        status: updated.status,
        maxPoints: updated.maxPoints,
        weight: updated.weight,
        assignedDate: updated.assignedDate,
        dueDate: updated.dueDate,
        className: updated.className,
        updatedAt: updated.updatedAt?.toDate?.()?.toISOString() ?? '',
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'PUT' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'PUT', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * DELETE /api/v1/teacher/classes/{classId}/assignments/{assignmentId}
 * Delete an assignment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, assignmentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Verify assignment belongs to teacher's class
    const isOwner = await verifyAssignmentTeacher(assignmentId, token.uid);
    if (!isOwner) {
      return jsonError(403, 'auth/forbidden', 'Not authorized to delete this assignment', origin);
    }

    // Delete assignment
    const deleted = await deleteAssignment(assignmentId);

    if (!deleted) {
      return jsonError(404, 'resource/not-found', 'Assignment not found', origin);
    }

    const responseBody = {
      success: true,
      message: 'Assignment deleted successfully',
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'DELETE' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
