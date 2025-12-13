import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherAssignmentPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetClasses, adminAssignTeacher } from '@/lib/class-api';
import { adminGetGradeOptions } from '@/lib/grade-api';
import { apiFetch } from '@/lib/api-client';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/class-api', () => ({
  adminGetClasses: jest.fn(),
  adminAssignTeacher: jest.fn(),
  adminRemoveTeacher: jest.fn(),
}));

jest.mock('@/lib/grade-api', () => ({
  adminGetGradeOptions: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('TeacherAssignmentPage', () => {
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  
  const mockClasses = [
    {
      id: 'class-1',
      name: 'PS-1 Section A',
      gradeId: 'ps-1',
      gradeName: 'Pre-School 1',
      day: 'Saturday',
      time: '10:00 AM - 12:00 PM',
      capacity: 15,
      enrolled: 2,
      status: 'active' as const,
      teachers: [
        {
          teacherId: 'teacher-1',
          teacherName: 'John Doe',
          teacherEmail: 'john@test.com',
          role: 'primary' as const,
          assignedAt: '2024-01-01',
          assignedBy: 'admin-1',
        },
      ],
      available: 13,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'class-2',
      name: 'Grade 3 Section A',
      gradeId: 'grade-3',
      gradeName: 'Grade 3',
      day: 'Sunday',
      time: '2:00 PM - 4:00 PM',
      capacity: 20,
      enrolled: 0,
      status: 'active' as const,
      teachers: [],
      available: 20,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockTeachers = [
    { uid: 'teacher-1', email: 'john@test.com', name: 'John Doe', status: 'active' },
    { uid: 'teacher-2', email: 'jane@test.com', name: 'Jane Smith', status: 'active' },
  ];

  const mockGrades = [
    { id: 'ps-1', name: 'PS-1', displayName: 'Pre-School 1', displayOrder: 1 },
    { id: 'grade-3', name: 'Grade-3', displayName: 'Grade 3', displayOrder: 6 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    (apiFetch as jest.Mock).mockResolvedValue({
      success: true,
      data: { teachers: mockTeachers, total: 2 },
    });
    (adminGetGradeOptions as jest.Mock).mockResolvedValue(mockGrades);
  });

  test('renders loading state initially', () => {
    render(<TeacherAssignmentPage />);
    expect(screen.getByText(/loading teacher assignments/i)).toBeInTheDocument();
  });

  test('renders page with classes after loading', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Teacher Assignments')).toBeInTheDocument();
    });

    expect(screen.getByText('PS-1 Section A')).toBeInTheDocument();
    expect(screen.getByText('Grade 3 Section A')).toBeInTheDocument();
  });

  test('displays teacher workload summary', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Teacher Workload')).toBeInTheDocument();
    });

    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 class/i)).toBeInTheDocument();
  });

  test('shows assigned and unassigned counts', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/1 assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/1 unassigned/i)).toBeInTheDocument();
    });
  });

  test('filters classes by grade', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('PS-1 Section A')).toBeInTheDocument();
      expect(screen.getByText('Grade 3 Section A')).toBeInTheDocument();
    });

    const gradeFilter = screen.getByLabelText(/grade:/i);
    fireEvent.change(gradeFilter, { target: { value: 'ps-1' } });

    await waitFor(() => {
      expect(screen.getByText('PS-1 Section A')).toBeInTheDocument();
      expect(screen.queryByText('Grade 3 Section A')).not.toBeInTheDocument();
    });
  });

  test('filters to show unassigned only', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('PS-1 Section A')).toBeInTheDocument();
      expect(screen.getByText('Grade 3 Section A')).toBeInTheDocument();
    });

    const unassignedCheckbox = screen.getByLabelText(/show unassigned only/i);
    fireEvent.click(unassignedCheckbox);

    await waitFor(() => {
      expect(screen.queryByText('PS-1 Section A')).not.toBeInTheDocument();
      expect(screen.getByText('Grade 3 Section A')).toBeInTheDocument();
    });
  });

  test('shows empty state when no classes match filters', async () => {
    render(<TeacherAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('PS-1 Section A')).toBeInTheDocument();
    });

    const gradeFilter = screen.getByLabelText(/grade:/i);
    fireEvent.change(gradeFilter, { target: { value: 'non-existent-grade' } });

    await waitFor(() => {
      expect(screen.getByText(/no classes found matching your filters/i)).toBeInTheDocument();
    });
  });
});
