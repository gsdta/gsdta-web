/**
 * Generate Test Data Excel File
 *
 * Creates a test Excel file with the same structure as the production data
 * but with fake/dummy data for testing purposes.
 *
 * Usage: node scripts/generate-test-data.js
 *
 * Output: docs/GSDTA-Test-Data-2025-26.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');

// Output file path
const OUTPUT_PATH = path.join(__dirname, '../docs/GSDTA-Test-Data-2025-26.xlsx');

// Number of records to generate (matching prod)
const NUM_STUDENTS = 221;

// Tamil first names (common)
const FIRST_NAMES = [
  'Arun', 'Priya', 'Vikram', 'Meera', 'Raj', 'Lakshmi', 'Karthik', 'Divya',
  'Surya', 'Anitha', 'Ganesh', 'Kavitha', 'Ravi', 'Sangeetha', 'Senthil', 'Deepa',
  'Muthu', 'Geetha', 'Velu', 'Padma', 'Bala', 'Revathi', 'Arjun', 'Shalini',
  'Ashwin', 'Nithya', 'Harish', 'Pooja', 'Dinesh', 'Saranya', 'Mohan', 'Janani',
  'Vivek', 'Keerthana', 'Suresh', 'Bhavani', 'Ramesh', 'Vaishnavi', 'Prakash', 'Dharani',
  'Aravind', 'Sowmya', 'Venkat', 'Abinaya', 'Sathish', 'Ishwarya', 'Kumar', 'Lavanya',
  'Deva', 'Malini', 'Hari', 'Nandhini', 'Manoj', 'Oviya', 'Naveen', 'Pavithra'
];

// Tamil last names (common)
const LAST_NAMES = [
  'Kumar', 'Sharma', 'Patel', 'Krishnan', 'Sundar', 'Iyer', 'Rajan', 'Murugan',
  'Narayanan', 'Subramanian', 'Venkatesh', 'Raghavan', 'Chandran', 'Mani', 'Pillai', 'Nair',
  'Shankar', 'Balaji', 'Gopal', 'Srinivasan', 'Natarajan', 'Ramachandran', 'Anand', 'Bhaskar',
  'Swaminathan', 'Ramasamy', 'Selvaraj', 'Jayaraman', 'Krishnamurthy', 'Vasudevan'
];

// School districts (San Diego area)
const SCHOOL_DISTRICTS = [
  'Poway Unified School District',
  'San Diego Unified School District',
  'San Dieguito Union High School District',
  'Carlsbad Unified School District',
  'Solana Beach School District',
  'Del Mar Union School District',
  'Encinitas Union School District',
  'Oceanside Unified School District',
  'Vista Unified School District',
  'Escondido Union School District'
];

// Public schools
const PUBLIC_SCHOOLS = [
  'Westwood Elementary', 'Canyon View Elementary', 'Sunrise Elementary',
  'Valley Elementary', 'Oak Grove Elementary', 'Meadowbrook Elementary',
  'Highland Elementary', 'Creekside Elementary', 'Parkview Elementary',
  'Lakeview Elementary', 'Mountain View Elementary', 'Hillside Elementary',
  'Sunset Hills Elementary', 'Rolling Hills Elementary', 'Garden Grove Elementary'
];

// Cities
const CITIES = [
  'San Diego', 'Poway', 'Rancho Bernardo', 'Carmel Valley', 'Del Mar',
  'Solana Beach', 'Encinitas', 'Carlsbad', 'Escondido', 'La Jolla'
];

// Grade levels
const GRADES = [
  { excel: 'Mazhalai 1', id: 'ps-1', sections: ['A', 'B', 'C'] },
  { excel: 'Mazhalai 2', id: 'ps-2', sections: ['A', 'B', 'C'] },
  { excel: 'KG', id: 'kg', sections: ['A', 'B', 'C', 'D'] },
  { excel: 'Grade 1', id: 'grade-1', sections: ['A', 'B', 'C', 'D'] },
  { excel: 'Grade 2', id: 'grade-2', sections: ['A', 'B', 'C', 'D'] },
  { excel: 'Grade 3', id: 'grade-3', sections: ['A', 'B', 'C'] },
  { excel: 'Grade 4', id: 'grade-4', sections: ['A', 'B', 'C'] },
  { excel: 'Grade 5', id: 'grade-5', sections: ['A', 'B'] },
  { excel: 'Grade 6', id: 'grade-6', sections: ['A'] },
  { excel: 'Grade 7', id: 'grade-7', sections: ['A', 'B'] },
  { excel: 'Grade 8', id: 'grade-8', sections: ['A', 'B'] }
];

// Helper functions
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  return `(${randomInt(619, 858)}) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(firstName, lastName, domain = 'testmail.com') {
  const num = randomInt(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${domain}`;
}

function generateDOBForAge(age) {
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  // Return as ISO string to avoid Excel serial number issues
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateAddress() {
  const num = randomInt(1000, 9999);
  const streets = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Cypress'];
  const types = ['St', 'Ave', 'Dr', 'Ln', 'Way', 'Ct', 'Blvd'];
  return `${num} ${randomElement(streets)} ${randomElement(types)}`;
}

function generateZip() {
  return String(randomInt(92014, 92130));
}

// Generate student data
function generateStudents() {
  console.log(`Generating ${NUM_STUDENTS} student records...`);

  const students = [];

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const gender = Math.random() > 0.5 ? 'Boy' : 'Girl';
    const grade = randomElement(GRADES);
    const age = randomInt(4, 14);
    const dob = generateDOBForAge(age);
    const publicGrade = age <= 5 ? 'Pre-K' :
                       age <= 6 ? 'Kindergarten' :
                       `Grade ${Math.min(age - 5, 8)}`;

    const motherFirstName = randomElement(FIRST_NAMES);
    const fatherFirstName = randomElement(FIRST_NAMES);
    const city = randomElement(CITIES);

    // Generate timestamp as ISO string
    const timestamp = new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000));
    const timestampStr = timestamp.toISOString();

    students.push({
      'Timestamp': timestampStr,
      'Student Name (First Last)': `${firstName} ${lastName}`,
      'DOB': dob,
      'Gender': gender,
      'Current Public School Name': randomElement(PUBLIC_SCHOOLS),
      'Your School District ': randomElement(SCHOOL_DISTRICTS),
      'Grade in Public (2025-26)': publicGrade,
      'Last year grade in Tamil School': Math.random() > 0.3 ? randomElement(GRADES).excel : 'New Student',
      'Enrolling Grade 2025-26': grade.excel,
      "Mother's Name": `${motherFirstName} ${lastName}`,
      "Mother's email": generateEmail(motherFirstName, lastName),
      "Mother's Mobile": generatePhone(),
      "Mother's Employer": randomElement(['Tech Corp', 'Healthcare Inc', 'Finance LLC', 'Education Dept', 'Self-employed', 'Startup Co']),
      "Father's Name": `${fatherFirstName} ${lastName}`,
      "Father's email": generateEmail(fatherFirstName, lastName),
      "Father's Mobile": generatePhone(),
      "Father's Employer": randomElement(['Software Inc', 'Medical Center', 'Bank Corp', 'University', 'Consulting LLC', 'Engineering Co']),
      'Home Address': generateAddress(),
      'City': city,
      'Zip Code': generateZip()
    });
  }

  return students;
}

// Generate teacher data
function generateTeachers() {
  console.log('Generating teacher assignments...');

  const teachers = [];
  let teacherIndex = 0;

  for (const grade of GRADES) {
    for (const section of grade.sections) {
      const mainFirstName = randomElement(FIRST_NAMES);
      const mainLastName = randomElement(LAST_NAMES);
      const asstFirstName = randomElement(FIRST_NAMES);
      const asstLastName = randomElement(LAST_NAMES);

      teachers.push({
        'School Grade': grade.excel,
        'Section': section,
        'Main Teacher': `${mainFirstName} ${mainLastName}`,
        'Email address': generateEmail(mainFirstName, mainLastName, 'gsdta-test.org'),
        'Asst. Teacher': Math.random() > 0.2 ? `${asstFirstName} ${asstLastName}` : '',
        'Room': Math.random() > 0.3 ? `B${String(++teacherIndex).padStart(2, '0')}` : ''
      });
    }
  }

  return teachers;
}

// Generate textbook data (same as prod - not PII)
function generateTextbooks() {
  console.log('Generating textbook records...');

  return [
    { Grade: 'Mazhalai 1', 'Item No': '#910131', 'Job Name': 'Mazhalai Textbook & HW First Semester', 'Page No': 52, 'No of copies': 25 },
    { Grade: 'Mazhalai 2', 'Item No': '#933091', 'Job Name': 'Mazhalai Textbook & HW Second Semester', 'Page No': 84, 'No of copies': 27 },
    { Grade: 'KG', 'Item No': '#910135', 'Job Name': 'Basic 1 First Semester HW', 'Page No': 36, 'No of copies': 30 },
    { Grade: 'KG', 'Item No': '#910137', 'Job Name': 'Basic 1 First Semester Textbook', 'Page No': 64, 'No of copies': 33 },
    { Grade: 'Grade 1', 'Item No': '#910139', 'Job Name': 'Basic 2 First Semester HW', 'Page No': 44, 'No of copies': 37 },
    { Grade: 'Grade 1', 'Item No': '#910141', 'Job Name': 'Basic 2 First Semester Textbook', 'Page No': 60, 'No of copies': 40 },
    { Grade: 'Grade 2', 'Item No': '#953051', 'Job Name': 'Basic 2 Third Semester Textbook', 'Page No': 60, 'No of copies': 66 },
    { Grade: 'Grade 2', 'Item No': '#953053', 'Job Name': 'Basic 2 Third Semester HW', 'Page No': 44, 'No of copies': 60 },
    { Grade: 'Grade 3', 'Item No': '#956803', 'Job Name': 'Basic 3 Third Semester Textbook', 'Page No': 76, 'No of copies': 27 },
    { Grade: 'Grade 3', 'Item No': '#956805', 'Job Name': 'Basic 3 Third Semester HW', 'Page No': 60, 'No of copies': 24 },
    { Grade: 'Grade 4', 'Item No': '#956807', 'Job Name': 'Unit 3 Text', 'Page No': 44, 'No of copies': 30 },
    { Grade: 'Grade 4', 'Item No': '#956809', 'Job Name': 'Unit 3 HW', 'Page No': 52, 'No of copies': 28 },
    { Grade: 'Grade 5', 'Item No': '#956811', 'Job Name': 'Unit 6 Text', 'Page No': 40, 'No of copies': 16 },
    { Grade: 'Grade 5', 'Item No': '#956813', 'Job Name': 'Unit 6 HW', 'Page No': 44, 'No of copies': 14 },
    { Grade: 'Grade 6', 'Item No': '#956815', 'Job Name': 'Unit 9 Text', 'Page No': 32, 'No of copies': 9 },
    { Grade: 'Grade 6', 'Item No': '#956817', 'Job Name': 'Unit 9 HW', 'Page No': 52, 'No of copies': 8 },
    { Grade: 'Grade 7', 'Item No': '#956819', 'Job Name': 'Unit 12 Text', 'Page No': 40, 'No of copies': 12 },
    { Grade: 'Grade 7', 'Item No': '#956821', 'Job Name': 'Unit 12 HW', 'Page No': 52, 'No of copies': 10 },
    { Grade: 'Grade 8', 'Item No': '#956823', 'Job Name': 'Unit 15 Text', 'Page No': 40, 'No of copies': 15 },
    { Grade: 'Grade 8', 'Item No': '#956825', 'Job Name': 'Unit 15 HW', 'Page No': 56, 'No of copies': 13 }
  ];
}

// Generate class roster sheets
function generateClassRosters(students) {
  console.log('Generating class rosters...');

  const rosters = {};

  // Group students by enrolling grade
  for (const student of students) {
    const grade = student['Enrolling Grade 2025-26'];
    if (!rosters[grade]) {
      rosters[grade] = [];
    }
    rosters[grade].push({
      'S.No': rosters[grade].length + 1,
      'Student Name': student['Student Name (First Last)'],
      'Grade': grade,
      "Parent's Name": student["Mother's Name"] || student["Father's Name"],
      'Contact': student["Mother's Mobile"] || student["Father's Mobile"]
    });
  }

  return rosters;
}

// Main function
function main() {
  console.log('\n=== GSDTA Test Data Generator ===\n');

  // Generate all data
  const students = generateStudents();
  const teachers = generateTeachers();
  const textbooks = generateTextbooks();
  const rosters = generateClassRosters(students);

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add Registration sheet
  const studentSheet = XLSX.utils.json_to_sheet(students);
  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Registration');
  console.log(`  Added Registration sheet with ${students.length} records`);

  // Add Teacher sheet
  const teacherSheet = XLSX.utils.json_to_sheet(teachers);
  XLSX.utils.book_append_sheet(workbook, teacherSheet, 'Teacher');
  console.log(`  Added Teacher sheet with ${teachers.length} records`);

  // Add Books sheet
  const booksSheet = XLSX.utils.json_to_sheet(textbooks);
  XLSX.utils.book_append_sheet(workbook, booksSheet, 'Books');
  console.log(`  Added Books sheet with ${textbooks.length} records`);

  // Add class roster sheets
  for (const [gradeName, roster] of Object.entries(rosters)) {
    if (roster.length > 0) {
      const rosterSheet = XLSX.utils.json_to_sheet(roster);
      const sheetName = gradeName.replace(/\s+/g, '-').substring(0, 31); // Excel sheet name limit
      XLSX.utils.book_append_sheet(workbook, rosterSheet, sheetName);
      console.log(`  Added ${sheetName} roster with ${roster.length} students`);
    }
  }

  // Write file
  XLSX.writeFile(workbook, OUTPUT_PATH);

  console.log(`\n✅ Test data file created: ${OUTPUT_PATH}`);
  console.log('\nSummary:');
  console.log(`  - ${students.length} students`);
  console.log(`  - ${teachers.length} teacher assignments`);
  console.log(`  - ${textbooks.length} textbooks`);
  console.log(`  - ${Object.keys(rosters).length} class rosters`);
  console.log('\nTo import this data:');
  console.log('  1. Update scripts/import-2025-26-data.js to use GSDTA-Test-Data-2025-26.xlsx');
  console.log('  2. Or: node scripts/import-2025-26-data.js --dry-run');
}

main();
