import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewNewsPostPage from '../page';
import * as newsPostsApi from '@/lib/news-posts-api';

// Mock the news-posts API
jest.mock('@/lib/news-posts-api', () => ({
  adminCreateNewsPost: jest.fn(),
}));

// Mock the AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    getIdToken: jest.fn().mockResolvedValue('mock-token'),
    user: { uid: 'test-user', roles: ['admin'] },
  }),
}));

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/admin/news-posts/new',
}));

// Mock RichTextEditor
jest.mock('@/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, label, error }: any) => (
    <div data-testid="rich-text-editor">
      <label>{label}</label>
      <textarea
        data-testid={`editor-${label?.toLowerCase().replace(/[^a-z]/g, '-')}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="error">{error}</span>}
    </div>
  ),
}));

// Mock ImageUpload
jest.mock('@/components/ImageUpload', () => ({
  ImageUpload: ({ images, onImagesChange, label, single }: any) => (
    <div data-testid={single ? 'featured-image-upload' : 'gallery-image-upload'}>
      <span>{label}</span>
      <button
        type="button"
        onClick={() =>
          onImagesChange([{ url: 'https://example.com/test.jpg', order: 0, alt: { en: '', ta: '' } }])
        }
      >
        Add Image
      </button>
      <span>Images: {images.length}</span>
    </div>
  ),
}));

describe('NewNewsPostPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page rendering', () => {
    it('should render page header with back link', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByText('Create News Post')).toBeInTheDocument();
      expect(screen.getByText('Back to News Posts')).toBeInTheDocument();
    });

    it('should render language tabs', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Tamil (தமிழ்)')).toBeInTheDocument();
    });

    it('should render form sections', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByText('Categorization')).toBeInTheDocument();
      expect(screen.getByText('Featured Image')).toBeInTheDocument();
      expect(screen.getByText(/Gallery Images/)).toBeInTheDocument();
      expect(screen.getByText('Publishing Options')).toBeInTheDocument();
    });

    it('should render submit buttons', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create as Draft')).toBeInTheDocument();
    });
  });

  describe('Form inputs', () => {
    it('should render title input for English', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByLabelText(/Title \(English\)/)).toBeInTheDocument();
    });

    it('should render summary textarea for English', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByLabelText(/Summary \(English\)/)).toBeInTheDocument();
    });

    it('should render category select', () => {
      render(<NewNewsPostPage />);

      const categorySelect = screen.getByLabelText(/Category/);
      expect(categorySelect).toBeInTheDocument();
      expect(screen.getByText('School News')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Announcements')).toBeInTheDocument();
      expect(screen.getByText('Academic')).toBeInTheDocument();
    });

    it('should render priority input', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByLabelText(/Priority/)).toBeInTheDocument();
    });

    it('should render date inputs', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
    });
  });

  describe('Language tab switching', () => {
    it('should switch to Tamil tab when clicked', () => {
      render(<NewNewsPostPage />);

      const tamilTab = screen.getByText('Tamil (தமிழ்)');
      fireEvent.click(tamilTab);

      expect(screen.getByLabelText(/Title \(Tamil\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Summary \(Tamil\)/)).toBeInTheDocument();
    });

    it('should switch back to English tab', () => {
      render(<NewNewsPostPage />);

      // Switch to Tamil
      fireEvent.click(screen.getByText('Tamil (தமிழ்)'));
      // Switch back to English
      fireEvent.click(screen.getByText('English'));

      expect(screen.getByLabelText(/Title \(English\)/)).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should show error when English title is empty on submit', async () => {
      render(<NewNewsPostPage />);

      const submitButton = screen.getByText('Create as Draft');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('English title is required')).toBeInTheDocument();
      });
    });

    it('should show error when English summary is empty on submit', async () => {
      render(<NewNewsPostPage />);

      // Fill title
      const titleInput = screen.getByLabelText(/Title \(English\)/);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      const submitButton = screen.getByText('Create as Draft');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('English summary is required')).toBeInTheDocument();
      });
    });
  });

  describe('Tags functionality', () => {
    it('should add a tag when clicking Add button', () => {
      render(<NewNewsPostPage />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'test-tag' } });

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      expect(screen.getByText('test-tag')).toBeInTheDocument();
    });

    it('should add a tag when pressing Enter', () => {
      render(<NewNewsPostPage />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'enter-tag' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      expect(screen.getByText('enter-tag')).toBeInTheDocument();
    });

    it('should remove a tag when clicking x', () => {
      render(<NewNewsPostPage />);

      // Add a tag first
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'removable-tag' } });
      fireEvent.click(screen.getByText('Add'));

      // Verify tag is added
      expect(screen.getByText('removable-tag')).toBeInTheDocument();

      // Remove tag
      const removeButton = screen.getByText('×');
      fireEvent.click(removeButton);

      expect(screen.queryByText('removable-tag')).not.toBeInTheDocument();
    });

    it('should not add duplicate tags', () => {
      render(<NewNewsPostPage />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');

      // Add tag first time
      fireEvent.change(tagInput, { target: { value: 'unique-tag' } });
      fireEvent.click(screen.getByText('Add'));

      // Try to add same tag
      fireEvent.change(tagInput, { target: { value: 'unique-tag' } });
      fireEvent.click(screen.getByText('Add'));

      // Should only appear once
      const tags = screen.getAllByText('unique-tag');
      expect(tags).toHaveLength(1);
    });
  });

  describe('Form submission', () => {
    it('should call API and redirect on successful submission', async () => {
      (newsPostsApi.adminCreateNewsPost as jest.Mock).mockResolvedValue({
        id: 'new-post-id',
        slug: 'test-news-post',
      });

      render(<NewNewsPostPage />);

      // Fill required fields
      const titleInput = screen.getByLabelText(/Title \(English\)/);
      fireEvent.change(titleInput, { target: { value: 'Test News Post' } });

      const summaryInput = screen.getByLabelText(/Summary \(English\)/);
      fireEvent.change(summaryInput, { target: { value: 'This is a test summary' } });

      // Fill body (mocked editor)
      const bodyEditor = screen.getByTestId('editor-body--english----');
      fireEvent.change(bodyEditor, { target: { value: '<p>Test content</p>' } });

      // Submit
      const submitButton = screen.getByText('Create as Draft');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(newsPostsApi.adminCreateNewsPost).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            titleEn: 'Test News Post',
            summaryEn: 'This is a test summary',
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/news-posts/new-post-id?created=true');
      });
    });

    it('should show error message on submission failure', async () => {
      (newsPostsApi.adminCreateNewsPost as jest.Mock).mockRejectedValue(
        new Error('Failed to create news post')
      );

      render(<NewNewsPostPage />);

      // Fill required fields
      const titleInput = screen.getByLabelText(/Title \(English\)/);
      fireEvent.change(titleInput, { target: { value: 'Test News Post' } });

      const summaryInput = screen.getByLabelText(/Summary \(English\)/);
      fireEvent.change(summaryInput, { target: { value: 'This is a test summary' } });

      const bodyEditor = screen.getByTestId('editor-body--english----');
      fireEvent.change(bodyEditor, { target: { value: '<p>Test content</p>' } });

      // Submit
      const submitButton = screen.getByText('Create as Draft');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create news post')).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      (newsPostsApi.adminCreateNewsPost as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<NewNewsPostPage />);

      // Fill required fields
      const titleInput = screen.getByLabelText(/Title \(English\)/);
      fireEvent.change(titleInput, { target: { value: 'Test News Post' } });

      const summaryInput = screen.getByLabelText(/Summary \(English\)/);
      fireEvent.change(summaryInput, { target: { value: 'This is a test summary' } });

      const bodyEditor = screen.getByTestId('editor-body--english----');
      fireEvent.change(bodyEditor, { target: { value: '<p>Test content</p>' } });

      // Submit
      const submitButton = screen.getByText('Create as Draft');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  describe('Image upload', () => {
    it('should render featured image upload', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByTestId('featured-image-upload')).toBeInTheDocument();
    });

    it('should render gallery image upload', () => {
      render(<NewNewsPostPage />);

      expect(screen.getByTestId('gallery-image-upload')).toBeInTheDocument();
    });
  });

  describe('Cancel button', () => {
    it('should link back to news posts list', () => {
      render(<NewNewsPostPage />);

      const cancelLink = screen.getByText('Cancel');
      expect(cancelLink).toHaveAttribute('href', '/admin/news-posts');
    });
  });

  describe('Category selection', () => {
    it('should allow changing category', () => {
      render(<NewNewsPostPage />);

      const categorySelect = screen.getByLabelText(/Category/) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'events' } });

      expect(categorySelect.value).toBe('events');
    });
  });

  describe('Priority input', () => {
    it('should allow changing priority', () => {
      render(<NewNewsPostPage />);

      const priorityInput = screen.getByLabelText(/Priority/) as HTMLInputElement;
      fireEvent.change(priorityInput, { target: { value: '75' } });

      expect(priorityInput.value).toBe('75');
    });
  });
});
