import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPublishedNewsPosts } from '@/lib/firestoreNewsPosts';
import type { NewsPostCategory } from '@/types/newsPost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    'Cache-Control': 'public, max-age=120', // Cache for 2 minutes
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

/**
 * @swagger
 * /api/v1/public/news-posts:
 *   get:
 *     summary: Get published news posts for public display
 *     tags:
 *       - Public - News Posts
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, school-news, events, announcements, academic]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: List of published news posts
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || 'all') as NewsPostCategory | 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { posts, total } = await getPublishedNewsPosts({
      category,
      limit,
      offset,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        items: posts,
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total,
      },
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error(JSON.stringify({ requestId, path: '/api/v1/public/news-posts', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
