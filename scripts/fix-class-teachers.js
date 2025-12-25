/**
 * Fix Class Teacher Assignments
 *
 * Updates class documents to have proper teacher references with teacherId.
 * Also updates teachers collection with class assignments.
 *
 * Usage: node scripts/fix-class-teachers.js [--dry-run]
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-gsdta';

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

// System admin ID for assignedBy field
const SYSTEM_ADMIN_ID = 'system-import';

async function main() {
  console.log('='.repeat(60));
  console.log('Fix Class Teacher Assignments');
  console.log('='.repeat(60));
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Target: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);
  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE ***\n');
  }

  // Step 1: Load all teachers and build email -> teacher map
  console.log('\nLoading teachers...');
  const teachersSnapshot = await db.collection('teachers').get();
  const teacherByEmail = new Map();
  const teacherById = new Map();

  teachersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const teacherInfo = {
      id: doc.id,
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    };
    if (data.email) {
      teacherByEmail.set(data.email.toLowerCase(), teacherInfo);
    }
    teacherById.set(doc.id, teacherInfo);
  });
  console.log(`  Found ${teacherByEmail.size} teachers with emails`);

  // Step 2: Load all classes and fix teacher assignments
  console.log('\nProcessing classes...');
  const classesSnapshot = await db.collection('classes').get();

  let classesFixed = 0;
  let classesAlreadyOk = 0;
  let teachersNotFound = 0;

  for (const doc of classesSnapshot.docs) {
    const classData = doc.data();
    const className = classData.name;
    const existingTeachers = classData.teachers || [];

    // Check if teachers need fixing (missing teacherId or using wrong field names)
    const needsFix = existingTeachers.some(t =>
      !t.teacherId || t.name !== undefined  // Has 'name' instead of 'teacherName'
    );

    if (!needsFix && existingTeachers.length > 0) {
      // Check if all teachers have valid teacherId
      const allValid = existingTeachers.every(t => t.teacherId && teacherById.has(t.teacherId));
      if (allValid) {
        classesAlreadyOk++;
        continue;
      }
    }

    // Build new teachers array with proper structure
    const newTeachers = [];

    for (const t of existingTeachers) {
      // Try to find teacher by email or name
      const email = (t.email || t.teacherEmail || '').toLowerCase();
      const name = t.name || t.teacherName || '';

      let teacherInfo = null;

      // First try by email
      if (email && teacherByEmail.has(email)) {
        teacherInfo = teacherByEmail.get(email);
      }

      // If not found by email, try to find by name
      if (!teacherInfo && name) {
        for (const [, info] of teacherByEmail) {
          if (info.name.toLowerCase() === name.toLowerCase()) {
            teacherInfo = info;
            break;
          }
        }
      }

      if (teacherInfo) {
        newTeachers.push({
          teacherId: teacherInfo.id,
          teacherName: teacherInfo.name,
          teacherEmail: teacherInfo.email,
          role: t.role || 'primary',
          assignedAt: t.assignedAt || Timestamp.now(),
          assignedBy: t.assignedBy || SYSTEM_ADMIN_ID,
        });
      } else {
        console.log(`    Warning: Teacher not found for class "${className}": ${name} (${email})`);
        teachersNotFound++;
        // Still add with what we have
        if (name) {
          newTeachers.push({
            teacherId: `unknown-${name.replace(/\s+/g, '-').toLowerCase()}`,
            teacherName: name,
            teacherEmail: email || null,
            role: t.role || 'primary',
            assignedAt: t.assignedAt || Timestamp.now(),
            assignedBy: t.assignedBy || SYSTEM_ADMIN_ID,
          });
        }
      }
    }

    if (newTeachers.length > 0) {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would fix "${className}":`);
        newTeachers.forEach(t => console.log(`    - ${t.teacherName} (${t.role})`));
      } else {
        await doc.ref.update({
          teachers: newTeachers,
          updatedAt: Timestamp.now(),
        });
        console.log(`  Fixed "${className}": ${newTeachers.length} teachers`);
      }
      classesFixed++;
    }
  }

  // Step 3: Update teacher documents with class assignments
  console.log('\nUpdating teacher class assignments...');

  // Build a map of teacher -> classes
  const teacherClasses = new Map();

  const updatedClassesSnapshot = await db.collection('classes').get();
  for (const doc of updatedClassesSnapshot.docs) {
    const classData = doc.data();
    const teachers = classData.teachers || [];

    for (const t of teachers) {
      if (t.teacherId && !t.teacherId.startsWith('unknown-')) {
        if (!teacherClasses.has(t.teacherId)) {
          teacherClasses.set(t.teacherId, []);
        }
        teacherClasses.get(t.teacherId).push({
          classId: doc.id,
          className: classData.name,
          gradeId: classData.gradeId,
          section: classData.section,
          role: t.role,
        });
      }
    }
  }

  let teachersUpdated = 0;
  for (const [teacherId, classes] of teacherClasses) {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would update teacher ${teacherId}: ${classes.length} classes`);
    } else {
      await db.collection('teachers').doc(teacherId).update({
        classAssignments: classes,
        updatedAt: Timestamp.now(),
      });
      console.log(`  Updated teacher ${teacherId}: ${classes.length} classes`);
    }
    teachersUpdated++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Classes fixed: ${classesFixed}`);
  console.log(`  Classes already OK: ${classesAlreadyOk}`);
  console.log(`  Teachers not found: ${teachersNotFound}`);
  console.log(`  Teacher documents updated: ${teachersUpdated}`);

  if (DRY_RUN) {
    console.log('\n*** DRY RUN COMPLETE - No data was modified ***');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
