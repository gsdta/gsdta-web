import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { randomUUID } from 'crypto';
import {
  getNewsPostById,
  updateNewsPost,
  deleteNewsPost,
} from '@/lib/firestoreNewsPosts';
import type { NewsPost } from '@/types/newsPost';
import { NEWS_POST_CONSTANTS } from '@/types/newsPost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schemas
const bilingualTextSchema = z.object({
  en: z.string().min(1, 'English text is required').max(NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH),
  ta: z.string().max(NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH).default(''),
});

const bilingualSummarySchema = z.object({
  en: z.string().min(1, 'English summary is required').max(NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH),
  ta: z.string().max(NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH).default(''),
});

const bilingualRichTextSchema = z.object({
  en: z.string().min(1, 'English content is required').max(NEWS_POST_CONSTANTS.MAX_BODY_LENGTH),
  ta: z.string().max(NEWS_POST_CONSTANTS.MAX_BODY_LENGTH).default(''),
});

const imageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  alt: z.object({
    en: z.string().max(200).default(''),
    ta: z.string().max(200).default(''),
  }).optional(),
  caption: z.object({
    en: z.string().max(500).default(''),
    ta: z.string().max(500).default(''),
  }).optional(),
  order: z.number().min(0).default(0),
});

const updateSchema = z.object({
  title: bilingualTextSchema.optional(),
  summary: bilingualSummarySchema.optional(),
  body: bilingualRichTextSchema.optional(),
  category: z.enum(['school-news', 'events', 'announcements', 'academic']).optional(),
  tags: z.array(z.string().max(NEWS_POST_CONSTANTS.MAX_TAG_LENGTH)).max(NEWS_POST_CONSTANTS.MAX_TAGS).optional(),
  featuredImage: imageSchema.optional().nullable(),
  images: z.array(imageSchema).max(NEWS_POST_CONSTANTS.MAX_IMAGES).optional(),
  priority: z.number().min(NEWS_POST_CONSTANTS.MIN_PRIORITY).max(NEWS_POST_CONSTANTS.MAX_PRIORITY).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

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
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

// Helper to convert NewsPost to response format
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
 * /api/v1/admin/news-posts/{id}:
 *   get:
 *     summary: Get a news post by ID
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
 *     responses:
 *       200:
 *         description: News post
 *       404:
 *         description: News post not found
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'NewsPosts');

    const post = await getNewsPostById(id);

    if (!post) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const res = NextResponse.json({
      success: true,
      data: postToResponse(post),
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/news-posts/{id}:
 *   patch:
 *     summary: Update a news post
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
 *     responses:
 *       200:
 *         description: News post updated
 *       404:
 *         description: News post not found
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'NewsPosts');

    const existingPost = await getNewsPostById(id);
    if (!existingPost) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const body = await req.json();
    const parseResult = updateSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const editorName = profile.name || profile.email || 'Admin';

    const updatedPost = await updateNewsPost(
      id,
      parseResult.data,
      profile.uid,
      editorName
    );

    if (!updatedPost) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const res = NextResponse.json({
      success: true,
      message: 'News post updated successfully',
      data: postToResponse(updatedPost),
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}`, method: 'PATCH' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}`, method: 'PATCH', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/news-posts/{id}:
 *   delete:
 *     summary: Delete a news post (soft delete)
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
 *     responses:
 *       200:
 *         description: News post deleted
 *       404:
 *         description: News post not found
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'NewsPosts');

    const deleted = await deleteNewsPost(id);

    if (!deleted) {
      return jsonError(404, 'news-post/not-found', 'News post not found', origin);
    }

    const res = NextResponse.json({
      success: true,
      message: 'News post deleted successfully',
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}`, method: 'DELETE' }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/news-posts/${id}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
