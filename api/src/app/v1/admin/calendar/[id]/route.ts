import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import {
  getCalendarEventById,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/firestoreCalendar';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)
    ) {
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
    Vary: 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

function jsonSuccess(data: unknown, status: number, origin: string | null) {
  const res = NextResponse.json({ success: true, data }, { status });
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

// Zod schemas for validation
const bilingualTextSchema = z.object({
  en: z.string().min(1, 'English title is required'),
  ta: z.string().optional(),
});

const eventTypeSchema = z.enum(['gsdta', 'holiday', 'test', 'meeting', 'academic', 'sports', 'other']);
const recurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const visibilitySchema = z.enum(['public', 'parent', 'teacher', 'admin']);
const statusSchema = z.enum(['active', 'inactive']);

const updateEventSchema = z.object({
  title: bilingualTextSchema.optional(),
  description: bilingualTextSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  allDay: z.boolean().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  eventType: eventTypeSchema.optional(),
  recurrence: recurrenceSchema.optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visibility: z.array(visibilitySchema).optional(),
  status: statusSchema.optional(),
  location: z.string().max(200).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/admin/calendar/:id
 * Get a single calendar event (admin only)
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['admin'] });

    const event = await getCalendarEventById(id);

    if (!event) {
      return jsonError(404, 'calendar/not-found', 'Calendar event not found', origin);
    }

    console.info(
      JSON.stringify({ requestId, uid: token.uid, path: `/api/v1/admin/calendar/${id}`, method: 'GET' })
    );

    return jsonSuccess({ event }, 200, origin);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/calendar/${id}`, method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Failed to fetch calendar event', origin);
  }
}

/**
 * PUT /api/v1/admin/calendar/:id
 * Update a calendar event (admin only)
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { token, profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON body', origin);
    }

    const parseResult = updateEventSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errors, origin);
    }

    const updateData = parseResult.data;

    // Update the event
    const event = await updateCalendarEvent(id, updateData, token.uid, profile.name);

    if (!event) {
      return jsonError(404, 'calendar/not-found', 'Calendar event not found', origin);
    }

    console.info(
      JSON.stringify({ requestId, uid: token.uid, path: `/api/v1/admin/calendar/${id}`, method: 'PUT' })
    );

    return jsonSuccess({ event }, 200, origin);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/calendar/${id}`, method: 'PUT', error: String(err) }));
    return jsonError(500, 'internal/error', 'Failed to update calendar event', origin);
  }
}

/**
 * DELETE /api/v1/admin/calendar/:id
 * Soft delete a calendar event (admin only)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['admin'] });

    const deleted = await deleteCalendarEvent(id, token.uid);

    if (!deleted) {
      return jsonError(404, 'calendar/not-found', 'Calendar event not found', origin);
    }

    console.info(
      JSON.stringify({ requestId, uid: token.uid, path: `/api/v1/admin/calendar/${id}`, method: 'DELETE' })
    );

    return jsonSuccess({ deleted: true }, 200, origin);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: `/api/v1/admin/calendar/${id}`, method: 'DELETE', error: String(err) }));
    return jsonError(500, 'internal/error', 'Failed to delete calendar event', origin);
  }
}
