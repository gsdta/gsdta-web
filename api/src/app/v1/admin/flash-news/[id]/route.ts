import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { UpdateFlashNewsDto } from '@/types/flashNews';

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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

const bilingualTextSchema = z.object({
  en: z.string().min(1).max(200),
  ta: z.string().min(1),
});

const updateFlashNewsSchema = z.object({
  text: bilingualTextSchema.optional(),
  isActive: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkText: bilingualTextSchema.optional().nullable(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const params = await segmentData.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const db = adminDb();
    const docRef = db.collection('flashNews').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    const data = docSnap.data()!;
    const item = {
      id: docSnap.id,
      ...data,
      startDate: data.startDate?.toDate?.()?.toISOString() || null,
      endDate: data.endDate?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };

    const response = {
      success: true,
      data: { item },
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

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const params = await segmentData.params;

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = updateFlashNewsSchema.parse(body) as UpdateFlashNewsDto;

    const db = adminDb();
    const docRef = db.collection('flashNews').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: profile.uid,
    };

    if (validData.text !== undefined) updateData.text = validData.text;
    if (validData.isActive !== undefined) updateData.isActive = validData.isActive;
    if (validData.isUrgent !== undefined) updateData.isUrgent = validData.isUrgent;
    if (validData.priority !== undefined) updateData.priority = validData.priority;
    if (validData.linkUrl !== undefined) updateData.linkUrl = validData.linkUrl;
    if (validData.linkText !== undefined) updateData.linkText = validData.linkText;
    if (validData.backgroundColor !== undefined) updateData.backgroundColor = validData.backgroundColor;
    if (validData.textColor !== undefined) updateData.textColor = validData.textColor;

    if (validData.startDate !== undefined) {
      updateData.startDate = validData.startDate ? Timestamp.fromDate(new Date(validData.startDate)) : null;
    }
    if (validData.endDate !== undefined) {
      updateData.endDate = validData.endDate ? Timestamp.fromDate(new Date(validData.endDate)) : null;
    }

    await docRef.update(updateData);

    const response = {
      success: true,
      data: {
        id: params.id,
        message: 'Flash news updated successfully',
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
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error updating flash news:', err);
    return jsonError(500, 'internal/error', 'Failed to update flash news', origin);
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const params = await segmentData.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const db = adminDb();
    const docRef = db.collection('flashNews').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    await docRef.delete();

    const response = {
      success: true,
      data: {
        message: 'Flash news deleted successfully',
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
    console.error('Error deleting flash news:', err);
    return jsonError(500, 'internal/error', 'Failed to delete flash news', origin);
  }
}
