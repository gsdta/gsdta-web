import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateClassPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateClass } from '@/lib/class-api';
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getIdToken: mockGetIdToken,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  test('CCF-001: Renders create class form', () => {
    render(<CreateClassPage />);
    expect(screen.getByLabelText(/Class Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Capacity/i)).toBeInTheDocument();
    expect(screen.getByText('Create New Class')).toBeInTheDocument();
  });

  test('CCF-003: Name validation - required', async () => {
    render(<CreateClassPage />);
    
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('Class name is required')).toBeInTheDocument();
    });
    expect(adminCreateClass).not.toHaveBeenCalled();
  });

  test('CCF-004: Time validation - required', async () => {
    render(<CreateClassPage />);
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('Time is required')).toBeInTheDocument();
    });
  });

  test('CCF-005: Capacity validation - min 1', async () => {
    render(<CreateClassPage />);

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
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
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
    
    fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Test Class' } });
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10am' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Class/i }));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('CCF-008: Level dropdown has options', () => {
    render(<CreateClassPage />);
    const options = screen.getByLabelText(/Level/i).querySelectorAll('option');
    expect(options).toHaveLength(3); // Beginner, Intermediate, Advanced
    expect(options[0].textContent).toBe('Beginner');
  });

  test('CCF-009: Day dropdown has all days', () => {
    render(<CreateClassPage />);
    const options = screen.getByLabelText(/Day/i).querySelectorAll('option');
    expect(options).toHaveLength(7);
  });
});
