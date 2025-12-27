import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherClassDetailPage from '../page';
import { getTeacherClass } from '@/lib/teacher-api';

jest.mock('@/lib/teacher-api', () => ({
  getTeacherClass: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

jest.mock('next/navigation', () => ({
  useParams: () => ({ classId: 'class-1' }),
}));

describe('TeacherClassDetailPage', () => {
  const mockClass = {
    id: 'class-1',
    name: 'Tamil Beginners',
    gradeId: 'grade-1',
    gradeName: 'Grade 1',
    day: 'Sunday',
    time: '10:00 AM',
    capacity: 20,
    enrolled: 15,
    available: 5,
    teacherRole: 'primary',
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TCD-001: Renders loading state initially', () => {
    (getTeacherClass as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<TeacherClassDetailPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('TCD-002: Displays class name as heading', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tamil Beginners' })).toBeInTheDocument();
    });
  });

  test('TCD-003: Shows grade name', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Grade 1')).toBeInTheDocument();
    });
  });

  test('TCD-004: Shows teacher role badge', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
    });
  });

  test('TCD-005: Shows class information section', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Class Information' })).toBeInTheDocument();
    });
  });

  test('TCD-006: Displays day and time', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Sunday')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });
  });

  test('TCD-007: Shows enrollment information', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('15/20 students')).toBeInTheDocument();
    });
  });

  test('TCD-008: Shows available spots', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Available Spots')).toBeInTheDocument();
    });
  });

  test('TCD-009: View Roster quick action has correct href', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      const rosterLink = screen.getByRole('link', { name: /View Roster/i });
      expect(rosterLink).toHaveAttribute('href', '/teacher/classes/class-1/roster');
    });
  });

  test('TCD-010: Mark Attendance quick action has correct href', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      const attendanceLink = screen.getByRole('link', { name: /Mark Attendance/i });
      expect(attendanceLink).toHaveAttribute('href', '/teacher/classes/class-1/attendance/mark');
    });
  });

  test('TCD-011: Attendance History quick action has correct href', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      const historyLink = screen.getByRole('link', { name: /Attendance History/i });
      expect(historyLink).toHaveAttribute('href', '/teacher/classes/class-1/attendance');
    });
  });

  test('TCD-012: Shows error state on API failure', async () => {
    (getTeacherClass as jest.Mock).mockRejectedValue(new Error('Failed to load class'));
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load class')).toBeInTheDocument();
    });
  });

  test('TCD-013: Has breadcrumb navigation', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    render(<TeacherClassDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/teacher');
      expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('href', '/teacher/classes');
    });
  });
});
