/**
 * Seed QA Environment with Test Data for New Features
 *
 * Usage: FIREBASE_PROJECT_ID=gsdta-qa node scripts/seed-qa-new-features.js
 *
 * This script adds test data for:
 * - Calendar events
 * - Messaging conversations
 * - Teacher assignments & gradebook
 * - Report cards
 * - Attendance records
 *
 * Prerequisites:
 * - gcloud auth application-default login
 */

const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gsdta-qa';

// Initialize Firebase Admin with default credentials
admin.initializeApp({
  projectId: PROJECT_ID,
});

const db = admin.firestore();

// ============================================
// SAMPLE CALENDAR EVENTS
// ============================================
const SAMPLE_CALENDAR_EVENTS = [
  {
    id: 'event-new-year-2025',
    title: {
      en: 'New Year Celebration 2025',
      ta: 'புத்தாண்டு கொண்டாட்டம் 2025'
    },
    description: {
      en: 'Join us for our annual New Year celebration with cultural performances and traditional food.',
      ta: 'கலாச்சார நிகழ்ச்சிகள் மற்றும் பாரம்பரிய உணவுகளுடன் எங்கள் ஆண்டு புத்தாண்டு கொண்டாட்டத்தில் எங்களுடன் சேருங்கள்.'
    },
    eventType: 'celebration',
    startDate: new Date('2025-01-04T10:00:00'),
    endDate: new Date('2025-01-04T14:00:00'),
    location: 'GSDTA Main Hall',
    isAllDay: false,
    isPublic: true,
    recurrence: 'none',
    status: 'active',
    createdBy: 'admin'
  },
  {
    id: 'event-pongal-2025',
    title: {
      en: 'Pongal Festival 2025',
      ta: 'பொங்கல் திருநாள் 2025'
    },
    description: {
      en: 'Celebrate the harvest festival with traditional Pongal cooking, kolam competition, and cultural programs.',
      ta: 'பாரம்பரிய பொங்கல் சமையல், கோலம் போட்டி மற்றும் கலாச்சார நிகழ்ச்சிகளுடன் அறுவடை திருவிழாவைக் கொண்டாடுங்கள்.'
    },
    eventType: 'holiday',
    startDate: new Date('2025-01-14T09:00:00'),
    endDate: new Date('2025-01-14T15:00:00'),
    location: 'GSDTA Campus',
    isAllDay: false,
    isPublic: true,
    recurrence: 'none',
    status: 'active',
    createdBy: 'admin'
  },
  {
    id: 'event-parent-meeting-jan',
    title: {
      en: 'Parent-Teacher Meeting',
      ta: 'பெற்றோர்-ஆசிரியர் கூட்டம்'
    },
    description: {
      en: 'Quarterly parent-teacher meeting to discuss student progress.',
      ta: 'மாணவர் முன்னேற்றத்தை விவாதிக்க காலாண்டு பெற்றோர்-ஆசிரியர் கூட்டம்.'
    },
    eventType: 'meeting',
    startDate: new Date('2025-01-18T14:00:00'),
    endDate: new Date('2025-01-18T17:00:00'),
    location: 'Classrooms',
    isAllDay: false,
    isPublic: false,
    recurrence: 'none',
    status: 'active',
    createdBy: 'admin'
  },
  {
    id: 'event-weekly-class',
    title: {
      en: 'Regular Tamil Class - Saturday',
      ta: 'வழக்கமான தமிழ் வகுப்பு - சனிக்கிழமை'
    },
    description: {
      en: 'Regular weekly Tamil language class for all grades.',
      ta: 'அனைத்து வகுப்புகளுக்கும் வழக்கமான வாராந்திர தமிழ் மொழி வகுப்பு.'
    },
    eventType: 'academic',
    startDate: new Date('2025-01-04T10:00:00'),
    endDate: new Date('2025-06-28T14:00:00'),
    location: 'GSDTA Campus',
    isAllDay: false,
    isPublic: true,
    recurrence: 'weekly',
    recurrenceEndDate: new Date('2025-06-28'),
    status: 'active',
    createdBy: 'admin'
  },
  {
    id: 'event-spring-break',
    title: {
      en: 'Spring Break - No Classes',
      ta: 'வசந்த விடுமுறை - வகுப்புகள் இல்லை'
    },
    description: {
      en: 'School closed for spring break.',
      ta: 'வசந்த விடுமுறைக்கு பள்ளி மூடப்பட்டுள்ளது.'
    },
    eventType: 'holiday',
    startDate: new Date('2025-03-24'),
    endDate: new Date('2025-03-28'),
    isAllDay: true,
    isPublic: true,
    recurrence: 'none',
    status: 'active',
    createdBy: 'admin'
  }
];

