import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegisterStudentPage from '../page';
import { useAuth } from '@/components/AuthProvider';
import { createStudent } from '@/lib/student-api';
import { useRouter } from 'next/navigation';

// Mocks
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/student-api', () => ({
  createStudent: jest.fn(),
}));

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('RegisterStudentPage', () => {
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

  test('REG-001: Renders registration form', () => {
    render(<RegisterStudentPage />);
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByText('Register New Student')).toBeInTheDocument();
  });

  test('REG-004: FirstName validation - required', async () => {
    render(<RegisterStudentPage />);
    
    // Fill other required fields but skip first name
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2015-01-01' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

    await waitFor(() => {
      // The error message comes from Zod schema "First name is required"
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
    });
    
    expect(createStudent).not.toHaveBeenCalled();
  });

  test('REG-005: LastName validation - required', async () => {
    render(<RegisterStudentPage />);
    
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2015-01-01' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

    await waitFor(() => {
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
    });
  });

  test('REG-006: DateOfBirth validation - required', async () => {
    render(<RegisterStudentPage />);
    
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

    await waitFor(() => {
      // Zod regex or string validation might trigger "Date must be in YYYY-MM-DD format" or required message
      // The schema says `z.string().regex(...)`. Empty string fails regex.
      expect(screen.getByText(/Date must be in YYYY-MM-DD format/i)).toBeInTheDocument();
    });
  });

  test('REG-007: Successful submission redirects to students page', async () => {
    (createStudent as jest.Mock).mockResolvedValue({});

    render(<RegisterStudentPage />);
    
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2015-01-01' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

    await waitFor(() => {
      expect(createStudent).toHaveBeenCalledWith(mockGetIdToken, expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01'
      }));
      expect(mockPush).toHaveBeenCalledWith('/parent/students?registered=true');
    });
  });

  test('REG-008: Failed submission shows error message', async () => {
    (createStudent as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<RegisterStudentPage />);
    
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2015-01-01' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('REG-009: PhotoConsent checkbox toggles', async () => {
    render(<RegisterStudentPage />);
    
    const checkbox = screen.getByLabelText(/I consent to photos/i);
    expect(checkbox).not.toBeChecked();
    
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  test('REG-010: Cancel link returns to students page', () => {
    render(<RegisterStudentPage />);
    const cancelLink = screen.getByText('Cancel');
    expect(cancelLink).toHaveAttribute('href', '/parent/students');
  });
});
