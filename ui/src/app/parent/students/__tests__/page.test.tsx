import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParentStudentsPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { getMyStudents } from '@/lib/student-api';
import { useSearchParams } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/student-api', () => ({
  getMyStudents: jest.fn(),
}));

// Mock Link since it's used in the component
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('ParentStudentsPage', () => {
  const mockUser = {
    uid: 'test-parent-uid',
    email: 'parent@test.com',
    role: 'parent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
  });

  test('PSP-001: Renders loading state initially', async () => {
    // Make promise not resolve immediately to show loading state
    (getMyStudents as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<ParentStudentsPage />);
    expect(screen.getByText('Loading students...')).toBeInTheDocument();
  });

  test('PSP-002: Renders empty state when no students', async () => {
    (getMyStudents as jest.Mock).mockResolvedValue([]);

    render(<ParentStudentsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading students...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No students registered yet')).toBeInTheDocument();
    const registerLink = screen.getByRole('link', { name: /Register Your First Student/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/parent/students/register');
  });

  test('PSP-003: Renders student cards', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        firstName: 'Arun',
        lastName: 'Kumar',
        status: 'active',
        className: 'Beginner Tamil',
      },
      {
        id: 'student-2',
        firstName: 'Priya',
        lastName: 'Sharma',
        status: 'pending',
      },
    ];
    (getMyStudents as jest.Mock).mockResolvedValue(mockStudents);

    render(<ParentStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Arun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
  });

  test('PSP-004: Displays status badges correctly', async () => {
    const mockStudents = [
      { id: '1', firstName: 'Pending', lastName: 'Student', status: 'pending' },
      { id: '2', firstName: 'Admitted', lastName: 'Student', status: 'admitted' },
      { id: '3', firstName: 'Active', lastName: 'Student', status: 'active' },
    ];
    (getMyStudents as jest.Mock).mockResolvedValue(mockStudents);

    render(<ParentStudentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Pending Review')).toHaveLength(1); // Only in badge, summary says "Pending"
      expect(screen.getAllByText('Admitted')).toHaveLength(2); // Badge + Summary
      expect(screen.getAllByText('Active')).toHaveLength(2); // Badge + Summary
    });
  });

  test('PSP-005: Register button links to registration page (Header)', async () => {
    (getMyStudents as jest.Mock).mockResolvedValue([]);
    render(<ParentStudentsPage />);
    
    await waitFor(() => {
        expect(screen.queryByText('Loading students...')).not.toBeInTheDocument();
    });

    // There are two register links if empty, one in header, one in body. 
    // Header one:
    const headerLink = screen.getAllByRole('link', { name: /Register New Student/i })[0];
    expect(headerLink).toHaveAttribute('href', '/parent/students/register');
  });

  test('PSP-006: Student card shows class info for active students', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        firstName: 'Arun',
        lastName: 'Kumar',
        status: 'active',
        className: 'Beginner Tamil',
      },
    ];
    (getMyStudents as jest.Mock).mockResolvedValue(mockStudents);

    render(<ParentStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Beginner Tamil')).toBeInTheDocument();
    });
  });

  test('PSP-008: Error state displays error message', async () => {
    (getMyStudents as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<ParentStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load students')).toBeInTheDocument();
    });
  });
});
