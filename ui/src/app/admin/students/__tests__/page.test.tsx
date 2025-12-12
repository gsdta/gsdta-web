import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminStudentsPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudents, adminAdmitStudent } from '@/lib/student-api';
import { useRouter, useSearchParams } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/student-api', () => ({
  adminGetStudents: jest.fn(),
  adminAdmitStudent: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('AdminStudentsPage', () => {
  const mockPush = jest.fn();
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockStudents = [
    {
      id: 'student-1',
      firstName: 'Arun',
      lastName: 'Kumar',
      status: 'pending',
      parentEmail: 'parent@test.com',
      createdAt: '2024-01-01',
    },
    {
      id: 'student-2',
      firstName: 'Priya',
      lastName: 'Sharma',
      status: 'active',
      parentEmail: 'parent2@test.com',
      createdAt: '2024-01-02',
      className: 'Tamil Basic',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
      toString: jest.fn().mockReturnValue(''),
    });
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  test('ASL-001: Renders loading state', async () => {
    (adminGetStudents as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<AdminStudentsPage />);
    expect(screen.getByText('Loading students...')).toBeInTheDocument();
  });

  const mockCounts = {
    pending: 1,
    admitted: 0,
    active: 1,
    inactive: 0,
    withdrawn: 0,
  };

  test('ASL-002: Renders student table', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: mockStudents, counts: mockCounts });
    render(<AdminStudentsPage />);
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  test('ASL-003: Displays student name in table', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: mockStudents, counts: mockCounts });
    render(<AdminStudentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Arun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
  });

  test('ASL-004: Displays status badges', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: mockStudents, counts: mockCounts });
    render(<AdminStudentsPage />);
    await waitFor(() => {
      // Use getAllByText because status text appears in stats cards and table badges
      expect(screen.getAllByText('Pending Review')).toHaveLength(1); // Only badge ("Pending" in stats)
      expect(screen.getAllByText('Active')).toHaveLength(3); // Badge + Stats + Filter Option
    });
  });

  test('ASL-005: Filter dropdown changes status filter', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [], counts: mockCounts });
    render(<AdminStudentsPage />);
    
    await waitFor(() => expect(screen.queryByText('Loading students...')).not.toBeInTheDocument());

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pending' } });

    // Should call API with new filter
    await waitFor(() => {
      expect(adminGetStudents).toHaveBeenLastCalledWith(mockGetIdToken, expect.objectContaining({ status: 'pending' }));
    });
    
    // Should update URL
    expect(mockPush).toHaveBeenCalledWith('/admin/students?status=pending');
  });

  test('ASL-007: Admit button visible for pending students', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [mockStudents[0]], counts: mockCounts }); // pending
    render(<AdminStudentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Admit')).toBeInTheDocument();
    });
  });

  test('ASL-008: Admit button hidden for active students', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [mockStudents[1]], counts: mockCounts }); // active
    render(<AdminStudentsPage />);
    await waitFor(() => {
      expect(screen.queryByText('Admit')).not.toBeInTheDocument();
    });
  });

  test('ASL-009: Click admit calls API', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [mockStudents[0]], counts: mockCounts });
    (adminAdmitStudent as jest.Mock).mockResolvedValue({});
    
    render(<AdminStudentsPage />);
    await waitFor(() => expect(screen.getByText('Admit')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Admit'));
    
    expect(global.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(adminAdmitStudent).toHaveBeenCalledWith(mockGetIdToken, 'student-1');
      // Should refresh list
      expect(adminGetStudents).toHaveBeenCalledTimes(2);
    });
  });

  test('ASL-010: View link navigates to student details', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [mockStudents[0]], counts: mockCounts });
    render(<AdminStudentsPage />);
    await waitFor(() => {
        expect(screen.getByText('View')).toHaveAttribute('href', '/admin/students/student-1');
    });
  });

  test('ASL-011: Empty state when no students', async () => {
    (adminGetStudents as jest.Mock).mockResolvedValue({ students: [], counts: mockCounts });
    render(<AdminStudentsPage />);
    await waitFor(() => {
      expect(screen.getByText('No students found')).toBeInTheDocument();
    });
  });
});
