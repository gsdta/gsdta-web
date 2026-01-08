import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { AuthError } from '@/lib/auth';
import { requireFeature, type FeatureFlagRole } from '@/lib/featureFlags';
import {
  canAccessConversation,
  getMessages,
  sendMessage,
} from '@/lib/firestoreMessaging';
import { messageToResponse, type ConversationRole } from '@/types/messaging';

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

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/v1/me/conversations/{id}/messages:
 *   get:
 *     summary: Get messages in a conversation
 *     description: Get paginated messages for a conversation
 *     tags:
 *       - Messaging
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of messages to return (default 50)
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Message ID cursor for pagination (get messages before this)
 *     responses:
 *       200:
 *         description: List of messages
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');
  const { id } = await context.params;

  try {
    const auth = await requireAuth(authz);
    const userId = auth.token.uid;

    // Check access
    const access = await canAccessConversation(id, userId);
    if (!access.canAccess) {
      return jsonError(403, 'FORBIDDEN', 'Not a participant in this conversation', origin);
    }

    // Check feature flag based on role
    await requireFeature(access.role as FeatureFlagRole, 'Messaging');

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const before = url.searchParams.get('before') || undefined;

    const { messages, hasMore } = await getMessages(id, { limit, before });

    return jsonResponse(
      {
        success: true,
        data: {
          messages: messages.map((m) => messageToResponse(m, userId)),
          hasMore,
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Get messages error:', error);

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

// Send message schema
const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
});

/**
 * @swagger
 * /api/v1/me/conversations/{id}/messages:
 *   post:
 *     summary: Send a message
 *     description: Send a new message in a conversation
 *     tags:
 *       - Messaging
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content (max 2000 chars)
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');
  const { id } = await context.params;

  try {
    const auth = await requireAuth(authz);
    const userId = auth.token.uid;

    // Check access
    const access = await canAccessConversation(id, userId);
    if (!access.canAccess) {
      return jsonError(403, 'FORBIDDEN', 'Not a participant in this conversation', origin);
    }

    // Check feature flag based on role
    await requireFeature(access.role as FeatureFlagRole, 'Messaging');

    // Parse request body
    const body = await req.json();
    const parseResult = sendMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonError(
        400,
        'INVALID_REQUEST',
        parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        origin
      );
    }

    const message = await sendMessage(id, userId, access.role!, parseResult.data.content);

    return jsonResponse(
      {
        success: true,
        data: {
          message: messageToResponse(message, userId),
        },
      },
      201,
      origin
    );
  } catch (error) {
    console.error('Send message error:', error);

    if (error instanceof AuthError) {
      const code = error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
      return jsonError(error.status, code, error.message, origin);
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return jsonError(404, 'NOT_FOUND', 'Conversation not found', origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}
