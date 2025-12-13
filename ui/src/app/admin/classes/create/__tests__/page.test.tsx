import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateClassPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateClass } from '@/lib/class-api';
import { adminGetGradeOptions } from '@/lib/grade-api';
import { useRouter } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/class-api', () => ({
  adminCreateClass: jest.fn(),
}));

jest.mock('@/lib/grade-api', () => ({
  adminGetGradeOptions: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('CreateClassPage', () => {
  const mockPush = jest.fn();
  const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
  const mockGrades = [
    { id: 'g1', name: 'G1', displayName: 'Grade 1', displayOrder: 1 },
    { id: 'g2', name: 'G2', displayName: 'Grade 2', displayOrder: 2 },
    { id: 'g3', name: 'G3', displayName: 'Grade 3', displayOrder: 3 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    // Default grades mock
    (adminGetGradeOptions as jest.Mock).mockResolvedValue(mockGrades);
  });

  test('CCF-001: Renders create class form', async () => {
    render(<CreateClassPage />);
    
    // Wait for grades to load
    await waitFor(() => {
        expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Class Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Grade/i)).toBeInTheDocument(); // Changed from Level to Grade
    expect(screen.getByLabelText(/Day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Capacity/i)).toBeInTheDocument();
    expect(screen.getByText('Create New Class')).toBeInTheDocument();
  });

  test('CCF-003: Name validation - required', async () => {
    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('Class name is required')).toBeInTheDocument();
    });
    expect(adminCreateClass).not.toHaveBeenCalled();
  });

  test('CCF-004: Time validation - required', async () => {
    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('Time is required')).toBeInTheDocument();
    });
  });

  test('CCF-005: Capacity validation - min 1', async () => {
    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    const input = screen.getByLabelText(/Capacity/i) as HTMLInputElement;
    // Set capacity to 0 - parseInt will parse '0' as 0
    fireEvent.change(input, { target: { value: '0' } });

    // Submit the form by submitting the form element directly
    const form = screen.getByRole('button', { name: /Create Class/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText(/Capacity must be at least 1/i)).toBeInTheDocument();
    });
  });

  test('CCF-006: Successful submission redirects', async () => {
    (adminCreateClass as jest.Mock).mockResolvedValue({});

    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    // Grade should be auto-selected or we select one
    fireEvent.change(screen.getByLabelText(/Grade/i), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(adminCreateClass).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/admin/classes?created=true');
    });
  });

  test('CCF-007: Failed submission shows error', async () => {
    (adminCreateClass as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    fireEvent.change(screen.getByLabelText(/Grade/i), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('CCF-008: Grades dropdown has options', async () => {
    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());

    const select = screen.getByLabelText(/Grade/i);
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(4); // Select a grade + 3 mocks
    expect(options[1].textContent).toContain('G1');
  });

  test('CCF-009: Day dropdown has all days', async () => {
    render(<CreateClassPage />);
    await waitFor(() => expect(screen.queryByText('Loading grades...')).not.toBeInTheDocument());
    const options = screen.getByLabelText(/Day/i).querySelectorAll('option');
    expect(options).toHaveLength(7);
  });
});