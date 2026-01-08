import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { verifyTeacherAssignment } from '@/lib/teacherGuard';
import {
  getReportCardById,
  updateReportCard,
  publishReportCard,
  deleteReportCard,
} from '@/lib/firestoreReportCards';
import { REPORT_CARD_CONSTANTS, TERM_NAMES } from '@/types/reportCard';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for updating a report card
const updateReportCardSchema = z.object({
  teacherComments: z.string().max(2000).optional(),
  conductGrade: z.string().max(50).optional(),
  status: z.enum(REPORT_CARD_CONSTANTS.VALID_STATUSES).optional(),
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
 * GET /api/v1/teacher/classes/{classId}/report-cards/{id}
 * Get a specific report card
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, id } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get report card
    const reportCard = await getReportCardById(id);

    if (!reportCard) {
      return jsonError(404, 'resource/not-found', 'Report card not found', origin);
    }

    // Verify report card belongs to this class
    if (reportCard.classId !== classId) {
      return jsonError(404, 'resource/not-found', 'Report card not found in this class', origin);
    }

    const responseBody = {
      success: true,
      data: {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: reportCard.studentName,
        className: reportCard.className,
        gradeName: reportCard.gradeName,
        term: reportCard.term,
        termName: TERM_NAMES[reportCard.term],
        academicYear: reportCard.academicYear,
        overallPercentage: reportCard.overallPercentage,
        letterGrade: reportCard.letterGrade,
        totalPoints: reportCard.totalPoints,
        maxPoints: reportCard.maxPoints,
        gradeBreakdown: reportCard.gradeBreakdown,
        attendance: reportCard.attendance,
        teacherComments: reportCard.teacherComments,
        conductGrade: reportCard.conductGrade,
        status: reportCard.status,
        publishedAt: reportCard.publishedAt?.toDate?.()?.toISOString() ?? null,
        generatedBy: reportCard.generatedBy,
        generatedByName: reportCard.generatedByName,
        createdAt: reportCard.createdAt?.toDate?.()?.toISOString() ?? '',
        updatedAt: reportCard.updatedAt?.toDate?.()?.toISOString() ?? '',
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * PUT /api/v1/teacher/classes/{classId}/report-cards/{id}
 * Update a report card (comments, conduct grade, or publish)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, id } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get existing report card
    const existingReportCard = await getReportCardById(id);
    if (!existingReportCard || existingReportCard.classId !== classId) {
      return jsonError(404, 'resource/not-found', 'Report card not found', origin);
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = updateReportCardSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const data = parseResult.data;
    const teacherName = profile.name || `${profile.firstName} ${profile.lastName}`.trim();

    // Update report card
    const updated = await updateReportCard(id, data, token.uid, teacherName);

    if (!updated) {
      return jsonError(404, 'resource/not-found', 'Report card not found', origin);
    }

    const responseBody = {
      success: true,
      data: {
        id: updated.id,
        studentName: updated.studentName,
        term: updated.term,
        academicYear: updated.academicYear,
        overallPercentage: updated.overallPercentage,
        letterGrade: updated.letterGrade,
        teacherComments: updated.teacherComments,
        conductGrade: updated.conductGrade,
        status: updated.status,
        publishedAt: updated.publishedAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: updated.updatedAt?.toDate?.()?.toISOString() ?? '',
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'PUT' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'PUT', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * DELETE /api/v1/teacher/classes/{classId}/report-cards/{id}
 * Delete a report card
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; id: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { classId, id } = await params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Verify teacher is assigned to this class
    await verifyTeacherAssignment(token.uid, classId);

    // Get existing report card
    const existingReportCard = await getReportCardById(id);
    if (!existingReportCard || existingReportCard.classId !== classId) {
      return jsonError(404, 'resource/not-found', 'Report card not found', origin);
    }

    // Don't allow deleting published report cards
    if (existingReportCard.status === 'published') {
      return jsonError(400, 'validation/cannot-delete', 'Cannot delete a published report card', origin);
    }

    // Delete report card
    const deleted = await deleteReportCard(id);

    if (!deleted) {
      return jsonError(404, 'resource/not-found', 'Report card not found', origin);
    }

    const responseBody = {
      success: true,
      message: 'Report card deleted successfully',
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'DELETE' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/teacher/classes/${classId}/report-cards/${id}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
