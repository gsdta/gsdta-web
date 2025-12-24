/**
 * Seed Firebase Emulators with Test Data
 * 
 * Usage: node scripts/seed-emulator.js
 * 
 * Prerequisites:
 * - Firebase emulators must be running
 * - Environment variables must be set for emulators
 */

// Connect to emulators (set env BEFORE importing firebase-admin so SDK picks it up reliably)
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8890';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'demo-gsdta';

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (!err) return false;
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message : String(err);

  // Common transient network errors (Node)
  const transientMarkers = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'socket hang up',
    'network error',
  ];

  if (transientMarkers.includes(code)) return true;
  return transientMarkers.some((m) => message.includes(m));
}

async function withRetries(fn, { label, attempts = 5, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === attempts) throw err;
      const delay = baseDelayMs * attempt;
      console.warn(`  ⚠️  ${label || 'operation'} failed (attempt ${attempt}/${attempts}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function waitForEmulatorsReady() {
  console.log('\n⏳ Waiting for Firebase emulators to be ready...');

  // Auth emulator readiness: listUsers should work without credentials in emulator mode.
  await withRetries(
    async () => {
      await auth.listUsers(1);
    },
    { label: 'Auth emulator readiness', attempts: 20, baseDelayMs: 250 }
  );
  console.log('  ✅ Auth emulator ready');

  // Firestore emulator readiness: simple read should succeed.
  await withRetries(
    async () => {
      await db.collection('_seedHealth').limit(1).get();
    },
    { label: 'Firestore emulator readiness', attempts: 20, baseDelayMs: 250 }
  );
  console.log('  ✅ Firestore emulator ready');
}

async function verifyAuthPasswordSignIn(email, password) {
  // Match what the browser SDK uses in the emulator: identitytoolkit signInWithPassword + apiKey.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key-for-emulator';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!authHost) throw new Error('FIREBASE_AUTH_EMULATOR_HOST is not set');

  const url = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Auth emulator signInWithPassword failed for ${email} (${res.status}). ${body.substring(0, 300)}`
    );
  }
}

// Test users configuration
const TEST_USERS = [
  // E2E test users (used by Cucumber tests)
  {
    uid: 'test-admin-uid',
    email: 'admin@test.com',
    password: 'admin123',
    displayName: 'Test Admin',
    firstName: 'Test',
    lastName: 'Admin',
    roles: ['admin'],
    status: 'active'
  },
  {
    uid: 'test-teacher-uid',
    email: 'teacher@test.com',
    password: 'teacher123',
    displayName: 'Test Teacher',
    firstName: 'Test',
    lastName: 'Teacher',
    roles: ['teacher'],
    status: 'active'
  },
  {
    uid: 'test-parent-uid',
    email: 'parent@test.com',
    password: 'parent123',
    displayName: 'Test Parent',
    firstName: 'Test',
    lastName: 'Parent',
    roles: ['parent'],
    status: 'active'
  },
  // Additional test users
  {
    uid: 'teacher-test-002',
    email: 'teacher2@test.com',
    password: 'teacher123',
    displayName: 'Sarah Johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    roles: ['teacher'],
    status: 'active'
  },
  {
    uid: 'parent-test-002',
    email: 'parent2@test.com',
    password: 'parent123',
    displayName: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    roles: ['parent'],
    status: 'active'
  }
];

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
    level: 'Beginner', // Legacy field
    day: 'Saturday',
    time: '10:00 AM - 12:00 PM',
    capacity: 15,
    enrolled: 2,
    teacherId: 'test-teacher-uid', // Legacy field
    teacherName: 'Test Teacher', // Legacy field
    teachers: [
      {
        userId: 'test-teacher-uid',
        name: 'Test Teacher',
        role: 'primary',
        assignedAt: new Date()
      }
    ],
    status: 'active',
    academicYear: '2024-2025'
  },
  {
    id: 'class-002',
    name: 'Grade 3 Section A - Saturday PM',
    gradeId: 'grade-3',
    gradeName: 'Grade 3',
    level: 'Intermediate', // Legacy field
    day: 'Saturday',
    time: '2:00 PM - 4:00 PM',
    capacity: 20,
    enrolled: 1,
    teacherId: 'teacher-test-002', // Legacy field
    teacherName: 'Sarah Johnson', // Legacy field
    teachers: [
      {
        userId: 'teacher-test-002',
        name: 'Sarah Johnson',
        role: 'primary',
        assignedAt: new Date()
      }
    ],
    status: 'active',
    academicYear: '2024-2025'
  },
  {
    id: 'class-003',
    name: 'Grade 8 Advanced - Sunday',
    gradeId: 'grade-8',
    gradeName: 'Grade 8',
    level: 'Advanced', // Legacy field
    day: 'Sunday',
    time: '10:00 AM - 12:00 PM',
    capacity: 15,
    enrolled: 0,
    status: 'active',
    academicYear: '2024-2025'
  },
  {
    id: 'class-004',
    name: 'KG Section B - Sunday PM',
    gradeId: 'kg',
    gradeName: 'Kindergarten',
    level: 'Beginner', // Legacy field
    day: 'Sunday',
    time: '2:00 PM - 4:00 PM',
    capacity: 18,
    enrolled: 0,
    status: 'active',
    academicYear: '2024-2025'
  }
];

