/**
 * Minimal Seed for API Cucumber Tests
 * 
 * This script seeds ONLY the minimum data needed for Cucumber tests to run.
 * It does NOT create students with classId assignments to avoid test pollution.
 * 
 * The actual test data is created by the Cucumber test steps (Before hooks).
 * 
 * Usage: node scripts/seed-api-tests.js
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearCollections() {
  console.log('\n🗑️  Clearing existing data...');
  const collections = ['users', 'students', 'grades', 'classes', 'teacherInvites'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    if (!snapshot.empty) {
      await batch.commit();
    }
  }
  console.log('  ✅ Collections cleared');
}

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  
  const users = [
    {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      password: 'admin123',
      displayName: 'Test Admin',
    },
    {
      uid: 'test-teacher-uid',
      email: 'teacher@test.com',
      password: 'teacher123',
      displayName: 'Test Teacher',
    },
    {
      uid: 'test-parent-uid',
      email: 'parent@test.com',
      password: 'parent123',
      displayName: 'Test Parent',
    },
  ];

  for (const user of users) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
    } catch (err) {
      if (err.code !== 'auth/email-already-exists') {
        throw err;
      }
    }
  }
  console.log('  ✅ Test users created');
}

async function createUserProfiles() {
  console.log('\n📝 Creating user profiles...');
  
  const profiles = [
    {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      displayName: 'Test Admin',
      role: 'admin',
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      uid: 'test-teacher-uid',
      email: 'teacher@test.com',
      displayName: 'Test Teacher',
      role: 'teacher',
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      uid: 'test-parent-uid',
      email: 'parent@test.com',
      displayName: 'Test Parent',
      role: 'parent',
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const profile of profiles) {
    await db.collection('users').doc(profile.uid).set(profile);
  }
  console.log('  ✅ User profiles created');
}

async function createTeacherInvites() {
  console.log('\n✉️  Creating test teacher invites...');
  
  const invites = [
    {
      token: 'test-invite-valid-123',
      email: 'newteacher@test.com',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: 'test-admin-uid',
    },
    {
      token: 'test-invite-expired-456',
      email: 'expired@test.com',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 10 * 24 * 60 * 60 * 1000),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: 'test-admin-uid',
    },
    {
      token: 'test-invite-used-789',
      email: 'used@test.com',
      status: 'used',
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdBy: 'test-admin-uid',
      usedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 4 * 24 * 60 * 60 * 1000),
      usedBy: 'test-teacher-uid',
    },
  ];

  for (const invite of invites) {
    await db.collection('teacherInvites').add(invite);
  }
  console.log('  ✅ Teacher invites created');
}

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   API Tests Seed - Minimal Data       ║');
    console.log('╚════════════════════════════════════════╝');

    await clearCollections();
    await createTestUsers();
    await createUserProfiles();
    await createTeacherInvites();

    console.log('\n✅ API test data seeded successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Test Users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin:   admin@test.com   / admin123');
    console.log('  Teacher: teacher@test.com / teacher123');
    console.log('  Parent:  parent@test.com  / parent123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Note: Cucumber tests will create their own test data');
    console.log('      (grades, classes, students) in Before hooks.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
