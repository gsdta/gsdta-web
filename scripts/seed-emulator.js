/**
 * Seed Firebase Emulators with Test Data
 * 
 * Usage: node scripts/seed-emulator.js
 * 
 * Prerequisites:
 * - Firebase emulators must be running
 * - Environment variables must be set for emulators
 */

const admin = require('firebase-admin');

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

const PROJECT_ID = 'demo-gsdta';

// Initialize Firebase Admin
admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

// Test users configuration
const TEST_USERS = [
  {
    uid: 'admin-test-001',
    email: 'admin@test.com',
    password: 'admin123',
    displayName: 'Test Admin',
    roles: ['admin'],
    status: 'active'
  },
  {
    uid: 'teacher-test-001',
    email: 'teacher@test.com',
    password: 'teacher123',
    displayName: 'Test Teacher',
    roles: ['teacher'],
    status: 'active'
  },
  {
    uid: 'teacher-test-002',
    email: 'teacher2@test.com',
    password: 'teacher123',
    displayName: 'Sarah Johnson',
    roles: ['teacher'],
    status: 'active'
  },
  {
    uid: 'parent-test-001',
    email: 'parent@test.com',
    password: 'parent123',
    displayName: 'Test Parent',
    roles: ['parent'],
    status: 'active'
  },
  {
    uid: 'parent-test-002',
    email: 'parent2@test.com',
    password: 'parent123',
    displayName: 'John Smith',
    roles: ['parent'],
    status: 'active'
  }
];

// Sample students data
const SAMPLE_STUDENTS = [
  {
    id: 'student-001',
    name: 'Arun Kumar',
    parentId: 'parent-test-001',
    grade: '5th Grade',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2015-03-15',
    enrollmentDate: '2024-09-01',
    status: 'active',
    notes: 'Enthusiastic learner, loves Tamil poetry'
  },
  {
    id: 'student-002',
    name: 'Priya Sharma',
    parentId: 'parent-test-001',
    grade: '7th Grade',
    schoolName: 'Lincoln Elementary',
    dateOfBirth: '2013-07-22',
    enrollmentDate: '2024-09-01',
    status: 'active',
    notes: 'Advanced reader, participates actively'
  },
  {
    id: 'student-003',
    name: 'Vikram Patel',
    parentId: 'parent-test-002',
    grade: '6th Grade',
    schoolName: 'Washington Middle School',
    dateOfBirth: '2014-11-08',
    enrollmentDate: '2024-09-01',
    status: 'active',
    notes: 'Good progress in writing'
  }
];

// Sample teacher invites
const SAMPLE_INVITES = [
  {
    token: 'test-invite-valid-123',
    email: 'newteacher@test.com',
    role: 'teacher',
    status: 'pending',
    createdBy: 'admin-test-001',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  {
    token: 'test-invite-expired-456',
    email: 'expired@test.com',
    role: 'teacher',
    status: 'pending',
    createdBy: 'admin-test-001',
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago (expired)
  },
  {
    token: 'test-invite-used-789',
    email: 'teacher2@test.com',
    role: 'teacher',
    status: 'accepted',
    createdBy: 'admin-test-001',
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
  
  for (const userData of TEST_USERS) {
    try {
      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUser(userData.uid);
        console.log(`  ⏭️  User ${userData.email} already exists, updating...`);
        
        // Update existing user
        await auth.updateUser(userData.uid, {
          email: userData.email,
          displayName: userData.displayName,
          emailVerified: true,
          password: userData.password
        });
      } catch (error) {
        // User doesn't exist, create new
        userRecord = await auth.createUser({
          uid: userData.uid,
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true
        });
        console.log(`  ✅ Created user: ${userData.email}`);
      }

      // Set custom claims for roles
      await auth.setCustomUserClaims(userData.uid, { 
        roles: userData.roles 
      });
      
    } catch (error) {
      console.error(`  ❌ Error with user ${userData.email}:`, error.message);
    }
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
        email: userData.email,
        name: userData.displayName,
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

      await db.collection('students').doc(student.id).set(studentData, { merge: true });
      console.log(`  ✅ Created student: ${student.name} (Parent: ${student.parentId})`);
    } catch (error) {
      console.error(`  ❌ Error creating student ${student.name}:`, error.message);
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
    const collections = ['users', 'students', 'invites', 'heroContent'];
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

    // Seed all data
    await seedAuthUsers();
    await seedUserProfiles();
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
