import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPublishedNewsPostBySlug } from '@/lib/firestoreNewsPosts';

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
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
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
 * /api/v1/public/news-posts/{slug}:
 *   get:
 *     summary: Get a single published news post by slug
 *     tags:
 *       - Public - News Posts
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: News post details
 *       404:
 *         description: Post not found or not published
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const { slug } = await params;

    if (!slug) {
      return jsonError(400, 'validation/missing-slug', 'Slug is required', origin);
    }

    const post = await getPublishedNewsPostBySlug(slug);

    if (!post) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const res = NextResponse.json({
      success: true,
      data: post,
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error(JSON.stringify({ requestId, path: '/api/v1/public/news-posts/[slug]', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
