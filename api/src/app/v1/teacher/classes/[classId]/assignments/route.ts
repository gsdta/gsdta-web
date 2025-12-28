import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import {
  createAssignment,
  getAssignmentsByClass,
} from '@/lib/firestoreAssignments';
import { ASSIGNMENT_CONSTANTS } from '@/types/assignment';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for creating an assignment
const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(ASSIGNMENT_CONSTANTS.VALID_TYPES),
  maxPoints: z.number()
    .min(ASSIGNMENT_CONSTANTS.MIN_POINTS)
    .max(ASSIGNMENT_CONSTANTS.MAX_POINTS),
  weight: z.number().min(0).max(10).optional(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * GET /api/v1/teacher/classes/{classId}/assignments
 * Get assignments for a class
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const assignments = await getAssignmentsByClass(classId, status);

    // Format assignments for response
    const formattedAssignments = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      status: a.status,
      maxPoints: a.maxPoints,
      weight: a.weight,
      assignedDate: a.assignedDate,
      dueDate: a.dueDate,
      className: a.className,
      createdAt: a.createdAt?.toDate?.()?.toISOString() ?? '',
      updatedAt: a.updatedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const responseBody = {
      success: true,
      data: {
        assignments: formattedAssignments,
        total: formattedAssignments.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments`, method: 'GET', count: formattedAssignments.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * POST /api/v1/teacher/classes/{classId}/assignments
 * Create an assignment for a class
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Parse and validate request body
    const body = await req.json();
    const parseResult = createAssignmentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const data = parseResult.data;

    // Validate due date is not before assigned date
    if (data.dueDate < data.assignedDate) {
      return jsonError(400, 'validation/invalid-dates', 'Due date cannot be before assigned date', origin);
    }

    // Create assignment
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();
    const assignment = await createAssignment(
      {
        classId,
        ...data,
      },
      token.uid,
      teacherName
    );

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
        createdAt: assignment.createdAt?.toDate?.()?.toISOString() ?? '',
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments`, method: 'POST', assignmentId: assignment.id }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error) {
      if (err.message.includes('not found')) {
        return jsonError(404, 'resource/not-found', err.message, origin);
      }
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
