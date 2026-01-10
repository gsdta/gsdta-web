import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { randomUUID } from 'crypto';
import { reviewNewsPost, getNewsPostById } from '@/lib/firestoreNewsPosts';
import type { NewsPost } from '@/types/newsPost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(1).max(1000).optional(),
}).refine(
  (data) => data.action !== 'reject' || data.rejectionReason,
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);

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

function postToResponse(post: NewsPost): Record<string, unknown> {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    body: post.body,
    slug: post.slug,
    category: post.category,
    tags: post.tags,
    featuredImage: post.featuredImage,
    images: post.images,
    status: post.status,
    docStatus: post.docStatus,
    priority: post.priority,
    startDate: post.startDate?.toDate?.()?.toISOString(),
    endDate: post.endDate?.toDate?.()?.toISOString(),
    authorId: post.authorId,
    authorName: post.authorName,
    authorRole: post.authorRole,
    submittedAt: post.submittedAt?.toDate?.()?.toISOString(),
    reviewedBy: post.reviewedBy,
    reviewedByName: post.reviewedByName,
    reviewedAt: post.reviewedAt?.toDate?.()?.toISOString(),
    rejectionReason: post.rejectionReason,
    publishedAt: post.publishedAt?.toDate?.()?.toISOString(),
    publishedBy: post.publishedBy,
    publishedByName: post.publishedByName,
    unpublishedAt: post.unpublishedAt?.toDate?.()?.toISOString(),
    unpublishedBy: post.unpublishedBy,
    createdAt: post.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: post.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * @swagger
 * /api/v1/admin/news-posts/{id}/review:
 *   post:
 *     summary: Approve or reject a news post submitted for review
 *     tags:
 *       - Admin - News Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review action completed
 *       400:
 *         description: Invalid status for review
 *       404:
 *         description: News post not found
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'NewsPosts');

    // Check if post exists and is pending review
    const existingPost = await getNewsPostById(id);
    if (!existingPost) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    if (existingPost.status !== 'pending_review') {
      return jsonError(400, 'news-post/invalid-status', `Cannot review post with status: ${existingPost.status}. Post must be pending review.`, origin);
    }

    const body = await req.json();
    const parseResult = reviewSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const { action, rejectionReason } = parseResult.data;
    const reviewerName = profile.name || profile.email || 'Admin';

    const updatedPost = await reviewNewsPost(
      id,
      action,
      profile.uid,
      reviewerName,
      rejectionReason
    );

    if (!updatedPost) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const actionMessage = action === 'approve' ? 'approved' : 'rejected';

    const res = NextResponse.json({
      success: true,
      message: `News post ${actionMessage} successfully`,
      data: postToResponse(updatedPost),
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}/review`, method: 'POST', action }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    if (err instanceof Error && err.message.includes('Cannot review')) {
      return jsonError(400, 'news-post/invalid-status', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}/review`, method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
