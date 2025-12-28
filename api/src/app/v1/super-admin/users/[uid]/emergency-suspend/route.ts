import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { emergencySuspendUser, liftUserSuspension, getUserSuspensions } from '@/lib/dataRecovery';

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
 * @swagger
 * /api/v1/super-admin/users/{uid}/emergency-suspend:
 *   get:
 *     summary: Get suspension history for a user
 *     description: Returns all suspension records for a specific user. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Emergency Actions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Suspension history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { uid } = await params;
    const suspensions = await getUserSuspensions(uid);

    const response = {
      success: true,
      data: {
        suspensions,
        total: suspensions.length,
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error getting suspension history:', err);
    return jsonError(500, 'internal/error', 'Failed to get suspension history', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/users/{uid}/emergency-suspend:
 *   post:
 *     summary: Emergency suspend a user
 *     description: Immediately suspend a user account. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Emergency Actions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to suspend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - severity
 *             properties:
 *               reason:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [warning, temporary, permanent]
 *               durationDays:
 *                 type: number
 *                 description: Required for temporary suspensions
 *     responses:
 *       200:
 *         description: User suspended
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { uid } = await params;
    const body = await req.json();
    const { reason, severity, durationDays } = body;

    if (!reason?.trim()) {
      return jsonError(400, 'validation/error', 'Suspension reason is required', origin);
    }

    if (!['warning', 'temporary', 'permanent'].includes(severity)) {
      return jsonError(400, 'validation/error', 'Invalid severity level', origin);
    }

    if (severity === 'temporary' && (!durationDays || durationDays < 1)) {
      return jsonError(400, 'validation/error', 'Duration is required for temporary suspensions', origin);
    }

    const result = await emergencySuspendUser(
      uid,
      reason.trim(),
      severity,
      profile.uid,
      profile.email || '',
      durationDays
    );

    if (!result.success) {
      return jsonError(400, 'suspension/failed', result.error || 'Failed to suspend user', origin);
    }

    const response = {
      success: true,
      message: 'User suspended successfully',
      data: result.suspension,
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error suspending user:', err);
    return jsonError(500, 'internal/error', 'Failed to suspend user', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/users/{uid}/emergency-suspend:
 *   delete:
 *     summary: Lift a user suspension
 *     description: Remove suspension from a user account. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Emergency Actions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for lifting the suspension
 *     responses:
 *       200:
 *         description: Suspension lifted
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { uid } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return jsonError(400, 'validation/error', 'Reason for lifting suspension is required', origin);
    }

    const result = await liftUserSuspension(
      uid,
      reason.trim(),
      profile.uid,
      profile.email || ''
    );

    if (!result.success) {
      return jsonError(400, 'lift/failed', result.error || 'Failed to lift suspension', origin);
    }

    const response = {
      success: true,
      message: 'Suspension lifted successfully',
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error lifting suspension:', err);
    return jsonError(500, 'internal/error', 'Failed to lift suspension', origin);
  }
}
