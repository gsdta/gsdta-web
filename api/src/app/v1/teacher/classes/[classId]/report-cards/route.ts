import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import {
  getReportCardsByClass,
  generateReportCard,
  bulkGenerateReportCards,
} from '@/lib/firestoreReportCards';
import { REPORT_CARD_CONSTANTS } from '@/types/reportCard';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for generating a report card
const generateReportCardSchema = z.object({
  studentId: z.string().min(1).optional(),
  term: z.enum(REPORT_CARD_CONSTANTS.VALID_TERMS),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format'),
  teacherComments: z.string().max(2000).optional(),
  conductGrade: z.string().max(50).optional(),
  studentIds: z.array(z.string()).optional(),
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
 * GET /api/v1/teacher/classes/{classId}/report-cards
 * Get report cards for a class
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
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const term = searchParams.get('term') as 'semester1' | 'semester2' | 'annual' | undefined;
    const academicYear = searchParams.get('academicYear') || undefined;

    const reportCards = await getReportCardsByClass(classId, term, academicYear);

    // Format report cards for response
    const formattedReportCards = reportCards.map((rc) => ({
      id: rc.id,
      studentId: rc.studentId,
      studentName: rc.studentName,
      term: rc.term,
      academicYear: rc.academicYear,
      overallPercentage: rc.overallPercentage,
      letterGrade: rc.letterGrade,
      status: rc.status,
      publishedAt: rc.publishedAt?.toDate?.()?.toISOString() ?? null,
      createdAt: rc.createdAt?.toDate?.()?.toISOString() ?? '',
    }));

    const responseBody = {
      success: true,
      data: {
        reportCards: formattedReportCards,
        total: formattedReportCards.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards`, method: 'GET', count: formattedReportCards.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * POST /api/v1/teacher/classes/{classId}/report-cards
 * Generate report card(s) for a class
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
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Parse and validate request body
    const body = await req.json();
    const parseResult = generateReportCardSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const data = parseResult.data;
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();

    let reportCards;

    if (data.studentId) {
      // Generate for single student
      const reportCard = await generateReportCard(
        {
          classId,
          studentId: data.studentId,
          term: data.term,
          academicYear: data.academicYear,
          teacherComments: data.teacherComments,
          conductGrade: data.conductGrade,
        },
        token.uid,
        teacherName
      );
      reportCards = [reportCard];
    } else {
      // Bulk generate for class
      reportCards = await bulkGenerateReportCards(
        classId,
        data.term,
        data.academicYear,
        token.uid,
        teacherName,
        data.studentIds
      );
    }

    // Format report cards for response
    const formattedReportCards = reportCards.map((rc) => ({
      id: rc.id,
      studentId: rc.studentId,
      studentName: rc.studentName,
      term: rc.term,
      academicYear: rc.academicYear,
      overallPercentage: rc.overallPercentage,
      letterGrade: rc.letterGrade,
      status: rc.status,
    }));

    const responseBody = {
      success: true,
      data: {
        reportCards: formattedReportCards,
        count: formattedReportCards.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards`, method: 'POST', count: reportCards.length }));
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
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
