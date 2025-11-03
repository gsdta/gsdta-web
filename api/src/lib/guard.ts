import { verifyIdToken, AuthError, VerifiedToken } from './auth';
import { getUserProfile, UserProfile } from './firestoreUsers';

export type RequireAuthOptions = {
  requireActive?: boolean; // default true
  requireRoles?: string[]; // require caller to have at least one of these roles
};

export type AuthContext = {
  token: VerifiedToken;
  profile: UserProfile;
};

// Allow tests to override dependencies
let _verify = verifyIdToken;
let _getProfile = getUserProfile;
export function __setGuardDepsForTests(
  deps: { verify?: typeof verifyIdToken; getUserProfile?: typeof getUserProfile } | null
) {
  _verify = (deps?.verify ?? verifyIdToken) as typeof verifyIdToken;
  _getProfile = (deps?.getUserProfile ?? getUserProfile) as typeof getUserProfile;
}

/**
 * Verify Firebase ID token, load user profile, and enforce status/role guards.
 * Throws AuthError with appropriate status/code/message on failure.
 */
export async function requireAuth(
  authorizationHeader: string | null | undefined,
  options: RequireAuthOptions = {}
): Promise<AuthContext> {
  const { requireActive = true, requireRoles } = options;

  const token = await _verify(authorizationHeader);
  const profile = await _getProfile(token.uid);

  if (!profile) {
    throw new AuthError(404, 'auth/profile-not-found', 'User profile not found');
  }

  if (requireActive && profile.status !== 'active') {
    throw new AuthError(403, 'auth/forbidden', 'User status is not active');
  }

  if (Array.isArray(requireRoles) && requireRoles.length > 0) {
    const hasRole = (profile.roles || []).some((r) => requireRoles.includes(r));
    if (!hasRole) {
      throw new AuthError(403, 'auth/forbidden', 'Insufficient privileges');
    }
  }

  return { token, profile };
}
