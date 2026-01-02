// api/src/lib/__tests__/rateLimit.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceRateLimit, __resetRateLimitStore } from '../rateLimit';
import type { NextRequest } from 'next/server';

function createMockRequest(ip: string = '192.168.1.1', forwardedFor?: string): NextRequest {
  const headers = new Map<string, string>();
  if (forwardedFor) {
    headers.set('x-forwarded-for', forwardedFor);
  } else {
    headers.set('x-real-ip', ip);
  }

  return {
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
  } as unknown as NextRequest;
}

test.beforeEach(() => {
  __resetRateLimitStore();
});

test('enforceRateLimit: should allow requests under the limit', () => {
  const req = createMockRequest('192.168.1.1');
  const result = enforceRateLimit(req, 'test', 5, 60000);

  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});

test('enforceRateLimit: should count requests correctly', () => {
  const req = createMockRequest('192.168.1.1');

  // Make 4 requests
  for (let i = 0; i < 4; i++) {
    enforceRateLimit(req, 'test', 5, 60000);
  }

  const result = enforceRateLimit(req, 'test', 5, 60000);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 0);
});

test('enforceRateLimit: should limit after reaching max requests', () => {
  const req = createMockRequest('192.168.1.1');

  // Make 5 requests to hit the limit
  for (let i = 0; i < 5; i++) {
    enforceRateLimit(req, 'test', 5, 60000);
  }

  const result = enforceRateLimit(req, 'test', 5, 60000);
  assert.equal(result.limited, true);
  assert.equal(result.remaining, 0);
  assert.ok(result.resetInMs >= 0);
});

test('enforceRateLimit: should isolate different IPs', () => {
  const req1 = createMockRequest('192.168.1.1');
  const req2 = createMockRequest('192.168.1.2');

  // Exhaust limit for IP1
  for (let i = 0; i < 5; i++) {
    enforceRateLimit(req1, 'test', 5, 60000);
  }

  // IP2 should still have requests available
  const result = enforceRateLimit(req2, 'test', 5, 60000);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});

test('enforceRateLimit: should isolate different keys', () => {
  const req = createMockRequest('192.168.1.1');

  // Exhaust limit for key1
  for (let i = 0; i < 5; i++) {
    enforceRateLimit(req, 'key1', 5, 60000);
  }

  // key2 should still have requests available
  const result = enforceRateLimit(req, 'key2', 5, 60000);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});

test('enforceRateLimit: should use x-forwarded-for header', () => {
  const req = createMockRequest('unused', '10.0.0.1, 10.0.0.2');

  const result = enforceRateLimit(req, 'test', 5, 60000);
  assert.equal(result.limited, false);

  // Make requests from a different x-forwarded-for
  const req2 = createMockRequest('unused', '10.0.0.3');
  const result2 = enforceRateLimit(req2, 'test', 5, 60000);
  assert.equal(result2.limited, false);
  assert.equal(result2.remaining, 4);
});

test('enforceRateLimit: should fall back to 127.0.0.1 when no IP headers present', () => {
  const req = {
    headers: {
      get: () => null,
    },
  } as unknown as NextRequest;

  const result = enforceRateLimit(req, 'test', 5, 60000);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});

test('__resetRateLimitStore: should clear all rate limits', () => {
  const req = createMockRequest('192.168.1.1');

  // Exhaust limit
  for (let i = 0; i < 5; i++) {
    enforceRateLimit(req, 'test', 5, 60000);
  }

  // Reset store
  __resetRateLimitStore();

  // Should have fresh limit
  const result = enforceRateLimit(req, 'test', 5, 60000);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});
