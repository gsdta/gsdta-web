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

// Tamil grades for variety
const TAMIL_GRADES = ['ps-1', 'ps-2', 'kg', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

// School districts for variety
const SCHOOL_DISTRICTS = [
  'San Diego Unified',
  'Poway Unified',
  'San Dieguito Union',
  'Del Mar Union',
  'Carlsbad Unified'
];

// Sample students for UAT - with advanced search fields
const UAT_STUDENTS = [];

// Generate diverse students for testing advanced search
const studentConfigs = [
  // Active students with class assigned
  { status: 'active', hasClass: true, enrollingGrade: 'grade-3', district: 'San Diego Unified', daysAgo: 60 },
  { status: 'active', hasClass: true, enrollingGrade: 'grade-3', district: 'San Diego Unified', daysAgo: 55 },
  { status: 'active', hasClass: true, enrollingGrade: 'grade-2', district: 'Poway Unified', daysAgo: 45 },
  { status: 'active', hasClass: true, enrollingGrade: 'grade-4', district: 'San Dieguito Union', daysAgo: 30 },
  { status: 'active', hasClass: true, enrollingGrade: 'ps-1', district: 'Del Mar Union', daysAgo: 20 },
  // Active students WITHOUT class (unassigned)
  { status: 'active', hasClass: false, enrollingGrade: 'grade-1', district: 'Carlsbad Unified', daysAgo: 15 },
  { status: 'active', hasClass: false, enrollingGrade: 'kg', district: 'San Diego Unified', daysAgo: 10 },
  // Admitted students (waiting for class)
  { status: 'admitted', hasClass: false, enrollingGrade: 'grade-5', district: 'Poway Unified', daysAgo: 7, admittedDaysAgo: 5 },
  { status: 'admitted', hasClass: false, enrollingGrade: 'ps-2', district: 'San Dieguito Union', daysAgo: 5, admittedDaysAgo: 3 },
  { status: 'admitted', hasClass: true, enrollingGrade: 'grade-3', district: 'Del Mar Union', daysAgo: 14, admittedDaysAgo: 10 },
  // Pending students (new registrations)
  { status: 'pending', hasClass: false, enrollingGrade: 'grade-2', district: 'Carlsbad Unified', daysAgo: 3 },
  { status: 'pending', hasClass: false, enrollingGrade: 'grade-1', district: 'San Diego Unified', daysAgo: 2 },
  { status: 'pending', hasClass: false, enrollingGrade: 'grade-4', district: 'Poway Unified', daysAgo: 1 },
  // More variety for filters
  { status: 'active', hasClass: true, enrollingGrade: 'grade-6', district: 'San Diego Unified', daysAgo: 90 },
  { status: 'inactive', hasClass: true, enrollingGrade: 'grade-3', district: 'Del Mar Union', daysAgo: 120 }
];

for (let i = 0; i < studentConfigs.length; i++) {
  const config = studentConfigs[i];
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - config.daysAgo);

  const admittedDate = config.admittedDaysAgo ? new Date() : null;
  if (admittedDate) {
    admittedDate.setDate(admittedDate.getDate() - config.admittedDaysAgo);
  }

  UAT_STUDENTS.push({
    id: `uat-student-${i + 1}`,
    firstName: 'UAT',
    lastName: `Student ${i + 1}`,
    parentId: i < 8 ? 'uat-parent-1' : 'uat-parent-2',
    parentEmail: i < 8 ? 'parent1-uat@gsdta.org' : 'parent2-uat@gsdta.org',
    grade: config.enrollingGrade.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    gradeId: config.enrollingGrade,
    enrollingGrade: config.enrollingGrade, // For advanced search filter
    classId: config.hasClass ? 'class-grade-3-sat' : null,
    className: config.hasClass ? 'Grade 3 - Saturday AM' : null,
    status: config.status,
    schoolName: `${config.district.split(' ')[0]} Elementary`,
    schoolDistrict: config.district, // For advanced search filter
    dateOfBirth: '2016-05-15',
    createdAtDate: createdDate, // Will be converted to Timestamp
    admittedAtDate: admittedDate || (config.status !== 'pending' ? createdDate : null) // Will be converted
  });
}

