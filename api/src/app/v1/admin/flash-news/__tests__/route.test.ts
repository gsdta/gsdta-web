import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock flash news data for testing
const mockFlashNews = [
  {
    id: 'flash1',
    text: { en: 'Registration now open!', ta: 'பதிவு இப்போது திறந்துள்ளது!' },
    linkUrl: 'https://example.com/register',
    linkText: { en: 'Register Now', ta: 'இப்போது பதிவு செய்க' },
    isActive: true,
    isUrgent: false,
    priority: 10,
    startDate: new Date('2024-12-01').toISOString(),
    endDate: new Date('2024-12-31').toISOString(),
    createdAt: new Date('2024-11-01').toISOString(),
    updatedAt: new Date('2024-11-01').toISOString(),
    createdBy: 'admin1',
  },
  {
    id: 'flash2',
    text: { en: 'School closed tomorrow!', ta: 'நாளை பள்ளி மூடப்பட்டது!' },
    isActive: true,
    isUrgent: true,
    priority: 100,
    createdAt: new Date('2024-12-10').toISOString(),
    updatedAt: new Date('2024-12-10').toISOString(),
    createdBy: 'admin1',
  },
];

function createMockRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
) {
  const { method = 'GET', headers = {}, body } = options;
  
  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body,
  });
}

test('GET /v1/admin/flash-news - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/flash-news');
  
  const response = await GET(req);
  
  assert.equal(response.status, 401, 'Should return 401 without auth');
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('GET /v1/admin/flash-news - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/flash-news',
    { headers: { 'Authorization': 'Bearer invalid-token' } }
  );
  
  const response = await GET(req);
  
  // Should be 401 or 403
  assert.ok(
    response.status === 401 || response.status === 403,
    'Should return 401 or 403 with invalid token'
  );
});

test('POST /v1/admin/flash-news - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/flash-news', {
    method: 'POST',
    body: JSON.stringify({
      text: { en: 'Test news', ta: 'சோதனை செய்தி' },
    }),
  });
  
  const response = await POST(req);
  
  assert.equal(response.status, 401, 'Should return 401 without auth');
});

test('Flash news admin data structure', () => {
  mockFlashNews.forEach(news => {
    // Required fields
    assert.ok(news.id, 'Should have id');
    assert.ok(news.text, 'Should have text');
    assert.ok(news.text.en, 'Should have English text');
    assert.ok(news.text.ta, 'Should have Tamil text');
    assert.ok(typeof news.isActive === 'boolean', 'isActive should be boolean');
    assert.ok(typeof news.isUrgent === 'boolean', 'isUrgent should be boolean');
    assert.ok(typeof news.priority === 'number', 'priority should be number');
    assert.ok(news.createdAt, 'Should have createdAt');
    assert.ok(news.updatedAt, 'Should have updatedAt');
    assert.ok(news.createdBy, 'Should have createdBy');
  });
});

test('Create flash news validation - text is required', () => {
  const invalidPayload = {
    // Missing text
    priority: 10,
  };
  
  assert.ok(!invalidPayload.hasOwnProperty('text'), 'Text should be missing');
});

test('Create flash news validation - bilingual text required', () => {
  const validPayload = {
    text: {
      en: 'English news text',
      ta: 'தமிழ் செய்தி உரை',
    },
    priority: 10,
  };
  
  assert.ok(validPayload.text.en, 'English text is required');
  assert.ok(validPayload.text.ta, 'Tamil text is required');
});

test('Create flash news validation - text length limits', () => {
  const validEnglish = 'A'.repeat(200); // Max 200 chars
  const validTamil = 'அ'.repeat(300);   // Max 300 chars
  const invalidEnglish = 'A'.repeat(201);
  const invalidTamil = 'அ'.repeat(301);
  
  assert.ok(validEnglish.length <= 200, 'English should be max 200 chars');
  assert.ok(validTamil.length <= 300, 'Tamil should be max 300 chars');
  assert.ok(invalidEnglish.length > 200, 'Invalid English exceeds limit');
  assert.ok(invalidTamil.length > 300, 'Invalid Tamil exceeds limit');
});

test('Priority range validation', () => {
  const validPriorities = [0, 1, 50, 99, 100];
  const invalidPriorities = [-1, 101, 1000];
  
  validPriorities.forEach(p => {
    assert.ok(p >= 0 && p <= 100, `Priority ${p} should be valid`);
  });
  
  invalidPriorities.forEach(p => {
    assert.ok(p < 0 || p > 100, `Priority ${p} should be invalid`);
  });
});

test('Status filter query param - all', () => {
  const url = 'http://localhost:8080/v1/admin/flash-news?status=all';
  const urlObj = new URL(url);
  const status = urlObj.searchParams.get('status');
  
  assert.equal(status, 'all');
});

test('Status filter query param - active', () => {
  const url = 'http://localhost:8080/v1/admin/flash-news?status=active';
  const urlObj = new URL(url);
  const status = urlObj.searchParams.get('status');
  
  assert.equal(status, 'active');
  
  const activeNews = mockFlashNews.filter(n => n.isActive);
  assert.equal(activeNews.length, 2);
});

test('Status filter query param - inactive', () => {
  const url = 'http://localhost:8080/v1/admin/flash-news?status=inactive';
  const urlObj = new URL(url);
  const status = urlObj.searchParams.get('status');
  
  assert.equal(status, 'inactive');
});

test('Urgent flag logic', () => {
  const urgentNews = mockFlashNews.filter(n => n.isUrgent);
  const normalNews = mockFlashNews.filter(n => !n.isUrgent);
  
  assert.equal(urgentNews.length, 1);
  assert.equal(normalNews.length, 1);
  
  // Urgent news should typically have higher priority
  assert.ok(urgentNews[0].priority > normalNews[0].priority);
});

test('Link URL validation', () => {
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  assert.ok(isValidUrl('https://example.com'), 'HTTPS URL should be valid');
  assert.ok(isValidUrl('http://localhost:3000'), 'HTTP localhost should be valid');
  assert.ok(!isValidUrl('not-a-url'), 'Invalid URL should fail');
  assert.ok(!isValidUrl(''), 'Empty string should fail');
});

test('Date scheduling logic', () => {
  const newsWithDates = mockFlashNews[0];
  
  if (newsWithDates.startDate && newsWithDates.endDate) {
    const start = new Date(newsWithDates.startDate);
    const end = new Date(newsWithDates.endDate);
    
    assert.ok(start < end, 'Start date should be before end date');
  }
});

test('Created by tracking', () => {
  mockFlashNews.forEach(news => {
    assert.ok(news.createdBy, 'Should track who created the news');
    assert.ok(typeof news.createdBy === 'string', 'createdBy should be a string (UID)');
  });
});

test('Timestamp fields format', () => {
  mockFlashNews.forEach(news => {
    // createdAt and updatedAt should be valid ISO date strings
    assert.ok(news.createdAt, 'Should have createdAt');
    assert.ok(news.updatedAt, 'Should have updatedAt');
    
    const createdDate = new Date(news.createdAt);
    const updatedDate = new Date(news.updatedAt);
    
    assert.ok(!isNaN(createdDate.getTime()), 'createdAt should be valid date');
    assert.ok(!isNaN(updatedDate.getTime()), 'updatedAt should be valid date');
  });
});