// ============================================
// SAMPLE ATTENDANCE RECORDS
// ============================================
const SAMPLE_ATTENDANCE = [];

// Generate attendance for the past 4 Saturdays
const saturdays = [
  '2025-01-04',
  '2024-12-28',
  '2024-12-21',
  '2024-12-14'
];

const attendanceStatuses = ['present', 'present', 'present', 'present', 'late', 'absent'];

// We'll add attendance for first 10 students in a class
for (const date of saturdays) {
  for (let i = 1; i <= 10; i++) {
    const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
    SAMPLE_ATTENDANCE.push({
      id: `att-${date}-student-${i}`,
      classId: 'class-grade-3-sat',
      className: 'Grade 3 - Saturday AM',
      date: date,
      studentId: `uat-student-${i}`,
      studentName: `UAT Student ${i}`,
      status: status,
      notes: status === 'late' ? 'Arrived 10 minutes late' : '',
      recordedBy: 'uat-teacher-1',
      recordedByName: 'UAT Teacher',
      docStatus: 'active'
    });
  }
}

// ============================================
// SAMPLE ASSIGNMENTS
// ============================================
const SAMPLE_ASSIGNMENTS = [
  {
    id: 'assign-homework-week1',
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    title: 'Week 1 Homework - Tamil Alphabets',
    description: 'Practice writing Tamil alphabets உயிர் எழுத்துக்கள் (vowels) - complete worksheet pages 1-3',
    type: 'homework',
    category: 'writing',
    dueDate: new Date('2025-01-11'),
    maxScore: 100,
    weight: 1,
    status: 'published',
    createdBy: 'uat-teacher-1',
    createdByName: 'UAT Teacher'
  },
  {
    id: 'assign-quiz-week1',
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    title: 'Week 1 Quiz - Vowels Recognition',
    description: 'Quick quiz on identifying and pronouncing Tamil vowels',
    type: 'quiz',
    category: 'reading',
    dueDate: new Date('2025-01-04'),
    maxScore: 20,
    weight: 0.5,
    status: 'published',
    createdBy: 'uat-teacher-1',
    createdByName: 'UAT Teacher'
  },
  {
    id: 'assign-project-jan',
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    title: 'January Project - Tamil Story Reading',
    description: 'Read a Tamil short story and present a summary to the class',
    type: 'project',
    category: 'comprehension',
    dueDate: new Date('2025-01-25'),
    maxScore: 50,
    weight: 2,
    status: 'published',
    createdBy: 'uat-teacher-1',
    createdByName: 'UAT Teacher'
  },
  {
    id: 'assign-test-midterm',
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    title: 'Midterm Test - Tamil Language',
    description: 'Comprehensive test covering reading, writing, and comprehension',
    type: 'test',
    category: 'comprehensive',
    dueDate: new Date('2025-02-15'),
    maxScore: 100,
    weight: 3,
    status: 'draft',
    createdBy: 'uat-teacher-1',
    createdByName: 'UAT Teacher'
  }
];

// ============================================
// SAMPLE STUDENT GRADES
// ============================================
const SAMPLE_GRADES_DATA = [];

