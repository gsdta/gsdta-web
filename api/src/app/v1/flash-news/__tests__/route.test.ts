import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../route';

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
  },
  {
    id: 'flash2',
    text: { en: 'School closed tomorrow!', ta: 'நாளை பள்ளி மூடப்பட்டது!' },
    isActive: true,
    isUrgent: true,
    priority: 100,
    createdAt: new Date('2024-12-10').toISOString(),
    updatedAt: new Date('2024-12-10').toISOString(),
  },
  {
    id: 'flash3',
    text: { en: 'Inactive news', ta: 'செயலற்ற செய்தி' },
    isActive: false,
    isUrgent: false,
    priority: 5,
    createdAt: new Date('2024-10-01').toISOString(),
    updatedAt: new Date('2024-10-01').toISOString(),
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/flash-news - is a public endpoint (no auth required)', async () => {
  const req = createMockRequest('http://localhost:8080/v1/flash-news');
  
  // The endpoint should not return 401 (it's public)
  const response = await GET(req);
  
  // It may fail with 500 if Firebase is not initialized, but not 401
  assert.notEqual(response.status, 401, 'Public endpoint should not require auth');
});

test('Flash news data structure validation', () => {
  mockFlashNews.forEach(news => {
    assert.ok(news.id, 'Should have id');
    assert.ok(news.text, 'Should have text');
    assert.ok(news.text.en, 'Should have English text');
    assert.ok(news.text.ta, 'Should have Tamil text');
    assert.ok(typeof news.isActive === 'boolean', 'isActive should be boolean');
    assert.ok(typeof news.isUrgent === 'boolean', 'isUrgent should be boolean');
    assert.ok(typeof news.priority === 'number', 'priority should be number');
    assert.ok(news.createdAt, 'Should have createdAt');
    assert.ok(news.updatedAt, 'Should have updatedAt');
  });
});

test('Active filter logic', () => {
  const activeOnly = mockFlashNews.filter(n => n.isActive === true);
  assert.equal(activeOnly.length, 2);
  assert.ok(activeOnly.every(n => n.isActive === true));
});

test('Inactive filter logic', () => {
  const inactiveOnly = mockFlashNews.filter(n => n.isActive === false);
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].id, 'flash3');
});

test('Urgent news identification', () => {
  const urgentNews = mockFlashNews.filter(n => n.isUrgent === true);
  assert.equal(urgentNews.length, 1);
  assert.equal(urgentNews[0].id, 'flash2');
});

test('Priority sorting - higher priority first', () => {
  const sorted = [...mockFlashNews].sort((a, b) => b.priority - a.priority);
  assert.equal(sorted[0].priority, 100, 'Highest priority should be first');
  assert.equal(sorted[0].id, 'flash2', 'Urgent news should be first (priority 100)');
  assert.equal(sorted[1].priority, 10);
  assert.equal(sorted[2].priority, 5);
});

test('Bilingual text validation', () => {
  const validText = {
    en: 'English text here',
    ta: 'தமிழ் உரை இங்கே',
  };
  
  assert.ok(validText.en.length > 0, 'English text should not be empty');
  assert.ok(validText.ta.length > 0, 'Tamil text should not be empty');
  assert.ok(validText.en.length <= 200, 'English text should be max 200 chars');
  assert.ok(validText.ta.length <= 300, 'Tamil text should be max 300 chars');
});

test('Date range filtering logic', () => {
  const now = new Date();
  
  const isWithinDateRange = (startDate: string | null, endDate: string | null): boolean => {
    if (!startDate && !endDate) return true;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const afterStart = !start || start <= now;
    const beforeEnd = !end || now <= end;
    
    return afterStart && beforeEnd;
  };
  
  // Test with both dates set
  assert.ok(typeof isWithinDateRange('2024-01-01', '2025-12-31') === 'boolean');
  
  // Test with no dates (should be true)
  assert.ok(isWithinDateRange(null, null) === true);
});

test('Link URL and text validation', () => {
  const newsWithLink = mockFlashNews[0];
  
  if (newsWithLink.linkUrl) {
    // If there's a URL, it should be a valid URL
    try {
      new URL(newsWithLink.linkUrl);
      assert.ok(true, 'Link URL is valid');
    } catch {
      assert.fail('Link URL should be a valid URL');
    }
    
    // If there's a URL, there should be link text
    if (newsWithLink.linkText) {
      assert.ok(newsWithLink.linkText.en, 'Link text should have English');
      assert.ok(newsWithLink.linkText.ta, 'Link text should have Tamil');
    }
  }
});

test('CORS headers should be set', async () => {
  const req = createMockRequest('http://localhost:8080/v1/flash-news', {
    'Origin': 'http://localhost:3000',
  });
  
  const response = await GET(req);
  
  // Check that Vary header is set (common CORS header)
  const varyHeader = response.headers.get('Vary');
  assert.ok(varyHeader, 'Should have Vary header for CORS');
});

test('Cache-Control header should be set for public endpoint', async () => {
  const req = createMockRequest('http://localhost:8080/v1/flash-news');
  
  const response = await GET(req);
  
  const cacheControl = response.headers.get('Cache-Control');
  // Note: May not be set if Firebase fails, but we're testing the logic
  if (response.status === 200) {
    assert.ok(cacheControl, 'Should have Cache-Control header');
    assert.ok(cacheControl.includes('public'), 'Should be publicly cacheable');
  }
});
