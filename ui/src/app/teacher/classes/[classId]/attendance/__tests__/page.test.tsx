import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherAttendanceHistoryPage from '../page';
import { getClassAttendance, getTeacherClass } from '@/lib/teacher-api';

jest.mock('@/lib/teacher-api', () => ({
  getClassAttendance: jest.fn(),
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

describe('TeacherAttendanceHistoryPage', () => {
  const mockClass = {
    id: 'class-1',
    name: 'Tamil Beginners',
    gradeName: 'Grade 1',
    day: 'Sunday',
    time: '10:00 AM',
    teacherRole: 'primary',
  };

  const mockAttendance = {
    records: [
      {
        id: 'att-1',
        studentId: 'student-1',
        studentName: 'Alice Johnson',
        date: '2024-01-14',
        status: 'present',
        arrivalTime: null,
        notes: null,
        recordedBy: 'teacher-1',
        recordedByName: 'John Smith',
        recordedAt: '2024-01-14T10:30:00Z',
      },
      {
        id: 'att-2',
        studentId: 'student-2',
        studentName: 'Bob Smith',
        date: '2024-01-14',
        status: 'absent',
        notes: 'Sick',
        recordedBy: 'teacher-1',
        recordedByName: 'John Smith',
        recordedAt: '2024-01-14T10:30:00Z',
      },
    ],
    total: 2,
    limit: 50,
    offset: 0,
    summary: {
      date: '2024-01-14',
      classId: 'class-1',
      className: 'Tamil Beginners',
      present: 12,
      absent: 2,
      late: 1,
      excused: 0,
      total: 15,
      attendanceRate: 80,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TAH-001: Renders loading state initially', () => {
    (getTeacherClass as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (getClassAttendance as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<TeacherAttendanceHistoryPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('TAH-002: Displays page heading', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Attendance History/i })).toBeInTheDocument();
    });
  });

  test('TAH-003: Shows class name', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tamil Beginners - Grade 1/i)).toBeInTheDocument();
    });
  });

  test('TAH-004: Shows summary card', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Summary for 2024-01-14')).toBeInTheDocument();
    });
  });

  test('TAH-005: Displays summary statistics', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // Present
      expect(screen.getByText('2')).toBeInTheDocument(); // Absent
      expect(screen.getByText('80%')).toBeInTheDocument(); // Rate
    });
  });

  test('TAH-006: Shows attendance table', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  test('TAH-007: Shows student names in table', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  test('TAH-008: Shows status badges', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('present')).toBeInTheDocument();
      expect(screen.getByText('absent')).toBeInTheDocument();
    });
  });

  test('TAH-009: Has Mark Attendance button', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      const markBtn = screen.getByRole('link', { name: /Mark Attendance/i });
      expect(markBtn).toHaveAttribute('href', '/teacher/classes/class-1/attendance/mark');
    });
  });

  test('TAH-010: Has date filter inputs', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      // Check for date inputs by type since labels aren't associated via htmlFor
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  test('TAH-011: Clear button resets filters', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    // Should trigger reload with no filters
    await waitFor(() => {
      expect(getClassAttendance).toHaveBeenCalled();
    });
  });

  test('TAH-012: Edit link has correct href', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      const editLinks = screen.getAllByRole('link', { name: /Edit/i });
      expect(editLinks[0]).toHaveAttribute('href', '/teacher/classes/class-1/attendance/att-1/edit');
    });
  });

  test('TAH-013: Shows empty state when no records', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue({ ...mockAttendance, records: [], summary: null });
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/No attendance records found/i)).toBeInTheDocument();
    });
  });

  test('TAH-014: Shows error state on API failure', async () => {
    (getTeacherClass as jest.Mock).mockRejectedValue(new Error('Failed to load data'));
    (getClassAttendance as jest.Mock).mockRejectedValue(new Error('Failed to load data'));
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  test('TAH-015: Has breadcrumb navigation', async () => {
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockAttendance);
    render(<TeacherAttendanceHistoryPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/teacher');
    });
  });
});
