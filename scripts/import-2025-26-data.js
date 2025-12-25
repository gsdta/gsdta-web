/**
 * Import 2025-26 School Year Data from Excel
 *
 * Usage: node scripts/import-2025-26-data.js [--dry-run] [--test] [--students] [--teachers] [--textbooks] [--classes]
 *
 * Prerequisites:
 * - Firebase emulators must be running (for local testing)
 * - Or set GOOGLE_APPLICATION_CREDENTIALS for production
 * - npm install xlsx in the scripts folder
 *
 * Options:
 * --dry-run     Preview what would be imported without writing to database
 * --test        Use test data file (GSDTA-Test-Data-2025-26.xlsx) instead of prod
 * --students    Import only students
 * --teachers    Import only teacher assignments
 * --textbooks   Import only textbooks
 * --classes     Import only classes
 * --volunteers  Import only volunteers (HV helpers)
 * --all         Import everything (default if no options specified)
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-gsdta';

// Only use emulator if project is demo-* OR emulator hosts are explicitly set
const IS_DEMO_PROJECT = PROJECT_ID.startsWith('demo-');
const USE_EMULATOR = IS_DEMO_PROJECT || process.env.FIRESTORE_EMULATOR_HOST;

if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
}

const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');

// Initialize Firebase Admin
admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;

// Check for --test flag first (before other arg parsing)
const USE_TEST_DATA = process.argv.includes('--test');

// Excel file path
const EXCEL_PATH = USE_TEST_DATA
  ? path.join(__dirname, '../docs/GSDTA-Test-Data-2025-26.xlsx')
  : path.join(__dirname, '../docs/GSDTA Student and Teacher 2025-26.xlsx');

// Default password for pre-created parent accounts
const DEFAULT_PASSWORD = 'Gsdta2025!';

// Academic year
const ACADEMIC_YEAR = '2025-2026';

// Super admin configuration
const SUPER_ADMIN = {
  email: 'gunasekaran.pasupathy@gmail.com',
  displayName: 'Gunasekaran Pasupathy',
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// Determine what to import (exclude --dry-run and --test from the filter count)
const importFlags = args.filter(a => a.startsWith('--') && a !== '--dry-run' && a !== '--test');
const IMPORT_ALL = args.includes('--all') || importFlags.length === 0;
const IMPORT_STUDENTS = IMPORT_ALL || args.includes('--students');
const IMPORT_TEACHERS = IMPORT_ALL || args.includes('--teachers');
const IMPORT_TEXTBOOKS = IMPORT_ALL || args.includes('--textbooks');
const IMPORT_CLASSES = IMPORT_ALL || args.includes('--classes');
const IMPORT_VOLUNTEERS = IMPORT_ALL || args.includes('--volunteers');

// Grade mapping from Excel names to app grade IDs
const GRADE_MAPPING = {
  'Mazhalai 1': 'ps-1',
  'Mazhalai-1': 'ps-1',
  'Mazhalai 2': 'ps-2',
  'Mazhalai-2': 'ps-2',
  'KG': 'kg',
  'Kindergarten': 'kg',
  'Basic 1': 'kg',
  'Grade 1': 'grade-1',
  'Grade-1': 'grade-1',
  'Basic 2': 'grade-1',
  'Grade 2': 'grade-2',
  'Grade-2': 'grade-2',
  'Grade 3': 'grade-3',
  'Grade-3': 'grade-3',
  'Grade 4': 'grade-4',
  'Grade-4': 'grade-4',
  'Grade 5': 'grade-5',
  'Grade-5': 'grade-5',
  'Grade 6': 'grade-6',
  'Grade-6': 'grade-6',
  'Grade 7': 'grade-7',
  'Grade-7': 'grade-7',
  'Grade 8': 'grade-8',
  'Grade-8': 'grade-8',
  'PS-1': 'ps-1',
  'PS-2': 'ps-2',
  // Production Excel sheet names (roster sheets)
  'Mazhalai- 1': 'ps-1',
  'Mazhalai- 2': 'ps-2',
  'Basic- 1': 'kg',
  'Basic- 2': 'grade-1',
  'Grade 2': 'grade-2',
  'Grade 3': 'grade-3',
  'Unit-3&4': 'grade-4',
  'Unit- 6&7': 'grade-5',
  'Unit- 9&10': 'grade-6',
  'Unit- 12&13': 'grade-7',
  'Unit- 15&16': 'grade-8',
};

// Grade display names
const GRADE_NAMES = {
  'ps-1': 'Pre-School 1 (Mazhalai 1)',
  'ps-2': 'Pre-School 2 (Mazhalai 2)',
  'kg': 'Kindergarten',
  'grade-1': 'Grade 1',
  'grade-2': 'Grade 2',
  'grade-3': 'Grade 3',
  'grade-4': 'Grade 4',
  'grade-5': 'Grade 5',
  'grade-6': 'Grade 6',
  'grade-7': 'Grade 7',
  'grade-8': 'Grade 8',
};

/**
 * Parse date from various formats to ISO string
 */
