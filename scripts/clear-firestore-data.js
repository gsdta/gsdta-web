/**
 * Clear Firestore Data
 *
 * Clears all data from specified collections. Use with caution!
 *
 * Usage: node scripts/clear-firestore-data.js [--dry-run]
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

const DRY_RUN = process.argv.includes('--dry-run');

// Collections to clear
const COLLECTIONS = [
  'students',
  'teachers',
  'classes',
  'grades',
  'textbooks',
  'volunteers',
  'users',
];

async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ${collectionName}: 0 documents (empty)`);
    return 0;
  }

  const batchSize = 500;
  let deleted = 0;

  // Delete in batches
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!DRY_RUN) {
      await batch.commit();
    }
    deleted += chunk.length;
  }

  console.log(`  ${collectionName}: ${deleted} documents deleted`);
  return deleted;
}

async function deleteAuthUsers() {
  console.log('\nDeleting Firebase Auth users...');

  let deleted = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);

    if (listResult.users.length === 0) {
      break;
    }

    const uids = listResult.users.map(user => user.uid);

    if (!DRY_RUN) {
      await auth.deleteUsers(uids);
    }

    deleted += uids.length;
    console.log(`  Deleted ${deleted} users...`);

    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`  Total auth users deleted: ${deleted}`);
  return deleted;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Clear Firestore Data');
  console.log('='.repeat(60));
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Target: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);

  if (!USE_EMULATOR) {
    console.log('\n⚠️  WARNING: This will DELETE PRODUCTION DATA! ⚠️\n');
  }

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No data will be deleted ***\n');
  }

  // Delete Firestore collections
  console.log('\nDeleting Firestore collections...');
  let totalDocs = 0;

  for (const collection of COLLECTIONS) {
    totalDocs += await deleteCollection(collection);
  }

  // Delete Auth users
  const authDeleted = await deleteAuthUsers();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Firestore documents deleted: ${totalDocs}`);
  console.log(`  Auth users deleted: ${authDeleted}`);

  if (DRY_RUN) {
    console.log('\n*** DRY RUN COMPLETE - No data was deleted ***');
  } else {
    console.log('\n✅ All data cleared successfully!');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
