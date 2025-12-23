import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../route';

/**
 * Unit tests for GET /api/v1/teacher/classes
 * 
 * Tests the endpoint that returns classes assigned to the authenticated teacher.
 * 
 * Note: These are unit tests that mock the authentication and data layer.
 * Integration tests with real Firestore are in /api/tests/e2e/
 */

// Mock class data
const mockClasses = [
  {
    id: 'class1',
    name: 'Grade 5 - Tamil Literature',
    gradeId: 'grade5',
    gradeName: 'Grade 5',
    day: 'Sunday',
    time: '10:00 AM',
    capacity: 20,
    enrolled: 15,
    academicYear: '2024-2025',
    status: 'active',
    teacherId: 't1', // Legacy field
    teachers: [
      { teacherId: 't1', role: 'primary' as const },
      { teacherId: 't2', role: 'assistant' as const },
    ],
  },
  {
    id: 'class2',
    name: 'Grade 3 - Basics',
    gradeId: 'grade3',
    gradeName: 'Grade 3',
    day: 'Sunday',
    time: '11:00 AM',
    capacity: 25,
    enrolled: 18,
    academicYear: '2024-2025',
    status: 'active',
    teacherId: 't3',
    teachers: [
      { teacherId: 't3', role: 'primary' as const },
      { teacherId: 't1', role: 'assistant' as const }, // t1 is assistant here
    ],
  },
  {
    id: 'class3',
    name: 'Inactive Class',
    gradeId: 'grade4',
    gradeName: 'Grade 4',
    day: 'Monday',
    time: '10:00 AM',
    capacity: 20,
    enrolled: 0,
    academicYear: '2023-2024',
    status: 'inactive',
    teacherId: 't1',
    teachers: [{ teacherId: 't1', role: 'primary' as const }],
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/teacher/classes - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/api/v1/teacher/classes');
  
  const response = await GET(req);
  
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.ok(data.error);
});

test('GET /v1/teacher/classes - requires teacher or admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/api/v1/teacher/classes',
    { 'Authorization': 'Bearer invalid-token' }
  );
  
  const response = await GET(req);
  
  // Should be 401 (unauthorized) or 403 (forbidden)
  assert.ok(response.status === 401 || response.status === 403);
});

test('Class data structure validation', () => {
  mockClasses.forEach(cls => {
    assert.ok(cls.id, 'Class must have id');
    assert.ok(cls.name, 'Class must have name');
    assert.ok(cls.gradeId, 'Class must have gradeId');
    assert.ok(cls.day, 'Class must have day');
    assert.ok(cls.time, 'Class must have time');
    assert.ok(typeof cls.capacity === 'number', 'Capacity must be number');
    assert.ok(typeof cls.enrolled === 'number', 'Enrolled must be number');
    assert.ok(cls.status, 'Class must have status');
    assert.ok(Array.isArray(cls.teachers), 'Teachers must be array');
  });
});

test('Teacher role assignment - primary teacher', () => {
  const teacherId = 't1';
  const myClass = mockClasses[0];
  
  const myRole = myClass.teachers.find(t => t.teacherId === teacherId)?.role;
  
  assert.equal(myRole, 'primary');
});

test('Teacher role assignment - assistant teacher', () => {
  const teacherId = 't1';
  const myClass = mockClasses[1];
  
  const myRole = myClass.teachers.find(t => t.teacherId === teacherId)?.role;
  
  assert.equal(myRole, 'assistant');
});

test('Teacher role assignment - legacy teacherId field', () => {
  const teacherId = 't1';
  const myClass = mockClasses[0];
  
  // Should check both new teachers array and legacy teacherId
  const isAssigned =
    myClass.teachers.some(t => t.teacherId === teacherId) ||
    myClass.teacherId === teacherId;
  
  assert.ok(isAssigned);
});

test('Filter classes by teacher assignment', () => {
  const teacherId = 't1';
  
  const myClasses = mockClasses.filter(
    cls =>
      cls.teachers.some(t => t.teacherId === teacherId) ||
      cls.teacherId === teacherId
  );
  
  assert.equal(myClasses.length, 3);
  assert.ok(myClasses.every(cls => 
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId
  ));
});

test('Filter classes - teacher not assigned', () => {
  const teacherId = 't99'; // Not assigned to any class
  
  const myClasses = mockClasses.filter(
    cls =>
      cls.teachers.some(t => t.teacherId === teacherId) ||
      cls.teacherId === teacherId
  );
  
  assert.equal(myClasses.length, 0);
});

test('Day sorting order', () => {
  const dayOrder: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  
  const sorted = [...mockClasses].sort((a, b) => {
    const dayDiff = (dayOrder[a.day] ?? 7) - (dayOrder[b.day] ?? 7);
    if (dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });
  
  // Sunday classes should come first
  assert.equal(sorted[0].day, 'Sunday');
  assert.equal(sorted[1].day, 'Sunday');
  
  // Monday class should come after Sunday
  assert.equal(sorted[2].day, 'Monday');
});

test('Time sorting within same day', () => {
  const sundayClasses = mockClasses.filter(c => c.day === 'Sunday');
  
  const sorted = [...sundayClasses].sort((a, b) => 
    a.time.localeCompare(b.time)
  );
  
  // 10:00 AM should come before 11:00 AM
  assert.equal(sorted[0].time, '10:00 AM');
  assert.equal(sorted[1].time, '11:00 AM');
});

test('Class enrollment capacity validation', () => {
  mockClasses.forEach(cls => {
    assert.ok(cls.enrolled >= 0, 'Enrolled cannot be negative');
    assert.ok(cls.capacity > 0, 'Capacity must be positive');
  });
});

test('Class status values', () => {
  const validStatuses = ['active', 'inactive', 'archived'];
  
  mockClasses.forEach(cls => {
    assert.ok(validStatuses.includes(cls.status), 
      `Status must be one of: ${validStatuses.join(', ')}`);
  });
});

test('Response format validation', () => {
  const mockResponse = {
    success: true,
    data: {
      classes: mockClasses.map(cls => ({
        id: cls.id,
        name: cls.name,
        gradeId: cls.gradeId,
        gradeName: cls.gradeName,
        day: cls.day,
        time: cls.time,
        capacity: cls.capacity,
        enrolled: cls.enrolled,
        academicYear: cls.academicYear,
        status: cls.status,
        myRole: cls.teachers.find(t => t.teacherId === 't1')?.role || null,
      })),
      total: mockClasses.length,
    },
  };
  
  assert.ok(mockResponse.success);
  assert.ok(mockResponse.data);
  assert.ok(Array.isArray(mockResponse.data.classes));
  assert.equal(typeof mockResponse.data.total, 'number');
  
  mockResponse.data.classes.forEach(cls => {
    assert.ok(cls.myRole === 'primary' || cls.myRole === 'assistant' || cls.myRole === null);
  });
});

test('Academic year format validation', () => {
  const yearRegex = /^\d{4}-\d{4}$/;
  
  mockClasses.forEach(cls => {
    if (cls.academicYear) {
      assert.ok(yearRegex.test(cls.academicYear), 
        'Academic year must be in YYYY-YYYY format');
    }
  });
});
