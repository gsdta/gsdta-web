import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getSystemConfig, updateSystemConfig, enableMaintenanceMode, disableMaintenanceMode } from '@/lib/systemConfig';

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
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
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
 * /api/v1/super-admin/config:
 *   get:
 *     summary: Get system configuration
 *     description: Returns current system configuration. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System configuration
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

    const config = await getSystemConfig();

    const response = {
      success: true,
      data: config,
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error getting system config:', err);
    return jsonError(500, 'internal/error', 'Failed to get system configuration', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/config:
 *   put:
 *     summary: Update system configuration
 *     description: Update system configuration settings. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rateLimits:
 *                 type: object
 *               backup:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 *       500:
 *         description: Internal server error
 */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    // Require super_admin role
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const body = await req.json();
    const { rateLimits, backup } = body;

    const config = await updateSystemConfig(
      { rateLimits, backup },
      profile.uid,
      profile.email || ''
    );

    const response = {
      success: true,
      message: 'Configuration updated',
      data: config,
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error updating system config:', err);
    return jsonError(500, 'internal/error', 'Failed to update system configuration', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/config:
 *   post:
 *     summary: Toggle maintenance mode
 *     description: Enable or disable maintenance mode. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enable_maintenance, disable_maintenance]
 *               message:
 *                 type: object
 *                 properties:
 *                   en:
 *                     type: string
 *                   ta:
 *                     type: string
 *     responses:
 *       200:
 *         description: Maintenance mode toggled
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    // Require super_admin role
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const body = await req.json();
    const { action, message } = body;

    let config;

    if (action === 'enable_maintenance') {
      if (!message?.en || !message?.ta) {
        return jsonError(400, 'validation/error', 'Maintenance message required in both languages', origin);
      }
      config = await enableMaintenanceMode(message, profile.uid, profile.email || '');
    } else if (action === 'disable_maintenance') {
      config = await disableMaintenanceMode(profile.uid, profile.email || '');
    } else {
      return jsonError(400, 'validation/error', 'Invalid action', origin);
    }

    const response = {
      success: true,
      message: action === 'enable_maintenance' ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      data: config,
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error toggling maintenance mode:', err);
    return jsonError(500, 'internal/error', 'Failed to toggle maintenance mode', origin);
  }
}
