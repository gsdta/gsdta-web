import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/api/v1/:path*'],
};

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const method = req.method;
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd ? fwd.split(',')[0]!.trim() : 'unknown';
  const requestId = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Minimal structured log (no PII beyond IP)
  try {
    console.info(JSON.stringify({ requestId, method, path: url.pathname, ip }));
  } catch {}

  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

