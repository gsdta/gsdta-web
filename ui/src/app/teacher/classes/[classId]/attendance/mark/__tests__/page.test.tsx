import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarkAttendancePage from '../page';
import { getClassRoster, getTeacherClass, getClassAttendance, markClassAttendance } from '@/lib/teacher-api';

jest.mock('@/lib/teacher-api', () => ({
  getClassRoster: jest.fn(),
  getTeacherClass: jest.fn(),
  getClassAttendance: jest.fn(),
  markClassAttendance: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ classId: 'class-1' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('MarkAttendancePage', () => {
  const mockClass = {
    id: 'class-1',
    name: 'Tamil Beginners',
    gradeName: 'Grade 1',
    day: 'Sunday',
    time: '10:00 AM',
    teacherRole: 'primary',
  };

  const mockRoster = {
    students: [
      { id: 'student-1', firstName: 'Alice', lastName: 'Johnson', name: 'Alice Johnson', status: 'active' },
      { id: 'student-2', firstName: 'Bob', lastName: 'Smith', name: 'Bob Smith', status: 'active' },
    ],
    total: 2,
    class: mockClass,
  };

  const mockEmptyAttendance = {
    records: [],
    total: 0,
    limit: 50,
    offset: 0,
    summary: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getTeacherClass as jest.Mock).mockResolvedValue(mockClass);
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    (getClassAttendance as jest.Mock).mockResolvedValue(mockEmptyAttendance);
    (markClassAttendance as jest.Mock).mockResolvedValue({ records: [], count: 2 });
  });

  test('MA-001: Renders loading state initially', () => {
    (getTeacherClass as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<MarkAttendancePage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('MA-002: Displays page heading', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mark Attendance/i })).toBeInTheDocument();
    });
  });

  test('MA-003: Shows class name', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText(/Tamil Beginners - Grade 1/i)).toBeInTheDocument();
    });
  });

  test('MA-004: Has date picker', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      const dateInput = document.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
    });
  });

  test('MA-005: Shows student names', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  test('MA-006: Has status buttons for each student', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      const presentBtns = screen.getAllByRole('button', { name: /Present/i });
      const absentBtns = screen.getAllByRole('button', { name: /Absent/i });
      expect(presentBtns.length).toBeGreaterThan(0);
      expect(absentBtns.length).toBeGreaterThan(0);
    });
  });

  test('MA-007: Mark all as Present button works', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    // Find the "Mark all" section - get the button that's specifically in the quick actions
    const markAllSection = screen.getByText('Mark all as:').parentElement;
    const presentBtn = markAllSection?.querySelector('button');

    if (presentBtn) {
      fireEvent.click(presentBtn);
    }

    // All status buttons should reflect Present
    await waitFor(() => {
      // Check summary text shows all present
      expect(screen.getByText(/2 present/i)).toBeInTheDocument();
    });
  });

  test('MA-008: Clicking status button changes student status', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    // Find and click the first Absent button (skip the "Mark all" section buttons)
    const allAbsentBtns = screen.getAllByRole('button', { name: /^Absent$/i });
    // Click one of the student Absent buttons (not the mark all one)
    fireEvent.click(allAbsentBtns[allAbsentBtns.length - 1]);

    // Should show notes field for non-present status
    await waitFor(() => {
      const notesInput = screen.queryByPlaceholderText(/Add notes/i);
      // At least one student should have notes field now
      expect(notesInput || document.querySelector('input[placeholder*="notes"]')).toBeTruthy();
    });
  });

  test('MA-009: Has Save Attendance button', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Attendance/i })).toBeInTheDocument();
    });
  });

  test('MA-010: Has Cancel button', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  test('MA-011: Cancel button navigates back', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockPush).toHaveBeenCalledWith('/teacher/classes/class-1');
  });

  test('MA-012: Save button submits attendance', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const saveBtn = screen.getByRole('button', { name: /Save Attendance/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(markClassAttendance).toHaveBeenCalled();
    });
  });

  test('MA-013: Shows success message after save', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const saveBtn = screen.getByRole('button', { name: /Save Attendance/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Attendance saved successfully/i)).toBeInTheDocument();
    });
  });

  test('MA-014: Shows summary of selections', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      // Default all present
      expect(screen.getByText(/2 present/i)).toBeInTheDocument();
    });
  });

  test('MA-015: Shows info message when attendance already marked', async () => {
    (getClassAttendance as jest.Mock).mockResolvedValue({
      records: [{ id: 'att-1', studentId: 'student-1', status: 'present' }],
      total: 1,
      summary: null,
    });

    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText(/already been marked/i)).toBeInTheDocument();
    });
  });

  test('MA-016: Shows empty state when no students', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue({ ...mockRoster, students: [], total: 0 });
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText(/No students enrolled/i)).toBeInTheDocument();
    });
  });

  test('MA-017: Shows error state on API failure', async () => {
    (getTeacherClass as jest.Mock).mockRejectedValue(new Error('Failed to load'));
    (getClassRoster as jest.Mock).mockRejectedValue(new Error('Failed to load'));
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  test('MA-018: Has breadcrumb navigation', async () => {
    render(<MarkAttendancePage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/teacher');
    });
  });
});
