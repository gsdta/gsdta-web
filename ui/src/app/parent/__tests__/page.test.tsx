import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentDashboard from '../page';
import { useAuth } from '@/components/AuthProvider';
import { FeatureFlagsProvider } from '@/context/FeatureFlagsContext';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <FeatureFlagsProvider>
      {component}
    </FeatureFlagsProvider>
  );
};

describe('ParentDashboard', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'parent@test.com',
    name: 'Test Parent',
    role: 'parent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    });
  });

  // Helper to setup fetch mock for both feature flags and students API
  const setupFetchMock = (studentsResponse: unknown) => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/v1/feature-flags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              flags: {
                parent: {
                  Students: { enabled: true },
                  StudentRegistration: { enabled: true },
                  Messaging: { enabled: true },
                  Profile: { enabled: true },
                  Settings: { enabled: true },
                },
              },
              descriptions: {},
            },
          }),
        });
      }
      // Students API
      return Promise.resolve(studentsResponse);
    });
  };

  test('PD-001: Renders welcome message with user name', async () => {
    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: [] } }),
    });

    renderWithProvider(<ParentDashboard />);

    expect(screen.getByText(/Welcome back, Test Parent!/)).toBeInTheDocument();
  });

  test('PD-002: Renders loading state initially', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/v1/feature-flags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { flags: { parent: {} }, descriptions: {} },
          }),
        });
      }
      return new Promise(() => {}); // Never resolves for students
    });

    renderWithProvider(<ParentDashboard />);

    // Stats show "..." during loading
    expect(screen.getAllByText('...')).toHaveLength(2); // Linked Students and Active Students
  });

  test('PD-003: Renders Register Student quick action link', async () => {
    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: [] } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.queryAllByText('...')).toHaveLength(0);
    });

    const registerLink = screen.getByRole('link', { name: /Register Student/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/parent/students/register');
  });

  test('PD-004: Renders all quick action links', async () => {
    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: [] } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.queryAllByText('...')).toHaveLength(0);
    });

    // Check all quick action links exist
    expect(screen.getByRole('link', { name: /Register Student/i })).toHaveAttribute('href', '/parent/students/register');
    expect(screen.getByRole('link', { name: /My Students/i })).toHaveAttribute('href', '/parent/students');
    expect(screen.getByRole('link', { name: /My Profile/i })).toHaveAttribute('href', '/parent/profile');
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/parent/settings');
    expect(screen.getByRole('link', { name: /Messages/i })).toHaveAttribute('href', '/parent/messages');
  });

  test('PD-005: Renders empty state with register button when no students', async () => {
    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: [] } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.queryAllByText('...')).toHaveLength(0);
    });

    expect(screen.getByText('No students registered yet')).toBeInTheDocument();
    const emptyStateRegisterLink = screen.getByRole('link', { name: /Register Your First Student/i });
    expect(emptyStateRegisterLink).toBeInTheDocument();
    expect(emptyStateRegisterLink).toHaveAttribute('href', '/parent/students/register');
  });

  test('PD-006: Renders student list when students exist', async () => {
    const mockStudents = [
      { id: '1', name: 'Arun Kumar', grade: '5', status: 'active' },
      { id: '2', name: 'Priya Kumar', grade: '3', status: 'pending' },
    ];

    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: mockStudents } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Arun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Priya Kumar')).toBeInTheDocument();
    });
  });

  test('PD-007: Displays correct student counts', async () => {
    const mockStudents = [
      { id: '1', name: 'Student 1', status: 'active' },
      { id: '2', name: 'Student 2', status: 'active' },
      { id: '3', name: 'Student 3', status: 'pending' },
    ];

    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: mockStudents } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      // Linked Students = 3
      expect(screen.getByText('3')).toBeInTheDocument();
      // Active Students = 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  test('PD-008: Hides empty state when students exist', async () => {
    const mockStudents = [
      { id: '1', name: 'Arun Kumar', status: 'active' },
    ];

    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: mockStudents } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('No students registered yet')).not.toBeInTheDocument();
    });
  });

  test('PD-009: Shows Your Students section with View all link', async () => {
    const mockStudents = [
      { id: '1', name: 'Arun Kumar', status: 'active' },
    ];

    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: mockStudents } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Your Students')).toBeInTheDocument();
    });

    const viewAllLink = screen.getByRole('link', { name: /View all/ });
    expect(viewAllLink).toHaveAttribute('href', '/parent/students');
  });

  test('PD-010: Handles API error gracefully', async () => {
    setupFetchMock({
      ok: false,
      status: 500,
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      // Should show 0 students (fallback) - both linked and active will be 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    // Should show empty state
    expect(screen.getByText('No students registered yet')).toBeInTheDocument();
  });

  test('PD-011: Displays student status badges correctly', async () => {
    const mockStudents = [
      { id: '1', name: 'Active Student', status: 'active' },
      { id: '2', name: 'Pending Student', status: 'pending' },
    ];

    setupFetchMock({
      ok: true,
      json: () => Promise.resolve({ data: { students: mockStudents } }),
    });

    renderWithProvider(<ParentDashboard />);

    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });
});
