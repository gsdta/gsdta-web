import type { NextRequest } from 'next/server';

// Simple in-memory sliding window rate limiter per IP+key.
// Note: Best-effort only. For multi-instance prod, prefer a shared store (Redis/Memcache) or Cloud Armor.

type Bucket = { timestamps: number[] };
const store: Map<string, Bucket> = new Map();

function bucketKey(ip: string, key: string) {
  return `${key}:${ip}`;
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  // Fall back to remote address if available via header (NextRequest does not expose req.socket)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export type RateLimitDecision = {
  limited: boolean;
  remaining: number;
  resetInMs: number;
};

/**
 * Enforce a simple rate limit: up to `limit` requests per `windowMs` per IP for the given key.
 * Returns decision. Does not throw.
 */
export function enforceRateLimit(req: NextRequest, key: string, limit: number, windowMs: number): RateLimitDecision {
  const ip = getIp(req);
  const now = Date.now();
  const cutoff = now - windowMs;

  const k = bucketKey(ip, key);
  const b = store.get(k) ?? { timestamps: [] };
  // Drop old timestamps
  b.timestamps = b.timestamps.filter((t) => t > cutoff);

  if (b.timestamps.length >= limit) {
    const oldest = b.timestamps[0]!;
    const resetInMs = Math.max(0, oldest + windowMs - now);
    store.set(k, b);
    return { limited: true, remaining: 0, resetInMs };
  }

  b.timestamps.push(now);
  store.set(k, b);
  return { limited: false, remaining: Math.max(0, limit - b.timestamps.length), resetInMs: windowMs };
}

// Test helper
export function __resetRateLimitStore() {
  store.clear();
}

