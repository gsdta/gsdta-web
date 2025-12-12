import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getStudentsByParentId } from '@/lib/firestoreUsers';
import { randomUUID } from 'crypto';

/**
 * @swagger
 * /api/v1/me/students:
 *   get:
 *     summary: Get students linked to current user
 *     description: Returns all students where the current user is set as the parent.
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked students
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
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           grade:
 *                             type: string
 *                           schoolName:
 *                             type: string
 *                           enrollmentDate:
 *                             type: string
 *                           status:
 *                             type: string
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active
 */
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
    'https://www.gsdta.com',
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
  const res = NextResponse.json({ code, message }, { status });
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
 * GET /api/v1/me/students
 * Returns students linked to the current authenticated user.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const authContext = await requireAuth(authz, { requireActive: true });
    const { token } = authContext;

    // Get students linked to this parent
    const students = await getStudentsByParentId(token.uid);

    const responseBody = {
      success: true,
      data: {
        students,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: '/api/v1/me/students', method: 'GET', count: students.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/me/students', method: 'GET', error: 'internal' }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
