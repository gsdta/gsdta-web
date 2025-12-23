import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { UpdateFlashNewsDto } from '@/types/flashNews';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Validation schema for updates
const bilingualTextSchema = z.object({
  en: z.string().min(1).max(200),
  ta: z.string().min(1).max(300),
});

const updateFlashNewsSchema = z.object({
  text: bilingualTextSchema.optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkText: bilingualTextSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   get:
 *     summary: Get flash news item (admin)
 *     tags:
 *       - Admin - Content
 *     security:
 *       - bearerAuth: []
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const { id } = await params;
  
  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const db = adminDb();
    const doc = await db.collection('flashNews').doc(id).get();

    if (!doc.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    const data = doc.data()!;
    const item = {
      id: doc.id,
      text: data.text,
      linkUrl: data.linkUrl || null,
      linkText: data.linkText || null,
      isActive: data.isActive,
      isUrgent: data.isUrgent || false,
      priority: data.priority || 0,
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

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   patch:
 *     summary: Update flash news item (admin)
 *     tags:
 *       - Admin - Content
 *     security:
 *       - bearerAuth: []
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const { id } = await params;
  
  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = updateFlashNewsSchema.parse(body) as UpdateFlashNewsDto;

    const db = adminDb();
    const docRef = db.collection('flashNews').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: profile.uid,
    };

    if (validData.text !== undefined) {
      updateData.text = validData.text;
    }
    if (validData.linkUrl !== undefined) {
      updateData.linkUrl = validData.linkUrl;
    }
    if (validData.linkText !== undefined) {
      updateData.linkText = validData.linkText;
    }
    if (validData.isActive !== undefined) {
      updateData.isActive = validData.isActive;
    }
    if (validData.isUrgent !== undefined) {
      updateData.isUrgent = validData.isUrgent;
    }
    if (validData.priority !== undefined) {
      updateData.priority = validData.priority;
    }
    if (validData.startDate !== undefined) {
      updateData.startDate = validData.startDate 
        ? Timestamp.fromDate(new Date(validData.startDate)) 
        : null;
    }
    if (validData.endDate !== undefined) {
      updateData.endDate = validData.endDate 
        ? Timestamp.fromDate(new Date(validData.endDate)) 
        : null;
    }

    await docRef.update(updateData);

    const response = {
      success: true,
      data: {
        id,
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

/**
 * @swagger
 * /api/v1/admin/flash-news/{id}:
 *   delete:
 *     summary: Delete flash news item (admin)
 *     tags:
 *       - Admin - Content
 *     security:
 *       - bearerAuth: []
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  const { id } = await params;
  
  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const db = adminDb();
    const docRef = db.collection('flashNews').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return jsonError(404, 'not-found', 'Flash news not found', origin);
    }

    await docRef.delete();

    const response = {
      success: true,
      data: {
        id,
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
