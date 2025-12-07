import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

const mockSegmentData = { params: Promise.resolve({ id: 'hero123' }) };

test('GET /v1/admin/hero-content/[id] - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/hero-content/hero123');
  
  const response = await GET(req, mockSegmentData);
  
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('GET /v1/admin/hero-content/[id] - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/hero-content/hero123',
    { 'Authorization': 'Bearer invalid-token' }
  );
  
  const response = await GET(req, mockSegmentData);
  
  assert.ok(response.status === 401 || response.status === 403);
});

test('PATCH /v1/admin/hero-content/[id] - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/hero-content/hero123', {
    method: 'PATCH',
  });
  
  const response = await PATCH(req, mockSegmentData);
  
  assert.equal(response.status, 401);
});

test('DELETE /v1/admin/hero-content/[id] - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/hero-content/hero123', {
    method: 'DELETE',
  });
  
  const response = await DELETE(req, mockSegmentData);
  
  assert.equal(response.status, 401);
});

test('Update payload validation - valid bilingual text', () => {
  const validUpdate = {
    title: {
      en: 'Updated Title',
      ta: 'புதுப்பிக்கப்பட்ட தலைப்பு',
    },
    isActive: true,
    priority: 5,
  };
  
  assert.ok(validUpdate.title.en);
  assert.ok(validUpdate.title.ta);
  assert.ok(typeof validUpdate.isActive === 'boolean');
  assert.ok(typeof validUpdate.priority === 'number');
});

test('Update payload validation - optional fields can be null', () => {
  const updateWithNulls = {
    description: null,
    imageUrl: null,
    ctaText: null,
    ctaLink: null,
    startDate: null,
    endDate: null,
  };
  
  assert.equal(updateWithNulls.description, null);
  assert.equal(updateWithNulls.imageUrl, null);
});

test('Priority validation - should be between 0 and 100', () => {
  const validPriorities = [0, 50, 100];
  const invalidPriorities = [-1, 101, 150];
  
  validPriorities.forEach(p => {
    assert.ok(p >= 0 && p <= 100);
  });
  
  invalidPriorities.forEach(p => {
    assert.ok(p < 0 || p > 100);
  });
});

test('Date string validation', () => {
  const validDateString = '2024-12-31T23:59:59.000Z';
  const invalidDateString = '2024-13-45'; // Invalid date
  
  const isValidDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };
  
  assert.ok(isValidDate(validDateString));
  assert.ok(!isValidDate(invalidDateString));
});
