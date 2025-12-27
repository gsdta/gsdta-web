import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherRosterPage from '../page';
import { getClassRoster } from '@/lib/teacher-api';

jest.mock('@/lib/teacher-api', () => ({
  getClassRoster: jest.fn(),
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

describe('TeacherRosterPage', () => {
  const mockRoster = {
    students: [
      {
        id: 'student-1',
        firstName: 'Alice',
        lastName: 'Johnson',
        name: 'Alice Johnson',
        dateOfBirth: '2015-05-15',
        gender: 'Female',
        grade: '3rd',
        status: 'active',
        contacts: [
          { name: 'Mary Johnson', relationship: 'Mother', phone: '555-1234', email: 'mary@test.com', isEmergency: true },
        ],
        medicalNotes: 'Peanut allergy',
      },
      {
        id: 'student-2',
        firstName: 'Bob',
        lastName: 'Smith',
        name: 'Bob Smith',
        status: 'active',
      },
    ],
    total: 2,
    class: {
      id: 'class-1',
      name: 'Tamil Beginners',
      gradeName: 'Grade 1',
      day: 'Sunday',
      time: '10:00 AM',
      teacherRole: 'primary',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TR-001: Renders loading state initially', () => {
    (getClassRoster as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<TeacherRosterPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('TR-002: Displays page heading', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Student Roster/i })).toBeInTheDocument();
    });
  });

  test('TR-003: Shows class name and grade', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tamil Beginners - Grade 1/i)).toBeInTheDocument();
    });
  });

  test('TR-004: Shows total student count', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText('2 students')).toBeInTheDocument();
    });
  });

  test('TR-005: Displays student names', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  test('TR-006: Shows student initials in avatar', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText('AJ')).toBeInTheDocument();
      expect(screen.getByText('BS')).toBeInTheDocument();
    });
  });

  test('TR-007: Shows status badge', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      const statusBadges = screen.getAllByText('active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  test('TR-008: Has search input', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search students/i)).toBeInTheDocument();
    });
  });

  test('TR-009: Search triggers API call', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Search students/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(getClassRoster).toHaveBeenCalledWith('class-1', { search: 'Alice' });
    }, { timeout: 1000 });
  });

  test('TR-010: Shows empty state when no students', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue({ ...mockRoster, students: [], total: 0 });
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText(/No students enrolled/i)).toBeInTheDocument();
    });
  });

  test('TR-011: Student card is expandable', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    // Find and click the student button to expand
    const studentButton = screen.getByRole('button', { name: /Alice Johnson/i });
    fireEvent.click(studentButton);

    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeInTheDocument();
    });
  });

  test('TR-012: Shows medical notes when expanded', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const studentButton = screen.getByRole('button', { name: /Alice Johnson/i });
    fireEvent.click(studentButton);

    await waitFor(() => {
      expect(screen.getByText('Medical Notes')).toBeInTheDocument();
      expect(screen.getByText('Peanut allergy')).toBeInTheDocument();
    });
  });

  test('TR-013: Shows emergency contact indicator', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());

    const studentButton = screen.getByRole('button', { name: /Alice Johnson/i });
    fireEvent.click(studentButton);

    await waitFor(() => {
      expect(screen.getByText('Emergency')).toBeInTheDocument();
    });
  });

  test('TR-014: Shows error state on API failure', async () => {
    (getClassRoster as jest.Mock).mockRejectedValue(new Error('Failed to load roster'));
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load roster')).toBeInTheDocument();
    });
  });

  test('TR-015: Has breadcrumb navigation', async () => {
    (getClassRoster as jest.Mock).mockResolvedValue(mockRoster);
    render(<TeacherRosterPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/teacher');
      expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('href', '/teacher/classes');
    });
  });
});
