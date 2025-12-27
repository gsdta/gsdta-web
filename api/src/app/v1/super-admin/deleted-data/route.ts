import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { queryDeletedData, getActiveSuspensions } from '@/lib/dataRecovery';

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
 * /api/v1/super-admin/deleted-data:
 *   get:
 *     summary: List deleted data or active suspensions
 *     description: Returns list of soft-deleted data or active suspensions. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Data Recovery
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deleted, suspensions]
 *         description: Type of data to query (default deleted)
 *       - in: query
 *         name: collection
 *         schema:
 *           type: string
 *         description: Filter by collection name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of records to skip
 *       - in: query
 *         name: includeRestored
 *         schema:
 *           type: boolean
 *         description: Include already restored data
 *     responses:
 *       200:
 *         description: Deleted data list or suspensions list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'deleted';

    if (type === 'suspensions') {
      const suspensions = await getActiveSuspensions();

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
    }

    // Default: deleted data
    const collection = searchParams.get('collection') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeRestored = searchParams.get('includeRestored') === 'true';

    const { entries, total } = await queryDeletedData({
      collection,
      limit,
      offset,
      includeRestored,
    });

    const response = {
      success: true,
      data: {
        entries,
        total,
        limit,
        offset,
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
    console.error('Error querying deleted data:', err);
    return jsonError(500, 'internal/error', 'Failed to query deleted data', origin);
  }
}
