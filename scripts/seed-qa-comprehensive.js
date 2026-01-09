/**
 * Comprehensive QA Environment Seed Script
 *
 * Creates ~200 students with realistic distribution across:
 * - Multiple academic years (2024-2025, 2023-2024, 2022-2023)
 * - Various statuses (pending, admitted, active, inactive, withdrawn)
 * - All Tamil grades (ps-1 through grade-8)
 * - Multiple school districts
 * - Multiple parents and classes
 *
 * Usage: FIREBASE_PROJECT_ID=gsdta-qa node scripts/seed-qa-comprehensive.js
 */

const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gsdta-qa';

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

// ============================================
// REFERENCE DATA
// ============================================

const TAMIL_GRADES = [
  { id: 'ps-1', name: 'Pre-School 1' },
  { id: 'ps-2', name: 'Pre-School 2' },
  { id: 'kg', name: 'Kindergarten' },
  { id: 'grade-1', name: 'Grade 1' },
  { id: 'grade-2', name: 'Grade 2' },
  { id: 'grade-3', name: 'Grade 3' },
  { id: 'grade-4', name: 'Grade 4' },
  { id: 'grade-5', name: 'Grade 5' },
  { id: 'grade-6', name: 'Grade 6' },
  { id: 'grade-7', name: 'Grade 7' },
  { id: 'grade-8', name: 'Grade 8' },
];

const SCHOOL_DISTRICTS = [
  'Poway Unified School District',
  'San Diego Unified School District',
  'San Dieguito Union High School District',
  'Carlsbad Unified School District',
  'Solana Beach School District',
  'Temecula Valley Unified School District',
  'Del Mar Union School District',
  'Encinitas Union School District',
  'Rancho Santa Fe School District',
];

const SCHOOL_NAMES = [
  'Westwood Elementary',
  'Canyon View Elementary',
  'Del Sur Elementary',
  'Black Mountain Elementary',
  'Rolling Hills Elementary',
  'Adobe Bluffs Elementary',
  'Chaparral Elementary',
  'Creekside Elementary',
  'Highland Ranch Elementary',
  'Monterey Ridge Elementary',
  'Oak Valley Middle',
  'Painted Rock Elementary',
  'Stone Ranch Elementary',
  'Sundance Elementary',
  'Twin Peaks Middle',
  'Valley Elementary',
  'Westview High',
];

const TAMIL_LEVELS = ['none', 'beginner', 'intermediate', 'advanced'];

const FIRST_NAMES = [
  'Arun', 'Priya', 'Karthik', 'Lakshmi', 'Vijay', 'Meena', 'Ravi', 'Ananya',
  'Suresh', 'Divya', 'Ganesh', 'Kavitha', 'Mohan', 'Nithya', 'Prakash', 'Ramya',
  'Sanjay', 'Uma', 'Venkat', 'Yamini', 'Ashok', 'Bhavani', 'Chandran', 'Deepa',
  'Ezhil', 'Fathima', 'Gopal', 'Hema', 'Iniyan', 'Janani', 'Kumar', 'Latha',
  'Mani', 'Nalini', 'Omprakash', 'Padma', 'Rajan', 'Saranya', 'Thiru', 'Usha',
  'Velu', 'Yamuna', 'Arjun', 'Devi', 'Hari', 'Indira', 'Jayam', 'Kamala',
  'Logesh', 'Maya', 'Naveen', 'Oviya', 'Prabhu', 'Radha', 'Senthil', 'Tara',
];

const LAST_NAMES = [
  'Krishnan', 'Ramasamy', 'Subramaniam', 'Venkatesh', 'Natarajan', 'Balasubramanian',
  'Chandrasekaran', 'Duraipandi', 'Elango', 'Govindaraj', 'Iyengar', 'Jayaraman',
  'Kannan', 'Lakshmanan', 'Murugan', 'Nagarajan', 'Palani', 'Rajendran',
  'Shanmugam', 'Thirunavukkarasu', 'Umamaheswaran', 'Venkatesan', 'Yogeswaran',
  'Anand', 'Bharathi', 'Chidambaram', 'Devan', 'Ganesan', 'Hariharan',
];

