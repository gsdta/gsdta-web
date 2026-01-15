import { render, screen, waitFor } from '@testing-library/react';
import NewsArticlePage from '../page';
import * as newsPostsApi from '@/lib/news-posts-api';

// Mock the news-posts API
jest.mock('@/lib/news-posts-api', () => ({
  getPublicNewsPost: jest.fn(),
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

// Mock React's use() for params
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    use: (promise: any) => {
      if (promise && typeof promise.then === 'function') {
        // For our params promise, return the resolved value
        return { slug: 'test-article-slug' };
      }
      return promise;
    },
  };
});

describe('NewsArticlePage (Public)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPost = {
    id: 'post1',
    title: { en: 'Annual Day Celebration', ta: 'ஆண்டு விழா' },
    summary: { en: 'Join us for our annual celebration', ta: 'எங்கள் ஆண்டு கொண்டாட்டத்தில் சேருங்கள்' },
    body: { en: '<p>This is the full article content with <strong>rich text</strong>.</p>', ta: '<p>இது <strong>பணக்கார உரை</strong> கொண்ட முழு கட்டுரை உள்ளடக்கம்.</p>' },
    slug: 'annual-day-celebration-abc123',
    category: 'events' as const,
    tags: ['annual-day', 'celebration', 'school'],
    featuredImage: {
      id: 'img1',
      url: 'https://example.com/image.jpg',
      alt: { en: 'Annual Day Image', ta: 'ஆண்டு விழா படம்' },
      caption: { en: 'Students performing', ta: 'மாணவர்கள் நிகழ்த்துகிறார்கள்' },
      order: 0,
    },
    images: [
      {
        id: 'gallery1',
        url: 'https://example.com/gallery1.jpg',
        thumbnailUrl: 'https://example.com/gallery1-thumb.jpg',
        alt: { en: 'Gallery Image 1', ta: '' },
        order: 0,
      },
      {
        id: 'gallery2',
        url: 'https://example.com/gallery2.jpg',
        alt: { en: 'Gallery Image 2', ta: '' },
        order: 1,
      },
    ],
    authorName: 'John Admin',
    publishedAt: '2024-12-01T00:00:00Z',
    priority: 50,
  };

  describe('Page rendering', () => {
    it('should render article title', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Annual Day Celebration')).toBeInTheDocument();
      });
    });

    it('should render back to news link', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Back to News')).toBeInTheDocument();
      });
    });

    it('should render category badge', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Events')).toBeInTheDocument();
      });
    });

    it('should render author name', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('John Admin')).toBeInTheDocument();
      });
    });

    it('should render article summary', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Join us for our annual celebration')).toBeInTheDocument();
      });
    });

    it('should render article body as HTML', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        // The body is rendered as dangerouslySetInnerHTML, check for text content
        expect(screen.getByText(/This is the full article content/)).toBeInTheDocument();
      });
    });
  });

  describe('Featured image', () => {
    it('should display featured image when available', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        const images = document.querySelectorAll('img');
        const featuredImage = Array.from(images).find(img =>
          img.getAttribute('src') === 'https://example.com/image.jpg'
        );
        expect(featuredImage).toBeTruthy();
      });
    });

    it('should display image caption when available', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Students performing')).toBeInTheDocument();
      });
    });
  });

  describe('Gallery images', () => {
    it('should display gallery section when images exist', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Gallery')).toBeInTheDocument();
      });
    });

    it('should display gallery images', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        const images = document.querySelectorAll('img');
        const galleryImageUrls = Array.from(images).map(img => img.getAttribute('src'));
        expect(galleryImageUrls).toContain('https://example.com/gallery1-thumb.jpg');
      });
    });
  });

  describe('Tags', () => {
    it('should display tags when available', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(mockPost);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Tags')).toBeInTheDocument();
        expect(screen.getByText('annual-day')).toBeInTheDocument();
        expect(screen.getByText('celebration')).toBeInTheDocument();
        expect(screen.getByText('school')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while fetching data', () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-article-slug' })} />);

      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('should display error message when article not found', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockRejectedValue(new Error('News post not found'));

      render(<NewsArticlePage params={Promise.resolve({ slug: 'nonexistent-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('News post not found')).toBeInTheDocument();
      });
    });

    it('should show back to news link on error', async () => {
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-slug' })} />);

      await waitFor(() => {
        expect(screen.getByText('Back to News')).toBeInTheDocument();
      });
    });
  });

  describe('No gallery or tags', () => {
    it('should not display gallery section when no images', async () => {
      const postWithoutGallery = { ...mockPost, images: undefined };
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(postWithoutGallery);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-slug' })} />);

      await waitFor(() => {
        expect(screen.queryByText('Gallery')).not.toBeInTheDocument();
      });
    });

    it('should not display tags section when no tags', async () => {
      const postWithoutTags = { ...mockPost, tags: undefined };
      (newsPostsApi.getPublicNewsPost as jest.Mock).mockResolvedValue(postWithoutTags);

      render(<NewsArticlePage params={Promise.resolve({ slug: 'test-slug' })} />);

      await waitFor(() => {
        expect(screen.queryByText('Tags')).not.toBeInTheDocument();
      });
    });
  });
});
