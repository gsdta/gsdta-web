import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, AuthError } from '@/lib/auth';
import { getUserProfile } from '@/lib/firestoreUsers';
import { randomUUID } from 'crypto';

/**
 * @swagger
 * /api/v1/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: Returns the user profile from Firestore merged with token fields. Requires Authorization header with Firebase ID token.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uid:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 status:
 *                   type: string
 *                 emailVerified:
 *                   type: boolean
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active
 *       404:
 *         description: User profile not found
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    return origin === 'http://localhost:3000' ? origin : null;
  }
  // In production, we typically don't need cross-origin access from UI (same domain), but keep allow-list if needed.
  const prodAllowed = new Set<string>([
    'https://www.gsdta.org',
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
 * GET /api/v1/me
 * Returns current authenticated user profile merged with token fields.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const token = await verifyIdToken(authz);

    const profile = await getUserProfile(token.uid);
    if (!profile) {
      return jsonError(404, 'users/not-found', 'User profile not found', origin);
    }

    if (profile.status !== 'active') {
      return jsonError(403, 'auth/forbidden', 'User status is not active', origin);
    }

    const body = {
      uid: token.uid,
      email: token.email ?? profile.email,
      name: profile.name,
      roles: profile.roles,
      status: profile.status,
      emailVerified: token.emailVerified,
    };

    const res = NextResponse.json(body, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    // minimal log without PII beyond uid
    console.info(JSON.stringify({ requestId, uid: token.uid, path: '/api/v1/me', method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/me', method: 'GET', error: 'internal' }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
