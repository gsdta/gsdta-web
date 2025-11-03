import { NextRequest, NextResponse } from 'next/server';
import { getInviteByToken, isInviteUsable } from '@/lib/roleInvites';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isDev() { return process.env.NODE_ENV !== 'production'; }
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
    'https://www.gsdta.com',
  ]);
  return prodAllowed.has(origin) ? origin : null;
}
function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}
function jsonError(status: number, code: string, message: string, origin: string | null) {
  const res = NextResponse.json({ code, message }, { status });
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
 * GET /api/v1/invites/verify?token=...
 * Public endpoint: returns invite details if usable.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  // Rate limit: 20 requests per minute per IP for invite verification
  const rl = enforceRateLimit(req, 'invites:verify', 20, 60_000);
  if (rl.limited) {
    const res = NextResponse.json({ code: 'rate/limited', message: 'Too many requests. Please try again later.' }, { status: 429 });
    res.headers.set('Retry-After', String(Math.ceil(rl.resetInMs / 1000)));
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get('token') || '').trim();
  if (!token) return jsonError(400, 'invite/invalid-token', 'Token is required', origin);

  try {
    const invite = await getInviteByToken(token);
    if (!isInviteUsable(invite)) {
      return jsonError(404, 'invite/not-found', 'Invite not found or expired', origin);
    }
    const res = NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt.toDate().toISOString(),
    }, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch {
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
