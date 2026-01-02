// api/src/__tests__/middleware.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware';
import type { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string = 'GET', forwardedFor?: string): NextRequest {
  const headers = new Map<string, string>();
  if (forwardedFor) {
    headers.set('x-forwarded-for', forwardedFor);
  }

  return {
    url,
    method,
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
  } as unknown as NextRequest;
}

test('config: should match API v1 routes', () => {
  assert.ok(config.matcher);
  assert.ok(Array.isArray(config.matcher) ? config.matcher.includes('/api/v1/:path*') : config.matcher === '/api/v1/:path*');
});

test('middleware: should return NextResponse with request-id header', () => {
  const req = createMockRequest('http://localhost:8080/api/v1/health', 'GET');

  const response = middleware(req);

  assert.ok(response);
  assert.ok(response.headers.get('x-request-id'));
});

test('middleware: should generate unique request IDs', () => {
  const req1 = createMockRequest('http://localhost:8080/api/v1/health', 'GET');
  const req2 = createMockRequest('http://localhost:8080/api/v1/users', 'POST');

  const response1 = middleware(req1);
  const response2 = middleware(req2);

  const id1 = response1.headers.get('x-request-id');
  const id2 = response2.headers.get('x-request-id');

  assert.ok(id1);
  assert.ok(id2);
  assert.notEqual(id1, id2);
});

test('middleware: should handle requests with x-forwarded-for header', () => {
  const req = createMockRequest(
    'http://localhost:8080/api/v1/health',
    'GET',
    '192.168.1.1, 10.0.0.1'
  );

  const response = middleware(req);

  assert.ok(response);
  assert.ok(response.headers.get('x-request-id'));
});

test('middleware: should handle requests without forwarded headers', () => {
  const req = createMockRequest('http://localhost:8080/api/v1/health', 'GET');

  const response = middleware(req);

  assert.ok(response);
});

test('middleware: should handle different HTTP methods', () => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const method of methods) {
    const req = createMockRequest('http://localhost:8080/api/v1/test', method);
    const response = middleware(req);
    assert.ok(response);
    assert.ok(response.headers.get('x-request-id'));
  }
});

test('middleware: should generate fallback requestId when crypto.randomUUID not available', () => {
  // Save original
  const originalCrypto = globalThis.crypto;
  const originalRandomUUID = globalThis.crypto?.randomUUID;

  // Mock crypto without randomUUID
  Object.defineProperty(globalThis, 'crypto', {
    value: {},
    writable: true,
    configurable: true,
  });

  const req = createMockRequest('http://localhost:8080/api/v1/health', 'GET');
  const response = middleware(req);

  // Restore original
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    writable: true,
    configurable: true,
  });
  if (originalCrypto && originalRandomUUID) {
    originalCrypto.randomUUID = originalRandomUUID;
  }

  assert.ok(response);
  const requestId = response.headers.get('x-request-id');
  assert.ok(requestId);
  // Fallback format: timestamp-randomstring
  assert.ok(requestId.includes('-'));
});
