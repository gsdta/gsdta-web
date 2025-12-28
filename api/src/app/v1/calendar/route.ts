import { NextRequest, NextResponse } from 'next/server';
import { getPublicCalendarEvents, expandRecurringEvents } from '@/lib/firestoreCalendar';
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Cache for 5 minutes
    'Cache-Control': 'public, max-age=300',
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

/**
 * GET /api/v1/calendar
 * Get public calendar events (no authentication required)
 *
 * Query Parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to today)
 * - endDate: YYYY-MM-DD (optional, defaults to 1 year from startDate)
 * - expand: boolean (optional, if true expands recurring events)
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const expandRecurring = url.searchParams.get('expand') === 'true';

    // Default date range: today to 1 year from now
    const today = new Date();
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const startDate = startDateParam || today.toISOString().split('T')[0];
    const endDate = endDateParam || oneYearLater.toISOString().split('T')[0];

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return jsonError(400, 'validation/invalid-date', 'Date must be in YYYY-MM-DD format', origin);
    }

    // Get public events
    const events = await getPublicCalendarEvents(startDate, endDate);

    // Optionally expand recurring events
    let result;
    if (expandRecurring) {
      result = {
        events: expandRecurringEvents(events, startDate, endDate),
        expanded: true,
      };
    } else {
      result = {
        events,
        expanded: false,
      };
    }

    console.info(
      JSON.stringify({
        requestId,
        path: '/api/v1/calendar',
        method: 'GET',
        startDate,
        endDate,
        count: result.events.length,
      })
    );

    return jsonSuccess(result, 200, origin);
  } catch (err) {
    console.error(JSON.stringify({ requestId, path: '/api/v1/calendar', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Failed to fetch calendar events', origin);
  }
}
