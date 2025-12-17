#!/usr/bin/env node
/**
 * Minimal Seed Script for Test Users
 *
 * This script seeds ONLY the minimum data needed for tests to run:
 * - Firebase Auth users
 * - User profiles in Firestore
 *
 * It does NOT create:
 * - Grades, classes, students (tests create their own)
 * - Hero content (tests create their own)
 *
 * Usage:
 *   node scripts/seed-test-users.js           # Seed users only
 *   node scripts/seed-test-users.js --clear   # Clear all data first, then seed
 *
 * Both Cucumber (API) and Playwright (E2E) tests use this minimal seed.
 * Tests are responsible for creating and cleaning up their own test data.
 */

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-gsdta';

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

// Test user definitions
const TEST_USERS = [
  {
    uid: 'test-admin-uid',
    email: 'admin@test.com',
    password: 'admin123',
    firstName: 'Test',
    lastName: 'Admin',
    roles: ['admin'],
  },
  {
    uid: 'test-teacher-uid',
    email: 'teacher@test.com',
    password: 'teacher123',
    firstName: 'Test',
    lastName: 'Teacher',
    roles: ['teacher'],
  },
  {
    uid: 'test-parent-uid',
    email: 'parent@test.com',
    password: 'parent123',
    firstName: 'Test',
    lastName: 'Parent',
    roles: ['parent'],
  },
  {
    uid: 'test-parent-no-students-uid',
    email: 'parent_empty@test.com',
    password: 'parent123',
    firstName: 'Test',
    lastName: 'Empty',
    roles: ['parent'],
  },
  {
    uid: 'teacher-test-002',
    email: 'teacher2@test.com',
    password: 'teacher123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    roles: ['teacher'],
  },
  {
    uid: 'parent-test-002',
    email: 'parent2@test.com',
    password: 'parent123',
    firstName: 'Second',
    lastName: 'Parent',
    roles: ['parent'],
  },
];

/**
 * Wait for emulators to be ready
 */
async function waitForEmulators(maxAttempts = 20, delayMs = 250) {
  console.log('\n⏳ Waiting for emulators...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try to list users (tests Auth emulator)
      await auth.listUsers(1);
      // Try to read from Firestore (tests Firestore emulator)
      await db.collection('_health').doc('check').get();
      console.log('  ✅ Emulators are ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Emulators not ready after ${maxAttempts} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(1.5, attempt - 1)));
    }
  }
}

/**
 * Clear all collections (optional)
 */
async function clearCollections() {
  console.log('\n🗑️  Clearing existing data...');
  const collections = [
    'users',
    'students',
    'grades',
    'classes',
    'teacherInvites',
    'invites',
    'heroContent',
  ];

  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).limit(500).get();
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  ✓ Cleared ${collectionName} (${snapshot.size} docs)`);
      }
    } catch (error) {
      console.warn(`  ⚠ Could not clear ${collectionName}: ${error.message}`);
    }
  }
  console.log('  ✅ Collections cleared');
}

/**
 * Create Firebase Auth users
 */
async function createAuthUsers() {
  console.log('\n👥 Creating Firebase Auth users...');

  for (const user of TEST_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: `${user.firstName} ${user.lastName}`,
        emailVerified: true,
      });
      console.log(`  ✓ Created ${user.email}`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        // Update existing user to ensure password is correct
        try {
          await auth.updateUser(user.uid, {
            email: user.email,
            password: user.password,
            displayName: `${user.firstName} ${user.lastName}`,
            emailVerified: true,
          });
          console.log(`  ✓ Updated ${user.email} (already existed)`);
        } catch (updateError) {
          console.warn(`  ⚠ Could not update ${user.email}: ${updateError.message}`);
        }
      } else {
        throw error;
      }
    }
  }
  console.log('  ✅ Auth users ready');
}

/**
 * Create Firestore user profiles
 */
async function createUserProfiles() {
  console.log('\n📝 Creating user profiles in Firestore...');

  const now = admin.firestore.Timestamp.now();

  for (const user of TEST_USERS) {
    const profile = {
      uid: user.uid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc(user.uid).set(profile, { merge: true });
    console.log(`  ✓ Profile: ${user.email} (${user.roles.join(', ')})`);
  }
  console.log('  ✅ User profiles created');
}

/**
 * Verify credentials work via Firebase Auth REST API
 */
async function verifyCredentials() {
  console.log('\n🔐 Verifying credentials...');

  const apiKey = 'fake-api-key-for-emulator';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

  // Test admin login
  const testUser = TEST_USERS[0]; // admin
  const url = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        returnSecureToken: true,
      }),
    });

    if (response.ok) {
      console.log('  ✅ Credentials verified (admin login successful)');
    } else {
      const error = await response.json();
      console.warn(`  ⚠ Credential verification failed: ${error.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.warn(`  ⚠ Could not verify credentials: ${error.message}`);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Test Users Seeded Successfully                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const user of TEST_USERS) {
    const roleStr = user.roles.join(', ').padEnd(12);
    console.log(`  ${roleStr} ${user.email.padEnd(25)} / ${user.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Note: Tests are responsible for creating their own test data');
  console.log('      (grades, classes, students, etc.) and cleaning up after.\n');
}

/**
 * Main function
 */
async function main() {
  const shouldClear = process.argv.includes('--clear');

  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       Minimal Test Seed - Users Only                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    await waitForEmulators();

    if (shouldClear) {
      await clearCollections();
    }

    await createAuthUsers();
    await createUserProfiles();
    await verifyCredentials();

    printSummary();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
