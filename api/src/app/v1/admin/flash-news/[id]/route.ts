import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { randomUUID } from 'crypto';
import type { FlashNews, BilingualText } from '@/types/flashNews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLLECTION = 'flashNews';

// Validation schemas
const bilingualTextSchema = z.object({
  en: z.string().min(1, 'English text is required').max(200, 'Text must be 200 characters or less'),
  ta: z.string().max(200, 'Text must be 200 characters or less').default(''),
});

const updateSchema = z.object({
  text: bilingualTextSchema.optional(),
  link: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  priority: z.number().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// CORS helpers
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
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

// Helper to convert Firestore doc to response format
function docToResponse(id: string, data: FirebaseFirestore.DocumentData): FlashNews {
  return {
    id,
    text: data.text as BilingualText,
    link: data.link,
    priority: data.priority ?? 50,
    isActive: data.isActive ?? false,
    startDate: data.startDate?.toDate?.()?.toISOString(),
    endDate: data.endDate?.toDate?.()?.toISOString(),
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    createdBy: data.createdBy ?? '',
    updatedBy: data.updatedBy,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   get:
 *     summary: Get a flash news item by ID
 *     tags:
 *       - Admin - Flash News
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flash news item
 *       404:
 *         description: Flash news not found
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'FlashNews');

    const doc = await adminDb().collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      return jsonError(404, 'flash-news/not-found', 'Flash news item not found', origin);
    }

    const res = NextResponse.json({
      success: true,
      data: docToResponse(doc.id, doc.data()!),
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/flash-news/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   patch:
 *     summary: Update a flash news item
 *     tags:
 *       - Admin - Flash News
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               text:
 *                 type: object
 *                 properties:
 *                   en:
 *                     type: string
 *                   ta:
 *                     type: string
 *               link:
 *                 type: string
 *               priority:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flash news item updated
 *       404:
 *         description: Flash news not found
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'FlashNews');

    const docRef = adminDb().collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return jsonError(404, 'flash-news/not-found', 'Flash news item not found', origin);
    }

    const body = await req.json();
    const parseResult = updateSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { text, link, priority, isActive, startDate, endDate } = parseResult.data;
    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: profile.uid,
    };

    if (text !== undefined) updateData.text = text;
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle nullable fields
    if (link === null || link === '') {
      updateData.link = null;
    } else if (link !== undefined) {
      updateData.link = link;
    }

    if (startDate === null) {
      updateData.startDate = null;
    } else if (startDate !== undefined) {
      updateData.startDate = Timestamp.fromDate(new Date(startDate));
    }

    if (endDate === null) {
      updateData.endDate = null;
    } else if (endDate !== undefined) {
      updateData.endDate = Timestamp.fromDate(new Date(endDate));
    }

    await docRef.update(updateData);

    // Fetch updated doc
    const updatedDoc = await docRef.get();

    const res = NextResponse.json({
      success: true,
      message: 'Flash news updated successfully',
      data: docToResponse(updatedDoc.id, updatedDoc.data()!),
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/flash-news/${id}`, method: 'PATCH' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/flash-news/${id}`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   delete:
 *     summary: Delete a flash news item
 *     tags:
 *       - Admin - Flash News
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flash news item deleted
 *       404:
 *         description: Flash news not found
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'FlashNews');

    const docRef = adminDb().collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return jsonError(404, 'flash-news/not-found', 'Flash news item not found', origin);
    }

    await docRef.delete();

    const res = NextResponse.json({
      success: true,
      message: 'Flash news deleted successfully',
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/flash-news/${id}`, method: 'DELETE' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/flash-news/${id}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
