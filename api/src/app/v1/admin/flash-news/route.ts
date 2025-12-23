import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { CreateFlashNewsDto } from '@/types/flashNews';
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

// Validation schemas
const bilingualTextSchema = z.object({
  en: z.string().min(1, 'English text required').max(200, 'Text too long (max 200 chars)'),
  ta: z.string().min(1, 'Tamil text required').max(300, 'Text too long (max 300 chars)'),
});

const createFlashNewsSchema = z.object({
  text: bilingualTextSchema,
  linkUrl: z.string().url().optional(),
  linkText: bilingualTextSchema.optional(),
  isUrgent: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * @swagger
 * /api/v1/admin/flash-news:
 *   get:
 *     summary: List all flash news (admin)
 *     description: Returns all flash news items for admin management.
 *     tags:
 *       - Admin - Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *     responses:
 *       200:
 *         description: List of flash news items
 */
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

/**
 * @swagger
 * /api/v1/admin/flash-news:
 *   post:
 *     summary: Create flash news (admin)
 *     description: Creates a new flash news item.
 *     tags:
 *       - Admin - Content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: object
 *                 properties:
 *                   en:
 *                     type: string
 *                   ta:
 *                     type: string
 *     responses:
 *       201:
 *         description: Flash news created
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = createFlashNewsSchema.parse(body) as CreateFlashNewsDto;

    const db = adminDb();
    const newsRef = db.collection('flashNews').doc();

    const now = Timestamp.now();
    const newsData = {
      id: newsRef.id,
      text: validData.text,
      linkUrl: validData.linkUrl || null,
      linkText: validData.linkText || null,
      isActive: false, // Start as inactive, admin activates
      isUrgent: validData.isUrgent || false,
      priority: validData.priority || 10,
      startDate: validData.startDate ? Timestamp.fromDate(new Date(validData.startDate)) : null,
      endDate: validData.endDate ? Timestamp.fromDate(new Date(validData.endDate)) : null,
      createdAt: now,
      updatedAt: now,
      createdBy: profile.uid,
    };

    await newsRef.set(newsData);

    const response = {
      success: true,
      data: {
        id: newsRef.id,
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
