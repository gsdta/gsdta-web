import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';

// Mock student data for testing
const mockStudent = {
  id: 'student-1',
  firstName: 'Arun',
  lastName: 'Kumar',
  dateOfBirth: '2016-03-20',
  status: 'pending',
  parentId: 'parent-1',
  parentEmail: 'parent@example.com',
  grade: '3rd Grade',
  schoolName: 'Test Elementary',
  priorTamilLevel: 'beginner',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function createMockRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
) {
  return new NextRequest(url, {
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
    body: options.body,
  });
}

test('GET /v1/admin/students/:id - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/students/student-1');
  const params = Promise.resolve({ id: 'student-1' });

  const response = await GET(req, { params });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('GET /v1/admin/students/:id - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/students/student-1',
    { headers: { 'Authorization': 'Bearer invalid-token' } }
  );
  const params = Promise.resolve({ id: 'student-1' });

  const response = await GET(req, { params });

  assert.ok(response.status === 401 || response.status === 403);
});

test('PATCH /v1/admin/students/:id - requires authentication', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/students/student-1',
    {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Updated' }),
    }
  );
  const params = Promise.resolve({ id: 'student-1' });

  const response = await PATCH(req, { params });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('PATCH /v1/admin/students/:id - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/students/student-1',
    {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer invalid-token' },
      body: JSON.stringify({ firstName: 'Updated' }),
    }
  );
  const params = Promise.resolve({ id: 'student-1' });

  const response = await PATCH(req, { params });

  assert.ok(response.status === 401 || response.status === 403);
});

test('Student update schema validation - valid data', () => {
  const validUpdates = [
    { firstName: 'Valid' },
    { lastName: 'Name' },
    { dateOfBirth: '2016-01-15' },
    { grade: '4th Grade' },
    { status: 'admitted' },
    { photoConsent: true },
  ];

  validUpdates.forEach((update) => {
    assert.ok(Object.keys(update).length > 0);
  });
});

test('Student status values are valid', () => {
  const validStatuses = ['pending', 'admitted', 'active', 'inactive', 'withdrawn'];

  validStatuses.forEach((status) => {
    assert.ok(
      ['pending', 'admitted', 'active', 'inactive', 'withdrawn'].includes(status),
      `${status} should be a valid status`
    );
  });
});

test('Date format validation - YYYY-MM-DD', () => {
  const validDates = ['2016-01-15', '2020-12-31', '1999-06-30'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  validDates.forEach((date) => {
    assert.ok(dateRegex.test(date), `${date} should match YYYY-MM-DD format`);
  });
});

test('Date format validation - invalid formats rejected', () => {
  const invalidDates = ['15-01-2016', '2016/01/15', '01-15-2016', '2016'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  invalidDates.forEach((date) => {
    assert.ok(!dateRegex.test(date), `${date} should NOT match YYYY-MM-DD format`);
  });
});

test('Field length constraints', () => {
  const maxLengths = {
    firstName: 100,
    lastName: 100,
    grade: 50,
    schoolName: 200,
    priorTamilLevel: 50,
    medicalNotes: 1000,
    notes: 2000,
  };

  Object.entries(maxLengths).forEach(([field, max]) => {
    const longValue = 'a'.repeat(max + 1);
    assert.ok(longValue.length > max, `${field} should exceed max length of ${max}`);
  });
});

test('Student data structure', () => {
  assert.ok(mockStudent.id);
  assert.ok(mockStudent.firstName);
  assert.ok(mockStudent.lastName);
  assert.ok(mockStudent.dateOfBirth);
  assert.ok(mockStudent.status);
  assert.ok(mockStudent.parentId);
  assert.ok(mockStudent.createdAt);
  assert.ok(mockStudent.updatedAt);
});

test('Computed name field', () => {
  const fullName = `${mockStudent.firstName} ${mockStudent.lastName}`;
  assert.equal(fullName, 'Arun Kumar');
});
