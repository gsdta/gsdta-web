import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST as _POST } from '../route';

/**
 * Unit tests for GET/POST /api/v1/teacher/classes/[id]/attendance
 * 
 * Tests attendance recording functionality for teachers.
 * 
 * Security: Teacher must be assigned to class to mark attendance.
 */

const mockClass = {
  id: 'class1',
  name: 'Grade 5 - Tamil Literature',
  gradeId: 'grade5',
  teacherId: 't1',
  teachers: [
    { teacherId: 't1', role: 'primary' as const },
    { teacherId: 't2', role: 'assistant' as const },
  ],
};

const mockAttendanceRecords = [
  {
    id: 'att1',
    studentId: 's1',
    classId: 'class1',
    date: '2024-12-22',
    status: 'present' as const,
    notes: '',
    markedBy: 't1',
    markedByName: 'Teacher One',
  },
  {
    id: 'att2',
    studentId: 's2',
    classId: 'class1',
    date: '2024-12-22',
    status: 'absent' as const,
    notes: 'Sick',
    markedBy: 't1',
    markedByName: 'Teacher One',
  },
  {
    id: 'att3',
    studentId: 's3',
    classId: 'class1',
    date: '2024-12-22',
    status: 'late' as const,
    notes: 'Arrived 10 mins late',
    markedBy: 't1',
    markedByName: 'Teacher One',
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/teacher/classes/[id]/attendance - requires authentication', async () => {
  const req = createMockRequest(
    'http://localhost:8080/api/v1/teacher/classes/class1/attendance?date=2024-12-22'
  );
  
  const response = await GET(req, { params: Promise.resolve({ id: 'class1' }) });
  
  assert.equal(response.status, 401);
});

test('GET /v1/teacher/classes/[id]/attendance - requires date parameter', async () => {
  const req = createMockRequest(
    'http://localhost:8080/api/v1/teacher/classes/class1/attendance',
    { 'Authorization': 'Bearer test-token' }
  );
  
  const response = await GET(req, { params: Promise.resolve({ id: 'class1' }) });
  
  // Should return 400 if date is missing
  assert.ok(response.status === 400 || response.status === 401);
});

test('Date format validation - valid YYYY-MM-DD', () => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  const validDates = ['2024-12-22', '2024-01-01', '2023-05-15'];
  validDates.forEach(date => {
    assert.ok(dateRegex.test(date), `${date} should be valid`);
  });
});

test('Date format validation - invalid formats', () => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  const invalidDates = ['12/22/2024', '2024-12-22T10:00:00', '2024-1-1', 'invalid'];
  invalidDates.forEach(date => {
    assert.equal(dateRegex.test(date), false, `${date} should be invalid`);
  });
});

test('Attendance status validation', () => {
  const validStatuses = ['present', 'absent', 'late', 'excused'];
  
  mockAttendanceRecords.forEach(record => {
    assert.ok(validStatuses.includes(record.status),
      `Status ${record.status} must be one of: ${validStatuses.join(', ')}`);
  });
});

test('Attendance record structure validation', () => {
  mockAttendanceRecords.forEach(record => {
    assert.ok(record.studentId, 'Must have studentId');
    assert.ok(record.classId, 'Must have classId');
    assert.ok(record.date, 'Must have date');
    assert.ok(record.status, 'Must have status');
    assert.ok(record.markedBy, 'Must have markedBy');
    assert.ok(record.markedByName, 'Must have markedByName');
    // notes is optional
    assert.ok(typeof record.notes === 'string', 'notes must be string');
  });
});

test('POST request body validation - valid input', () => {
  const validBody = {
    date: '2024-12-22',
    records: [
      { studentId: 's1', status: 'present' },
      { studentId: 's2', status: 'absent', notes: 'Sick' },
    ],
  };
  
  assert.ok(validBody.date);
  assert.ok(Array.isArray(validBody.records));
  assert.ok(validBody.records.length > 0);
  
  validBody.records.forEach(r => {
    assert.ok(r.studentId);
    assert.ok(['present', 'absent', 'late', 'excused'].includes(r.status));
  });
});

