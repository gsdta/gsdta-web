import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { createUserProfile, updateUserProfile, type ProfileUpdateData } from '@/lib/firestoreUsers';
import { corsHeaders } from '@/lib/cors';
import { randomUUID } from 'crypto';
import { z } from 'zod';

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

// Zod schemas for profile update validation
const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  country: z.string().optional(),
}).strict();

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  preferredLanguage: z.enum(['en', 'ta']).optional(),
  notificationPreferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
  }).strict().optional(),
}).strict();

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
    
    // Use requireAuth for consistent authentication (supports test mode)
    let authContext;
    try {
      authContext = await requireAuth(authz, { requireActive: false });
    } catch (err) {
      // If profile not found, auto-create parent profile on first sign-in (Parent Signup Policy - 04)
      if (err instanceof AuthError && err.code === 'auth/profile-not-found') {
        // Re-verify token to get user info
        const { verifyIdToken } = await import('@/lib/auth');
        const token = await verifyIdToken(authz);
        const email = token.email ?? '';
        const name = email.split('@')[0];
        console.info(JSON.stringify({ requestId, uid: token.uid, action: 'auto-create-parent-profile' }));
        const profile = await createUserProfile(token.uid, email, name, ['parent']);
        authContext = { token, profile };
      } else {
        throw err;
      }
    }
    
    const { token, profile } = authContext;

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
    console.error(JSON.stringify({ requestId, path: '/api/v1/me', method: 'GET', error: String(err), stack: (err as Error).stack }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * PUT /api/v1/me
 * Updates the authenticated user's profile with provided fields.
 * @swagger
 * /api/v1/me:
 *   put:
 *     summary: Update current user profile
 *     description: Updates the authenticated user's profile. Only provided fields are updated.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
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
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   country:
 *                     type: string
 *               preferredLanguage:
 *                 type: string
 *                 enum: [en, ta]
 *               notificationPreferences:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Updated user profile
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active
 */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const authContext = await requireAuth(authz, { requireActive: true });
    const { token } = authContext;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON body', origin);
    }

    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errors, origin);
    }

    const updateData: ProfileUpdateData = parseResult.data;

    // Update the profile
    const updatedProfile = await updateUserProfile(token.uid, updateData);
    if (!updatedProfile) {
      return jsonError(404, 'auth/profile-not-found', 'User profile not found', origin);
    }

    // Return the full updated profile
    const responseBody = {
      uid: updatedProfile.uid,
      email: updatedProfile.email,
      name: updatedProfile.name,
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      roles: updatedProfile.roles,
      status: updatedProfile.status,
      phone: updatedProfile.phone,
      address: updatedProfile.address,
      preferredLanguage: updatedProfile.preferredLanguage,
      notificationPreferences: updatedProfile.notificationPreferences,
      emailVerified: token.emailVerified,
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: '/api/v1/me', method: 'PUT' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/me', method: 'PUT', error: 'internal' }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
