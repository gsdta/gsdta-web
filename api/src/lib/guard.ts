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

// Test user profiles for test mode
const testUsers: Record<string, { token: VerifiedToken; profile: UserProfile }> = {
  admin: {
    token: {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      emailVerified: true,
    },
    profile: {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      name: 'Test Admin',
      firstName: 'Test',
      lastName: 'Admin',
      roles: ['admin'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  teacher: {
    token: {
      uid: 'test-teacher-uid',
      email: 'teacher@test.com',
      emailVerified: true,
    },
    profile: {
      uid: 'test-teacher-uid',
      email: 'teacher@test.com',
      name: 'Test Teacher',
      firstName: 'Test',
      lastName: 'Teacher',
      roles: ['teacher'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  parent: {
    token: {
      uid: 'test-parent-uid',
      email: 'parent@test.com',
      emailVerified: true,
    },
    profile: {
      uid: 'test-parent-uid',
      email: 'parent@test.com',
      name: 'Test Parent',
      firstName: 'Test',
      lastName: 'Parent',
      roles: ['parent'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  parentNoStudents: {
    token: {
      uid: 'test-parent-no-students-uid',
      email: 'parent_empty@test.com',
      emailVerified: true,
    },
    profile: {
      uid: 'test-parent-no-students-uid',
      email: 'parent_empty@test.com',
      name: 'Test Parent Empty',
      firstName: 'Test',
      lastName: 'Empty',
      roles: ['parent'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

// Mock verify function for tests
async function mockVerify(authHeader: string | null | undefined): Promise<VerifiedToken> {
  if (!authHeader) {
    throw new AuthError(401, 'auth/missing-token', 'Authorization header required');
  }

  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw new AuthError(401, 'auth/invalid-token', 'Invalid authorization format');
  }

  const token = match[1];
  
  // Match test tokens to test users
  if (token === 'test-admin-token') {
    return testUsers.admin.token;
  } else if (token === 'test-teacher-token') {
    return testUsers.teacher.token;
  } else if (token === 'test-parent-token') {
    return testUsers.parent.token;
  } else if (token === 'test-parent-no-students-token') {
    return testUsers.parentNoStudents.token;
  }

  throw new AuthError(401, 'auth/invalid-token', 'Invalid token');
}

// Mock getUserProfile function for tests
async function mockGetUserProfile(uid: string): Promise<UserProfile | null> {
  for (const user of Object.values(testUsers)) {
    if (user.token.uid === uid) {
      return user.profile;
    }
  }
  return null;
}

// Function to get verify function based on runtime env
function getVerifyFunction() {
  // Enable test mode if USE_TEST_AUTH is explicitly set OR if NODE_ENV is test
  const useTestMode = process.env.USE_TEST_AUTH === 'true' || process.env.NODE_ENV === 'test';
  return useTestMode ? mockVerify : verifyIdToken;
}

// Function to get getUserProfile based on runtime env
function getGetProfileFunction() {
  // Enable test mode if USE_TEST_AUTH is explicitly set OR if NODE_ENV is test
  const useTestMode = process.env.USE_TEST_AUTH === 'true' || process.env.NODE_ENV === 'test';
  return useTestMode ? mockGetUserProfile : getUserProfile;
}

export function __setGuardDepsForTests(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: { verify?: typeof verifyIdToken; getUserProfile?: typeof getUserProfile } | null
) {
  // This function is kept for backwards compatibility but not used anymore
  // Test mocks are now automatically used based on USE_TEST_AUTH env var
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

  // Get functions based on runtime environment
  const verify = getVerifyFunction();
  const getProfile = getGetProfileFunction();

  const token = await verify(authorizationHeader);
  const profile = await getProfile(token.uid);

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
