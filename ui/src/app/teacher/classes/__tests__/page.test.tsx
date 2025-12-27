import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherClassesPage from '../page';
import { getTeacherClasses } from '@/lib/teacher-api';

jest.mock('@/lib/teacher-api', () => ({
  getTeacherClasses: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('TeacherClassesPage', () => {
  const mockClasses = [
    {
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
    },
    {
      id: 'class-2',
      name: 'Tamil Advanced',
      gradeId: 'grade-2',
      gradeName: 'Grade 5',
      day: 'Sunday',
      time: '11:00 AM',
      capacity: 15,
      enrolled: 10,
      available: 5,
      teacherRole: 'assistant',
      status: 'active',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-001: Renders loading state initially', () => {
    (getTeacherClasses as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<TeacherClassesPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('TC-002: Renders page heading', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Classes/i })).toBeInTheDocument();
    });
  });

  test('TC-003: Displays class cards', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Tamil Beginners')).toBeInTheDocument();
      expect(screen.getByText('Tamil Advanced')).toBeInTheDocument();
    });
  });

  test('TC-004: Shows class grade name', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Grade 1')).toBeInTheDocument();
      expect(screen.getByText('Grade 5')).toBeInTheDocument();
    });
  });

  test('TC-005: Shows enrollment count', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('15/20 students')).toBeInTheDocument();
    });
  });

  test('TC-006: Shows teacher role badge', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.getByText('assistant')).toBeInTheDocument();
    });
  });

  test('TC-007: View Details link has correct href', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      const detailsLinks = screen.getAllByRole('link', { name: /View Details/i });
      expect(detailsLinks[0]).toHaveAttribute('href', '/teacher/classes/class-1');
    });
  });

  test('TC-008: Roster link has correct href', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      const rosterLinks = screen.getAllByRole('link', { name: /Roster/i });
      expect(rosterLinks[0]).toHaveAttribute('href', '/teacher/classes/class-1/roster');
    });
  });

  test('TC-009: Shows empty state when no classes', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue([]);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText(/not assigned to any classes/i)).toBeInTheDocument();
    });
  });

  test('TC-010: Shows error state on API failure', async () => {
    (getTeacherClasses as jest.Mock).mockRejectedValue(new Error('Failed to load classes'));
    render(<TeacherClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load classes')).toBeInTheDocument();
    });
  });

  test('TC-011: Shows day and time for each class', async () => {
    (getTeacherClasses as jest.Mock).mockResolvedValue(mockClasses);
    render(<TeacherClassesPage />);
    await waitFor(() => {
      // Both classes are on Sunday, so multiple elements exist
      expect(screen.getAllByText('Sunday').length).toBeGreaterThan(0);
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });
  });
});
