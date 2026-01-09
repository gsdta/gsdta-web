/**
 * Check UAT test user accounts in QA Firestore
 *
 * Usage:
 *   node scripts/check-test-users.js
 */

const admin = require('firebase-admin');

// QA project ID
const projectId = 'gsdta-qa';

// Test user emails to check (from UAT config)
const testEmails = [
  process.env.UAT_PARENT_EMAIL,
  process.env.UAT_TEACHER_EMAIL,
  process.env.UAT_ADMIN_EMAIL,
].filter(Boolean);

// Initialize Firebase Admin with ADC
console.log(`\n🔧 Connecting to Firestore (project: ${projectId})...\n`);
admin.initializeApp({ projectId });

const db = admin.firestore();
const auth = admin.auth();

async function checkUsers() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Checking Test User Accounts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (testEmails.length === 0) {
    // If env vars not set, query all users to help debug
    console.log('⚠️  No UAT_*_EMAIL env vars set. Listing all users in Firestore...\n');

    const usersSnapshot = await db.collection('users').limit(20).get();

    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firestore users collection!\n');
      return;
    }

    console.log(`Found ${usersSnapshot.size} user(s):\n`);

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      console.log(`  📧 ${data.email || '(no email)'}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     Status: ${data.status || '(not set)'}`);
      console.log(`     Roles: ${JSON.stringify(data.roles || [])}`);
      console.log();
    }
    return;
  }

  for (const email of testEmails) {
    console.log(`📧 Checking: ${email}`);
    console.log('─'.repeat(50));

    // Check Firebase Auth
    try {
      const authUser = await auth.getUserByEmail(email);
      console.log(`  ✅ Firebase Auth: EXISTS`);
      console.log(`     UID: ${authUser.uid}`);
      console.log(`     Disabled: ${authUser.disabled}`);
      console.log(`     Email Verified: ${authUser.emailVerified}`);

      // Check Firestore profile
      const userDoc = await db.collection('users').doc(authUser.uid).get();

      if (userDoc.exists) {
        const data = userDoc.data();
        console.log(`  ✅ Firestore Profile: EXISTS`);
        console.log(`     Status: ${data.status || '(not set)'}`);
        console.log(`     Roles: ${JSON.stringify(data.roles || [])}`);
        console.log(`     Name: ${data.name || '(not set)'}`);

        // Check for issues
        if (data.status !== 'active') {
          console.log(`  ⚠️  ISSUE: Status is "${data.status}" - should be "active"`);
        }
        if (!data.roles || data.roles.length === 0) {
          console.log(`  ⚠️  ISSUE: No roles assigned`);
        }
      } else {
        console.log(`  ❌ Firestore Profile: NOT FOUND`);
        console.log(`     ISSUE: User exists in Auth but not in Firestore users collection`);
      }

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`  ❌ Firebase Auth: NOT FOUND`);
        console.log(`     ISSUE: User does not exist in Firebase Authentication`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log();
  }
}

// Run
checkUsers()
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Check complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
