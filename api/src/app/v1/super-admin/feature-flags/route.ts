import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import {
  getFeatureFlags,
  updateFeatureFlags,
  FeatureFlagRole,
  FEATURE_DESCRIPTIONS,
} from '@/lib/featureFlags';

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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
 * /api/v1/super-admin/feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     description: Returns current feature flags configuration. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature flags configuration
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
    // Require super_admin or admin_readonly role (view-only access)
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin', 'admin_readonly'] });

    const flags = await getFeatureFlags();

    const response = {
      success: true,
      data: {
        flags,
        descriptions: FEATURE_DESCRIPTIONS,
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
    console.error('Error getting feature flags:', err);
    return jsonError(500, 'internal/error', 'Failed to get feature flags', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/feature-flags:
 *   put:
 *     summary: Update feature flags for a role
 *     description: Update feature flags for a specific role. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - flags
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, teacher, parent]
 *               flags:
 *                 type: object
 *                 description: Object with feature names as keys and { enabled: boolean } as values
 *     responses:
 *       200:
 *         description: Feature flags updated
 *       400:
 *         description: Bad request - invalid role or flags
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
    const { role, flags } = body;

    // Validate role
    const validRoles: FeatureFlagRole[] = ['admin', 'teacher', 'parent'];
    if (!role || !validRoles.includes(role)) {
      return jsonError(400, 'validation/error', 'Invalid role. Must be admin, teacher, or parent', origin);
    }

    // Validate flags object
    if (!flags || typeof flags !== 'object') {
      return jsonError(400, 'validation/error', 'Flags must be an object', origin);
    }

    // Validate each flag has enabled boolean
    const validDescriptions = FEATURE_DESCRIPTIONS[role as FeatureFlagRole];
    const validFeatures = Object.keys(validDescriptions);

    for (const [feature, value] of Object.entries(flags)) {
      if (!validFeatures.includes(feature)) {
        return jsonError(400, 'validation/error', `Invalid feature: ${feature} for role ${role}`, origin);
      }
      if (typeof (value as { enabled?: unknown })?.enabled !== 'boolean') {
        return jsonError(400, 'validation/error', `Feature ${feature} must have enabled as boolean`, origin);
      }
    }

    const updatedFlags = await updateFeatureFlags(
      role as FeatureFlagRole,
      flags,
      profile.uid,
      profile.email || ''
    );

    const response = {
      success: true,
      message: `Feature flags updated for ${role}`,
      data: {
        flags: updatedFlags,
        descriptions: FEATURE_DESCRIPTIONS,
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
    console.error('Error updating feature flags:', err);
    return jsonError(500, 'internal/error', 'Failed to update feature flags', origin);
  }
}
