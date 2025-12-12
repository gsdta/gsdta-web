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

import AdminStudentDetailsPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudent, adminAdmitStudent, adminAssignClass } from '@/lib/student-api';
import { adminGetClassOptions } from '@/lib/class-api';
import { useRouter, useSearchParams } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/student-api', () => ({
  adminGetStudent: jest.fn(),
  adminAdmitStudent: jest.fn(),
  adminAssignClass: jest.fn(),
}));

jest.mock('@/lib/class-api', () => ({
  adminGetClassOptions: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('AdminStudentDetailsPage', () => {
  const mockPush = jest.fn();
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockParams = Promise.resolve({ id: 'student-1' });

  const mockStudent = {
    id: 'student-1',
    firstName: 'Arun',
    lastName: 'Kumar',
    status: 'pending',
    parentEmail: 'parent@test.com',
    createdAt: '2024-01-01',
    parentId: 'parent-1',
  };

  const mockClasses = [
    { id: 'class-1', name: 'Class 1', level: 'Beginner', day: 'Sat', time: '10am', capacity: 20, enrolled: 5, available: 15 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    (adminGetClassOptions as jest.Mock).mockResolvedValue(mockClasses);
    
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  test('ASD-001: Renders student details', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => expect(adminGetStudent).toHaveBeenCalled());

    // Check if error occurred
    expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument();

    expect(await screen.findByText(/Arun Kumar/i)).toBeInTheDocument();
    expect(screen.getByText('Student Information')).toBeInTheDocument();
  });

  test('ASD-002: Admit button visible for pending', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'pending' });
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    await waitFor(() => {
      expect(screen.getByText('Admit Student')).toBeInTheDocument();
    });
  });

  test('ASD-003: Assign Class button visible for admitted', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'admitted' });
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    await waitFor(() => {
      expect(screen.getByText('Assign Class')).toBeInTheDocument();
    });
  });

  test('ASD-004: Click Admit changes status', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'pending' });
    (adminAdmitStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'admitted' });
    
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    await waitFor(() => expect(screen.getByText('Admit Student')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Admit Student'));
    
    expect(global.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(adminAdmitStudent).toHaveBeenCalledWith(mockGetIdToken, 'student-1');
      // Should show updated status or buttons (Assign Class becomes visible if status updates locally)
      // The component updates state with result of adminAdmitStudent
      expect(screen.getByText('Assign Class')).toBeInTheDocument();
    });
  });

  test('ASD-005: Click Assign Class opens modal', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'admitted' });
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    
    await waitFor(() => expect(screen.getByText('Assign Class')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Assign Class'));
    
    expect(screen.getByText('Assign Class to Arun')).toBeInTheDocument();
  });

  test('ASD-006: Class dropdown shows available classes', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'admitted' });
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    
    await waitFor(() => expect(screen.getByText('Assign Class')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Assign Class'));
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/Class 1/)).toBeInTheDocument();
  });

  test('ASD-007: Select class and confirm assigns', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'admitted' });
    (adminAssignClass as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'active', classId: 'class-1', className: 'Class 1' });
    
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    
    await waitFor(() => expect(screen.getByText('Assign Class')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Assign Class'));
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'class-1' } });
    
    // Find the Assign Class button in modal (there's one in header too, so verify which one)
    // The modal one says "Assign Class" and is disabled until selected.
    // We can target by being inside modal or "Assigning..." text changes.
    // Let's use getAllByText or restrict query to modal if possible.
    // The modal has text "Assign Class to Arun".
    
    const modalButtons = screen.getAllByText('Assign Class');
    // Last one is likely the modal button (rendered later)
    const assignBtn = modalButtons[modalButtons.length - 1];
    
    fireEvent.click(assignBtn);
    
    await waitFor(() => {
      expect(adminAssignClass).toHaveBeenCalledWith(mockGetIdToken, 'student-1', 'class-1');
      expect(screen.getByText('Change Class')).toBeInTheDocument(); // If status active
    });
  });

  test('ASD-010: Parent contact info displayed', async () => {
    (adminGetStudent as jest.Mock).mockResolvedValue(mockStudent);
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AdminStudentDetailsPage params={mockParams} />
      </React.Suspense>
    );
    
    await waitFor(() => {
      expect(screen.getByText('parent@test.com')).toBeInTheDocument();
      expect(screen.getByText('parent-1')).toBeInTheDocument();
    });
  });
});
