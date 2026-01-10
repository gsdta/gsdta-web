import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminNewsPostsPage from '../page';
import * as newsPostsApi from '@/lib/news-posts-api';

// Mock the news-posts API
jest.mock('@/lib/news-posts-api', () => ({
  adminGetNewsPosts: jest.fn(),
  adminDeleteNewsPost: jest.fn(),
  adminPublishNewsPost: jest.fn(),
  adminUnpublishNewsPost: jest.fn(),
}));

// Mock the AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    getIdToken: jest.fn().mockResolvedValue('mock-token'),
    user: { uid: 'test-user', roles: ['admin'] },
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/admin/news-posts',
}));

// Mock TableRowActionMenu
jest.mock('@/components/TableRowActionMenu', () => ({
  TableRowActionMenu: ({ actions, onClose }: { actions: any[]; onClose: () => void }) => (
    <div data-testid="action-menu">
      {actions.map((action: any, idx: number) => (
        <button key={idx} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
  useTableRowActions: () => ({
    selectedItem: null,
    menuPosition: null,
    handleRowClick: jest.fn(),
    closeMenu: jest.fn(),
    isMenuOpen: false,
  }),
}));

describe('AdminNewsPostsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page rendering', () => {
    it('should render page header and create button', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('News Posts')).toBeInTheDocument();
        expect(screen.getByText(/Manage news articles/i)).toBeInTheDocument();
        expect(screen.getByText('Create News Post')).toBeInTheDocument();
      });
    });

    it('should render status and category filter dropdowns', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('Status:')).toBeInTheDocument();
        expect(screen.getByText('Category:')).toBeInTheDocument();
        // Verify dropdowns exist
        expect(screen.getByDisplayValue('All')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while fetching data', () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AdminNewsPostsPage />);

      expect(screen.getByRole('status') || document.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no items exist', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('No news posts found.')).toBeInTheDocument();
        expect(screen.getByText('Create your first news post')).toBeInTheDocument();
      });
    });
  });

  describe('News posts list', () => {
    const mockItems = [
      {
        id: '1',
        title: { en: 'Annual Day Celebration', ta: 'ஆண்டு விழா' },
        summary: { en: 'Join us for the celebration', ta: 'கொண்டாட்டத்தில் சேரவும்' },
        body: { en: '<p>Content</p>', ta: '<p>உள்ளடக்கம்</p>' },
        slug: 'annual-day-celebration',
        category: 'events' as const,
        status: 'published' as const,
        docStatus: 'active' as const,
        priority: 50,
        authorId: 'admin1',
        authorName: 'John Admin',
        authorRole: 'admin' as const,
        publishedAt: '2024-12-01T00:00:00Z',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      },
      {
        id: '2',
        title: { en: 'Teacher Training', ta: 'ஆசிரியர் பயிற்சி' },
        summary: { en: 'Upcoming training session', ta: 'வரவிருக்கும் பயிற்சி' },
        body: { en: '<p>Content</p>', ta: '<p>உள்ளடக்கம்</p>' },
        slug: 'teacher-training',
        category: 'announcements' as const,
        status: 'pending_review' as const,
        docStatus: 'active' as const,
        priority: 40,
        authorId: 'teacher1',
        authorName: 'Jane Teacher',
        authorRole: 'teacher' as const,
        createdAt: '2024-11-01T00:00:00Z',
        updatedAt: '2024-11-01T00:00:00Z',
      },
    ];

    it('should display list of news posts', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: mockItems,
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Day Celebration')).toBeInTheDocument();
        expect(screen.getByText('Teacher Training')).toBeInTheDocument();
      });
    });

    it('should show status badges', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: mockItems,
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('Published')).toBeInTheDocument();
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
      });
    });

    it('should show category badges', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: mockItems,
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Announcements')).toBeInTheDocument();
      });
    });

    it('should display author information', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: mockItems,
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Admin')).toBeInTheDocument();
        expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
      });
    });

    it('should show pending review alert when posts are pending', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: mockItems,
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 post pending review/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by status', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        const statusSelect = screen.getByDisplayValue('All');
        fireEvent.change(statusSelect, { target: { value: 'published' } });
      });

      await waitFor(() => {
        expect(newsPostsApi.adminGetNewsPosts).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({ status: 'published' })
        );
      });
    });

    it('should filter by category', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('All Categories');
        fireEvent.change(categorySelect, { target: { value: 'events' } });
      });

      await waitFor(() => {
        expect(newsPostsApi.adminGetNewsPosts).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({ category: 'events' })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message on fetch failure', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Item count', () => {
    it('should show item count', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [
          {
            id: '1',
            title: { en: 'Test', ta: '' },
            summary: { en: 'Test', ta: '' },
            body: { en: '', ta: '' },
            slug: 'test',
            category: 'events',
            status: 'draft',
            docStatus: 'active',
            priority: 50,
            authorId: 'admin1',
            authorName: 'Admin',
            authorRole: 'admin',
            createdAt: '2024-12-01T00:00:00Z',
            updatedAt: '2024-12-01T00:00:00Z',
          },
        ],
        total: 10,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 of 10 items/)).toBeInTheDocument();
      });
    });
  });

  describe('Workflow info box', () => {
    it('should display workflow information', async () => {
      (newsPostsApi.adminGetNewsPosts as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(<AdminNewsPostsPage />);

      await waitFor(() => {
        expect(screen.getByText('News Post Workflow')).toBeInTheDocument();
        // Check for workflow step descriptions (more specific than just status names)
        expect(screen.getByText(/Work in progress, not visible to public/)).toBeInTheDocument();
        expect(screen.getByText(/Submitted by teacher, awaiting admin approval/)).toBeInTheDocument();
        expect(screen.getByText(/Visible to public/)).toBeInTheDocument();
      });
    });
  });
});
