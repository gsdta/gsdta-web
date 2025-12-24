import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassRosterPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetClassRoster, adminRemoveStudentFromClass } from '@/lib/class-api';
import { useParams } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/class-api', () => ({
  adminGetClassRoster: jest.fn(),
  adminRemoveStudentFromClass: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('ClassRosterPage', () => {
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockRosterData = {
    class: {
      id: 'class-1',
      name: 'Tamil Grade 3A',
      gradeId: 'grade-3',
      gradeName: 'Grade 3',
      capacity: 25,
      enrolled: 2,
    },
    students: [
      {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        grade: 'Grade 3',
        status: 'active',
        parentEmail: 'parent1@test.com',
      },
      {
        id: 'student-2',
        firstName: 'Jane',
        lastName: 'Smith',
        name: 'Jane Smith',
        grade: 'Grade 3',
        status: 'active',
        parentEmail: 'parent2@test.com',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useParams as jest.Mock).mockReturnValue({ id: 'class-1' });
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  test('ROSTER-001: Renders loading state', async () => {
    (adminGetClassRoster as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<ClassRosterPage />);
    
    // Check for loading skeleton elements
    const skeletons = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('ROSTER-002: Renders roster with students', async () => {
    (adminGetClassRoster as jest.Mock).mockResolvedValue(mockRosterData);
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Tamil Grade 3A - Roster')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('ROSTER-003: Displays class capacity correctly', async () => {
    (adminGetClassRoster as jest.Mock).mockResolvedValue(mockRosterData);
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/2 \/ 25 students/)).toBeInTheDocument();
      expect(screen.getByText(/23 spots available/)).toBeInTheDocument();
    });
  });

  test('ROSTER-004: Shows full indicator when at capacity', async () => {
    const fullRosterData = {
      ...mockRosterData,
      class: { ...mockRosterData.class, enrolled: 25 },
    };
    (adminGetClassRoster as jest.Mock).mockResolvedValue(fullRosterData);
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/\(Full\)/)).toBeInTheDocument();
    });
  });

  test('ROSTER-005: Displays student information correctly', async () => {
    (adminGetClassRoster as jest.Mock).mockResolvedValue(mockRosterData);
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('parent1@test.com')).toBeInTheDocument();
      expect(screen.getByText('parent2@test.com')).toBeInTheDocument();
    });
  });

  test('ROSTER-006: Remove button calls API correctly', async () => {
    (adminGetClassRoster as jest.Mock).mockResolvedValue(mockRosterData);
    (adminRemoveStudentFromClass as jest.Mock).mockResolvedValue(undefined);
    
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(adminRemoveStudentFromClass).toHaveBeenCalledWith(
        mockGetIdToken,
        'class-1',
        'student-1'
      );
    });
  });

  test('ROSTER-007: Shows confirmation dialog before removing', async () => {
    (adminGetClassRoster as jest.Mock).mockResolvedValue(mockRosterData);
    const mockConfirm = jest.fn(() => false);
    global.confirm = mockConfirm;
    
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    
    expect(mockConfirm).toHaveBeenCalledWith('Remove John Doe from this class?');
    expect(adminRemoveStudentFromClass).not.toHaveBeenCalled();
  });

  test('ROSTER-008: Renders empty state when no students', async () => {
    const emptyData = {
      class: mockRosterData.class,
      students: [],
    };
    (adminGetClassRoster as jest.Mock).mockResolvedValue(emptyData);
    
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No students enrolled yet')).toBeInTheDocument();
    });
  });

  test('ROSTER-009: Assign Students button disabled when class full', async () => {
    const fullData = {
      ...mockRosterData,
      class: { ...mockRosterData.class, capacity: 2, enrolled: 2 },
    };
    (adminGetClassRoster as jest.Mock).mockResolvedValue(fullData);
    
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      const assignButton = screen.getByText('+ Assign Students');
      expect(assignButton).toBeDisabled();
    });
  });

  test('ROSTER-010: Handles error state', async () => {
    (adminGetClassRoster as jest.Mock).mockRejectedValue(
      new Error('Failed to load roster')
    );
    
    render(<ClassRosterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load roster')).toBeInTheDocument();
    });
  });
});
