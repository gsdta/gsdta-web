// api/src/lib/__tests__/auth.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIdToken, AuthError, __setAuthForTests } from '../auth';

// Store original NODE_ENV
const originalEnv = process.env.NODE_ENV;

// Helper to set NODE_ENV in tests (TypeScript marks it as readonly)
const setNodeEnv = (value: string) => {
  (process.env as { NODE_ENV: string }).NODE_ENV = value;
};

test.afterEach(() => {
  __setAuthForTests(null);
  setNodeEnv(originalEnv ?? 'test');
});

// ============================================
// AuthError tests
// ============================================

test('AuthError: should create error with status and code', () => {
  const error = new AuthError(401, 'auth/test', 'Test message');

  assert.equal(error.status, 401);
  assert.equal(error.code, 'auth/test');
  assert.equal(error.message, 'Test message');
  assert.ok(error instanceof Error);
});

// ============================================
// parseBearer tests (via verifyIdToken)
// ============================================

test('verifyIdToken: should throw for missing Authorization header', async () => {
  try {
    await verifyIdToken(null);
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
    assert.equal(err.code, 'auth/unauthorized');
    assert.ok(err.message.includes('Missing Authorization header'));
  }
});

test('verifyIdToken: should throw for undefined Authorization header', async () => {
  try {
    await verifyIdToken(undefined);
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

test('verifyIdToken: should throw for empty Authorization header', async () => {
  try {
    await verifyIdToken('');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

test('verifyIdToken: should throw for invalid scheme', async () => {
  try {
    await verifyIdToken('Basic sometoken');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
    assert.ok(err.message.includes('invalid Authorization header'));
  }
});

test('verifyIdToken: should throw for missing token after Bearer', async () => {
  try {
    await verifyIdToken('Bearer');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

test('verifyIdToken: should throw for Bearer with only space', async () => {
  try {
    await verifyIdToken('Bearer ');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

// ============================================
// Test token handling (test mode)
// ============================================

test('verifyIdToken: should return test admin token in test mode', async () => {
  setNodeEnv('test');

  const result = await verifyIdToken('Bearer test-admin-token');

  assert.equal(result.uid, 'test-admin-uid');
  assert.equal(result.email, 'admin@test.com');
  assert.equal(result.emailVerified, true);
});

test('verifyIdToken: should return test teacher token in test mode', async () => {
  setNodeEnv('test');

  const result = await verifyIdToken('Bearer test-teacher-token');

  assert.equal(result.uid, 'test-teacher-uid');
  assert.equal(result.email, 'teacher@test.com');
  assert.equal(result.emailVerified, true);
});

test('verifyIdToken: should return test parent token in test mode', async () => {
  setNodeEnv('test');

  const result = await verifyIdToken('Bearer test-parent-token');

  assert.equal(result.uid, 'test-parent-uid');
  assert.equal(result.email, 'parent@test.com');
  assert.equal(result.emailVerified, true);
});

test('verifyIdToken: should not use test tokens in non-test mode', async () => {
  setNodeEnv('production');

  // Mock the auth to throw
  const mockAuth = () => ({
    verifyIdToken: async () => {
      throw new Error('Invalid token');
    },
  });
  __setAuthForTests(mockAuth as any);

  try {
    await verifyIdToken('Bearer test-admin-token');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
    assert.ok(err.message.includes('Invalid or expired ID token'));
  }
});

test('verifyIdToken: should fall through to Firebase for unknown test token', async () => {
  setNodeEnv('test');

  // Mock the auth to throw
  const mockAuth = () => ({
    verifyIdToken: async () => {
      throw new Error('Invalid token');
    },
  });
  __setAuthForTests(mockAuth as any);

  try {
    await verifyIdToken('Bearer test-unknown-token');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

// ============================================
// Firebase verification tests
// ============================================

test('verifyIdToken: should verify token with Firebase', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async (token: string, checkRevoked: boolean) => {
      assert.equal(token, 'valid-firebase-token');
      assert.equal(checkRevoked, true);
      return {
        uid: 'firebase-uid',
        email: 'user@example.com',
        email_verified: true,
      };
    },
  });
  __setAuthForTests(mockAuth as any);

  const result = await verifyIdToken('Bearer valid-firebase-token');

  assert.equal(result.uid, 'firebase-uid');
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.emailVerified, true);
});

test('verifyIdToken: should handle email_verified false', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async () => ({
      uid: 'firebase-uid',
      email: 'user@example.com',
      email_verified: false,
    }),
  });
  __setAuthForTests(mockAuth as any);

  const result = await verifyIdToken('Bearer valid-token');

  assert.equal(result.emailVerified, false);
});

test('verifyIdToken: should handle missing email_verified', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async () => ({
      uid: 'firebase-uid',
      email: 'user@example.com',
      // email_verified is undefined
    }),
  });
  __setAuthForTests(mockAuth as any);

  const result = await verifyIdToken('Bearer valid-token');

  assert.equal(result.emailVerified, false);
});

test('verifyIdToken: should handle missing email', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async () => ({
      uid: 'firebase-uid',
      // email is undefined
      email_verified: true,
    }),
  });
  __setAuthForTests(mockAuth as any);

  const result = await verifyIdToken('Bearer valid-token');

  assert.equal(result.uid, 'firebase-uid');
  assert.equal(result.email, undefined);
});

test('verifyIdToken: should throw for invalid Firebase token', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async () => {
      throw new Error('auth/id-token-expired');
    },
  });
  __setAuthForTests(mockAuth as any);

  try {
    await verifyIdToken('Bearer expired-token');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
    assert.equal(err.code, 'auth/unauthorized');
    assert.ok(err.message.includes('Invalid or expired ID token'));
  }
});

test('verifyIdToken: should throw for revoked token', async () => {
  setNodeEnv('production');

  const mockAuth = () => ({
    verifyIdToken: async () => {
      throw new Error('auth/id-token-revoked');
    },
  });
  __setAuthForTests(mockAuth as any);

  try {
    await verifyIdToken('Bearer revoked-token');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err instanceof AuthError);
    assert.equal(err.status, 401);
  }
});

test('verifyIdToken: should trim token whitespace', async () => {
  setNodeEnv('test');

  // Token with trailing whitespace should work (trim is applied)
  const result = await verifyIdToken('Bearer test-admin-token  ');

  assert.equal(result.uid, 'test-admin-uid');
});

test('verifyIdToken: should handle bearer case-insensitively', async () => {
  setNodeEnv('test');

  const result = await verifyIdToken('BEARER test-admin-token');

  assert.equal(result.uid, 'test-admin-uid');
});

test('verifyIdToken: should handle lowercase bearer', async () => {
  setNodeEnv('test');

  const result = await verifyIdToken('bearer test-admin-token');

  assert.equal(result.uid, 'test-admin-uid');
});
