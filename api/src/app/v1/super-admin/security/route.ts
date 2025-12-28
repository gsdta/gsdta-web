import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { querySecurityEvents, getSecurityStats, resolveSecurityEvent } from '@/lib/securityEvents';
import type { SecurityEventType } from '@/lib/securityEvents';

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
 * /api/v1/super-admin/security:
 *   get:
 *     summary: Get security events and statistics
 *     description: Returns security events with optional filters or statistics. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stats
 *         schema:
 *           type: boolean
 *         description: If true, return only statistics
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [login_failed, rate_limit_exceeded, unauthorized_access, suspicious_activity]
 *         description: Filter by event type
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolved status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Security events or statistics
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
    const statsOnly = searchParams.get('stats') === 'true';

    // If only requesting statistics
    if (statsOnly) {
      const stats = await getSecurityStats();
      const res = NextResponse.json({
        success: true,
        data: stats,
      }, { status: 200 });
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Build query
    const query = {
      type: searchParams.get('type') as SecurityEventType | undefined,
      resolved: searchParams.get('resolved') === 'true' ? true :
                searchParams.get('resolved') === 'false' ? false : undefined,
      limit: Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100),
      offset: Math.max(0, parseInt(searchParams.get('offset') || '0')),
    };

    // Query security events
    const { events, total } = await querySecurityEvents(query);

    const response = {
      success: true,
      data: {
        events,
        total,
        limit: query.limit,
        offset: query.offset,
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
    console.error('Error querying security events:', err);
    return jsonError(500, 'internal/error', 'Failed to query security events', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/security:
 *   post:
 *     summary: Resolve a security event
 *     description: Mark a security event as resolved with a resolution note. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - resolution
 *             properties:
 *               eventId:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event resolved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    // Require super_admin role
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    // Parse request body
    const body = await req.json();
    const { eventId, resolution } = body;

    if (!eventId || !resolution) {
      return jsonError(400, 'validation/error', 'eventId and resolution are required', origin);
    }

    // Resolve the event
    const event = await resolveSecurityEvent(eventId, profile.uid, resolution);

    if (!event) {
      return jsonError(404, 'not-found', 'Security event not found', origin);
    }

    const response = {
      success: true,
      message: 'Security event resolved',
      data: { event },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error resolving security event:', err);
    return jsonError(500, 'internal/error', 'Failed to resolve security event', origin);
  }
}
