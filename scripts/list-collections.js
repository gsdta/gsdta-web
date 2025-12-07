/**
 * List all Firestore collections
 * 
 * Usage:
 *   export PROJECT_ID="your-project-id"
 *   node scripts/list-collections.js
 * 
 * For production:
 *   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
 *   export PROJECT_ID="your-project-id"
 *   node scripts/list-collections.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const projectId = process.env.PROJECT_ID || 'demo-gsdta';

// Check if running against emulators
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;

if (isEmulator) {
  console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}\n`);
  admin.initializeApp({ projectId });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`🔑 Using service account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);
  admin.initializeApp({ projectId });
} else {
  console.log(`⚠️  No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or use emulator.\n`);
  admin.initializeApp({ projectId });
}

async function listCollections() {
  try {
    const db = admin.firestore();
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('📭 No collections found (database may be empty)\n');
      return;
    }
    
    console.log(`📚 Found ${collections.length} collection(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const collection of collections) {
      const snapshot = await collection.limit(1).get();
      const docCount = snapshot.size > 0 ? `(has documents)` : `(empty)`;
      console.log(`  ✓ ${collection.id.padEnd(25)} ${docCount}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get approximate document counts for each collection
    console.log('📊 Approximate document counts:\n');
    for (const collection of collections) {
      try {
        const snapshot = await collection.count().get();
        const count = snapshot.data().count;
        console.log(`  ${collection.id.padEnd(25)} ${count} document(s)`);
      } catch (error) {
        console.log(`  ${collection.id.padEnd(25)} (count unavailable)`);
      }
    }
    
    console.log();
  } catch (error) {
    console.error('❌ Error listing collections:', error.message);
    process.exit(1);
  }
}

// Run
listCollections()
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
