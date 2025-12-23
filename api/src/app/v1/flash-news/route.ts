import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

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
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
  }
  return headers;
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
 * /api/v1/flash-news:
 *   get:
 *     summary: Get active flash news items
 *     description: Returns currently active flash news for the marquee. Public endpoint.
 *     tags:
 *       - Content
 *     responses:
 *       200:
 *         description: Active flash news items
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const db = adminDb();
    const now = Timestamp.now();

    // Query for active flash news, ordered by priority (highest first)
    const snapshot = await db.collection('flashNews')
      .where('isActive', '==', true)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Filter by date range (startDate <= now <= endDate)
    const activeItems = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const startDate = data.startDate as Timestamp | null;
      const endDate = data.endDate as Timestamp | null;

      // Check if content is within active date range
      const isWithinDateRange = 
        (!startDate || startDate.toMillis() <= now.toMillis()) &&
        (!endDate || endDate.toMillis() >= now.toMillis());

      if (isWithinDateRange) {
        activeItems.push({
          id: doc.id,
          text: data.text,
          linkUrl: data.linkUrl || null,
          linkText: data.linkText || null,
          isUrgent: data.isUrgent || false,
          priority: data.priority || 0,
        });
      }
    }

    const response = {
      success: true,
      data: { items: activeItems },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    console.error('Error fetching flash news:', err);
    const res = NextResponse.json(
      { success: false, code: 'internal/error', message: 'Failed to fetch flash news' },
      { status: 500 }
    );
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