// Generate grades for first 5 students on published assignments
for (let i = 1; i <= 5; i++) {
  // Homework grade
  SAMPLE_GRADES_DATA.push({
    id: `grade-hw1-student-${i}`,
    assignmentId: 'assign-homework-week1',
    classId: 'class-grade-3-sat',
    studentId: `uat-student-${i}`,
    studentName: `UAT Student ${i}`,
    score: 85 + Math.floor(Math.random() * 15),
    maxScore: 100,
    feedback: 'Good effort! Keep practicing your handwriting.',
    gradedBy: 'uat-teacher-1',
    gradedByName: 'UAT Teacher',
    status: 'graded'
  });

  // Quiz grade
  SAMPLE_GRADES_DATA.push({
    id: `grade-quiz1-student-${i}`,
    assignmentId: 'assign-quiz-week1',
    classId: 'class-grade-3-sat',
    studentId: `uat-student-${i}`,
    studentName: `UAT Student ${i}`,
    score: 16 + Math.floor(Math.random() * 5),
    maxScore: 20,
    feedback: 'Excellent pronunciation!',
    gradedBy: 'uat-teacher-1',
    gradedByName: 'UAT Teacher',
    status: 'graded'
  });
}

// ============================================
// SAMPLE REPORT CARDS
// ============================================
const SAMPLE_REPORT_CARDS = [];

for (let i = 1; i <= 3; i++) {
  SAMPLE_REPORT_CARDS.push({
    id: `report-2024-fall-student-${i}`,
    studentId: `uat-student-${i}`,
    studentName: `UAT Student ${i}`,
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    term: 'Fall 2024',
    academicYear: '2024-2025',
    grades: {
      reading: { score: 88 + i, grade: 'A', comment: 'Excellent reading skills' },
      writing: { score: 85 + i, grade: 'B+', comment: 'Good progress in writing' },
      speaking: { score: 90 + i, grade: 'A', comment: 'Very articulate' },
      comprehension: { score: 87 + i, grade: 'A-', comment: 'Understands concepts well' }
    },
    attendance: {
      present: 12,
      absent: 1,
      late: 1,
      total: 14,
      percentage: 86
    },
    overallGrade: 'A-',
    overallScore: 87 + i,
    teacherComments: 'Excellent student! Shows great enthusiasm for learning Tamil. Keep up the good work!',
    status: 'published',
    publishedAt: new Date('2024-12-20'),
    generatedBy: 'uat-teacher-1',
    generatedByName: 'UAT Teacher'
  });
}

// ============================================
// SAMPLE MESSAGING CONVERSATIONS
// ============================================
const SAMPLE_CONVERSATIONS = [
  {
    id: 'conv-parent1-teacher1',
    participants: ['uat-parent-1', 'uat-teacher-1'],
    participantDetails: {
      'uat-parent-1': { name: 'UAT Parent 1', role: 'parent' },
      'uat-teacher-1': { name: 'UAT Teacher', role: 'teacher' }
    },
    parentId: 'uat-parent-1',
    parentName: 'UAT Parent 1',
    teacherId: 'uat-teacher-1',
    teacherName: 'UAT Teacher',
    studentId: 'uat-student-1',
    studentName: 'UAT Student 1',
    subject: 'About homework',
    lastMessage: 'Thank you for the update!',
    lastMessageAt: new Date('2025-01-03T10:30:00'),
    unreadCount: {
      'uat-parent-1': 0,
      'uat-teacher-1': 1
    },
    status: 'active'
  },
  {
    id: 'conv-parent2-teacher1',
    participants: ['uat-parent-2', 'uat-teacher-1'],
    participantDetails: {
      'uat-parent-2': { name: 'UAT Parent 2', role: 'parent' },
      'uat-teacher-1': { name: 'UAT Teacher', role: 'teacher' }
    },
    parentId: 'uat-parent-2',
    parentName: 'UAT Parent 2',
    teacherId: 'uat-teacher-1',
    teacherName: 'UAT Teacher',
    studentId: 'uat-student-2',
    studentName: 'UAT Student 2',
    subject: 'Absence notification',
    lastMessage: 'My child will be absent next Saturday due to a family event.',
    lastMessageAt: new Date('2025-01-02T14:15:00'),
    unreadCount: {
      'uat-parent-2': 0,
      'uat-teacher-1': 0
    },
    status: 'active'
  }
];

