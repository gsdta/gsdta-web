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

const createSchema = z.object({
  text: bilingualTextSchema,
  link: z.string().url('Invalid URL').optional().or(z.literal('')),
  priority: z.number().min(1).max(100).default(50),
  isActive: z.boolean().default(false),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * @swagger
 * /api/v1/admin/flash-news:
 *   get:
 *     summary: List all flash news items
 *     tags:
 *       - Admin - Flash News
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of flash news items
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'FlashNews');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    let query = adminDb().collection(COLLECTION) as FirebaseFirestore.Query;

    if (status === 'active') {
      query = query.where('isActive', '==', true);
    } else if (status === 'inactive') {
      query = query.where('isActive', '==', false);
    }

    query = query.orderBy('priority', 'desc').orderBy('createdAt', 'desc');

    const snap = await query.get();
    const items = snap.docs.map((doc) => docToResponse(doc.id, doc.data()));

    const res = NextResponse.json({
      success: true,
      data: { items },
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/flash-news', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/flash-news:
 *   post:
 *     summary: Create a new flash news item
 *     tags:
 *       - Admin - Flash News
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
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
 *       201:
 *         description: Flash news item created
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'FlashNews');

    const body = await req.json();
    const parseResult = createSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { text, link, priority, isActive, startDate, endDate } = parseResult.data;
    const now = Timestamp.now();

    const docData: Record<string, unknown> = {
      text,
      priority,
      isActive,
      createdAt: now,
      updatedAt: now,
      createdBy: profile.uid,
    };

    if (link) docData.link = link;
    if (startDate) docData.startDate = Timestamp.fromDate(new Date(startDate));
    if (endDate) docData.endDate = Timestamp.fromDate(new Date(endDate));

    const docRef = await adminDb().collection(COLLECTION).add(docData);

    const res = NextResponse.json({
      success: true,
      message: 'Flash news created successfully',
      data: { id: docRef.id },
    }, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: '/api/v1/admin/flash-news', method: 'POST', id: docRef.id }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/flash-news', method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
