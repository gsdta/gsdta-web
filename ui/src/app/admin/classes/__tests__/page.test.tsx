import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassesPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminGetClasses, adminUpdateClass } from '@/lib/class-api';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/class-api', () => ({
  adminGetClasses: jest.fn(),
  adminUpdateClass: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('ClassesPage', () => {
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockClasses = [
    { id: 'class-1', name: 'Class 1', level: 'Beginner', day: 'Sat', time: '10am', capacity: 20, enrolled: 5, status: 'active', available: 15 },
    { id: 'class-2', name: 'Class 2', level: 'Advanced', day: 'Sun', time: '2pm', capacity: 15, enrolled: 0, status: 'inactive', available: 15 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  test('CL-001: Renders loading state', async () => {
    (adminGetClasses as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<ClassesPage />);
    expect(screen.getByText('Loading classes...')).toBeInTheDocument();
  });

  test('CL-002: Renders classes table', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  test('CL-003: Displays class name and level', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Class 1')).toBeInTheDocument();
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
  });

  test('CL-004: Displays enrolled/capacity', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('5/20')).toBeInTheDocument();
    });
  });

  test('CL-005: Filter by status works', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: [], total: 0 });
    render(<ClassesPage />);
    
    await waitFor(() => expect(screen.queryByText('Loading classes...')).not.toBeInTheDocument());

    const select = screen.getByLabelText(/Filter by status:/i);
    fireEvent.change(select, { target: { value: 'active' } });

    await waitFor(() => {
      expect(adminGetClasses).toHaveBeenLastCalledWith(mockGetIdToken, expect.objectContaining({ status: 'active' }));
    });
  });

  test('CL-006: Create Class button links correctly', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: [], total: 0 });
    render(<ClassesPage />);
    await waitFor(() => expect(screen.queryByText('Loading classes...')).not.toBeInTheDocument());
    
    // Header create button
    const createBtn = screen.getAllByText('Create Class')[0].closest('a');
    expect(createBtn).toHaveAttribute('href', '/admin/classes/create');
  });

  test('CL-007: Edit link navigates to class details', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => {
      // Find 'Edit' link for first class
      const editLinks = screen.getAllByText('Edit');
      expect(editLinks[0]).toHaveAttribute('href', '/admin/classes/class-1');
    });
  });

  test('CL-008: Deactivate button calls API', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => expect(screen.getByText('Deactivate')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Deactivate'));
    
    expect(global.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(adminUpdateClass).toHaveBeenCalledWith(mockGetIdToken, 'class-1', { status: 'inactive' });
      // Should refresh list
      expect(adminGetClasses).toHaveBeenCalledTimes(2);
    });
  });

  test('CL-009: Activate button visible for inactive', async () => {
    (adminGetClasses as jest.Mock).mockResolvedValue({ classes: mockClasses, total: 2 });
    render(<ClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });
});
