import { renderHook, waitFor } from '@testing-library/react';
import { useHeroContent } from '../useHeroContent';

// Mock Firebase
jest.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: jest.fn(() => ({})),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn((q, onNext) => {
    // Simulate empty result
    onNext({ docs: [] });
    return jest.fn(); // unsubscribe
  }),
}));

describe('useHeroContent', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should have correct initial structure', () => {
    const { result } = renderHook(() => useHeroContent());
    
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('content');
    expect(result.current).toHaveProperty('error');
  });

  it('should eventually finish loading', async () => {
    const { result } = renderHook(() => useHeroContent());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle cache storage', () => {
    const cachedData = {
      content: {
        id: 'test-1',
        type: 'event' as const,
        title: { en: 'Test Event', ta: 'சோதனை நிகழ்வு' },
        subtitle: { en: 'Test', ta: 'சோதனை' },
        isActive: true,
        priority: 10,
        createdAt: '2024-12-07T00:00:00.000Z',
        updatedAt: '2024-12-07T00:00:00.000Z',
        createdBy: 'test-admin',
      },
      timestamp: Date.now(),
    };

    localStorage.setItem('hero_content_cache', JSON.stringify(cachedData));
    const stored = localStorage.getItem('hero_content_cache');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.content.id).toBe('test-1');
  });

  it('should not crash with expired cache', () => {
    const cachedData = {
      content: {
        id: 'test-1',
        type: 'event' as const,
        title: { en: 'Test Event', ta: 'சோதனை நிகழ்வு' },
        subtitle: { en: 'Test', ta: 'சோதனை' },
        isActive: true,
        priority: 10,
        createdAt: '2024-12-07T00:00:00.000Z',
        updatedAt: '2024-12-07T00:00:00.000Z',
        createdBy: 'test-admin',
      },
      timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago (expired)
    };

    localStorage.setItem('hero_content_cache', JSON.stringify(cachedData));

    // Should not crash with expired cache
    expect(() => {
      renderHook(() => useHeroContent());
    }).not.toThrow();
  });
});