const SAMPLE_MESSAGES = [
  // Conversation 1 messages
  {
    id: 'msg-1-1',
    conversationId: 'conv-parent1-teacher1',
    senderId: 'uat-parent-1',
    senderName: 'UAT Parent 1',
    senderRole: 'parent',
    content: 'Hello teacher, I wanted to ask about the homework assignment for this week.',
    readBy: ['uat-parent-1', 'uat-teacher-1'],
    createdAt: new Date('2025-01-02T09:00:00')
  },
  {
    id: 'msg-1-2',
    conversationId: 'conv-parent1-teacher1',
    senderId: 'uat-teacher-1',
    senderName: 'UAT Teacher',
    senderRole: 'teacher',
    content: 'Hello! The homework for this week is to practice Tamil vowels on pages 1-3 of the workbook. Please make sure your child completes it by next Saturday.',
    readBy: ['uat-parent-1', 'uat-teacher-1'],
    createdAt: new Date('2025-01-02T10:30:00')
  },
  {
    id: 'msg-1-3',
    conversationId: 'conv-parent1-teacher1',
    senderId: 'uat-parent-1',
    senderName: 'UAT Parent 1',
    senderRole: 'parent',
    content: 'Thank you for the update!',
    readBy: ['uat-parent-1'],
    createdAt: new Date('2025-01-03T10:30:00')
  },
  // Conversation 2 messages
  {
    id: 'msg-2-1',
    conversationId: 'conv-parent2-teacher1',
    senderId: 'uat-parent-2',
    senderName: 'UAT Parent 2',
    senderRole: 'parent',
    content: 'Good afternoon teacher, I wanted to inform you that my child will be absent next Saturday due to a family event.',
    readBy: ['uat-parent-2', 'uat-teacher-1'],
    createdAt: new Date('2025-01-02T14:00:00')
  },
  {
    id: 'msg-2-2',
    conversationId: 'conv-parent2-teacher1',
    senderId: 'uat-teacher-1',
    senderName: 'UAT Teacher',
    senderRole: 'teacher',
    content: 'Thank you for letting me know. I will mark the absence as excused. Please make sure to catch up on the lessons when your child returns.',
    readBy: ['uat-parent-2', 'uat-teacher-1'],
    createdAt: new Date('2025-01-02T14:15:00')
  }
];

// ============================================
// SAMPLE UAT USERS (to be added if they don't exist)
// ============================================
const UAT_USERS = [
  {
    uid: 'uat-teacher-1',
    email: 'teacher-uat@gsdta.org',
    firstName: 'UAT',
    lastName: 'Teacher',
    name: 'UAT Teacher',
    roles: ['teacher'],
    status: 'active'
  },
  {
    uid: 'uat-parent-1',
    email: 'parent1-uat@gsdta.org',
    firstName: 'UAT',
    lastName: 'Parent 1',
    name: 'UAT Parent 1',
    phone: '5551234567',
    address: {
      street: '123 UAT Street',
      city: 'San Diego',
      state: 'CA',
      zip: '92101'
    },
    roles: ['parent'],
    status: 'active'
  },
  {
    uid: 'uat-parent-2',
    email: 'parent2-uat@gsdta.org',
    firstName: 'UAT',
    lastName: 'Parent 2',
    name: 'UAT Parent 2',
    phone: '5559876543',
    address: {
      street: '456 UAT Avenue',
      city: 'San Diego',
      state: 'CA',
      zip: '92102'
    },
    roles: ['parent'],
    status: 'active'
  }
];

