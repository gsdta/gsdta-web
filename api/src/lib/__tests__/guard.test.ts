import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, __setGuardDepsForTests } from '../guard';
import { AuthError, type VerifiedToken } from '../auth';
import type { UserProfile } from '../firestoreUsers';

const goodHeader = 'Bearer goodtoken';

test('requireAuth: allows active user without role requirement', async () => {
  __setGuardDepsForTests({
    verify: async (authz: string | null | undefined): Promise<VerifiedToken> => {
      assert.equal(authz, goodHeader);
      return { uid: 'u1', email: 'u1@example.com', emailVerified: true };
    },
    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
      assert.equal(uid, 'u1');
      return { uid, email: 'u1@example.com', name: 'U1', roles: ['parent'], status: 'active' };
    },
  });

  const ctx = await requireAuth(goodHeader);
  assert.equal(ctx.token.uid, 'u1');
  assert.deepEqual(ctx.profile.roles, ['parent']);

  __setGuardDepsForTests(null);
});

test('requireAuth: blocks suspended user when requireActive (default)', async () => {
  __setGuardDepsForTests({
    verify: async (): Promise<VerifiedToken> => ({ uid: 'u2', email: 'u2@example.com', emailVerified: true }),
    getUserProfile: async (): Promise<UserProfile | null> => ({ uid: 'u2', email: 'u2@example.com', name: 'U2', roles: ['parent'], status: 'suspended' }),
  });

  await assert.rejects(() => requireAuth(goodHeader), (err) => {
    assert.ok(err instanceof AuthError);
    const e = err as AuthError;
    assert.equal(e.status, 403);
    assert.equal(e.code, 'auth/forbidden');
    return true;
  });

  __setGuardDepsForTests(null);
});

test('requireAuth: enforces required roles', async () => {
  __setGuardDepsForTests({
    verify: async (): Promise<VerifiedToken> => ({ uid: 'u3', email: 'u3@example.com', emailVerified: true }),
    getUserProfile: async (): Promise<UserProfile | null> => ({ uid: 'u3', email: 'u3@example.com', name: 'U3', roles: ['parent'], status: 'active' }),
  });

  await assert.rejects(() => requireAuth(goodHeader, { requireRoles: ['admin'] }), (err) => {
    assert.ok(err instanceof AuthError);
    const e = err as AuthError;
    assert.equal(e.status, 403);
    assert.equal(e.code, 'auth/forbidden');
    return true;
  });

  // When role is present it should pass
  __setGuardDepsForTests({
    verify: async (): Promise<VerifiedToken> => ({ uid: 'u4', email: 'u4@example.com', emailVerified: true }),
    getUserProfile: async (): Promise<UserProfile | null> => ({ uid: 'u4', email: 'u4@example.com', name: 'U4', roles: ['admin'], status: 'active' }),
  });
  const ok = await requireAuth(goodHeader, { requireRoles: ['admin'] });
  assert.equal(ok.profile.uid, 'u4');

  __setGuardDepsForTests(null);
});

test('requireAuth: profile-not-found yields 404', async () => {
  __setGuardDepsForTests({
    verify: async (): Promise<VerifiedToken> => ({ uid: 'u5', email: 'u5@example.com', emailVerified: true }),
    getUserProfile: async (): Promise<UserProfile | null> => null,
  });

  await assert.rejects(() => requireAuth(goodHeader), (err) => {
    assert.ok(err instanceof AuthError);
    const e = err as AuthError;
    assert.equal(e.status, 404);
    assert.equal(e.code, 'auth/profile-not-found');
    return true;
  });

  __setGuardDepsForTests(null);
});
