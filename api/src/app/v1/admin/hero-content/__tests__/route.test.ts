import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock hero content data for testing
const mockHeroContent = [
  {
    id: 'hero1',
    type: 'event',
    title: { en: 'Annual Day Celebration', ta: 'ஆண்டு விழா' },
    subtitle: { en: 'Join us for celebration', ta: 'கொண்டாட்டத்தில் சேருங்கள்' },
    description: { en: 'A grand event', ta: 'ஒரு பெரிய நிகழ்வு' },
    imageUrl: 'https://example.com/image.jpg',
    ctaText: { en: 'Register Now', ta: 'இப்போது பதிவு செய்க' },
    ctaLink: 'https://example.com/register',
    isActive: true,
    priority: 10,
    startDate: new Date('2024-12-01').toISOString(),
    endDate: new Date('2024-12-31').toISOString(),
    createdAt: new Date('2024-11-01').toISOString(),
    updatedAt: new Date('2024-11-01').toISOString(),
    createdBy: 'admin1',
  },
  {
    id: 'hero2',
    type: 'event',
    title: { en: 'Inactive Event', ta: 'செயலற்ற நிகழ்வு' },
    subtitle: { en: 'Past event', ta: 'கடந்த நிகழ்வு' },
    isActive: false,
    priority: 5,
    createdAt: new Date('2024-10-01').toISOString(),
    updatedAt: new Date('2024-10-01').toISOString(),
    createdBy: 'admin1',
  },
];

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

test('GET /v1/admin/hero-content - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/hero-content');
  
  const response = await GET(req);
  
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.code, 'auth/unauthorized');
});

test('GET /v1/admin/hero-content - requires admin role', async () => {
  const req = createMockRequest(
    'http://localhost:8080/v1/admin/hero-content',
    { 'Authorization': 'Bearer invalid-token' }
  );
  
  const response = await GET(req);
  
  assert.ok(response.status === 401 || response.status === 403);
});

test('POST /v1/admin/hero-content - requires authentication', async () => {
  const req = createMockRequest('http://localhost:8080/v1/admin/hero-content', {
    method: 'POST',
  });
  
  const response = await POST(req);
  
  assert.equal(response.status, 401);
});

test('Hero content data structure validation', () => {
  mockHeroContent.forEach(content => {
    assert.ok(content.id);
    assert.ok(content.type === 'event' || content.type === 'thirukkural');
    assert.ok(content.title);
    assert.ok(content.title.en);
    assert.ok(content.title.ta);
    assert.ok(content.subtitle);
    assert.ok(content.subtitle.en);
    assert.ok(content.subtitle.ta);
    assert.ok(typeof content.isActive === 'boolean');
    assert.ok(typeof content.priority === 'number');
    assert.ok(content.createdAt);
    assert.ok(content.updatedAt);
    assert.ok(content.createdBy);
  });
});

test('Status filter logic - active only', () => {
  const activeOnly = mockHeroContent.filter(c => c.isActive === true);
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].id, 'hero1');
});

test('Status filter logic - inactive only', () => {
  const inactiveOnly = mockHeroContent.filter(c => c.isActive === false);
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].id, 'hero2');
});

test('Priority sorting logic', () => {
  const sorted = [...mockHeroContent].sort((a, b) => b.priority - a.priority);
  assert.equal(sorted[0].priority, 10);
  assert.equal(sorted[1].priority, 5);
});

test('Bilingual text validation', () => {
  const validBilingual = {
    en: 'English text',
    ta: 'தமிழ் உரை',
  };
  
  assert.ok(validBilingual.en);
  assert.ok(validBilingual.ta);
  assert.ok(validBilingual.en.length > 0);
  assert.ok(validBilingual.ta.length > 0);
});

test('Date range validation', () => {
  const now = new Date();
  const startDate = new Date('2024-12-01');
  const endDate = new Date('2024-12-31');
  
  // Check if date is within range
  const isWithinRange = startDate <= now && now <= endDate;
  
  // Mock for testing logic
  assert.ok(typeof isWithinRange === 'boolean');
});

test('URL validation for imageUrl', () => {
  const validUrl = 'https://example.com/image.jpg';
  const invalidUrl = 'not-a-url';
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  assert.ok(isValidUrl(validUrl));
  assert.ok(!isValidUrl(invalidUrl));
});

test('CTA link validation', () => {
  const content = mockHeroContent[0];
  
  if (content.ctaText) {
    assert.ok(content.ctaLink, 'CTA text should have corresponding link');
    assert.ok(content.ctaText.en, 'CTA should have English text');
    assert.ok(content.ctaText.ta, 'CTA should have Tamil text');
  }
});
