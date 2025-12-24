/**
 * Seed QA Firebase with Initial Data
 * 
 * This script seeds the QA Firestore database with sample data.
 * NOTE: Auth users must be created manually via Firebase Console.
 * 
 * Usage: 
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node seed-qa.js
 *   
 * Or in CI with Workload Identity:
 *   node seed-qa.js
 */

const admin = require('firebase-admin');

const QA_PROJECT_ID = 'gsdta-qa';

// Initialize Firebase Admin (uses ADC or GOOGLE_APPLICATION_CREDENTIALS)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: QA_PROJECT_ID
  });
}

const db = admin.firestore();

// QA Admin user - must be created manually in Firebase Console first
// Then add this UID here after creation
const QA_ADMIN_UID = process.env.QA_ADMIN_UID || 'REPLACE_WITH_ACTUAL_UID';
const QA_ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@gsdta.org';

// Sample grades data
const SAMPLE_GRADES = [
  { id: 'ps-1', name: 'PS-1', displayName: 'Pre-School 1', displayOrder: 1, status: 'active' },
  { id: 'ps-2', name: 'PS-2', displayName: 'Pre-School 2', displayOrder: 2, status: 'active' },
  { id: 'kg', name: 'KG', displayName: 'Kindergarten', displayOrder: 3, status: 'active' },
  { id: 'grade-1', name: 'Grade-1', displayName: 'Grade 1', displayOrder: 4, status: 'active' },
  { id: 'grade-2', name: 'Grade-2', displayName: 'Grade 2', displayOrder: 5, status: 'active' },
  { id: 'grade-3', name: 'Grade-3', displayName: 'Grade 3', displayOrder: 6, status: 'active' },
  { id: 'grade-4', name: 'Grade-4', displayName: 'Grade 4', displayOrder: 7, status: 'active' },
  { id: 'grade-5', name: 'Grade-5', displayName: 'Grade 5', displayOrder: 8, status: 'active' },
  { id: 'grade-6', name: 'Grade-6', displayName: 'Grade 6', displayOrder: 9, status: 'active' },
  { id: 'grade-7', name: 'Grade-7', displayName: 'Grade 7', displayOrder: 10, status: 'active' },
  { id: 'grade-8', name: 'Grade-8', displayName: 'Grade 8', displayOrder: 11, status: 'active' }
];

// Sample classes data
const SAMPLE_CLASSES = [
  {
    id: 'class-001',
    name: 'PS-1 Section A - Saturday AM',
    gradeId: 'ps-1',
    gradeName: 'Pre-School 1',
    day: 'Saturday',
    time: '10:00 AM - 12:00 PM',
    capacity: 15,
    enrolled: 0,
    status: 'active',
    academicYear: '2024-2025'
  },
  {
    id: 'class-002',
    name: 'Grade 3 Section A - Saturday PM',
    gradeId: 'grade-3',
    gradeName: 'Grade 3',
    day: 'Saturday',
    time: '2:00 PM - 4:00 PM',
    capacity: 20,
    enrolled: 0,
    status: 'active',
    academicYear: '2024-2025'
  }
];

/**
 * Seed admin user profile in Firestore
 * NOTE: The Auth user must be created manually first via Firebase Console
 */
async function seedAdminUser() {
  console.log('\n📝 Seeding admin user profile...');
  
  if (QA_ADMIN_UID === 'REPLACE_WITH_ACTUAL_UID') {
    console.log('  ⚠️  Skipping admin user - QA_ADMIN_UID not set');
    console.log('     1. Create user in Firebase Console: https://console.firebase.google.com/project/gsdta-qa/authentication/users');
    console.log('     2. Set QA_ADMIN_UID env var with the UID');
    console.log('     3. Re-run this script');
    return;
  }

  const userProfile = {
    uid: QA_ADMIN_UID,
    email: QA_ADMIN_EMAIL,
    firstName: 'QA',
    lastName: 'Admin',
    roles: ['admin'],
    status: 'active',
    emailVerified: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('users').doc(QA_ADMIN_UID).set(userProfile, { merge: true });
  console.log(`  ✅ Created admin profile: ${QA_ADMIN_EMAIL}`);
}

/**
 * Seed grade records
 */
async function seedGrades() {
  console.log('\n📝 Seeding grade records...');

  for (const grade of SAMPLE_GRADES) {
    const gradeData = {
      ...grade,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('grades').doc(grade.id).set(gradeData, { merge: true });
    console.log(`  ✅ Created grade: ${grade.displayName}`);
  }
}

/**
 * Seed class records
 */
async function seedClasses() {
  console.log('\n📝 Seeding class records...');

  for (const cls of SAMPLE_CLASSES) {
    const classData = {
      ...cls,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('classes').doc(cls.id).set(classData, { merge: true });
    console.log(`  ✅ Created class: ${cls.name}`);
  }
}

/**
 * Check if data already exists
 */
async function checkExistingData() {
  const gradesSnap = await db.collection('grades').limit(1).get();
  const usersSnap = await db.collection('users').limit(1).get();
  
  return {
    hasGrades: !gradesSnap.empty,
    hasUsers: !usersSnap.empty
  };
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 QA Firebase Seed Script');
  console.log('==========================');
  console.log(`Project: ${QA_PROJECT_ID}`);

  const skipIfExists = process.argv.includes('--skip-if-exists');
  const forceReseed = process.argv.includes('--force');

  try {
    const existing = await checkExistingData();
    
    if (existing.hasGrades && !forceReseed) {
      console.log('\n⚠️  Data already exists in QA database.');
      if (skipIfExists) {
        console.log('   --skip-if-exists flag set, skipping seed.');
        process.exit(0);
      }
      console.log('   Use --force to reseed, or --skip-if-exists to skip.');
      process.exit(0);
    }

    await seedAdminUser();
    await seedGrades();
    await seedClasses();

    console.log('\n✅ QA seeding complete!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Next Steps:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Create admin user in Firebase Console');
    console.log('   https://console.firebase.google.com/project/gsdta-qa/authentication/users');
    console.log('2. Copy the UID and re-run with:');
    console.log('   QA_ADMIN_UID=<uid> QA_ADMIN_EMAIL=<email> node seed-qa.js --force');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
