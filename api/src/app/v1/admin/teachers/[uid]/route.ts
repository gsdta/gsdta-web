import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { adminDb } from '@/lib/firebaseAdmin';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zod schema for admin teacher update
const adminUpdateTeacherSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'inactive']).optional(),
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
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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
 * /api/v1/admin/teachers/{uid}:
 *   get:
 *     summary: Get teacher details (admin)
 *     description: Returns detailed information about a specific teacher.
 *     tags:
 *       - Admin - Teachers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher details
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Teacher not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { uid } = await params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Teachers');

    const db = adminDb();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return jsonError(404, 'teacher/not-found', 'Teacher not found', origin);
    }

    const data = userDoc.data() || {};

    // Verify user has teacher role
    const roles = Array.isArray(data.roles) ? data.roles : [];
    if (!roles.includes('teacher')) {
      return jsonError(404, 'teacher/not-found', 'User is not a teacher', origin);
    }

    // Compute name from firstName/lastName if name is not set
    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    const computedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

    const responseBody = {
      success: true,
      data: {
        teacher: {
          uid: userDoc.id,
          email: data.email || '',
          name: computedName,
          firstName,
          lastName,
          roles,
          status: data.status || 'active',
          phone: data.phone || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/teachers/${uid}`, method: 'GET' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/teachers/${uid}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/teachers/{uid}:
 *   patch:
 *     summary: Update teacher (admin)
 *     description: Updates a teacher's information. Admin can update name, phone, and status.
 *     tags:
 *       - Admin - Teachers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Teacher updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Teacher not found
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { uid } = await params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'Teachers');

    const db = adminDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return jsonError(404, 'teacher/not-found', 'Teacher not found', origin);
    }

    const existingData = userDoc.data() || {};

    // Verify user has teacher role
    const roles = Array.isArray(existingData.roles) ? existingData.roles : [];
    if (!roles.includes('teacher')) {
      return jsonError(404, 'teacher/not-found', 'User is not a teacher', origin);
    }

    const body = await req.json();
    const parseResult = adminUpdateTeacherSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
    if (parseResult.data.firstName !== undefined) updateData.firstName = parseResult.data.firstName;
    if (parseResult.data.lastName !== undefined) updateData.lastName = parseResult.data.lastName;
    if (parseResult.data.phone !== undefined) updateData.phone = parseResult.data.phone;
    if (parseResult.data.status !== undefined) updateData.status = parseResult.data.status;

    await userRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await userRef.get();
    const data = updatedDoc.data() || {};

    // Compute name from firstName/lastName if name is not set
    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    const computedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

    const responseBody = {
      success: true,
      data: {
        teacher: {
          uid: updatedDoc.id,
          email: data.email || '',
          name: computedName,
          firstName,
          lastName,
          roles: data.roles || [],
          status: data.status || 'active',
          phone: data.phone || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/teachers/${uid}`, method: 'PATCH' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/teachers/${uid}`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