function parseDateToISO(dateValue) {
  if (!dateValue) return null;

  // Already a Date object (from Excel)
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }

  const str = String(dateValue).trim();

  // Excel serial number (days since 1900-01-01, but Excel incorrectly thinks 1900 was a leap year)
  // Numbers between 1 and 60000+ are likely Excel serial dates
  if (/^\d{5}$/.test(str)) {
    const serialNum = parseInt(str, 10);
    if (serialNum > 0 && serialNum < 100000) {
      // Excel epoch is January 1, 1900, but it has a bug where it thinks 1900 was a leap year
      // So we subtract 1 for dates after Feb 28, 1900 (serial 59)
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (to account for Excel's leap year bug)
      const date = new Date(excelEpoch.getTime() + serialNum * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
  }

  // ISO format: 2017-04-05 or 2017-04-05 00:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split(' ')[0].split('T')[0];
  }

  // M/D/YYYY or MM/DD/YYYY format
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // M-D-YYYY format
  const mdyDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyDashMatch) {
    const [, month, day, year] = mdyDashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  console.warn(`  Warning: Could not parse date: ${str}`);
  return null;
}

/**
 * Parse full name into first and last name
 */
function parseFullName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };

  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  // Last part is last name, rest is first name
  const lastName = parts.pop();
  const firstName = parts.join(' ');

  return { firstName, lastName };
}

/**
 * Normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove non-digits except leading +
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  return cleaned || null;
}

/**
 * Parse gender from Excel value
 */
function parseGender(value) {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  if (str === 'boy' || str === 'male' || str === 'm') return 'Boy';
  if (str === 'girl' || str === 'female' || str === 'f') return 'Girl';
  return 'Other';
}

/**
 * Map enrolling grade to grade ID
 */
function mapEnrollingGrade(value) {
  if (!value) return null;
  const str = String(value).trim();

  // Direct mapping
  if (GRADE_MAPPING[str]) return GRADE_MAPPING[str];

  // Try to extract grade
  for (const [key, id] of Object.entries(GRADE_MAPPING)) {
    if (str.toLowerCase().includes(key.toLowerCase())) {
      return id;
    }
  }

  return null;
}

/**
 * Read Excel workbook
 */
