import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { randomUUID } from 'crypto';
import type { BilingualText, FlashNewsPublic } from '@/types/flashNews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLLECTION = 'flashNews';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60', // Cache for 1 minute
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

// Helper to convert Firestore doc to public response format
function docToPublic(id: string, data: FirebaseFirestore.DocumentData): FlashNewsPublic {
  return {
    id,
    text: data.text as BilingualText,
    link: data.link,
    priority: data.priority ?? 50,
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
 * /api/v1/public/flash-news:
 *   get:
 *     summary: Get active flash news items for public display
 *     tags:
 *       - Public - Flash News
 *     responses:
 *       200:
 *         description: List of active flash news items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           text:
 *                             type: object
 *                             properties:
 *                               en:
 *                                 type: string
 *                               ta:
 *                                 type: string
 *                           link:
 *                             type: string
 *                           priority:
 *                             type: number
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const now = new Date();

    // Query active flash news, ordered by priority
    const query = adminDb()
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc');

    const snap = await query.get();

    // Filter by date range in memory (Firestore doesn't support OR queries well)
    const items: FlashNewsPublic[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();

      // Check startDate: if set, must be <= now
      if (data.startDate) {
        const startDate = data.startDate.toDate();
        if (startDate > now) continue;
      }

      // Check endDate: if set, must be >= now
      if (data.endDate) {
        const endDate = data.endDate.toDate();
        if (endDate < now) continue;
      }

      items.push(docToPublic(doc.id, data));
    }

    const res = NextResponse.json({
      success: true,
      data: { items },
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error(JSON.stringify({ requestId, path: '/api/v1/public/flash-news', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
