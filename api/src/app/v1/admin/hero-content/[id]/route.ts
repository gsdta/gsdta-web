import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { UpdateHeroContentDto } from '@/types/heroContent';

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
  en: z.string().min(1),
  ta: z.string().min(1),
});

const updateHeroContentSchema = z.object({
  title: bilingualTextSchema.optional(),
  subtitle: bilingualTextSchema.optional(),
  description: bilingualTextSchema.optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  ctaText: bilingualTextSchema.optional().nullable(),
  ctaLink: z.string().url().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
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
    const docRef = db.collection('heroContent').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Hero content not found', origin);
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
    console.error('Error fetching hero content:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch hero content', origin);
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
    const validData = updateHeroContentSchema.parse(body) as UpdateHeroContentDto;

    const db = adminDb();
    const docRef = db.collection('heroContent').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Hero content not found', origin);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: profile.uid,
    };

    if (validData.title !== undefined) updateData.title = validData.title;
    if (validData.subtitle !== undefined) updateData.subtitle = validData.subtitle;
    if (validData.description !== undefined) updateData.description = validData.description;
    if (validData.imageUrl !== undefined) updateData.imageUrl = validData.imageUrl;
    if (validData.ctaText !== undefined) updateData.ctaText = validData.ctaText;
    if (validData.ctaLink !== undefined) updateData.ctaLink = validData.ctaLink;
    if (validData.isActive !== undefined) updateData.isActive = validData.isActive;
    if (validData.priority !== undefined) updateData.priority = validData.priority;
    
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
        message: 'Hero content updated successfully',
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
    console.error('Error updating hero content:', err);
    return jsonError(500, 'internal/error', 'Failed to update hero content', origin);
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
    const docRef = db.collection('heroContent').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return jsonError(404, 'not-found', 'Hero content not found', origin);
    }

    await docRef.delete();

    const response = {
      success: true,
      data: {
        message: 'Hero content deleted successfully',
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
    console.error('Error deleting hero content:', err);
    return jsonError(500, 'internal/error', 'Failed to delete hero content', origin);
  }
}