function readExcelFile() {
  console.log(`\nReading Excel file: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`  Found sheets: ${workbook.SheetNames.join(', ')}`);
  return workbook;
}

/**
 * Import students from Registration sheet
 */
async function importStudents(workbook) {
  console.log('\n=== Importing Students ===');

  const sheet = workbook.Sheets['Registration'];
  if (!sheet) {
    console.log('  Registration sheet not found!');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`  Found ${data.length} student records`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const parentEmails = new Map(); // Track parent accounts to create

  for (const row of data) {
    try {
      const fullName = row['Student Name (First Last)'];
      if (!fullName) {
        skipped++;
        continue;
      }

      const { firstName, lastName } = parseFullName(fullName);
      const dateOfBirth = parseDateToISO(row['DOB']);
      const gender = parseGender(row['Gender']);
      const schoolName = row['Current Public School Name'] || null;
      const schoolDistrict = row['Your School District ']?.trim() || null;
      const grade = row['Grade in Public (2025-26)'] || null;
      const priorTamilLevel = row['Last year grade in Tamil School'] || null;
      const enrollingGrade = mapEnrollingGrade(row['Enrolling Grade 2025-26']);

      // Parent contacts
      const motherEmail = row["Mother's email"]?.trim()?.toLowerCase() || null;
      const fatherEmail = row["Father's email"]?.trim()?.toLowerCase() || null;

      const contacts = {
        mother: {
          name: row["Mother's Name (First Last)"] || null,
          email: motherEmail,
          phone: normalizePhone(row["Mother's Mobile "]),
          employer: row["Mother's Employer"] || null,
        },
        father: {
          name: row["Father's Name (First Last)"] || null,
          email: fatherEmail,
          phone: normalizePhone(row["Father's Mobile"]),
          employer: row["Father's Employer"] || null,
        },
      };

      // Address
      const address = {
        street: row['Home Address (Street name and Unit)'] || null,
        city: row['City'] || null,
        zipCode: row['Zip Code'] ? String(row['Zip Code']) : null,
      };

      // Track primary parent email for account creation
      const primaryEmail = motherEmail || fatherEmail;
      if (primaryEmail && !parentEmails.has(primaryEmail)) {
        parentEmails.set(primaryEmail, {
          email: primaryEmail,
          displayName: contacts.mother?.name || contacts.father?.name || 'Parent',
        });
      }

      const studentData = {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        schoolName,
        schoolDistrict,
        grade,
        priorTamilLevel,
        enrollingGrade,
        contacts,
        address,
        parentId: null, // Will be set when parent account is created
        parentEmail: primaryEmail,
        status: 'pending',
        photoConsent: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would import: ${firstName} ${lastName} (${enrollingGrade || 'no grade'})`);
      } else {
        await db.collection('students').add(studentData);
        console.log(`  Imported: ${firstName} ${lastName}`);
      }

      imported++;
    } catch (err) {
      console.error(`  Error importing student: ${err.message}`);
      errors++;
    }
  }

  // Create parent accounts
  console.log(`\n  Creating ${parentEmails.size} parent accounts...`);
  for (const [email, info] of parentEmails) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create parent account: ${email}`);
      } else {
        // Check if user already exists
        try {
          await auth.getUserByEmail(email);
          console.log(`  Parent account exists: ${email}`);
        } catch (e) {
          if (e.code === 'auth/user-not-found') {
            // Create new user
            const userRecord = await auth.createUser({
              email,
              password: DEFAULT_PASSWORD,
              displayName: info.displayName,
              emailVerified: false,
            });

            // Create user document
            await db.collection('users').doc(userRecord.uid).set({
              email,
              displayName: info.displayName,
              roles: ['parent'],
              status: 'active',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            // Update students with this parent's ID
            const studentsSnapshot = await db.collection('students')
              .where('parentEmail', '==', email)
              .get();

            const batch = db.batch();
            studentsSnapshot.docs.forEach(doc => {
              batch.update(doc.ref, { parentId: userRecord.uid });
            });
            await batch.commit();

            console.log(`  Created parent account: ${email} (${studentsSnapshot.size} students linked)`);
          } else {
            throw e;
          }
        }
      }
    } catch (err) {
      console.error(`  Error creating parent account ${email}: ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Import teachers from Teacher sheet - creates user accounts and teacher documents
 */
