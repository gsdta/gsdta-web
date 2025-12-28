import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getAllAdmins, getNonAdminUsers } from '@/lib/firestoreAdminManagement';

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
 * @swagger
 * /api/v1/super-admin/users/admins:
 *   get:
 *     summary: Get all admin users
 *     description: Returns a list of all users with admin or super_admin role. Super-admin only.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_promotable
 *         schema:
 *           type: boolean
 *         description: If true, also include non-admin users that can be promoted
 *     responses:
 *       200:
 *         description: List of admin users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    // Require super_admin role
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin'] });

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const includePromotable = searchParams.get('include_promotable') === 'true';

    // Get all admins
    const admins = await getAllAdmins();

    // Optionally include non-admin users that can be promoted
    let promotableUsers: Awaited<ReturnType<typeof getNonAdminUsers>> = [];
    if (includePromotable) {
      promotableUsers = await getNonAdminUsers();
    }

    const response = {
      success: true,
      data: {
        admins,
        total: admins.length,
        ...(includePromotable && { promotableUsers }),
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
    console.error('Error fetching admins:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch admins', origin);
  }
}