// Sample students data (updated to match new schema and grade levels)
const SAMPLE_STUDENTS = [
  {
    id: 'student-001',
    firstName: 'Arun',
    lastName: 'Kumar',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    grade: 'Pre-School 1',
    gradeId: 'ps-1',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2020-03-15',
    priorTamilLevel: 'beginner',
    medicalNotes: '',
    photoConsent: true,
    classId: 'class-001',
    className: 'PS-1 Section A - Saturday AM',
    status: 'active',
    notes: 'Enthusiastic learner, loves Tamil stories'
  },
  {
    id: 'student-002',
    firstName: 'Priya',
    lastName: 'Sharma',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    grade: 'Grade 3',
    gradeId: 'grade-3',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2016-07-22',
    priorTamilLevel: 'intermediate',
    medicalNotes: '',
    photoConsent: true,
    classId: 'class-002',
    className: 'Grade 3 Section A - Saturday PM',
    status: 'active',
    notes: 'Advanced reader, participates actively'
  },
  {
    id: 'student-003',
    firstName: 'Vikram',
    lastName: 'Patel',
    parentId: 'parent-test-002',
    parentEmail: 'parent2@test.com',
    grade: 'Pre-School 1',
    gradeId: 'ps-1',
    schoolName: 'Washington Middle School',
    dateOfBirth: '2020-11-08',
    priorTamilLevel: 'none',
    medicalNotes: 'Mild peanut allergy',
    photoConsent: false,
    classId: 'class-001',
    className: 'PS-1 Section A - Saturday AM',
    status: 'active',
    notes: 'Good progress in writing'
  },
  {
    id: 'student-004',
    firstName: 'Meera',
    lastName: 'Krishnan',
    parentId: 'parent-test-002',
    parentEmail: 'parent2@test.com',
    grade: 'Kindergarten',
    gradeId: 'kg',
    schoolName: 'Jefferson Elementary',
    dateOfBirth: '2019-05-10',
    priorTamilLevel: 'none',
    medicalNotes: '',
    photoConsent: true,
    status: 'pending',
    notes: 'New registration - awaiting review'
  },
  {
    id: 'student-005',
    firstName: 'Raj',
    lastName: 'Sundar',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    grade: 'Grade 8',
    gradeId: 'grade-8',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2011-09-20',
    priorTamilLevel: 'advanced',
    medicalNotes: '',
    photoConsent: false,
    status: 'admitted',
    notes: 'Admitted - needs class assignment'
  },
  {
    id: 'student-006',
    firstName: 'Lakshmi',
    lastName: 'Iyer',
    parentId: 'test-parent-uid',
    parentEmail: 'parent@test.com',
    grade: 'Pre-School 2',
    gradeId: 'ps-2',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2019-02-14',
    priorTamilLevel: 'beginner',
    medicalNotes: '',
    photoConsent: true,
    status: 'pending',
    notes: 'Sibling of existing student'
  }
];

