import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { randomUUID } from 'crypto';
import {
  createNewsPost,
  getNewsPosts,
} from '@/lib/firestoreNewsPosts';
import type { NewsPost, BilingualText, BilingualRichText, NewsPostImage } from '@/types/newsPost';
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

const createSchema = z.object({
  title: bilingualTextSchema,
  summary: bilingualSummarySchema,
  body: bilingualRichTextSchema,
  category: z.enum(['school-news', 'events', 'announcements', 'academic']),
  tags: z.array(z.string().max(NEWS_POST_CONSTANTS.MAX_TAG_LENGTH)).max(NEWS_POST_CONSTANTS.MAX_TAGS).optional(),
  featuredImage: imageSchema.optional(),
  images: z.array(imageSchema).max(NEWS_POST_CONSTANTS.MAX_IMAGES).optional(),
  priority: z.number().min(NEWS_POST_CONSTANTS.MIN_PRIORITY).max(NEWS_POST_CONSTANTS.MAX_PRIORITY).default(NEWS_POST_CONSTANTS.DEFAULT_PRIORITY),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'pending_review']).default('draft'),
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// Helper to convert NewsPost to response format (convert Timestamps to ISO strings)
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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * @swagger
 * /api/v1/admin/news-posts:
 *   get:
 *     summary: List all news posts
 *     tags:
 *       - Admin - News Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, pending_review, approved, rejected, published, unpublished]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, school-news, events, announcements, academic]
 *       - in: query
 *         name: authorRole
 *         schema:
 *           type: string
 *           enum: [all, teacher, admin]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of news posts
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'NewsPosts');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const authorRole = searchParams.get('authorRole') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { posts, total } = await getNewsPosts({
      status: status as 'all' | 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'unpublished',
      category: category as 'all' | 'school-news' | 'events' | 'announcements' | 'academic',
      authorRole: authorRole as 'all' | 'teacher' | 'admin',
      limit,
      offset,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        items: posts.map(postToResponse),
        total,
        limit,
        offset,
      },
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/news-posts', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/news-posts:
 *   post:
 *     summary: Create a new news post
 *     tags:
 *       - Admin - News Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - summary
 *               - body
 *               - category
 *     responses:
 *       201:
 *         description: News post created
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'NewsPosts');

    const body = await req.json();
    const parseResult = createSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    const authorName = profile.name || profile.email || 'Admin';

    const post = await createNewsPost(
      parseResult.data,
      profile.uid,
      authorName,
      'admin'
    );

    const res = NextResponse.json({
      success: true,
      message: 'News post created successfully',
      data: { id: post.id, slug: post.slug },
    }, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

    console.info(JSON.stringify({ requestId, path: '/api/v1/admin/news-posts', method: 'POST', id: post.id }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/news-posts', method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
