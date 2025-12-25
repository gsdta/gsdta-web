/**
 * Fix Student-Class Links
 *
 * One-time script to fix students that have classId but missing className,
 * and update class enrolled counts.
 *
 * Usage: node scripts/fix-student-class-links.js [--dry-run]
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-gsdta';

// Only use emulator if project is demo-* OR emulator hosts are explicitly set
const IS_DEMO_PROJECT = PROJECT_ID.startsWith('demo-');
const USE_EMULATOR = IS_DEMO_PROJECT || process.env.FIRESTORE_EMULATOR_HOST;

if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
}

const admin = require('firebase-admin');

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const { Timestamp } = admin.firestore;

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('='.repeat(60));
  console.log('Fix Student-Class Links');
  console.log('='.repeat(60));
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Target: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);
  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE ***\n');
  }

  // Step 1: Load all classes into a map
  console.log('\nLoading classes...');
  const classesSnapshot = await db.collection('classes').get();
  const classMap = new Map();

  classesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    classMap.set(doc.id, {
      id: doc.id,
      name: data.name,
      gradeId: data.gradeId,
      enrolled: 0, // We'll recalculate this
    });
  });
  console.log(`  Found ${classMap.size} classes`);

  // Step 2: Find students with classId but missing className
  console.log('\nChecking students...');
  const studentsSnapshot = await db.collection('students').get();

  let studentsFixed = 0;
  let studentsAlreadyOk = 0;
  let studentsNoClass = 0;
  let classNotFound = 0;

  for (const doc of studentsSnapshot.docs) {
    const data = doc.data();
    const classId = data.classId;

    if (!classId) {
      studentsNoClass++;
      continue;
    }

    const classInfo = classMap.get(classId);
    if (!classInfo) {
      console.log(`  Warning: Student ${data.firstName} ${data.lastName} has classId ${classId} but class not found`);
      classNotFound++;
      continue;
    }

    // Increment enrollment count
    classInfo.enrolled++;

    // Check if className is missing or incorrect
    if (!data.className || data.className !== classInfo.name) {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would fix: ${data.firstName} ${data.lastName} -> ${classInfo.name}`);
      } else {
        await doc.ref.update({
          className: classInfo.name,
          updatedAt: Timestamp.now(),
        });
        console.log(`  Fixed: ${data.firstName} ${data.lastName} -> ${classInfo.name}`);
      }
      studentsFixed++;
    } else {
      studentsAlreadyOk++;
    }
  }

  // Step 3: Update class enrollment counts
  console.log('\nUpdating class enrollment counts...');
  for (const [classId, classInfo] of classMap) {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would update ${classInfo.name}: enrolled=${classInfo.enrolled}`);
    } else {
      await db.collection('classes').doc(classId).update({
        enrolled: classInfo.enrolled,
        updatedAt: Timestamp.now(),
      });
      console.log(`  Updated ${classInfo.name}: enrolled=${classInfo.enrolled}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Students fixed (className added): ${studentsFixed}`);
  console.log(`  Students already OK: ${studentsAlreadyOk}`);
  console.log(`  Students with no class: ${studentsNoClass}`);
  console.log(`  Students with missing class: ${classNotFound}`);
  console.log(`  Classes updated: ${classMap.size}`);

  if (DRY_RUN) {
    console.log('\n*** DRY RUN COMPLETE - No data was modified ***');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
