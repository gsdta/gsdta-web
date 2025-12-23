import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