const CITIES = ['San Diego', 'Poway', 'Rancho Bernardo', 'Carmel Valley', 'Del Mar', 'Encinitas', 'Carlsbad', 'Escondido'];
const ZIP_CODES = ['92127', '92128', '92129', '92130', '92064', '92131', '92009', '92024', '92025'];

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDOB(minAge, maxAge) {
  const now = new Date();
  const age = randomInt(minAge, maxAge);
  const dob = new Date(now.getFullYear() - age, randomInt(0, 11), randomInt(1, 28));
  return dob.toISOString().split('T')[0];
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function generateEmail(firstName, lastName, domain = 'testmail.gsdta.org') {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@${domain}`;
}

function generatePhone() {
  return `858${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

// ============================================
// DATA GENERATORS
// ============================================

function generateClasses() {
  const classes = [];
  const days = ['Saturday'];
  const times = ['9:00 AM - 11:00 AM', '11:30 AM - 1:30 PM'];

  for (const grade of TAMIL_GRADES) {
    for (let section = 0; section < 2; section++) {
      const day = days[0];
      const time = times[section];
      const classId = `class-${grade.id}-${section === 0 ? 'am' : 'pm'}`;

      classes.push({
        id: classId,
        name: `${grade.name} - ${day} ${section === 0 ? 'AM' : 'PM'}`,
        gradeId: grade.id,
        gradeName: grade.name,
        day,
        time,
        capacity: 25,
        enrolled: 0, // Will be updated
        teachers: [],
        status: 'active',
        academicYear: '2024-2025',
      });
    }
  }

  return classes;
}

function generateTeachers(count) {
  const teachers = [];

  for (let i = 1; i <= count; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);

    teachers.push({
      uid: `qa-teacher-${i}`,
      email: `teacher${i}@testmail.gsdta.org`,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone: generatePhone(),
      roles: ['teacher'],
      status: 'active',
    });
  }

  return teachers;
}

function generateParents(count) {
  const parents = [];

  for (let i = 1; i <= count; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);

    parents.push({
      uid: `qa-parent-${i}`,
      email: generateEmail(firstName, lastName),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone: generatePhone(),
      address: {
        street: `${randomInt(100, 9999)} ${randomChoice(['Main', 'Oak', 'Park', 'Hill', 'Valley', 'Creek'])} ${randomChoice(['St', 'Ave', 'Dr', 'Ln', 'Way'])}`,
        city: randomChoice(CITIES),
        state: 'CA',
        zip: randomChoice(ZIP_CODES),
      },
      roles: ['parent'],
      status: 'active',
    });
  }

  return parents;
}

function generateStudents(parents, classes, count) {
  const students = [];
  const classEnrollment = {};

  // Initialize enrollment counts
  classes.forEach(c => { classEnrollment[c.id] = 0; });

  // Distribution configuration by year
  const yearConfigs = [
    // Current year 2024-2025 - mostly active
    {
      year: '2024-2025',
      count: Math.floor(count * 0.5), // 50%
      statusWeights: { active: 60, admitted: 20, pending: 15, inactive: 3, withdrawn: 2 },
      daysAgoRange: [1, 180],
    },
    // Previous year 2023-2024 - mostly inactive/active
    {
      year: '2023-2024',
      count: Math.floor(count * 0.30), // 30%
      statusWeights: { active: 30, inactive: 40, withdrawn: 25, admitted: 3, pending: 2 },
      daysAgoRange: [365, 730],
    },
    // Two years ago 2022-2023 - mostly inactive/withdrawn
    {
      year: '2022-2023',
      count: Math.floor(count * 0.20), // 20%
      statusWeights: { inactive: 50, withdrawn: 40, active: 8, admitted: 1, pending: 1 },
      daysAgoRange: [730, 1095],
    },
  ];

  let studentIndex = 1;

  for (const config of yearConfigs) {
    for (let i = 0; i < config.count; i++) {
      const parent = randomChoice(parents);
      const grade = randomChoice(TAMIL_GRADES);
      const status = weightedChoice(config.statusWeights);

      // Determine class assignment based on status
      let classId = null;
      let className = null;

      if (status === 'active' || status === 'inactive') {
        // Find a class for this grade
        const eligibleClasses = classes.filter(c => c.gradeId === grade.id);
        if (eligibleClasses.length > 0) {
          const selectedClass = randomChoice(eligibleClasses);
          if (classEnrollment[selectedClass.id] < selectedClass.capacity) {
            classId = selectedClass.id;
            className = selectedClass.name;
            classEnrollment[selectedClass.id]++;
          }
        }
      }
      // Leave some active students unassigned (for unassigned filter testing)
      if (status === 'active' && Math.random() < 0.15) {
        classId = null;
        className = null;
      }

      // Generate dates
      const createdDaysAgo = randomInt(config.daysAgoRange[0], config.daysAgoRange[1]);
      const createdAt = daysAgo(createdDaysAgo);

      let admittedAt = null;
      if (['admitted', 'active', 'inactive', 'withdrawn'].includes(status)) {
        const admittedDaysAgo = Math.max(1, createdDaysAgo - randomInt(1, 14));
        admittedAt = daysAgo(admittedDaysAgo);
      }

      const firstName = randomChoice(FIRST_NAMES);
      const lastName = parent.lastName; // Same family name

      const student = {
        id: `qa-student-${studentIndex}`,
        firstName,
        lastName,
        parentId: parent.uid,
        parentEmail: parent.email,
        dateOfBirth: generateDOB(4, 16),
        gender: randomChoice(['Boy', 'Girl']),
        grade: grade.name,
        gradeId: grade.id,
        enrollingGrade: grade.id,
        classId,
        className,
        status,
        schoolName: randomChoice(SCHOOL_NAMES),
        schoolDistrict: randomChoice(SCHOOL_DISTRICTS),
        priorTamilLevel: randomChoice(TAMIL_LEVELS),
        photoConsent: Math.random() > 0.3,
        address: {
          street: parent.address?.street || '',
          city: parent.address?.city || '',
          zipCode: parent.address?.zip || '',
        },
        contacts: {
          mother: {
            name: `${randomChoice(FIRST_NAMES)} ${lastName}`,
            email: parent.email,
            phone: generatePhone(),
            employer: randomChoice(['Tech Company', 'Healthcare', 'Education', 'Finance', 'Self-employed', '']),
          },
          father: {
            name: `${randomChoice(FIRST_NAMES)} ${lastName}`,
            email: generateEmail(randomChoice(FIRST_NAMES), lastName),
            phone: generatePhone(),
            employer: randomChoice(['Tech Company', 'Healthcare', 'Education', 'Finance', 'Self-employed', '']),
          },
        },
        medicalNotes: Math.random() < 0.1 ? 'No known allergies' : '',
        academicYear: config.year,
        createdAtDate: createdAt,
        admittedAtDate: admittedAt,
      };

      students.push(student);
      studentIndex++;
    }
  }

  // Update class enrollment counts
  classes.forEach(c => {
    c.enrolled = classEnrollment[c.id];
  });

  return students;
}

function weightedChoice(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }

  return Object.keys(weights)[0];
}

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function seedTeachers(teachers) {
  console.log(`\n👨‍🏫 Seeding ${teachers.length} teachers...`);

  for (const teacher of teachers) {
    try {
      const data = {
        ...teacher,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('users').doc(teacher.uid).set(data, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating teacher ${teacher.email}:`, error.message);
    }
  }
  console.log(`  ✅ Created ${teachers.length} teachers`);
}

async function seedParents(parents) {
  console.log(`\n👨‍👩‍👧 Seeding ${parents.length} parents...`);

  for (const parent of parents) {
    try {
      const data = {
        ...parent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('users').doc(parent.uid).set(data, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating parent ${parent.email}:`, error.message);
    }
  }
  console.log(`  ✅ Created ${parents.length} parents`);
}

async function seedClasses(classes, teachers) {
  console.log(`\n🏫 Seeding ${classes.length} classes...`);

  let teacherIndex = 0;
  for (const cls of classes) {
    try {
      // Assign a teacher to each class
      const teacher = teachers[teacherIndex % teachers.length];
      teacherIndex++;

      const data = {
        ...cls,
        teachers: [{
          teacherId: teacher.uid,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          role: 'primary',
          assignedAt: admin.firestore.Timestamp.fromDate(new Date()),
        }],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('classes').doc(cls.id).set(data, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating class ${cls.name}:`, error.message);
    }
  }
  console.log(`  ✅ Created ${classes.length} classes`);
}

async function seedStudents(students) {
  console.log(`\n🎓 Seeding ${students.length} students...`);

  let created = 0;
  for (const student of students) {
    try {
      const { createdAtDate, admittedAtDate, ...rest } = student;

      const data = {
        ...rest,
        createdAt: createdAtDate
          ? admin.firestore.Timestamp.fromDate(createdAtDate)
          : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (admittedAtDate) {
        data.admittedAt = admin.firestore.Timestamp.fromDate(admittedAtDate);
        data.admittedBy = 'admin';
      }

      await db.collection('students').doc(student.id).set(data, { merge: true });
      created++;

      if (created % 50 === 0) {
        console.log(`  ... created ${created} students`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating student ${student.id}:`, error.message);
    }
  }
  console.log(`  ✅ Created ${created} students`);
}

async function seedCalendarEvents() {
  console.log('\n📅 Seeding calendar events...');

  const events = [
    {
      id: 'event-new-year-2025',
      title: { en: 'New Year Celebration 2025', ta: 'புத்தாண்டு கொண்டாட்டம் 2025' },
      description: { en: 'Join us for our annual New Year celebration.', ta: 'எங்கள் ஆண்டு புத்தாண்டு கொண்டாட்டத்தில் சேருங்கள்.' },
      eventType: 'celebration',
      startDate: new Date('2025-01-04T10:00:00'),
      endDate: new Date('2025-01-04T14:00:00'),
      location: 'GSDTA Main Hall',
      isAllDay: false,
      isPublic: true,
      status: 'active',
    },
    {
      id: 'event-pongal-2025',
      title: { en: 'Pongal Festival 2025', ta: 'பொங்கல் திருநாள் 2025' },
      description: { en: 'Celebrate the harvest festival.', ta: 'அறுவடை திருவிழாவைக் கொண்டாடுங்கள்.' },
      eventType: 'holiday',
      startDate: new Date('2025-01-14T09:00:00'),
      endDate: new Date('2025-01-14T15:00:00'),
      location: 'GSDTA Campus',
      isAllDay: false,
      isPublic: true,
      status: 'active',
    },
    {
      id: 'event-spring-break-2025',
      title: { en: 'Spring Break - No Classes', ta: 'வசந்த விடுமுறை' },
      eventType: 'holiday',
      startDate: new Date('2025-03-24'),
      endDate: new Date('2025-03-28'),
      isAllDay: true,
      isPublic: true,
      status: 'active',
    },
    {
      id: 'event-summer-break-2025',
      title: { en: 'Summer Break', ta: 'கோடை விடுமுறை' },
      eventType: 'holiday',
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-08-15'),
      isAllDay: true,
      isPublic: true,
      status: 'active',
    },
    {
      id: 'event-annual-day-2025',
      title: { en: 'Annual Day Celebration', ta: 'ஆண்டு விழா' },
      eventType: 'celebration',
      startDate: new Date('2025-05-10T10:00:00'),
      endDate: new Date('2025-05-10T16:00:00'),
      location: 'Community Center',
      isAllDay: false,
      isPublic: true,
      status: 'active',
    },
  ];

  for (const event of events) {
    try {
      const data = {
        ...event,
        startDate: admin.firestore.Timestamp.fromDate(event.startDate),
        endDate: event.endDate ? admin.firestore.Timestamp.fromDate(event.endDate) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('calendar').doc(event.id).set(data, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating event:`, error.message);
    }
  }
  console.log(`  ✅ Created ${events.length} calendar events`);
}

async function seedAttendance(students, classes) {
  console.log('\n📋 Seeding attendance records...');

  const activeStudents = students.filter(s => s.status === 'active' && s.classId);
  const statuses = ['present', 'present', 'present', 'present', 'late', 'absent'];

  // Generate attendance for last 8 Saturdays
  const saturdays = [];
  let d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); // Last Saturday

  for (let i = 0; i < 8; i++) {
    saturdays.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 7);
  }

  let count = 0;
  for (const student of activeStudents.slice(0, 50)) { // Limit to 50 for manageable records
    for (const date of saturdays) {
      const status = randomChoice(statuses);
      const record = {
        id: `att-${date}-${student.id}`,
        classId: student.classId,
        className: student.className,
        date,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        status,
        notes: status === 'late' ? 'Arrived late' : '',
        recordedBy: 'qa-teacher-1',
        recordedByName: 'QA Teacher',
        docStatus: 'active',
      };

      try {
        await db.collection('attendance').doc(record.id).set({
          ...record,
          recordedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        count++;
      } catch (error) {
        // Continue on error
      }
    }
  }
  console.log(`  ✅ Created ${count} attendance records`);
}

async function seedAssignments(classes) {
  console.log('\n📝 Seeding assignments...');

  const assignmentTypes = ['homework', 'quiz', 'project', 'test'];
  const categories = ['reading', 'writing', 'speaking', 'comprehension'];

  let count = 0;
  for (const cls of classes.slice(0, 10)) { // First 10 classes
    for (let i = 0; i < 4; i++) {
      const assignment = {
        id: `assign-${cls.id}-${i + 1}`,
        classId: cls.id,
        className: cls.name,
        title: `${cls.gradeName} - ${assignmentTypes[i]} ${i + 1}`,
        description: `Practice assignment for ${cls.gradeName}`,
        type: assignmentTypes[i],
        category: categories[i],
        dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
        maxScore: assignmentTypes[i] === 'test' ? 100 : 50,
        weight: assignmentTypes[i] === 'test' ? 3 : 1,
        status: 'published',
        createdBy: 'qa-teacher-1',
        createdByName: 'QA Teacher',
      };

      try {
        await db.collection('assignments').doc(assignment.id).set({
          ...assignment,
          dueDate: admin.firestore.Timestamp.fromDate(assignment.dueDate),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        count++;
      } catch (error) {
        // Continue on error
      }
    }
  }
  console.log(`  ✅ Created ${count} assignments`);
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
  console.log('🌱 Comprehensive QA Environment Seed Script');
  console.log('============================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const STUDENT_COUNT = 200;
  const PARENT_COUNT = 80;
  const TEACHER_COUNT = 15;

  try {
    // Generate data
    console.log('\n📊 Generating data...');
    const teachers = generateTeachers(TEACHER_COUNT);
    const parents = generateParents(PARENT_COUNT);
    const classes = generateClasses();
    const students = generateStudents(parents, classes, STUDENT_COUNT);

    // Seed all data
    await seedTeachers(teachers);
    await seedParents(parents);
    await seedClasses(classes, teachers);
    await seedStudents(students);
    await seedCalendarEvents();
    await seedAttendance(students, classes);
    await seedAssignments(classes);

    // Calculate statistics
    const statusCounts = {};
    const yearCounts = {};
    let unassigned = 0;

    students.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      yearCounts[s.academicYear] = (yearCounts[s.academicYear] || 0) + 1;
      if (!s.classId) unassigned++;
    });

    console.log('\n✅ Seeding complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('QA Test Data Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Teachers: ${teachers.length}`);
    console.log(`  Parents: ${parents.length}`);
    console.log(`  Classes: ${classes.length} (across ${TAMIL_GRADES.length} grades)`);
    console.log(`  Students: ${students.length}`);
    console.log('');
    console.log('  Students by Status:');
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });
    console.log('');
    console.log('  Students by Academic Year:');
    Object.entries(yearCounts).sort().forEach(([year, count]) => {
      console.log(`    ${year}: ${count}`);
    });
    console.log('');
    console.log(`  Unassigned Students: ${unassigned}`);
    console.log('');
    console.log('  School Districts: 9 different districts');
    console.log('  Tamil Grades: ps-1 through grade-8');
    console.log('  Calendar Events: 5 events');
    console.log('  Attendance Records: ~400 records (8 weeks × 50 students)');
    console.log('  Assignments: ~40 assignments');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nNote: Users need Firebase Auth accounts to login.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
