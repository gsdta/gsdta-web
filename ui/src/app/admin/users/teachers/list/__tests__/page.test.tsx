import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeachersListPage from '../page';
import { apiFetch } from '@/lib/api-client';

// Mock dependencies
jest.mock('@/components/Protected', () => ({
  Protected: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('TeachersListPage', () => {
  const mockTeachersResponse = {
    success: true,
    data: {
      teachers: [
        {
          uid: 't1',
          email: 'teacher1@example.com',
          name: 'Teacher One',
          roles: ['teacher'],
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          uid: 't2',
          email: 'teacher2@example.com',
          name: 'Teacher Two',
          roles: ['teacher'],
          status: 'active',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render page title and description', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    expect(screen.getByRole('heading', { name: /teachers/i })).toBeInTheDocument();
    expect(screen.getByText(/view and manage all teachers/i)).toBeInTheDocument();
  });

  test('should render search and filter controls', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  test('should show loading state initially', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TeachersListPage />);

    expect(screen.getByText(/loading teachers/i)).toBeInTheDocument();
  });

  test('should display teachers table when data is loaded', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText('Teacher One')).toBeInTheDocument();
      expect(screen.getByText('teacher1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Teacher Two')).toBeInTheDocument();
      expect(screen.getByText('teacher2@example.com')).toBeInTheDocument();
    });
  });

  test('should display table headers', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      // Check for table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for column headers using more specific queries
      // Note: Actions column was removed - rows are now clickable
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /joined/i })).toBeInTheDocument();
    });
  });

  test('should show error state when API fails', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading teachers/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  test('should show empty state when no teachers', async () => {
    mockApiFetch.mockResolvedValue({
      success: true,
      data: {
        teachers: [],
        total: 0,
        limit: 50,
        offset: 0,
      },
    });

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText(/no teachers found/i)).toBeInTheDocument();
    });
  });

  test('should allow searching teachers', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);
    const user = userEvent.setup();

    render(<TeachersListPage />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john'),
        expect.any(Object)
      );
    });
  });

  test('should allow filtering by status', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);
    const user = userEvent.setup();

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText('Teacher One')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'inactive');

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=inactive'),
        expect.any(Object)
      );
    });
  });

  test('should display results count', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText(/showing 1 - 2 of 2 teachers/i)).toBeInTheDocument();
    });
  });

  test('should display active status badge', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      const statusBadges = screen.getAllByText('active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  test('should have clickable rows for each teacher', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      // Rows are now clickable buttons that open an action menu
      const rows = screen.getAllByRole('button');
      // Each teacher row is a button
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('should show pagination when total exceeds limit', async () => {
    mockApiFetch.mockResolvedValue({
      success: true,
      data: {
        teachers: mockTeachersResponse.data.teachers,
        total: 100,
        limit: 50,
        offset: 0,
      },
    });

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });

  test('should disable previous button on first page', async () => {
    mockApiFetch.mockResolvedValue({
      success: true,
      data: {
        teachers: mockTeachersResponse.data.teachers,
        total: 100,
        limit: 50,
        offset: 0,
      },
    });

    render(<TeachersListPage />);

    await waitFor(() => {
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });
  });

  test('should call API with correct pagination parameters', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50&offset=0'),
        expect.any(Object)
      );
    });
  });

  test('should retry on error when clicking try again', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTeachersResponse);
    
    const user = userEvent.setup();

    render(<TeachersListPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading teachers/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Teacher One')).toBeInTheDocument();
    });
  });

  test('should format date correctly', async () => {
    mockApiFetch.mockResolvedValue(mockTeachersResponse);

    render(<TeachersListPage />);

    await waitFor(() => {
      // Should show formatted date (1/1/2024 in US locale)
      const dateText = screen.getAllByText(/1\/1\/2024/);
      expect(dateText.length).toBeGreaterThan(0);
    });
  });
});
