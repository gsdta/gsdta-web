import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getAllClasses } from '@/lib/firestoreClasses';
import { getTeacherClasses } from '@/lib/teacherGuard';
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
 * @swagger
 * /api/v1/teacher/classes:
 *   get:
 *     summary: List classes assigned to the authenticated teacher
 *     description: Returns a list of classes where the authenticated teacher is assigned as primary or assistant.
 *     tags:
 *       - Teacher - Classes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned classes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     classes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           gradeName:
 *                             type: string
 *                           day:
 *                             type: string
 *                           time:
 *                             type: string
 *                           capacity:
 *                             type: integer
 *                           enrolled:
 *                             type: integer
 *                           teacherRole:
 *                             type: string
 *                             enum: [primary, assistant]
 *                     total:
 *                       type: integer
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User is not a teacher
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['teacher'] });
    await requireFeature('teacher', 'Classes');

    // Get all active classes, then filter to teacher's assigned classes
    const result = await getAllClasses({ status: 'active' });
    const teacherClasses = getTeacherClasses(token.uid, result.classes);

    // Format classes for response
    const formattedClasses = teacherClasses.map((c) => ({
      id: c.id,
      name: c.name,
      gradeId: c.gradeId || '',
      gradeName: c.gradeName || c.level || '',
      day: c.day,
      time: c.time,
      capacity: c.capacity,
      enrolled: c.enrolled,
      available: c.capacity - c.enrolled,
      teacherRole: c.teacherRole,
      status: c.status,
      academicYear: c.academicYear,
      createdAt: c.createdAt?.toDate?.()?.toISOString() ?? '',
      updatedAt: c.updatedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const responseBody = {
      success: true,
      data: {
        classes: formattedClasses,
        total: formattedClasses.length,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: '/api/v1/teacher/classes', method: 'GET', count: formattedClasses.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/teacher/classes', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
