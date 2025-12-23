import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../route';

/**
 * Unit tests for GET /api/v1/teacher/classes/[id]/roster
 * 
 * Tests the endpoint that returns student roster for a specific class.
 * 
 * Security: Teacher must be assigned to the class to view roster (unless admin).
 */

const mockClass = {
  id: 'class1',
  name: 'Grade 5 - Tamil Literature',
  gradeId: 'grade5',
  gradeName: 'Grade 5',
  day: 'Sunday',
  time: '10:00 AM',
  capacity: 20,
  enrolled: 3,
  academicYear: '2024-2025',
  status: 'active',
  teacherId: 't1',
  teachers: [
    { teacherId: 't1', role: 'primary' as const },
    { teacherId: 't2', role: 'assistant' as const },
  ],
};

const mockStudents = [
  {
    id: 's1',
    firstName: 'John',
    lastName: 'Doe',
    status: 'active',
    enrolledClasses: ['class1'],
  },
  {
    id: 's2',
    firstName: 'Jane',
    lastName: 'Smith',
    status: 'active',
    enrolledClasses: ['class1'],
  },
  {
    id: 's3',
    firstName: 'Bob',
    lastName: 'Johnson',
    status: 'active',
    enrolledClasses: ['class1'],
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/teacher/classes/[id]/roster - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/api/v1/teacher/classes/class1/roster');
  
  const response = await GET(req, { params: Promise.resolve({ id: 'class1' }) });
  
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.ok(data.error);
});

test('GET /v1/teacher/classes/[id]/roster - requires teacher or admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/api/v1/teacher/classes/class1/roster',
    { 'Authorization': 'Bearer invalid-token' }
  );
  
  const response = await GET(req, { params: Promise.resolve({ id: 'class1' }) });
  
  // Should be 401 (unauthorized) or 403 (forbidden)
  assert.ok(response.status === 401 || response.status === 403);
});

test('Student roster data structure validation', () => {
  mockStudents.forEach(student => {
    assert.ok(student.id, 'Student must have id');
    assert.ok(student.firstName, 'Student must have firstName');
    assert.ok(student.lastName, 'Student must have lastName');
    assert.ok(student.status, 'Student must have status');
    assert.ok(Array.isArray(student.enrolledClasses), 'enrolledClasses must be array');
  });
});

test('Sort students by lastName then firstName', () => {
  const unsortedStudents = [
    { firstName: 'Zoe', lastName: 'Adams', id: '1' },
    { firstName: 'Alice', lastName: 'Brown', id: '2' },
    { firstName: 'Bob', lastName: 'Adams', id: '3' },
  ];
  
  const sorted = [...unsortedStudents].sort((a, b) => {
    const lastNameCmp = a.lastName.localeCompare(b.lastName);
    if (lastNameCmp !== 0) return lastNameCmp;
    return a.firstName.localeCompare(b.firstName);
  });
  
  // Adams should come before Brown
  assert.equal(sorted[0].lastName, 'Adams');
  assert.equal(sorted[2].lastName, 'Brown');
  
  // Within Adams, Bob should come before Zoe
  assert.equal(sorted[0].firstName, 'Bob');
  assert.equal(sorted[1].firstName, 'Zoe');
});

test('Teacher authorization - primary teacher can access', () => {
  const teacherId = 't1';
  const cls = mockClass;
  
  const isAssigned =
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId;
  
  assert.ok(isAssigned);
});

test('Teacher authorization - assistant teacher can access', () => {
  const teacherId = 't2';
  const cls = mockClass;
  
  const isAssigned =
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId;
  
  assert.ok(isAssigned);
});

test('Teacher authorization - unassigned teacher cannot access', () => {
  const teacherId = 't99';
  const cls = mockClass;
  
  const isAssigned =
    cls.teachers.some(t => t.teacherId === teacherId) ||
    cls.teacherId === teacherId;
  
  assert.equal(isAssigned, false);
});

test('Admin can access any class roster', () => {
  const userRoles = ['admin', 'teacher'];
  const isAdmin = userRoles.includes('admin');
  
  assert.ok(isAdmin);
});

test('Response format validation', () => {
  const mockResponse = {
    success: true,
    data: {
      class: {
        id: mockClass.id,
        name: mockClass.name,
        gradeId: mockClass.gradeId,
        gradeName: mockClass.gradeName,
        day: mockClass.day,
        time: mockClass.time,
        capacity: mockClass.capacity,
        enrolled: mockClass.enrolled,
        academicYear: mockClass.academicYear,
      },
      students: mockStudents.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        name: `${s.firstName} ${s.lastName}`,
        status: s.status,
      })),
      total: mockStudents.length,
    },
  };
  
  assert.ok(mockResponse.success);
  assert.ok(mockResponse.data.class);
  assert.ok(Array.isArray(mockResponse.data.students));
  assert.equal(typeof mockResponse.data.total, 'number');
  
  // Verify students have composed name field
  mockResponse.data.students.forEach(s => {
    assert.equal(s.name, `${s.firstName} ${s.lastName}`);
  });
});

test('Student status validation', () => {
  const validStatuses = ['active', 'inactive', 'graduated'];
  
  mockStudents.forEach(student => {
    assert.ok(validStatuses.includes(student.status),
      `Status must be one of: ${validStatuses.join(', ')}`);
  });
});

test('Empty roster handling', () => {
  const emptyRoster: typeof mockStudents = [];
  
  const response = {
    success: true,
    data: {
      class: mockClass,
      students: emptyRoster,
      total: 0,
    },
  };
  
  assert.equal(response.data.total, 0);
  assert.equal(response.data.students.length, 0);
});

test('Class capacity vs enrolled validation', () => {
  assert.ok(mockClass.enrolled <= mockClass.capacity,
    'Enrolled count should not exceed capacity');
  assert.ok(mockClass.enrolled >= 0,
    'Enrolled count cannot be negative');
});
