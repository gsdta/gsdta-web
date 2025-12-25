import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock React.use
jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    use: () => ({ id: 'student-1' }),
  };
});

import StudentEditPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudent, adminUpdateStudent } from '@/lib/student-api';
import { useRouter } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/student-api', () => ({
  adminGetStudent: jest.fn(),
  adminUpdateStudent: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('StudentEditPage', () => {
  const mockPush = jest.fn();
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockParams = Promise.resolve({ id: 'student-1' });

  const mockStudent = {
    id: 'student-1',
    firstName: 'Arun',
    lastName: 'Kumar',
    dateOfBirth: '2016-03-20',
    gender: 'Boy',
    status: 'pending',
    parentEmail: 'parent@test.com',
    createdAt: '2024-01-01',
    grade: '3rd Grade',
    schoolName: 'Poway Elementary',
    priorTamilLevel: 'beginner',
    medicalNotes: 'Peanut allergy',
    photoConsent: true,
    notes: 'Test notes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  test('SE-001: Renders loading state initially', () => {
    (adminGetStudent as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <React.Suspense fallback={<div>Suspense Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );
    expect(screen.getByText('Loading student details...')).toBeInTheDocument();
  });

  test('SE-002: Renders edit form with student data', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    // Check form fields are populated
    expect(screen.getByDisplayValue('Arun')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kumar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2016-03-20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3rd Grade')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Poway Elementary')).toBeInTheDocument();
  });

  test('SE-003: Displays back link to student details', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Back to Student Details/i })).toHaveAttribute(
        'href',
        '/admin/students/student-1'
      );
    });
  });

  test('SE-004: Cancel button links to student details', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
        'href',
        '/admin/students/student-1'
      );
    });
  });

  test('SE-005: Shows current student status badge', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      // Status badge in header (not the dropdown option)
      const statusBadges = screen.getAllByText('Pending Review');
      expect(statusBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('SE-006: Submit button calls adminUpdateStudent', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    (adminUpdateStudent as jest.Mock).mockResolvedValue({ ...mockStudent, firstName: 'Updated' });

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    // Change a field
    const firstNameInput = screen.getByDisplayValue('Arun');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(adminUpdateStudent).toHaveBeenCalledWith(
        mockGetIdToken,
        'student-1',
        expect.objectContaining({ firstName: 'Updated' })
      );
    });
  });

  test('SE-007: Shows success message on update', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    (adminUpdateStudent as jest.Mock).mockResolvedValue({ ...mockStudent, firstName: 'Updated' });

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    // Change a field
    const firstNameInput = screen.getByDisplayValue('Arun');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Student updated successfully')).toBeInTheDocument();
    });
  });

  test('SE-008: Shows error message on failure', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    (adminUpdateStudent as jest.Mock).mockRejectedValue(new Error('Update failed'));

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    // Change a field
    const firstNameInput = screen.getByDisplayValue('Arun');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  test('SE-009: Shows no changes message when nothing changed', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    // Submit without changes
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('No changes to save')).toBeInTheDocument();
    });
  });

  test('SE-010: Photo consent checkbox updates correctly', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /Photo Consent/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  test('SE-011: Renders error when student not found', async () => {
    (adminGetStudent as jest.Mock).mockRejectedValue(new Error('Student not found'));
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Student not found')).toBeInTheDocument();
    });
  });

  test('SE-012: Status dropdown shows all options', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <StudentEditPage params={mockParams} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox', { name: /Status/i });
    expect(statusSelect).toBeInTheDocument();

    // Check all options exist
    expect(screen.getByRole('option', { name: 'Pending Review' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admitted' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Withdrawn' })).toBeInTheDocument();
  });
});
