import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, AuthError } from '@/lib/auth';
import { getInviteByToken, isInviteUsable, markInviteAccepted } from '@/lib/roleInvites';
import { ensureUserHasRole } from '@/lib/firestoreUsers';

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
 * POST /api/v1/invites/accept
 * Body: { token: string }
 * Authenticated endpoint: accepts invite for current user and adds role.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const authz = req.headers.get('authorization');
    const token = await verifyIdToken(authz);

    const body = await req.json().catch(() => ({}));
    const tokenStr = typeof body.token === 'string' ? body.token.trim() : '';
    if (!tokenStr) return jsonError(400, 'invite/invalid-token', 'Token is required', origin);

    const invite = await getInviteByToken(tokenStr);
    if (!isInviteUsable(invite)) {
      return jsonError(404, 'invite/not-found', 'Invite not found or expired', origin);
    }

    const userEmail = (token.email || '').toLowerCase();
    if (!userEmail || userEmail !== invite.email.toLowerCase()) {
      return jsonError(400, 'invite/email-mismatch', 'Signed-in email does not match invite', origin);
    }

    const name = userEmail.split('@')[0];
    const profile = await ensureUserHasRole(token.uid, userEmail, name, invite.role);

    await markInviteAccepted(invite.id, token.uid);

    const res = NextResponse.json({
      uid: profile.uid,
      email: profile.email,
      roles: profile.roles,
      status: profile.status,
    }, { status: 200 });
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

