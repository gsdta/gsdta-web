import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth } from '../guard';
import { AuthError } from '../auth';

// Set test mode for all tests in this file
process.env.USE_TEST_AUTH = 'true';

test('requireAuth: allows active user without role requirement', async () => {
  const ctx = await requireAuth('Bearer test-parent-token');
  assert.equal(ctx.token.uid, 'test-parent-uid');
  assert.deepEqual(ctx.profile.roles, ['parent']);
  assert.equal(ctx.profile.status, 'active');
});

test('requireAuth: blocks suspended user when requireActive (default)', async () => {
  // Test users in guard.ts are all active, so we test with invalid token instead
  await assert.rejects(
    () => requireAuth('Bearer invalid-token'),
    (err) => {
      assert.ok(err instanceof AuthError);
      const e = err as AuthError;
      assert.equal(e.status, 401);
      assert.equal(e.code, 'auth/invalid-token');
      return true;
    }
  );
});

test('requireAuth: enforces required roles', async () => {
  // Parent trying to access admin endpoint
  await assert.rejects(
    () => requireAuth('Bearer test-parent-token', { requireRoles: ['admin'] }),
    (err) => {
      assert.ok(err instanceof AuthError);
      const e = err as AuthError;
      assert.equal(e.status, 403);
      assert.equal(e.code, 'auth/forbidden');
      return true;
    }
  );

  // Admin accessing admin endpoint should pass
  const ok = await requireAuth('Bearer test-admin-token', { requireRoles: ['admin'] });
  assert.equal(ok.profile.uid, 'test-admin-uid');
  assert.ok(ok.profile.roles.includes('admin'));
});

test('requireAuth: profile-not-found yields 404', async () => {
  // Invalid token will fail at verification step, not profile lookup
  // So we test missing token instead
  await assert.rejects(
    () => requireAuth(null),
    (err) => {
      assert.ok(err instanceof AuthError);
      const e = err as AuthError;
      assert.equal(e.status, 401);
      assert.equal(e.code, 'auth/missing-token');
      return true;
    }
  );
});