// Sample teacher invites
const SAMPLE_INVITES = [
  {
    token: 'test-invite-valid-123',
    email: 'newteacher@test.com',
    role: 'teacher',
    status: 'pending',
    createdBy: 'test-admin-uid',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  {
    token: 'test-invite-expired-456',
    email: 'expired@test.com',
    role: 'teacher',
    status: 'pending',
    createdBy: 'test-admin-uid',
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago (expired)
  },
  {
    token: 'test-invite-used-789',
    email: 'teacher2@test.com',
    role: 'teacher',
    status: 'accepted',
    createdBy: 'test-admin-uid',
    acceptedBy: 'teacher-test-002',
    acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Still valid
  }
];

/**
 * Seed authentication users
 */
async function seedAuthUsers() {
  console.log('\n📝 Seeding authentication users...');

  const failures = [];

  for (const userData of TEST_USERS) {
    try {
      const existing = await withRetries(
        async () => await auth.getUser(userData.uid),
        { label: `auth.getUser(${userData.uid})`, attempts: 5, baseDelayMs: 300 }
      ).catch((err) => {
        if (err && err.code === 'auth/user-not-found') return null;
        throw err;
      });

      if (existing) {
        console.log(`  ⏭️  User ${userData.email} already exists, updating...`);
        await withRetries(
          async () =>
            await auth.updateUser(userData.uid, {
              email: userData.email,
              displayName: userData.displayName,
              emailVerified: true,
              password: userData.password,
            }),
          { label: `auth.updateUser(${userData.uid})`, attempts: 5, baseDelayMs: 300 }
        );
      } else {
        await withRetries(
          async () =>
            await auth.createUser({
              uid: userData.uid,
              email: userData.email,
              password: userData.password,
              displayName: userData.displayName,
              emailVerified: true,
            }),
          { label: `auth.createUser(${userData.uid})`, attempts: 10, baseDelayMs: 300 }
        );
        console.log(`  ✅ Created user: ${userData.email}`);
      }

      await withRetries(
        async () => await auth.setCustomUserClaims(userData.uid, { roles: userData.roles }),
        { label: `auth.setCustomUserClaims(${userData.uid})`, attempts: 5, baseDelayMs: 300 }
      );
    } catch (error) {
      failures.push({ email: userData.email, message: error?.message || String(error) });
      console.error(`  ❌ Error with user ${userData.email}:`, error?.message || error);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to seed ${failures.length} auth users: ${failures.map((f) => `${f.email} (${f.message})`).join('; ')}`);
  }

  // Verify the main E2E credentials can actually sign in via the emulator REST API.
  const required = ['admin@test.com', 'teacher@test.com', 'parent@test.com'];
  for (const email of required) {
    const user = TEST_USERS.find((u) => u.email === email);
    if (!user) continue;
    await verifyAuthPasswordSignIn(user.email, user.password);
    console.log(`  ✅ Verified sign-in: ${user.email}`);
  }
}

/**
 * Seed Firestore user profiles
 */
async function seedUserProfiles() {
  console.log('\n📝 Seeding user profiles in Firestore...');
  
  for (const userData of TEST_USERS) {
    try {
      const userProfile = {
        uid: userData.uid,
        email: userData.email,
        name: userData.displayName,
        firstName: userData.firstName || userData.displayName?.split(' ')[0] || 'Test',
        lastName: userData.lastName || userData.displayName?.split(' ')[1] || 'User',
        roles: userData.roles,
        status: userData.status,
        emailVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(userData.uid).set(userProfile, { merge: true });
      console.log(`  ✅ Created profile: ${userData.email} (${userData.roles.join(', ')})`);
    } catch (error) {
      console.error(`  ❌ Error creating profile for ${userData.email}:`, error.message);
    }
  }
}

/**
 * Seed grade records
 */
async function seedGrades() {
  console.log('\n📝 Seeding grade records...');

  for (const grade of SAMPLE_GRADES) {
    try {
      const gradeData = {
        ...grade,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('grades').doc(grade.id).set(gradeData, { merge: true });
      console.log(`  ✅ Created grade: ${grade.displayName} (${grade.name})`);
    } catch (error) {
      console.error(`  ❌ Error creating grade ${grade.name}:`, error.message);
    }
  }
}

/**
 * Seed class records
 */
async function seedClasses() {
  console.log('\n📝 Seeding class records...');

  for (const cls of SAMPLE_CLASSES) {
    try {
      // Convert teacher dates to Firestore timestamps
      const classData = {
        ...cls,
        teachers: cls.teachers ? cls.teachers.map(t => ({
          ...t,
          assignedAt: admin.firestore.Timestamp.fromDate(t.assignedAt)
        })) : undefined,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('classes').doc(cls.id).set(classData, { merge: true });
      console.log(`  ✅ Created class: ${cls.name} (${cls.enrolled}/${cls.capacity} students)`);
    } catch (error) {
      console.error(`  ❌ Error creating class ${cls.name}:`, error.message);
    }
  }
}

/**
 * Seed student records
 */
async function seedStudents() {
  console.log('\n📝 Seeding student records...');

  for (const student of SAMPLE_STUDENTS) {
    try {
      const studentData = {
        ...student,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add admittedAt for non-pending students
      if (student.status === 'admitted' || student.status === 'active') {
        studentData.admittedAt = admin.firestore.FieldValue.serverTimestamp();
        studentData.admittedBy = 'test-admin-uid';
      }

      await db.collection('students').doc(student.id).set(studentData, { merge: true });
      const fullName = `${student.firstName} ${student.lastName}`;
      console.log(`  ✅ Created student: ${fullName} (${student.status})`);
    } catch (error) {
      const fullName = `${student.firstName} ${student.lastName}`;
      console.error(`  ❌ Error creating student ${fullName}:`, error.message);
    }
  }
}

/**
 * Seed teacher invites
 */
async function seedInvites() {
  console.log('\n📝 Seeding teacher invites...');
  
  for (const invite of SAMPLE_INVITES) {
    try {
      const inviteData = {
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdBy: invite.createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(invite.expiresAt)
      };

      // Add optional fields if present
      if (invite.acceptedBy) {
        inviteData.acceptedBy = invite.acceptedBy;
        inviteData.acceptedAt = admin.firestore.Timestamp.fromDate(invite.acceptedAt);
      }

      await db.collection('invites').doc(invite.token).set(inviteData, { merge: true });
      
      const statusEmoji = invite.status === 'pending' 
        ? (invite.expiresAt < new Date() ? '⏰ (expired)' : '📧 (pending)') 
        : '✓ (accepted)';
      console.log(`  ✅ Created invite: ${invite.email} ${statusEmoji}`);
    } catch (error) {
      console.error(`  ❌ Error creating invite for ${invite.email}:`, error.message);
    }
  }
}

// Sample hero content
const SAMPLE_HERO_CONTENT = [
  {
    id: 'hero-annual-day-2024',
    type: 'event',
    title: {
      en: 'Annual Day Celebration 2024',
      ta: 'ஆண்டு விழா கொண்டாட்டம் 2024'
    },
    subtitle: {
      en: 'Join us for our grand annual celebration',
      ta: 'எங்கள் பெரிய ஆண்டு விழாவில் எங்களுடன் சேருங்கள்'
    },
    description: {
      en: 'Experience cultural performances, traditional music, and delicious Tamil cuisine',
      ta: 'கலாச்சார நிகழ்ச்சிகள், பாரம்பரிய இசை மற்றும் சுவையான தமிழ் உணவுகளை அனுபவிக்கவும்'
    },
    imageUrl: 'https://picsum.photos/seed/annual-day/1200/600',
    ctaText: {
      en: 'Register Now',
      ta: 'இப்போது பதிவு செய்க'
    },
    ctaLink: 'https://example.com/register',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2025-01-15'),
    isActive: true,
    priority: 10
  },
  {
    id: 'hero-registration-open',
    type: 'event',
    title: {
      en: 'New Student Registration Open',
      ta: 'புதிய மாணவர் பதிவு திறந்துள்ளது'
    },
    subtitle: {
      en: 'Enroll your child for 2024-25 academic year',
      ta: '2024-25 கல்வியாண்டுக்கு உங்கள் குழந்தையை சேர்க்கவும்'
    },
    description: {
      en: 'Limited seats available. Early bird discount until December 31st',
      ta: 'குறைந்த இருக்கைகள் கிடைக்கின்றன. டிசம்பர் 31 வரை ஆரம்ப தள்ளுபடி'
    },
    imageUrl: 'https://picsum.photos/seed/registration/1200/600',
    ctaText: {
      en: 'Apply Now',
      ta: 'இப்போது விண்ணப்பிக்கவும்'
    },
    ctaLink: 'https://example.com/apply',
    startDate: new Date('2024-11-15'),
    endDate: new Date('2025-01-31'),
    isActive: false,
    priority: 8
  },
  {
    id: 'hero-inactive-past-event',
    type: 'event',
    title: {
      en: 'Past Cultural Event',
      ta: 'கடந்த கலாச்சார நிகழ்வு'
    },
    subtitle: {
      en: 'This event has concluded',
      ta: 'இந்த நிகழ்வு முடிந்துவிட்டது'
    },
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-10-15'),
    isActive: false,
    priority: 5
  }
];

/**
 * Seed hero content
 */
async function seedHeroContent() {
  console.log('\n📝 Seeding hero content...');
  
  for (const content of SAMPLE_HERO_CONTENT) {
    try {
      const contentData = {
        ...content,
        startDate: content.startDate ? admin.firestore.Timestamp.fromDate(content.startDate) : null,
        endDate: content.endDate ? admin.firestore.Timestamp.fromDate(content.endDate) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'admin-test-001'
      };

      await db.collection('heroContent').doc(content.id).set(contentData, { merge: true });
      
      const statusEmoji = content.isActive ? '✅ (active)' : '💤 (inactive)';
      console.log(`  ✅ Created hero content: ${content.title.en} ${statusEmoji}`);
    } catch (error) {
      console.error(`  ❌ Error creating hero content ${content.title.en}:`, error.message);
    }
  }
}

/**
 * Clear all data (optional - use with caution)
 */
async function clearAllData() {
  console.log('\n🗑️  Clearing existing data...');
  
  try {
    // Clear Firestore collections
    const collections = ['users', 'students', 'classes', 'grades', 'invites', 'heroContent'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`  ✅ Cleared collection: ${collectionName} (${snapshot.size} docs)`);
    }

    // Clear Auth users
    const listUsersResult = await auth.listUsers();
    for (const userRecord of listUsersResult.users) {
      await auth.deleteUser(userRecord.uid);
    }
    console.log(`  ✅ Cleared auth users (${listUsersResult.users.length} users)`);
  } catch (error) {
    console.error('  ❌ Error clearing data:', error.message);
  }
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Firebase Emulator Seed Script');
  console.log('================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

  // Check if --clear flag is passed
  const shouldClear = process.argv.includes('--clear');
  
  try {
    if (shouldClear) {
      await clearAllData();
      console.log('\n✨ Data cleared successfully!');
      console.log('Run without --clear flag to seed data.');
      process.exit(0);
    }

    await waitForEmulatorsReady();

    // Seed all data
    await seedAuthUsers();
    await seedUserProfiles();
    await seedGrades();
    await seedClasses();
    await seedStudents();
    await seedInvites();
    await seedHeroContent();

    console.log('\n✅ Seeding complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin:    admin@test.com    / admin123');
    console.log('  Teacher:  teacher@test.com  / teacher123');
    console.log('  Teacher2: teacher2@test.com / teacher123');
    console.log('  Parent:   parent@test.com   / parent123');
    console.log('  Parent2:  parent2@test.com  / parent123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nTest Invite Tokens:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Valid:   test-invite-valid-123');
    console.log('  Expired: test-invite-expired-456');
    console.log('  Used:    test-invite-used-789');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nSample Grades:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  11 grades: PS-1, PS-2, KG, Grade 1-8');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nSample Classes:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  class-001: PS-1 Section A - Saturday AM');
    console.log('  class-002: Grade 3 Section A - Saturday PM');
    console.log('  class-003: Grade 8 Advanced - Sunday');
    console.log('  class-004: KG Section B - Sunday PM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nSample Students:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  student-001: Arun Kumar (PS-1, active)');
    console.log('  student-002: Priya Sharma (Grade 3, active)');
    console.log('  student-003: Vikram Patel (PS-1, active)');
    console.log('  student-004: Meera Krishnan (KG, pending)');
    console.log('  student-005: Raj Sundar (Grade 8, admitted)');
    console.log('  student-006: Lakshmi Iyer (PS-2, pending)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAccess Emulator UI: http://localhost:4445\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, clearAllData };
