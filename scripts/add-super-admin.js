/**
 * Add Super Admin User
 *
 * Creates or updates the super admin account.
 *
 * Usage: node scripts/add-super-admin.js
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-gsdta';

const IS_DEMO_PROJECT = PROJECT_ID.startsWith('demo-');
const USE_EMULATOR = IS_DEMO_PROJECT || process.env.FIRESTORE_EMULATOR_HOST;

if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
}

const admin = require('firebase-admin');

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();
const { Timestamp } = admin.firestore;

// Super admin configuration
const SUPER_ADMIN = {
  email: 'gunasekaran.pasupathy@gmail.com',
  displayName: 'Gunasekaran Pasupathy',
  password: 'Gsdta2025!', // Default password - should be changed on first login
};

async function main() {
  console.log('='.repeat(60));
  console.log('Add Super Admin');
  console.log('='.repeat(60));
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Target: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);
  console.log(`Admin Email: ${SUPER_ADMIN.email}`);

  let uid;

  // Check if user already exists in Auth
  try {
    const existingUser = await auth.getUserByEmail(SUPER_ADMIN.email);
    uid = existingUser.uid;
    console.log(`\nAuth user already exists: ${uid}`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      // Create new user
      const userRecord = await auth.createUser({
        email: SUPER_ADMIN.email,
        password: SUPER_ADMIN.password,
        displayName: SUPER_ADMIN.displayName,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log(`\nCreated auth user: ${uid}`);
    } else {
      throw e;
    }
  }

  // Create/update user document with admin role
  const userDoc = await db.collection('users').doc(uid).get();

  if (userDoc.exists) {
    const existingData = userDoc.data();
    const roles = existingData.roles || [];

    if (!roles.includes('admin')) {
      roles.push('admin');
      await db.collection('users').doc(uid).update({
        roles,
        updatedAt: Timestamp.now(),
      });
      console.log('Added admin role to existing user document');
    } else {
      console.log('User already has admin role');
    }
  } else {
    await db.collection('users').doc(uid).set({
      email: SUPER_ADMIN.email,
      displayName: SUPER_ADMIN.displayName,
      roles: ['admin'],
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log('Created user document with admin role');
  }

  console.log('\n✅ Super admin setup complete!');
  console.log(`   Email: ${SUPER_ADMIN.email}`);
  console.log(`   UID: ${uid}`);
  console.log(`   Role: admin`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
