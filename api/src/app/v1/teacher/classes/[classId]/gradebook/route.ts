import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import { getGradebook } from '@/lib/firestoreStudentGrades';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * GET /api/v1/teacher/classes/{classId}/gradebook
 * Get the full gradebook view for a class
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

    // Get gradebook
    const gradebook = await getGradebook(classId);

    if (!gradebook) {
      return jsonError(404, 'resource/not-found', 'Class not found', origin);
    }

    // Format gradebook for response
    const formattedGradebook = {
      classId: gradebook.classId,
      className: gradebook.className,
      classAverage: gradebook.classAverage,
      assignments: gradebook.assignments,
      students: gradebook.students.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        averagePercentage: s.averagePercentage,
        letterGrade: s.letterGrade,
        totalPoints: s.totalPoints,
        maxPoints: s.maxPoints,
        grades: Object.fromEntries(
          Object.entries(s.grades).map(([assignmentId, grade]) => [
            assignmentId,
            grade
              ? {
                  id: grade.id,
                  pointsEarned: grade.pointsEarned,
                  maxPoints: grade.maxPoints,
                  percentage: grade.percentage,
                  letterGrade: grade.letterGrade,
                }
              : null,
          ])
        ),
      })),
    };

    const responseBody = {
      success: true,
      data: formattedGradebook,
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({
      requestId,
      path: `/api/v1/teacher/classes/${classId}/gradebook`,
      method: 'GET',
      studentCount: gradebook.students.length,
      assignmentCount: gradebook.assignments.length,
    }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/gradebook`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
