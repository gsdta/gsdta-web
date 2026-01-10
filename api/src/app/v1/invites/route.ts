import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { createRoleInvite } from '@/lib/roleInvites';
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
 * POST /api/v1/invites
 * Body: { email: string; role?: 'teacher'; expiresInHours?: number }
 * Requires: Firebase ID token for an admin user
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    // Rate limit: 30 requests per hour per IP for invite creation
    const rl = enforceRateLimit(req, 'invites:create', 30, 3_600_000);
    if (rl.limited) {
      const res = NextResponse.json({ code: 'rate/limited', message: 'Too many requests. Please try again later.' }, { status: 429 });
      res.headers.set('Retry-After', String(Math.ceil(rl.resetInMs / 1000)));
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    const authz = req.headers.get('authorization');
    const { token } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });

    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body.email === 'string' ? body.email : '';
    const email = emailRaw.trim().toLowerCase();
    const role = (typeof body.role === 'string' ? body.role : 'teacher').trim();
    const expiresInHours = typeof body.expiresInHours === 'number' && isFinite(body.expiresInHours) && body.expiresInHours > 0 ? body.expiresInHours : 72;

    if (!email || !email.includes('@')) {
      return jsonError(400, 'invite/invalid-email', 'Valid email is required', origin);
    }
    if (role !== 'teacher') {
      return jsonError(400, 'invite/invalid-role', 'Only teacher role invites are supported', origin);
    }

    const invite = await createRoleInvite({ email, role, invitedBy: token.uid, expiresInHours });

    const res = NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      expiresAt: invite.expiresAt.toDate().toISOString(),
    }, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
