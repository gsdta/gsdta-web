import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { incrementNewsPostViews, getNewsPostBySlug } from '@/lib/firestoreNewsPosts';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
 * /api/v1/public/news-posts/{slug}/view:
 *   post:
 *     summary: Increment view count for a news post
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
 *         description: View count incremented
 *       404:
 *         description: Post not found
 */
export async function POST(
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

    // Get the post by slug to get its ID
    const post = await getNewsPostBySlug(slug);

    if (!post || post.status !== 'published') {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    // Increment view count
    await incrementNewsPostViews(post.id);

    const res = NextResponse.json({
      success: true,
      message: 'View recorded',
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error(JSON.stringify({ requestId, path: '/api/v1/public/news-posts/[slug]/view', method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
