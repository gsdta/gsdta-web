import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentSelectorModal from '../StudentSelectorModal';

// Mock the AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    getIdToken: jest.fn().mockResolvedValue('test-token'),
  }),
}));

// Mock the student-api
const mockAdminGetStudents = jest.fn();
jest.mock('@/lib/student-api', () => ({
  adminGetStudents: (...args: unknown[]) => mockAdminGetStudents(...args),
}));

describe('StudentSelectorModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAssign: jest.fn().mockResolvedValue(undefined),
    gradeId: 'grade-1',
    gradeName: 'Grade 1',
    spotsAvailable: 5,
    excludeStudentIds: [] as string[],
  };

  const mockStudents = [
    { id: 's1', firstName: 'John', lastName: 'Doe', name: 'John Doe', grade: 'grade-1', status: 'admitted', parentEmail: 'john@test.com' },
    { id: 's2', firstName: 'Jane', lastName: 'Smith', name: 'Jane Smith', grade: 'grade-1', status: 'admitted', parentEmail: 'jane@test.com' },
    { id: 's3', firstName: 'Bob', lastName: 'Johnson', name: 'Bob Johnson', grade: 'grade-1', status: 'admitted', parentEmail: 'bob@test.com' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminGetStudents.mockResolvedValue({ students: mockStudents });
  });

  test('SSM-001: renders modal when isOpen is true', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    expect(screen.getByText('Assign Students to Class')).toBeInTheDocument();
  });

  test('SSM-002: does not render when isOpen is false', () => {
    render(<StudentSelectorModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Assign Students to Class')).not.toBeInTheDocument();
  });

  test('SSM-003: displays grade name and spots available', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    expect(screen.getByText(/Grade 1/)).toBeInTheDocument();
    expect(screen.getByText(/5 spots available/)).toBeInTheDocument();
  });

  test('SSM-004: fetches students with correct filters', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    expect(mockAdminGetStudents).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        status: 'admitted',
        gradeId: 'grade-1',
        unassigned: true,
      })
    );
  });

  test('SSM-005: displays students list', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  test('SSM-006: allows selecting students', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });

    expect(screen.getByText('1 of 5 selected')).toBeInTheDocument();
  });

  test('SSM-007: search filters students by name', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search students by name...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Jane' } });
    });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  test('SSM-008: calls onClose when cancel is clicked', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('SSM-009: shows empty state when no students available', async () => {
    mockAdminGetStudents.mockResolvedValue({ students: [] });

    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('No eligible students found')).toBeInTheDocument();
    });
  });

  test('SSM-010: shows error state when API fails', async () => {
    mockAdminGetStudents.mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('SSM-011: disable assign button when no students selected', async () => {
    await act(async () => {
      render(<StudentSelectorModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const assignButton = screen.getByRole('button', { name: /Assign 0 Student/ });
    expect(assignButton).toBeDisabled();
  });
});
