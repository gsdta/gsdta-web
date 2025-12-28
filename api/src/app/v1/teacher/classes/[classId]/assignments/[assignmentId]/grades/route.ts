import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import { getAssignmentById, verifyAssignmentTeacher } from '@/lib/firestoreAssignments';
import {
  getGradesByAssignment,
  bulkCreateGrades,
} from '@/lib/firestoreStudentGrades';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for bulk grading
const bulkGradeSchema = z.object({
  grades: z.array(
    z.object({
      studentId: z.string().min(1),
      pointsEarned: z.number().min(0),
      feedback: z.string().max(1000).optional(),
    })
  ).min(1, 'At least one grade is required'),
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
 * GET /api/v1/teacher/classes/{classId}/assignments/{assignmentId}/grades
 * Get all grades for an assignment
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

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get assignment to verify it exists and belongs to this class
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment || assignment.classId !== classId) {
      return jsonError(404, 'resource/not-found', 'Assignment not found', origin);
    }

    // Get grades for the assignment
    const grades = await getGradesByAssignment(assignmentId);

    // Format grades for response
    const formattedGrades = grades.map((g) => ({
      id: g.id,
      studentId: g.studentId,
      studentName: g.studentName,
      pointsEarned: g.pointsEarned,
      maxPoints: g.maxPoints,
      percentage: g.percentage,
      letterGrade: g.letterGrade,
      feedback: g.feedback,
      gradedBy: g.gradedBy,
      gradedByName: g.gradedByName,
      gradedAt: g.gradedAt?.toDate?.()?.toISOString() ?? '',
    }));

    // Calculate stats
    let totalPoints = 0;
    let highScore = 0;
    let lowScore = assignment.maxPoints;

    for (const grade of grades) {
      totalPoints += grade.pointsEarned;
      if (grade.pointsEarned > highScore) highScore = grade.pointsEarned;
      if (grade.pointsEarned < lowScore) lowScore = grade.pointsEarned;
    }

    const gradedCount = grades.length;
    const averageScore = gradedCount > 0 ? Math.round((totalPoints / gradedCount) * 10) / 10 : 0;
    const averagePercentage = gradedCount > 0 ? Math.round((averageScore / assignment.maxPoints) * 100) : 0;

    const responseBody = {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          maxPoints: assignment.maxPoints,
        },
        grades: formattedGrades,
        stats: {
          gradedCount,
          averageScore,
          averagePercentage,
          highScore: gradedCount > 0 ? highScore : 0,
          lowScore: gradedCount > 0 ? lowScore : 0,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`, method: 'GET', count: gradedCount }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * POST /api/v1/teacher/classes/{classId}/assignments/{assignmentId}/grades
 * Bulk create/update grades for an assignment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, assignmentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Verify assignment belongs to teacher's class
    const isOwner = await verifyAssignmentTeacher(assignmentId, token.uid);
    if (!isOwner) {
      return jsonError(403, 'auth/forbidden', 'Not authorized to grade this assignment', origin);
    }

    // Get assignment
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      return jsonError(404, 'resource/not-found', 'Assignment not found', origin);
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = bulkGradeSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { grades } = parseResult.data;

    // Validate points don't exceed max
    for (const grade of grades) {
      if (grade.pointsEarned > assignment.maxPoints) {
        return jsonError(400, 'validation/invalid-points', `Points earned (${grade.pointsEarned}) cannot exceed max points (${assignment.maxPoints})`, origin);
      }
    }

    // Create/update grades
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();
    const createdGrades = await bulkCreateGrades(
      assignmentId,
      grades,
      token.uid,
      teacherName
    );

    // Format grades for response
    const formattedGrades = createdGrades.map((g) => ({
      id: g.id,
      studentId: g.studentId,
      studentName: g.studentName,
      pointsEarned: g.pointsEarned,
      maxPoints: g.maxPoints,
      percentage: g.percentage,
      letterGrade: g.letterGrade,
      feedback: g.feedback,
    }));

    const responseBody = {
      success: true,
      data: {
        grades: formattedGrades,
        count: formattedGrades.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`, method: 'POST', count: createdGrades.length }));
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
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