async function importTeachers(workbook) {
  console.log('\n=== Importing Teachers ===');

  const sheet = workbook.Sheets['Teacher'];
  if (!sheet) {
    console.log('  Teacher sheet not found!');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`  Found ${data.length} class records with teacher info`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const seenTeachers = new Map(); // email -> teacher info

  // Collect unique teachers from all classes
  for (const row of data) {
    const mainTeacher = row['Main Teacher'];
    const mainEmail = row['Email address']?.trim()?.toLowerCase();
    const gradeExcel = row['School Grade'];
    const section = row['Section'] || 'A';
    const gradeId = GRADE_MAPPING[gradeExcel] || GRADE_MAPPING[gradeExcel?.trim()];

    if (mainTeacher && mainEmail && !seenTeachers.has(mainEmail)) {
      const { firstName, lastName } = parseFullName(mainTeacher);
      seenTeachers.set(mainEmail, {
        firstName,
        lastName,
        email: mainEmail,
        displayName: mainTeacher.trim(),
        classAssignments: [],
      });
    }

    // Add class assignment
    if (mainEmail && gradeId) {
      const teacher = seenTeachers.get(mainEmail);
      if (teacher) {
        teacher.classAssignments.push({
          gradeId,
          section,
          role: 'primary',
        });
      }
    }

    // Handle assistant teachers (they may not have emails in test data)
    const assistantTeacher = row['Asst. Teacher'];
    if (assistantTeacher) {
      const { teachers: assistants } = parseTeacherInfo(assistantTeacher);
      for (const asst of assistants) {
        // Generate email for assistant if not provided
        const asstEmail = `${asst.firstName.toLowerCase()}.${asst.lastName.toLowerCase()}@gsdta-test.org`;
        if (!seenTeachers.has(asstEmail)) {
          seenTeachers.set(asstEmail, {
            firstName: asst.firstName,
            lastName: asst.lastName,
            email: asstEmail,
            displayName: `${asst.firstName} ${asst.lastName}`,
            classAssignments: [],
          });
        }
        const teacher = seenTeachers.get(asstEmail);
        if (teacher && gradeId) {
          teacher.classAssignments.push({
            gradeId,
            section,
            role: 'assistant',
          });
        }
      }
    }
  }

  console.log(`  Found ${seenTeachers.size} unique teachers`);

  // Create teacher accounts and documents
  for (const [email, info] of seenTeachers) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create teacher: ${info.displayName} (${email})`);
        imported++;
        continue;
      }

      // Check if user already exists
      let uid;
      try {
        const existingUser = await auth.getUserByEmail(email);
        uid = existingUser.uid;
        console.log(`  Teacher account exists: ${email}`);
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          // Create new user
          const userRecord = await auth.createUser({
            email,
            password: DEFAULT_PASSWORD,
            displayName: info.displayName,
            emailVerified: false,
          });
          uid = userRecord.uid;
        } else {
          throw e;
        }
      }

      // Create/update user document with teacher role
      await db.collection('users').doc(uid).set({
        email,
        displayName: info.displayName,
        roles: ['teacher'],
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });

      // Create teacher document
      await db.collection('teachers').doc(uid).set({
        userId: uid,
        firstName: info.firstName,
        lastName: info.lastName,
        email,
        phone: null,
        status: 'active',
        classAssignments: info.classAssignments,
        academicYear: ACADEMIC_YEAR,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });

      console.log(`  Created teacher: ${info.displayName} (${email}) - ${info.classAssignments.length} classes`);
      imported++;
    } catch (err) {
      console.error(`  Error creating teacher ${email}: ${err.message}`);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Import textbooks from Books sheet
 */
async function importTextbooks(workbook) {
  console.log('\n=== Importing Textbooks ===');

  const sheet = workbook.Sheets['Books'];
  if (!sheet) {
    console.log('  Books sheet not found!');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`  Found ${data.length} textbook records`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let currentGrade = null;

  for (const row of data) {
    try {
      // Track current grade (some rows only have grade, textbook rows have item numbers)
      if (row['Grade']) {
        currentGrade = row['Grade'];
      }

      const itemNumber = row['Item No'];
      const name = row['Job Name'];

      if (!itemNumber || !name) {
        skipped++;
        continue;
      }

      const gradeId = mapEnrollingGrade(currentGrade);
      if (!gradeId) {
        console.log(`  Skipping textbook (no grade mapping): ${name}`);
        skipped++;
        continue;
      }

      // Determine textbook type
      let type = 'combined';
      const nameLower = name.toLowerCase();
      if (nameLower.includes('textbook') && !nameLower.includes('hw') && !nameLower.includes('homework')) {
        type = 'textbook';
      } else if ((nameLower.includes('hw') || nameLower.includes('homework')) && !nameLower.includes('textbook')) {
        type = 'homework';
      }

      // Extract semester if present
      let semester = null;
      if (nameLower.includes('first semester')) semester = 'First';
      else if (nameLower.includes('second semester')) semester = 'Second';
      else if (nameLower.includes('third semester')) semester = 'Third';

      const textbookData = {
        gradeId,
        gradeName: GRADE_NAMES[gradeId] || currentGrade,
        itemNumber: String(itemNumber).trim(),
        name: name.trim(),
        type,
        semester,
        pageCount: row['Page No'] || 0,
        copies: row['No of copies'] || 0,
        unitCost: null, // Not in Excel
        academicYear: ACADEMIC_YEAR,
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would import textbook: ${name} (${gradeId})`);
      } else {
        await db.collection('textbooks').add(textbookData);
        console.log(`  Imported textbook: ${name}`);
      }

      imported++;
    } catch (err) {
      console.error(`  Error importing textbook: ${err.message}`);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Parse teacher info and extract volunteer helpers (HV)
 */
function parseTeacherInfo(teacherStr) {
  if (!teacherStr) return { teachers: [], volunteers: [] };

  const teachers = [];
  const volunteers = [];

  // Split by comma or /
  const parts = String(teacherStr).split(/[,/]/).map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const isVolunteer = part.includes('(HV)') || part.includes('(hv)');
    const cleanName = part.replace(/\s*\(HV\)\s*/gi, '').trim();

    if (isVolunteer) {
      const { firstName, lastName } = parseFullName(cleanName);
      volunteers.push({ firstName, lastName, type: 'high_school' });
    } else {
      const { firstName, lastName } = parseFullName(cleanName);
      teachers.push({ firstName, lastName });
    }
  }

  return { teachers, volunteers };
}