// ============================================
// SAMPLE VOLUNTEERS
// ============================================
const SAMPLE_VOLUNTEERS = [
  {
    id: 'vol-hs-1',
    firstName: 'Priya',
    lastName: 'Krishnan',
    email: 'priya.k@example.com',
    phone: '555-0101',
    type: 'high_school',
    school: 'Westview High School',
    gradeLevel: '11th Grade',
    availableDays: ['Saturday'],
    availableTimes: ['Morning (9AM-12PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Rajan Krishnan',
      phone: '555-0102',
      relationship: 'Father'
    },
    classAssignments: [
      {
        classId: 'class-grade-1-am',
        className: 'Grade 1 - AM',
        gradeId: 'grade-1',
        gradeName: 'Grade 1',
        assignedAt: new Date('2024-09-15')
      }
    ],
    status: 'active',
    totalHours: 24,
    hoursLog: [
      { date: '2024-12-07', hours: 3, classId: 'class-grade-1-am', notes: 'Helped with reading practice' },
      { date: '2024-12-14', hours: 3, classId: 'class-grade-1-am', notes: 'Assisted with writing exercises' }
    ],
    notes: 'Excellent with young children. Planning to pursue education major.'
  },
  {
    id: 'vol-hs-2',
    firstName: 'Arun',
    lastName: 'Subramaniam',
    email: 'arun.s@example.com',
    phone: '555-0201',
    type: 'high_school',
    school: 'Del Norte High School',
    gradeLevel: '12th Grade',
    availableDays: ['Saturday'],
    availableTimes: ['Morning (9AM-12PM)', 'Afternoon (12PM-3PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Lakshmi Subramaniam',
      phone: '555-0202',
      relationship: 'Mother'
    },
    classAssignments: [
      {
        classId: 'class-grade-3-sat',
        className: 'Grade 3 - Saturday AM',
        gradeId: 'grade-3',
        gradeName: 'Grade 3',
        assignedAt: new Date('2024-09-10')
      }
    ],
    status: 'active',
    totalHours: 36,
    hoursLog: [
      { date: '2024-11-23', hours: 4, classId: 'class-grade-3-sat', notes: 'Led group activities' },
      { date: '2024-12-07', hours: 4, classId: 'class-grade-3-sat', notes: 'Assisted with Tamil typing' }
    ],
    notes: 'Fluent in Tamil. Has younger siblings at the school.'
  },
  {
    id: 'vol-parent-1',
    firstName: 'Meena',
    lastName: 'Raghavan',
    email: 'meena.r@example.com',
    phone: '555-0301',
    type: 'parent',
    parentId: 'uat-parent-1',
    studentIds: ['uat-student-1', 'uat-student-2'],
    availableDays: ['Saturday'],
    availableTimes: ['Morning (9AM-12PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Venkat Raghavan',
      phone: '555-0302',
      relationship: 'Spouse'
    },
    classAssignments: [
      {
        classId: 'class-grade-2-sat',
        className: 'Grade 2 - Saturday',
        gradeId: 'grade-2',
        gradeName: 'Grade 2',
        assignedAt: new Date('2024-10-01')
      }
    ],
    status: 'active',
    totalHours: 18,
    hoursLog: [
      { date: '2024-11-16', hours: 3, classId: 'class-grade-2-sat', notes: 'Supervised snack time' },
      { date: '2024-12-14', hours: 3, classId: 'class-grade-2-sat', notes: 'Helped with art project' }
    ],
    notes: 'Very organized. Helps with event coordination.'
  },
  {
    id: 'vol-parent-2',
    firstName: 'Karthik',
    lastName: 'Venkatesh',
    email: 'karthik.v@example.com',
    phone: '555-0401',
    type: 'parent',
    parentId: 'uat-parent-2',
    studentIds: ['uat-student-3'],
    availableDays: ['Saturday', 'Sunday'],
    availableTimes: ['Morning (9AM-12PM)', 'Afternoon (12PM-3PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Divya Venkatesh',
      phone: '555-0402',
      relationship: 'Spouse'
    },
    classAssignments: [],
    status: 'active',
    totalHours: 12,
    hoursLog: [
      { date: '2024-12-07', hours: 6, notes: 'Pongal event setup and coordination' }
    ],
    notes: 'IT professional. Helps with technical setup.'
  },
  {
    id: 'vol-community-1',
    firstName: 'Sundaram',
    lastName: 'Iyer',
    email: 'sundaram.i@example.com',
    phone: '555-0501',
    type: 'community',
    availableDays: ['Saturday', 'Sunday'],
    availableTimes: ['Morning (9AM-12PM)', 'Afternoon (12PM-3PM)', 'Evening (3PM-6PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Kamala Iyer',
      phone: '555-0502',
      relationship: 'Spouse'
    },
    classAssignments: [
      {
        classId: 'class-grade-5-sat',
        className: 'Grade 5 - Saturday',
        gradeId: 'grade-5',
        gradeName: 'Grade 5',
        assignedAt: new Date('2024-09-01')
      }
    ],
    status: 'active',
    totalHours: 48,
    hoursLog: [
      { date: '2024-10-12', hours: 4, classId: 'class-grade-5-sat', notes: 'Tamil literature discussion' },
      { date: '2024-11-09', hours: 4, classId: 'class-grade-5-sat', notes: 'Poetry recitation coaching' }
    ],
    notes: 'Retired Tamil professor. Excellent resource for advanced classes.'
  },
  {
    id: 'vol-community-2',
    firstName: 'Anitha',
    lastName: 'Narayanan',
    email: 'anitha.n@example.com',
    phone: '555-0601',
    type: 'community',
    availableDays: ['Saturday'],
    availableTimes: ['Morning (9AM-12PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Ravi Narayanan',
      phone: '555-0602',
      relationship: 'Husband'
    },
    classAssignments: [],
    status: 'active',
    totalHours: 8,
    hoursLog: [
      { date: '2024-12-14', hours: 4, notes: 'Cultural program coordination' }
    ],
    notes: 'Classical dance teacher. Helps with cultural events.'
  },
  {
    id: 'vol-hs-3',
    firstName: 'Divya',
    lastName: 'Murthy',
    email: 'divya.m@example.com',
    phone: '555-0701',
    type: 'high_school',
    school: 'Rancho Bernardo High School',
    gradeLevel: '10th Grade',
    availableDays: ['Saturday'],
    availableTimes: ['Morning (9AM-12PM)'],
    academicYear: '2024-2025',
    emergencyContact: {
      name: 'Srinivas Murthy',
      phone: '555-0702',
      relationship: 'Father'
    },
    classAssignments: [],
    status: 'inactive',
    totalHours: 6,
    hoursLog: [
      { date: '2024-09-21', hours: 3, notes: 'Orientation session' }
    ],
    notes: 'On break due to exam schedule. Will return in spring.'
  }
];

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
      // Extract date objects before spreading
      const { createdAtDate, admittedAtDate, ...rest } = student;

      const studentData = {
        ...rest,
        createdAt: createdAtDate ? admin.firestore.Timestamp.fromDate(createdAtDate) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Only add admittedAt if it exists
      if (admittedAtDate) {
        studentData.admittedAt = admin.firestore.Timestamp.fromDate(admittedAtDate);
        studentData.admittedBy = 'admin';
      }

      await db.collection('students').doc(student.id).set(studentData, { merge: true });
      console.log(`  ✅ Created student: ${student.firstName} ${student.lastName} (${student.status}, ${student.enrollingGrade}, ${student.schoolDistrict})`);
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

async function seedVolunteers() {
  console.log('\n🙋 Seeding volunteers...');

  for (const volunteer of SAMPLE_VOLUNTEERS) {
    try {
      const volunteerData = {
        ...volunteer,
        classAssignments: volunteer.classAssignments.map(a => ({
          ...a,
          assignedAt: admin.firestore.Timestamp.fromDate(a.assignedAt)
        })),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('volunteers').doc(volunteer.id).set(volunteerData, { merge: true });
      console.log(`  ✅ Created volunteer: ${volunteer.firstName} ${volunteer.lastName} (${volunteer.type})`);
    } catch (error) {
      console.error(`  ❌ Error creating volunteer ${volunteer.firstName}:`, error.message);
    }
  }
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
    await seedVolunteers();

    console.log('\n✅ Seeding complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('UAT Test Data Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Users:');
    console.log('    - teacher-uat@gsdta.org (teacher)');
    console.log('    - parent1-uat@gsdta.org (parent, 8 children)');
    console.log('    - parent2-uat@gsdta.org (parent, 7 children)');
    console.log('');
    console.log('  Class: Grade 3 - Saturday AM');
    console.log('');
    console.log('  Students (15 total) - for Advanced Search testing:');
    console.log('    - By Status: 7 active, 3 admitted, 3 pending, 1 inactive');
    console.log('    - By Class: 8 assigned, 7 unassigned');
    console.log('    - By Grade: ps-1, ps-2, kg, grade-1 to grade-6');
    console.log('    - By District: San Diego, Poway, San Dieguito, Del Mar, Carlsbad');
    console.log('    - By Date: Various registration/admission dates (1-120 days ago)');
    console.log('');
    console.log('  Calendar Events: 5 events (Pongal, New Year, meetings, etc.)');
    console.log('  Attendance Records: 40 records (4 weeks x 10 students)');
    console.log('  Assignments: 4 assignments (homework, quiz, project, test)');
    console.log('  Student Grades: 10 grades (5 students x 2 assignments)');
    console.log('  Report Cards: 3 report cards (Fall 2024)');
    console.log('  Conversations: 2 parent-teacher conversations');
    console.log('  Messages: 5 messages');
    console.log('');
    console.log('  Volunteers (7 total):');
    console.log('    - High School: 3 (Priya, Arun, Divya)');
    console.log('    - Parent: 2 (Meena, Karthik)');
    console.log('    - Community: 2 (Sundaram, Anitha)');
    console.log('    - Active: 6, Inactive: 1');
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
