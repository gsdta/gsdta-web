import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guard';
import {
  getConversationById,
  canAccessConversation,
  markMessagesAsRead,
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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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
 * /api/v1/me/conversations/{id}:
 *   get:
 *     summary: Get conversation details
 *     description: Get details of a specific conversation
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
 *     responses:
 *       200:
 *         description: Conversation details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
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

    const conversation = await getConversationById(id);
    if (!conversation) {
      return jsonError(404, 'NOT_FOUND', 'Conversation not found', origin);
    }

    return jsonResponse(
      {
        success: true,
        data: {
          conversation: conversationToResponse(conversation, userId, access.role!),
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Get conversation error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return jsonError(401, 'UNAUTHORIZED', 'Authentication required', origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}

/**
 * @swagger
 * /api/v1/me/conversations/{id}:
 *   patch:
 *     summary: Mark conversation as read
 *     description: Mark all unread messages in a conversation as read
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
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
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

    await markMessagesAsRead(id, userId, access.role!);

    return jsonResponse(
      {
        success: true,
        message: 'Messages marked as read',
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Mark read error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return jsonError(401, 'UNAUTHORIZED', 'Authentication required', origin);
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
