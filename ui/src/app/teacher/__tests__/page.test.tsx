import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherDashboardPage from '../page';
import { getTeacherDashboard } from '@/lib/teacher-api';
import { FeatureFlagsProvider } from '@/context/FeatureFlagsContext';

jest.mock('@/lib/teacher-api', () => ({
  getTeacherDashboard: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

// Mock fetch for feature flags
const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <FeatureFlagsProvider>
      {component}
    </FeatureFlagsProvider>
  );
};

describe('TeacherDashboardPage', () => {
  const mockDashboard = {
    teacher: { uid: 'teacher-1', name: 'John Smith', email: 'john@test.com' },
    stats: { totalClasses: 3, totalStudents: 45, classesToday: 1 },
    todaysSchedule: [
      {
        id: 'class-1',
        name: 'Tamil Beginners',
        gradeName: 'Grade 1',
        time: '10:00 AM',
        studentCount: 15,
        teacherRole: 'primary',
        todayAttendance: null,
      },
    ],
    classes: [
      {
        id: 'class-1',
        name: 'Tamil Beginners',
        gradeName: 'Grade 1',
        day: 'Sunday',
        time: '10:00 AM',
        teacherRole: 'primary',
        studentCount: 15,
        capacity: 20,
      },
    ],
    recentAttendance: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock feature flags API to return all features enabled
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          flags: {
            teacher: {
              Classes: { enabled: true },
              Attendance: { enabled: true },
              Messaging: { enabled: true },
            },
          },
          descriptions: {},
        },
      }),
    });
  });

  test('TD-001: Renders loading state initially', () => {
    (getTeacherDashboard as jest.Mock).mockImplementation(() => new Promise(() => {}));
    renderWithProvider(<TeacherDashboardPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('TD-002: Renders welcome message with teacher name', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome, John Smith/i)).toBeInTheDocument();
    });
  });

  test('TD-003: Displays stats overview', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Assigned Classes')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Total Students')).toBeInTheDocument();
    });
  });

  test('TD-004: Shows today\'s schedule when classes exist', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
      // Tamil Beginners appears multiple times, just check at least one exists
      expect(screen.getAllByText('Tamil Beginners').length).toBeGreaterThan(0);
    });
  });

  test('TD-005: Renders quick actions section', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      // These texts appear multiple times in the dashboard
      expect(screen.getAllByText('My Classes').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mark Attendance').length).toBeGreaterThan(0);
    });
  });

  test('TD-006: Quick action links have correct hrefs', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /My Classes/i })).toHaveAttribute('href', '/teacher/classes');
    });
  });

  test('TD-007: Shows error state on API failure', async () => {
    (getTeacherDashboard as jest.Mock).mockRejectedValue(new Error('Failed to load'));
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  test('TD-008: Shows Mark Attendance button when no attendance for today', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      const markBtn = screen.getAllByRole('link', { name: /Mark Attendance/i })[0];
      expect(markBtn).toHaveAttribute('href', '/teacher/classes/class-1/attendance/mark');
    });
  });

  test('TD-009: Shows attendance rate when attendance exists', async () => {
    const dashWithAttendance = {
      ...mockDashboard,
      todaysSchedule: [
        {
          ...mockDashboard.todaysSchedule[0],
          todayAttendance: { present: 12, absent: 2, late: 1, excused: 0, total: 15, attendanceRate: 80 },
        },
      ],
    };
    (getTeacherDashboard as jest.Mock).mockResolvedValue(dashWithAttendance);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('80% present')).toBeInTheDocument();
    });
  });

  test('TD-010: My Classes section shows class cards', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Classes' })).toBeInTheDocument();
      const classLink = screen.getByRole('link', { name: /Tamil Beginners.*Grade 1/s });
      expect(classLink).toHaveAttribute('href', '/teacher/classes/class-1');
    });
  });

  test('TD-011: Messages quick action link exists', async () => {
    (getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    renderWithProvider(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Messages/i })).toHaveAttribute('href', '/teacher/messages');
    });
  });
});
