import { BeforeAll, AfterAll, After } from '@cucumber/cucumber';
import { __setGuardDepsForTests } from '../../../src/lib/guard';
import type { VerifiedToken } from '../../../src/lib/auth';
import type { UserProfile } from '../../../src/lib/firestoreUsers';
import { testDataTracker } from './testDataTracker';

// Test user profiles
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
    throw { status: 401, code: 'auth/missing-token', message: 'Authorization header required' };
  }

  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw { status: 401, code: 'auth/invalid-token', message: 'Invalid authorization format' };
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

  throw { status: 401, code: 'auth/invalid-token', message: 'Invalid token' };
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

BeforeAll(async function () {
  // Install test mocks for authentication
  __setGuardDepsForTests({
    verify: mockVerify as (authorizationHeader: string | null | undefined) => Promise<VerifiedToken>,
    getUserProfile: mockGetUserProfile,
  });
});

AfterAll(async function () {
  // Restore original functions
  __setGuardDepsForTests(null);
});

/**
 * After each scenario: Clean up all test data created during the scenario
 * This ensures test isolation - each scenario starts with a clean state.
 */
After(async function () {
  if (testDataTracker.hasTrackedData()) {
    try {
      await testDataTracker.cleanup();
    } catch (error) {
      console.warn('Warning: Test data cleanup encountered errors:', error);
    }
    testDataTracker.reset();
  }
});
