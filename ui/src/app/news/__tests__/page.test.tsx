import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsPage from '../page';
import * as newsPostsApi from '@/lib/news-posts-api';

// Mock the news-posts API
jest.mock('@/lib/news-posts-api', () => ({
  getPublicNewsPosts: jest.fn(),
}));

// Mock the i18n provider
jest.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    lang: 'en',
    t: (key: string) => key,
  }),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('NewsPage (Public)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPosts = [
    {
      id: 'post1',
      title: { en: 'Annual Day Celebration', ta: 'ஆண்டு விழா' },
      summary: { en: 'Join us for our annual celebration', ta: 'எங்கள் ஆண்டு கொண்டாட்டத்தில் சேருங்கள்' },
      body: { en: '<p>Full article content</p>', ta: '<p>முழு கட்டுரை உள்ளடக்கம்</p>' },
      slug: 'annual-day-celebration-abc123',
      category: 'events' as const,
      tags: ['annual-day', 'celebration'],
      featuredImage: {
        id: 'img1',
        url: 'https://example.com/image.jpg',
        order: 0,
      },
      authorName: 'John Admin',
      publishedAt: '2024-12-01T00:00:00Z',
      priority: 50,
    },
    {
      id: 'post2',
      title: { en: 'School News Update', ta: 'பள்ளி செய்தி புதுப்பிப்பு' },
      summary: { en: 'Latest updates from school', ta: 'பள்ளியிலிருந்து சமீபத்திய புதுப்பிப்புகள்' },
      body: { en: '<p>Article body</p>', ta: '<p>கட்டுரை உள்ளடக்கம்</p>' },
      slug: 'school-news-update-xyz789',
      category: 'school-news' as const,
      authorName: 'Jane Teacher',
      publishedAt: '2024-11-15T00:00:00Z',
      priority: 40,
    },
  ];

  describe('Page rendering', () => {
    it('should render page header', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('News')).toBeInTheDocument();
        expect(screen.getByText('Latest news and announcements from our school')).toBeInTheDocument();
      });
    });

    it('should render category filter buttons', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('School News')).toBeInTheDocument();
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Announcements')).toBeInTheDocument();
        expect(screen.getByText('Academic')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while fetching data', () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<NewsPage />);

      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no posts exist', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('No news posts found')).toBeInTheDocument();
      });
    });
  });

  describe('News posts list', () => {
    it('should display list of news posts', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Day Celebration')).toBeInTheDocument();
        expect(screen.getByText('School News Update')).toBeInTheDocument();
      });
    });

    it('should display post summaries', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Join us for our annual celebration')).toBeInTheDocument();
        expect(screen.getByText('Latest updates from school')).toBeInTheDocument();
      });
    });

    it('should display category badges', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        // Find category badges in cards (distinct from filter buttons)
        const badges = document.querySelectorAll('.rounded-full');
        const badgeTexts = Array.from(badges).map(el => el.textContent);
        expect(badgeTexts).toContain('Events');
        expect(badgeTexts).toContain('School News');
      });
    });

    it('should display author names', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Admin')).toBeInTheDocument();
        expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
      });
    });

    it('should link to article detail pages', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        const links = document.querySelectorAll('a');
        const hrefs = Array.from(links).map(el => el.getAttribute('href'));
        expect(hrefs).toContain('/news/annual-day-celebration-abc123');
        expect(hrefs).toContain('/news/school-news-update-xyz789');
      });
    });

    it('should display featured images when available', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        const images = document.querySelectorAll('img');
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute('src', 'https://example.com/image.jpg');
      });
    });
  });

  describe('Category filtering', () => {
    it('should filter posts by category', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Day Celebration')).toBeInTheDocument();
      });

      // Click on Events filter
      const eventsButton = screen.getByRole('button', { name: 'Events' });
      fireEvent.click(eventsButton);

      await waitFor(() => {
        expect(newsPostsApi.getPublicNewsPosts).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'events' })
        );
      });
    });

    it('should show All category as active by default', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: 'All' });
        expect(allButton).toHaveClass('bg-green-600');
      });
    });
  });

  describe('Pagination', () => {
    it('should show Load More button when hasMore is true', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 20,
        hasMore: true,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('should not show Load More button when hasMore is false', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 2,
        hasMore: false,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Load More')).not.toBeInTheDocument();
      });
    });

    it('should show total count', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockResolvedValue({
        items: mockPosts,
        total: 10,
        hasMore: true,
      });

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 10 news posts')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message on fetch failure', async () => {
      (newsPostsApi.getPublicNewsPosts as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<NewsPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