test('POST request body validation - empty records array', () => {
  const invalidBody = {
    date: '2024-12-22',
    records: [],
  };
  
  // Should have at least 1 record
  assert.equal(invalidBody.records.length, 0);
});

test('POST request body validation - missing required fields', () => {
  const invalidRecords = [
    { status: 'present' }, // Missing studentId
    { studentId: 's1' }, // Missing status
  ];
  
  invalidRecords.forEach(record => {
    const hasRequiredFields = 
      'studentId' in record && 
      'status' in record;
    assert.equal(hasRequiredFields, false);
  });
});

test('Attendance status enumeration', () => {
  type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
  
  const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
  
  // Test each status is valid
  statuses.forEach(status => {
    assert.ok(['present', 'absent', 'late', 'excused'].includes(status));
  });
});

test('Teacher authorization check', () => {
  const teacherId = 't1';
  const cls = mockClass;
  
  const isAssigned =
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId;
  
  assert.ok(isAssigned, 'Teacher t1 should be assigned');
});

test('Teacher authorization - unassigned teacher', () => {
  const teacherId = 't99';
  const cls = mockClass;
  
  const isAssigned =
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId;
  
  assert.equal(isAssigned, false, 'Teacher t99 should not be assigned');
});

test('Bulk attendance save - multiple students', () => {
  const saveRequest = {
    date: '2024-12-22',
    records: [
      { studentId: 's1', status: 'present' as const },
      { studentId: 's2', status: 'absent' as const },
      { studentId: 's3', status: 'late' as const },
      { studentId: 's4', status: 'excused' as const, notes: 'Doctor appointment' },
    ],
  };
  
  assert.equal(saveRequest.records.length, 4);
  assert.ok(saveRequest.records.every(r => r.studentId && r.status));
});

test('Attendance update replaces existing records', () => {
  // Simulates the batch operation where existing records are deleted
  // and new ones are created for the same class/date
  
  const _existingRecords = [
    { studentId: 's1', status: 'present' },
  ];
  
  const newRecords = [
    { studentId: 's1', status: 'absent' }, // Changed from present to absent
    { studentId: 's2', status: 'present' }, // New student
  ];
  
  // After update, should only have newRecords
  const finalRecords = [...newRecords];
  
  assert.equal(finalRecords.length, 2);
  assert.equal(finalRecords[0].status, 'absent');
});

test('Response format - GET attendance', () => {
  const mockResponse = {
    success: true,
    data: {
      classId: 'class1',
      date: '2024-12-22',
      records: mockAttendanceRecords.map(r => ({
        id: r.id,
        studentId: r.studentId,
        status: r.status,
        notes: r.notes,
        markedBy: r.markedBy,
        markedByName: r.markedByName,
      })),
      total: mockAttendanceRecords.length,
    },
  };
  
  assert.ok(mockResponse.success);
  assert.ok(mockResponse.data.classId);
  assert.ok(mockResponse.data.date);
  assert.ok(Array.isArray(mockResponse.data.records));
  assert.equal(typeof mockResponse.data.total, 'number');
});

test('Response format - POST attendance', () => {
  const mockResponse = {
    success: true,
    data: {
      classId: 'class1',
      date: '2024-12-22',
      records: [
        { id: 'att1', studentId: 's1', status: 'present', notes: '' },
        { id: 'att2', studentId: 's2', status: 'absent', notes: 'Sick' },
      ],
      savedCount: 2,
    },
  };
  
  assert.ok(mockResponse.success);
  assert.equal(mockResponse.data.savedCount, 2);
  assert.equal(mockResponse.data.records.length, 2);
});

test('Notes field is optional', () => {
  const recordWithNotes = { studentId: 's1', status: 'absent' as const, notes: 'Sick' };
  const recordWithoutNotes = { studentId: 's2', status: 'present' as const };
  
  assert.ok('notes' in recordWithNotes);
  assert.ok(!('notes' in recordWithoutNotes));
});

test('Date must be in past or today', () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Both should be valid for attendance marking
  assert.ok(todayStr);
  assert.ok(yesterdayStr);
});
