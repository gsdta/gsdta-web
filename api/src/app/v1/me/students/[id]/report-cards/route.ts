import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getPublishedReportCardsByStudent } from '@/lib/firestoreReportCards';
import { getStudentById } from '@/lib/firestoreStudents';
import { TERM_NAMES } from '@/types/reportCard';
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
 * GET /api/v1/me/students/{id}/report-cards
 * Get published report cards for a student (parent view)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id: studentId } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['parent'] });

    // Verify the student belongs to this parent
    const student = await getStudentById(studentId);
    if (!student) {
      return jsonError(404, 'resource/not-found', 'Student not found', origin);
    }

    if (student.parentId !== token.uid) {
      return jsonError(403, 'auth/forbidden', 'Not authorized to view this student', origin);
    }

    // Get published report cards
    const reportCards = await getPublishedReportCardsByStudent(studentId);

    // Format report cards for response (only include what parent should see)
    const formattedReportCards = reportCards.map((rc) => ({
      id: rc.id,
      className: rc.className,
      gradeName: rc.gradeName,
      term: rc.term,
      termName: TERM_NAMES[rc.term],
      academicYear: rc.academicYear,
      overallPercentage: rc.overallPercentage,
      letterGrade: rc.letterGrade,
      totalPoints: rc.totalPoints,
      maxPoints: rc.maxPoints,
      gradeBreakdown: rc.gradeBreakdown,
      attendance: rc.attendance,
      teacherComments: rc.teacherComments,
      conductGrade: rc.conductGrade,
      publishedAt: rc.publishedAt?.toDate?.()?.toISOString() ?? null,
    }));

    // Sort by academic year and term (most recent first)
    formattedReportCards.sort((a, b) => {
      const yearCompare = b.academicYear.localeCompare(a.academicYear);
      if (yearCompare !== 0) return yearCompare;
      // Order: annual > semester2 > semester1
      const termOrder = { annual: 3, semester2: 2, semester1: 1 };
      return (termOrder[b.term as keyof typeof termOrder] || 0) - (termOrder[a.term as keyof typeof termOrder] || 0);
    });

    const responseBody = {
      success: true,
      data: {
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        reportCards: formattedReportCards,
        total: formattedReportCards.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/me/students/${studentId}/report-cards`, method: 'GET', count: formattedReportCards.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/me/students/${studentId}/report-cards`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
