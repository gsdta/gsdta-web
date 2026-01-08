import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { AuthError } from '@/lib/auth';
import { requireFeature } from '@/lib/featureFlags';
import {
  createConversation,
  getConversationsForUser,
  getUnreadCount,
} from '@/lib/firestoreMessaging';
import { conversationToResponse, type ConversationRole } from '@/types/messaging';

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonResponse(data: unknown, status: number, origin: string | null) {
  const res = NextResponse.json(data, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonError(status: number, code: string, message: string, origin: string | null) {
  return jsonResponse({ success: false, code, message }, status, origin);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * Determine user's conversation role based on their profile roles
 */
function getUserConversationRole(roles: string[]): ConversationRole | null {
  if (roles.includes('teacher') || roles.includes('admin')) {
    return 'teacher';
  }
  if (roles.includes('parent')) {
    return 'parent';
  }
  return null;
}

/**
 * @swagger
 * /api/v1/me/conversations:
 *   get:
 *     summary: List user's conversations
 *     description: Get all conversations for the authenticated user
 *     tags:
 *       - Messaging
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of conversations to return (default 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Only return conversations with unread messages
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');

  try {
    const auth = await requireAuth(authz);
    const role = getUserConversationRole(auth.profile.roles);

    if (!role) {
      return jsonError(403, 'FORBIDDEN', 'User role not supported for messaging', origin);
    }

    // Check feature flag based on role
    await requireFeature(role, 'Messaging');

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const userId = auth.token.uid;
    const { conversations, total } = await getConversationsForUser(userId, role, {
      limit,
      offset,
      unreadOnly,
    });

    const unreadCount = await getUnreadCount(userId, role);

    return jsonResponse(
      {
        success: true,
        data: {
          conversations: conversations.map((c) => conversationToResponse(c, userId, role)),
          total,
          unreadCount,
          pagination: {
            limit,
            offset,
            hasMore: offset + conversations.length < total,
          },
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Get conversations error:', error);

    if (error instanceof AuthError) {
      const code = error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
      return jsonError(error.status, code, error.message, origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}

// Create conversation schema
const createConversationSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  studentId: z.string().optional(),
  classId: z.string().optional(),
  initialMessage: z.string().min(1, 'Initial message is required').max(2000),
});

/**
 * @swagger
 * /api/v1/me/conversations:
 *   post:
 *     summary: Create a new conversation
 *     description: Start a new conversation with another user
 *     tags:
 *       - Messaging
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - initialMessage
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 description: User ID of the person to message
 *               studentId:
 *                 type: string
 *                 description: Optional student ID for context
 *               classId:
 *                 type: string
 *                 description: Optional class ID for context
 *               initialMessage:
 *                 type: string
 *                 description: First message content
 *     responses:
 *       201:
 *         description: Conversation created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');

  try {
    const auth = await requireAuth(authz);
    const role = getUserConversationRole(auth.profile.roles);

    if (!role) {
      return jsonError(403, 'FORBIDDEN', 'User role not supported for messaging', origin);
    }

    // Check feature flag based on role
    await requireFeature(role, 'Messaging');

    // Parse request body
    const body = await req.json();
    const parseResult = createConversationSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonError(
        400,
        'INVALID_REQUEST',
        parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        origin
      );
    }

    const userId = auth.token.uid;
    const { conversation, message } = await createConversation(userId, role, parseResult.data);

    return jsonResponse(
      {
        success: true,
        data: {
          conversation: conversationToResponse(conversation, userId, role),
          message: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt?.toDate?.()?.toISOString() ?? '',
          },
        },
      },
      201,
      origin
    );
  } catch (error) {
    console.error('Create conversation error:', error);

    if (error instanceof AuthError) {
      const code = error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
      return jsonError(error.status, code, error.message, origin);
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return jsonError(400, 'USER_NOT_FOUND', error.message, origin);
    }
    if (error instanceof Error && error.message.includes('not a')) {
      return jsonError(400, 'INVALID_TARGET', error.message, origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}
