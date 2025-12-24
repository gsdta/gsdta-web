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
 * /api/v1/hero-content:
 *   get:
 *     summary: Get active hero content
 *     description: Returns currently active hero content based on date range and active status. Public endpoint.
 *     tags:
 *       - Content
 *     responses:
 *       200:
 *         description: Active hero content (null if none active)
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const db = adminDb();
    const now = Timestamp.now();

    // Query for active event banners
    const snapshot = await db.collection('heroContent')
      .where('isActive', '==', true)
      .orderBy('priority', 'desc')
      .limit(10)
      .get();

    // Filter by date range (startDate <= now <= endDate)
    let activeContent = null;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const startDate = data.startDate as Timestamp | null;
      const endDate = data.endDate as Timestamp | null;

      // Check if content is within active date range
      const isWithinDateRange = 
        (!startDate || startDate.toMillis() <= now.toMillis()) &&
        (!endDate || endDate.toMillis() >= now.toMillis());

      if (isWithinDateRange) {
        activeContent = {
          id: doc.id,
          type: data.type,
          title: data.title,
          subtitle: data.subtitle,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          ctaText: data.ctaText || null,
          ctaLink: data.ctaLink || null,
        };
        break; // Take first one (highest priority)
      }
    }

    const response = {
      success: true,
      data: { content: activeContent },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    console.error('Error fetching active hero content:', err);
    const res = NextResponse.json(
      { success: false, code: 'internal/error', message: 'Failed to fetch hero content' },
      { status: 500 }
    );
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
