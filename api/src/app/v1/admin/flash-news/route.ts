import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { CreateFlashNewsDto } from '@/types/flashNews';

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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Validation schemas
const bilingualTextSchema = z.object({
  en: z.string().min(1, 'English text required').max(200, 'English text too long'),
  ta: z.string().min(1, 'Tamil text required'),
});

const createFlashNewsSchema = z.object({
  text: bilingualTextSchema,
  isUrgent: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  linkUrl: z.string().url().optional(),
  linkText: bilingualTextSchema.optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
});

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    const db = adminDb();
    const collectionRef = db.collection('flashNews');

    let snapshot;
    if (statusFilter === 'active') {
      snapshot = await collectionRef
        .where('isActive', '==', true)
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'desc')
        .get();
    } else if (statusFilter === 'inactive') {
      snapshot = await collectionRef
        .where('isActive', '==', false)
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'desc')
        .get();
    } else {
      snapshot = await collectionRef
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'desc')
        .get();
    }

    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate?.()?.toISOString() || null,
        endDate: data.endDate?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    const response = {
      success: true,
      data: { items },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error fetching flash news:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch flash news', origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = createFlashNewsSchema.parse(body) as CreateFlashNewsDto;

    const db = adminDb();
    const docRef = db.collection('flashNews').doc();

    const now = Timestamp.now();
    const flashNewsData = {
      id: docRef.id,
      text: validData.text,
      isActive: false,
      isUrgent: validData.isUrgent || false,
      priority: validData.priority || 0,
      startDate: Timestamp.fromDate(new Date(validData.startDate)),
      endDate: Timestamp.fromDate(new Date(validData.endDate)),
      linkUrl: validData.linkUrl || null,
      linkText: validData.linkText || null,
      backgroundColor: validData.backgroundColor || null,
      textColor: validData.textColor || null,
      createdAt: now,
      updatedAt: now,
      createdBy: profile.uid,
    };

    await docRef.set(flashNewsData);

    const response = {
      success: true,
      data: {
        id: docRef.id,
        message: 'Flash news created successfully',
      },
    };

    const res = NextResponse.json(response, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error creating flash news:', err);
    return jsonError(500, 'internal/error', 'Failed to create flash news', origin);
  }
}