// Sample students for UAT
const UAT_STUDENTS = [];
for (let i = 1; i <= 10; i++) {
  UAT_STUDENTS.push({
    id: `uat-student-${i}`,
    firstName: 'UAT',
    lastName: `Student ${i}`,
    parentId: i <= 5 ? 'uat-parent-1' : 'uat-parent-2',
    parentEmail: i <= 5 ? 'parent1-uat@gsdta.org' : 'parent2-uat@gsdta.org',
    grade: 'Grade 3',
    gradeId: 'grade-3',
    classId: 'class-grade-3-sat',
    className: 'Grade 3 - Saturday AM',
    status: 'active',
    schoolName: 'Lincoln Elementary'
  });
}

// Sample class for UAT
const UAT_CLASS = {
  id: 'class-grade-3-sat',
  name: 'Grade 3 - Saturday AM',
  gradeId: 'grade-3',
  gradeName: 'Grade 3',
  day: 'Saturday',
  time: '10:00 AM - 12:00 PM',
  capacity: 20,
  enrolled: 10,
  teachers: [
    {
      teacherId: 'uat-teacher-1',
      teacherName: 'UAT Teacher',
      teacherEmail: 'teacher-uat@gsdta.org',
      role: 'primary',
      assignedAt: new Date()
    }
  ],
  status: 'active',
  academicYear: '2024-2025'
};

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function seedCalendarEvents() {
  console.log('\n📅 Seeding calendar events...');

  for (const event of SAMPLE_CALENDAR_EVENTS) {
    try {
      const eventData = {
        ...event,
        startDate: admin.firestore.Timestamp.fromDate(event.startDate),
        endDate: event.endDate ? admin.firestore.Timestamp.fromDate(event.endDate) : null,
        recurrenceEndDate: event.recurrenceEndDate ? admin.firestore.Timestamp.fromDate(event.recurrenceEndDate) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('calendar').doc(event.id).set(eventData, { merge: true });
      console.log(`  ✅ Created event: ${event.title.en}`);
    } catch (error) {
      console.error(`  ❌ Error creating event ${event.title.en}:`, error.message);
    }
  }
}

async function seedUATUsers() {
  console.log('\n👥 Seeding UAT users...');

  for (const user of UAT_USERS) {
    try {
      const userData = {
        ...user,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(user.uid).set(userData, { merge: true });
      console.log(`  ✅ Created user: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`  ❌ Error creating user ${user.email}:`, error.message);
    }
  }
}

async function seedUATClass() {
  console.log('\n🏫 Seeding UAT class...');

  try {
    const classData = {
      ...UAT_CLASS,
      teachers: UAT_CLASS.teachers.map(t => ({
        ...t,
        assignedAt: admin.firestore.Timestamp.fromDate(t.assignedAt)
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('classes').doc(UAT_CLASS.id).set(classData, { merge: true });
    console.log(`  ✅ Created class: ${UAT_CLASS.name}`);
  } catch (error) {
    console.error(`  ❌ Error creating class:`, error.message);
  }
}

async function seedUATStudents() {
  console.log('\n🎓 Seeding UAT students...');

  for (const student of UAT_STUDENTS) {
    try {
      const studentData = {
        ...student,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('students').doc(student.id).set(studentData, { merge: true });
      console.log(`  ✅ Created student: ${student.firstName} ${student.lastName}`);
    } catch (error) {
      console.error(`  ❌ Error creating student:`, error.message);
    }
  }
}

async function seedAttendance() {
  console.log('\n📋 Seeding attendance records...');

  for (const record of SAMPLE_ATTENDANCE) {
    try {
      const attendanceData = {
        ...record,
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('attendance').doc(record.id).set(attendanceData, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating attendance:`, error.message);
    }
  }
  console.log(`  ✅ Created ${SAMPLE_ATTENDANCE.length} attendance records`);
}

async function seedAssignments() {
  console.log('\n📝 Seeding assignments...');

  for (const assignment of SAMPLE_ASSIGNMENTS) {
    try {
      const assignmentData = {
        ...assignment,
        dueDate: admin.firestore.Timestamp.fromDate(assignment.dueDate),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('assignments').doc(assignment.id).set(assignmentData, { merge: true });
      console.log(`  ✅ Created assignment: ${assignment.title}`);
    } catch (error) {
      console.error(`  ❌ Error creating assignment:`, error.message);
    }
  }
}

async function seedStudentGrades() {
  console.log('\n🎯 Seeding student grades...');

  for (const grade of SAMPLE_GRADES_DATA) {
    try {
      const gradeData = {
        ...grade,
        gradedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('studentGrades').doc(grade.id).set(gradeData, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating grade:`, error.message);
    }
  }
  console.log(`  ✅ Created ${SAMPLE_GRADES_DATA.length} student grades`);
}

async function seedReportCards() {
  console.log('\n📄 Seeding report cards...');

  for (const reportCard of SAMPLE_REPORT_CARDS) {
    try {
      const reportCardData = {
        ...reportCard,
        publishedAt: reportCard.publishedAt ? admin.firestore.Timestamp.fromDate(reportCard.publishedAt) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('reportCards').doc(reportCard.id).set(reportCardData, { merge: true });
      console.log(`  ✅ Created report card: ${reportCard.studentName} - ${reportCard.term}`);
    } catch (error) {
      console.error(`  ❌ Error creating report card:`, error.message);
    }
  }
}

async function seedConversations() {
  console.log('\n💬 Seeding messaging conversations...');

  for (const conv of SAMPLE_CONVERSATIONS) {
    try {
      const convData = {
        ...conv,
        lastMessageAt: admin.firestore.Timestamp.fromDate(conv.lastMessageAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('conversations').doc(conv.id).set(convData, { merge: true });
      console.log(`  ✅ Created conversation: ${conv.parentName} <-> ${conv.teacherName}`);
    } catch (error) {
      console.error(`  ❌ Error creating conversation:`, error.message);
    }
  }
}

async function seedMessages() {
  console.log('\n📨 Seeding messages...');

  for (const msg of SAMPLE_MESSAGES) {
    try {
      const msgData = {
        ...msg,
        createdAt: admin.firestore.Timestamp.fromDate(msg.createdAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('messages').doc(msg.id).set(msgData, { merge: true });
    } catch (error) {
      console.error(`  ❌ Error creating message:`, error.message);
    }
  }
  console.log(`  ✅ Created ${SAMPLE_MESSAGES.length} messages`);
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
  console.log('🌱 QA Environment Seed Script - New Features');
  console.log('=============================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Seed all data
    await seedUATUsers();
    await seedUATClass();
    await seedUATStudents();
    await seedCalendarEvents();
    await seedAttendance();
    await seedAssignments();
    await seedStudentGrades();
    await seedReportCards();
    await seedConversations();
    await seedMessages();

    console.log('\n✅ Seeding complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('UAT Test Data Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Users:');
    console.log('    - teacher-uat@gsdta.org (teacher)');
    console.log('    - parent1-uat@gsdta.org (parent, 5 children)');
    console.log('    - parent2-uat@gsdta.org (parent, 5 children)');
    console.log('');
    console.log('  Class: Grade 3 - Saturday AM (10 students)');
    console.log('');
    console.log('  Calendar Events: 5 events (Pongal, New Year, meetings, etc.)');
    console.log('  Attendance Records: 40 records (4 weeks x 10 students)');
    console.log('  Assignments: 4 assignments (homework, quiz, project, test)');
    console.log('  Student Grades: 10 grades (5 students x 2 assignments)');
    console.log('  Report Cards: 3 report cards (Fall 2024)');
    console.log('  Conversations: 2 parent-teacher conversations');
    console.log('  Messages: 5 messages');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nNote: UAT users need to be created in Firebase Auth separately');
    console.log('or use existing auth accounts linked to these UIDs.');
    console.log('');

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

module.exports = { main };