/**
 * Import volunteers (HV helpers) from Teacher sheet
 */
async function importVolunteers(workbook) {
  console.log('\n=== Importing Volunteers (HV Helpers) ===');

  const sheet = workbook.Sheets['Teacher'];
  if (!sheet) {
    console.log('  Teacher sheet not found!');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const seenVolunteers = new Set();

  for (const row of data) {
    try {
      // Check assistant teacher columns for HV markers
      const assistantCols = ['Asst. Teacher', 'Asst. Teacher.1'];

      for (const col of assistantCols) {
        const { volunteers } = parseTeacherInfo(row[col]);

        for (const vol of volunteers) {
          const key = `${vol.firstName}-${vol.lastName}`.toLowerCase();
          if (seenVolunteers.has(key)) continue;
          seenVolunteers.add(key);

          const volunteerData = {
            firstName: vol.firstName,
            lastName: vol.lastName,
            type: 'high_school',
            status: 'active',
            academicYear: ACADEMIC_YEAR,
            classAssignments: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          if (DRY_RUN) {
            console.log(`  [DRY-RUN] Would import volunteer: ${vol.firstName} ${vol.lastName}`);
          } else {
            await db.collection('volunteers').add(volunteerData);
            console.log(`  Imported volunteer: ${vol.firstName} ${vol.lastName}`);
          }

          imported++;
        }
      }
    } catch (err) {
      console.error(`  Error importing volunteer: ${err.message}`);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Create grade documents in Firestore
 */
async function ensureGrades() {
  console.log('\n=== Ensuring Grades Exist ===');

  const GRADES = [
    { id: 'ps-1', name: 'Pre-School 1', displayName: 'Mazhalai 1', displayOrder: 1 },
    { id: 'ps-2', name: 'Pre-School 2', displayName: 'Mazhalai 2', displayOrder: 2 },
    { id: 'kg', name: 'Kindergarten', displayName: 'KG', displayOrder: 3 },
    { id: 'grade-1', name: 'Grade 1', displayName: 'Grade 1', displayOrder: 4 },
    { id: 'grade-2', name: 'Grade 2', displayName: 'Grade 2', displayOrder: 5 },
    { id: 'grade-3', name: 'Grade 3', displayName: 'Grade 3', displayOrder: 6 },
    { id: 'grade-4', name: 'Grade 4', displayName: 'Grade 4', displayOrder: 7 },
    { id: 'grade-5', name: 'Grade 5', displayName: 'Grade 5', displayOrder: 8 },
    { id: 'grade-6', name: 'Grade 6', displayName: 'Grade 6', displayOrder: 9 },
    { id: 'grade-7', name: 'Grade 7', displayName: 'Grade 7', displayOrder: 10 },
    { id: 'grade-8', name: 'Grade 8', displayName: 'Grade 8', displayOrder: 11 },
  ];

  for (const grade of GRADES) {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would create grade: ${grade.id} - ${grade.displayName}`);
    } else {
      await db.collection('grades').doc(grade.id).set({
        name: grade.name,
        displayName: grade.displayName,
        displayOrder: grade.displayOrder,
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      console.log(`  Created/updated grade: ${grade.id} - ${grade.displayName}`);
    }
  }
}

/**
 * Import classes from Teacher sheet and assign students from roster sheets
 */
async function importClasses(workbook) {
  console.log('\n=== Importing Classes ===');

  // First ensure grades exist
  await ensureGrades();

  const teacherSheet = workbook.Sheets['Teacher'];
  if (!teacherSheet) {
    console.log('  Teacher sheet not found!');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const teacherData = XLSX.utils.sheet_to_json(teacherSheet);
  console.log(`\n  Found ${teacherData.length} class records in Teacher sheet`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const classIdMap = new Map(); // Maps "grade-section" to classId
  const classNameMap = new Map(); // Maps classId to className

  // Load existing teachers to get their IDs
  console.log('\n  Loading teacher IDs...');
  const teachersSnapshot = await db.collection('teachers').get();
  const teacherByEmail = new Map();
  teachersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      teacherByEmail.set(data.email.toLowerCase(), {
        id: doc.id,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
      });
    }
  });
  console.log(`  Found ${teacherByEmail.size} teachers`);

  // Step 1: Create classes from Teacher sheet
  for (const row of teacherData) {
    try {
      const gradeExcel = row['School Grade'];
      const section = row['Section'] || 'A';
      const room = row['Room'] || null;
      const mainTeacher = row['Main Teacher'];
      const mainTeacherEmail = row['Email address'];
      const assistantTeacher = row['Asst. Teacher'];

      if (!gradeExcel) {
        skipped++;
        continue;
      }

      const gradeId = GRADE_MAPPING[gradeExcel] || GRADE_MAPPING[gradeExcel.trim()];
      if (!gradeId) {
        console.log(`  Warning: Unknown grade "${gradeExcel}", skipping`);
        skipped++;
        continue;
      }

      const gradeName = GRADE_NAMES[gradeId] || gradeExcel;
      const className = `${gradeName} Section ${section}`;
      const classKey = `${gradeId}-${section}`.toLowerCase();

      // Parse teachers with proper IDs
      const teachers = [];
      if (mainTeacher) {
        const email = mainTeacherEmail?.trim()?.toLowerCase();
        const teacherInfo = email ? teacherByEmail.get(email) : null;
        teachers.push({
          teacherId: teacherInfo?.id || `pending-${mainTeacher.trim().replace(/\s+/g, '-').toLowerCase()}`,
          teacherName: teacherInfo?.name || mainTeacher.trim(),
          teacherEmail: email || null,
          role: 'primary',
          assignedAt: Timestamp.now(),
          assignedBy: 'system-import',
        });
      }
      if (assistantTeacher) {
        const { teachers: assistants } = parseTeacherInfo(assistantTeacher);
        for (const asst of assistants) {
          const asstName = `${asst.firstName} ${asst.lastName}`;
          const asstEmail = `${asst.firstName.toLowerCase()}.${asst.lastName.toLowerCase()}@gsdta-test.org`;
          const teacherInfo = teacherByEmail.get(asstEmail);
          teachers.push({
            teacherId: teacherInfo?.id || `pending-${asstName.replace(/\s+/g, '-').toLowerCase()}`,
            teacherName: teacherInfo?.name || asstName,
            teacherEmail: teacherInfo?.email || asstEmail,
            role: 'assistant',
            assignedAt: Timestamp.now(),
            assignedBy: 'system-import',
          });
        }
      }

      const classData = {
        name: className,
        gradeId,
        gradeName,
        section,
        room,
        day: 'Saturday', // Default
        time: '10:00 AM - 12:00 PM', // Default
        capacity: 25,
        enrolled: 0,
        teachers,
        status: 'active',
        academicYear: ACADEMIC_YEAR,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create class: ${className}`);
        const dryRunId = `dry-run-${classKey}`;
        classIdMap.set(classKey, dryRunId);
        classNameMap.set(dryRunId, className);
      } else {
        const docRef = await db.collection('classes').add(classData);
        classIdMap.set(classKey, docRef.id);
        classNameMap.set(docRef.id, className);
        console.log(`  Created class: ${className} (${docRef.id})`);
      }

      imported++;
    } catch (err) {
      console.error(`  Error creating class: ${err.message}`);
      errors++;
    }
  }

  // Step 2: Assign students to classes from roster sheets
  console.log('\n  Assigning students to classes from rosters...');

  let studentsAssigned = 0;
  const classEnrollmentCounts = new Map(); // Track enrollment counts per class
  const rosterSheets = workbook.SheetNames.filter(name =>
    !['Registration', 'Teacher', 'Books'].includes(name)
  );

  for (const sheetName of rosterSheets) {
    const sheet = workbook.Sheets[sheetName];
    const rosterData = XLSX.utils.sheet_to_json(sheet);

    if (rosterData.length === 0) continue;

    // Determine grade from sheet name (e.g., "Grade-3" -> "grade-3", "Mazhalai-1" -> "ps-1")
    let gradeId = null;

    // First try exact match
    if (GRADE_MAPPING[sheetName]) {
      gradeId = GRADE_MAPPING[sheetName];
    } else {
      // Try case-insensitive match
      for (const [key, id] of Object.entries(GRADE_MAPPING)) {
        if (key.toLowerCase() === sheetName.toLowerCase()) {
          gradeId = id;
          break;
        }
      }
    }

    // If still no match, try partial matching
    if (!gradeId) {
      for (const [key, id] of Object.entries(GRADE_MAPPING)) {
        const keyNormalized = key.toLowerCase().replace(/[\s-]+/g, '');
        const sheetNormalized = sheetName.toLowerCase().replace(/[\s-]+/g, '');
        if (sheetNormalized.includes(keyNormalized) || keyNormalized.includes(sheetNormalized)) {
          gradeId = id;
          break;
        }
      }
    }

    if (!gradeId) {
      console.log(`    Skipping roster sheet "${sheetName}" - cannot determine grade`);
      continue;
    }

    console.log(`    Processing roster: ${sheetName} (${rosterData.length} students)`);

    // Check if a class exists for this grade, if not create one
    let classKey = `${gradeId}-a`;
    let classId = classIdMap.get(classKey);

    if (!classId && !DRY_RUN) {
      // Create a class for this grade
      const gradeName = GRADE_NAMES[gradeId] || gradeId;
      const className = `${gradeName} Section A`;

      const classData = {
        name: className,
        gradeId,
        gradeName,
        section: 'A',
        room: null,
        day: 'Saturday',
        time: '10:00 AM - 12:00 PM',
        capacity: 30,
        enrolled: 0,
        teachers: [],
        status: 'active',
        academicYear: ACADEMIC_YEAR,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await db.collection('classes').add(classData);
      classId = docRef.id;
      classIdMap.set(classKey, classId);
      classNameMap.set(classId, className);
      console.log(`      Created missing class: ${className} (${docRef.id})`);
      imported++;
    }

    for (const row of rosterData) {
      try {
        // Get student name from first column (column name varies by sheet)
        const firstColKey = Object.keys(row)[0];
        const studentName = row[firstColKey] || row['Student Name'];

        // Skip header rows and non-student entries
        if (!studentName ||
            studentName.includes('Teacher') ||
            studentName.includes('Student Name') ||
            studentName.includes('Section')) {
          continue;
        }

        // Find student by name in Firestore
        const { firstName, lastName } = parseFullName(studentName);

        if (DRY_RUN) {
          console.log(`      [DRY-RUN] Would assign ${studentName} to ${gradeId}`);
          studentsAssigned++;
          continue;
        }

        // Query for student
        const studentsQuery = await db.collection('students')
          .where('firstName', '==', firstName)
          .where('lastName', '==', lastName)
          .limit(1)
          .get();

        if (studentsQuery.empty) {
          // Try partial match
          const allStudents = await db.collection('students')
            .where('firstName', '==', firstName)
            .limit(5)
            .get();

          const matchedDoc = allStudents.docs.find(doc =>
            doc.data().lastName?.toLowerCase() === lastName?.toLowerCase()
          );

          if (!matchedDoc) {
            console.log(`      Warning: Student not found: ${studentName}`);
            continue;
          }

          // Find the class for this grade (use first section if multiple)
          const classId = classIdMap.get(`${gradeId}-a`) ||
                          classIdMap.get(`${gradeId}-A`) ||
                          Array.from(classIdMap.entries()).find(([k]) => k.startsWith(gradeId))?.[1];

          if (classId) {
            const className = classNameMap.get(classId);
            await matchedDoc.ref.update({
              classId,
              className,
              enrollingGrade: gradeId,
              status: 'active', // Assigned to class = active
              updatedAt: Timestamp.now(),
            });
            classEnrollmentCounts.set(classId, (classEnrollmentCounts.get(classId) || 0) + 1);
            studentsAssigned++;
          }
        } else {
          const studentDoc = studentsQuery.docs[0];
          const classId = classIdMap.get(`${gradeId}-a`) ||
                          classIdMap.get(`${gradeId}-A`) ||
                          Array.from(classIdMap.entries()).find(([k]) => k.startsWith(gradeId))?.[1];

          if (classId) {
            const className = classNameMap.get(classId);
            await studentDoc.ref.update({
              classId,
              className,
              enrollingGrade: gradeId,
              status: 'active', // Assigned to class = active
              updatedAt: Timestamp.now(),
            });
            classEnrollmentCounts.set(classId, (classEnrollmentCounts.get(classId) || 0) + 1);
            studentsAssigned++;
          }
        }
      } catch (err) {
        console.error(`      Error assigning student: ${err.message}`);
      }
    }
  }

  // Step 3: Update class enrollment counts
  console.log('\n  Updating class enrollment counts...');
  if (!DRY_RUN) {
    for (const [classId, count] of classEnrollmentCounts) {
      await db.collection('classes').doc(classId).update({
        enrolled: count,
        updatedAt: Timestamp.now(),
      });
      console.log(`    Updated ${classNameMap.get(classId)}: ${count} students`);
    }
  }

  console.log(`\n  Classes created: ${imported}`);
  console.log(`  Students assigned to classes: ${studentsAssigned}`);

  return { imported, skipped, errors, studentsAssigned };
}

/**
 * Create or update super admin account
 */
async function ensureSuperAdmin() {
  console.log('\n=== Ensuring Super Admin ===');

  let uid;

  // Check if user already exists in Auth
  try {
    const existingUser = await auth.getUserByEmail(SUPER_ADMIN.email);
    uid = existingUser.uid;
    console.log(`  Auth user exists: ${uid}`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create auth user: ${SUPER_ADMIN.email}`);
        return;
      }
      // Create new user
      const userRecord = await auth.createUser({
        email: SUPER_ADMIN.email,
        password: DEFAULT_PASSWORD,
        displayName: SUPER_ADMIN.displayName,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log(`  Created auth user: ${uid}`);
    } else {
      throw e;
    }
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would ensure admin role for: ${SUPER_ADMIN.email}`);
    return;
  }

  // Create/update user document with admin role
  const userDoc = await db.collection('users').doc(uid).get();

  if (userDoc.exists) {
    const existingData = userDoc.data();
    const roles = existingData.roles || [];

    if (!roles.includes('admin')) {
      roles.push('admin');
      await db.collection('users').doc(uid).update({
        roles,
        updatedAt: Timestamp.now(),
      });
      console.log('  Added admin role to existing user');
    } else {
      console.log('  User already has admin role');
    }
  } else {
    await db.collection('users').doc(uid).set({
      email: SUPER_ADMIN.email,
      displayName: SUPER_ADMIN.displayName,
      roles: ['admin'],
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log('  Created user document with admin role');
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('GSDTA 2025-26 Data Import Script');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No data will be written ***\n');
  }

  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Target: ${USE_EMULATOR ? 'EMULATOR (localhost)' : 'PRODUCTION FIRESTORE'}`);
  if (!USE_EMULATOR) {
    console.log('\n⚠️  WARNING: Writing to PRODUCTION Firestore! ⚠️\n');
  }
  console.log(`Academic Year: ${ACADEMIC_YEAR}`);
  console.log(`Import options: ${JSON.stringify({
    students: IMPORT_STUDENTS,
    teachers: IMPORT_TEACHERS,
    textbooks: IMPORT_TEXTBOOKS,
    classes: IMPORT_CLASSES,
    volunteers: IMPORT_VOLUNTEERS,
  })}`);

  // Always ensure super admin exists
  await ensureSuperAdmin();

  const workbook = readExcelFile();
  const results = {};

  if (IMPORT_STUDENTS) {
    results.students = await importStudents(workbook);
  }

  if (IMPORT_TEACHERS) {
    results.teachers = await importTeachers(workbook);
  }

  if (IMPORT_TEXTBOOKS) {
    results.textbooks = await importTextbooks(workbook);
  }

  if (IMPORT_VOLUNTEERS) {
    results.volunteers = await importVolunteers(workbook);
  }

  if (IMPORT_CLASSES) {
    results.classes = await importClasses(workbook);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));

  for (const [type, result] of Object.entries(results)) {
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Imported: ${result.imported}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Errors: ${result.errors}`);
  }

  if (DRY_RUN) {
    console.log('\n*** DRY RUN COMPLETE - No data was written ***');
  } else {
    console.log('\nImport complete!');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
