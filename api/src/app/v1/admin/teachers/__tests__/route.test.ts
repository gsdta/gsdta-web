import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock teachers data for testing
const mockTeachers = [
  {
    uid: 't1',
    email: 'teacher1@example.com',
    name: 'Teacher One',
    roles: ['teacher'],
    status: 'active',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    uid: 't2',
    email: 'teacher2@example.com',
    name: 'Teacher Two',
    roles: ['teacher'],
    status: 'active',
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
  },
  {
    uid: 't3',
    email: 'inactive@example.com',
    name: 'Inactive Teacher',
    roles: ['teacher'],
    status: 'inactive',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/admin/teachers - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/teachers');
  
  const response = await GET(req);
  
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('GET /v1/admin/teachers - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/teachers',
    { 'Authorization': 'Bearer invalid-token' }
  );
  
  const response = await GET(req);
  
  assert.ok(response.status === 401 || response.status === 403);
});

test('Teacher data structure validation', () => {
  mockTeachers.forEach(teacher => {
    assert.ok(teacher.uid);
    assert.ok(teacher.email);
    assert.ok(teacher.name);
    assert.ok(Array.isArray(teacher.roles));
    assert.ok(teacher.status);
    assert.ok(teacher.createdAt);
    assert.ok(teacher.updatedAt);
  });
});

test('Search filter logic', () => {
  const search = 'one';
  const filtered = mockTeachers.filter(t => 
    t.name.toLowerCase().includes(search) ||
    t.email.toLowerCase().includes(search)
  );
  
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].uid, 't1');
});

test('Status filter logic - active only', () => {
  const activeOnly = mockTeachers.filter(t => t.status === 'active');
  assert.equal(activeOnly.length, 2);
});

test('Status filter logic - inactive only', () => {
  const inactiveOnly = mockTeachers.filter(t => t.status === 'inactive');
  assert.equal(inactiveOnly.length, 1);
});

test('Pagination logic', () => {
  const limit = 2;
  const offset = 0;
  
  const page1 = mockTeachers.slice(offset, offset + limit);
  assert.equal(page1.length, 2);
  assert.equal(page1[0].uid, 't1');
});

test('Limit bounds checking', () => {
  const testLimit = (input: string, expected: number) => {
    const parsed = Math.min(Math.max(1, parseInt(input || '50')), 100);
    assert.equal(parsed, expected);
  };
  
  testLimit('150', 100);
  testLimit('0', 1);
  testLimit('50', 50);
});

test('Offset bounds checking', () => {
  const parsed = Math.max(0, parseInt('-10'));
  assert.equal(parsed, 0);
});
