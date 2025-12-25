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

  // ============================================================================
  // New field tests for 2025-26 data integration
  // ============================================================================

  describe('New Fields - Gender', () => {
    test('REG-011: Renders gender dropdown', () => {
      render(<RegisterStudentPage />);
      const genderSelect = screen.getByLabelText(/Gender/i);
      expect(genderSelect).toBeInTheDocument();
    });

    test('REG-012: Gender dropdown has correct options', () => {
      render(<RegisterStudentPage />);
      const genderSelect = screen.getByLabelText(/Gender/i);

      expect(genderSelect).toContainHTML('Select gender');
      expect(genderSelect).toContainHTML('Boy');
      expect(genderSelect).toContainHTML('Girl');
      expect(genderSelect).toContainHTML('Other');
    });

    test('REG-013: Gender selection updates form', () => {
      render(<RegisterStudentPage />);
      const genderSelect = screen.getByLabelText(/Gender/i);

      fireEvent.change(genderSelect, { target: { value: 'Girl' } });
      expect(genderSelect).toHaveValue('Girl');
    });
  });

  describe('New Fields - School Information', () => {
    test('REG-014: Renders school information section', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText('School Information')).toBeInTheDocument();
    });

    test('REG-015: Renders school district dropdown', () => {
      render(<RegisterStudentPage />);
      const districtSelect = screen.getByLabelText(/School District/i);
      expect(districtSelect).toBeInTheDocument();
    });

    test('REG-016: School district has common San Diego districts', () => {
      render(<RegisterStudentPage />);
      const districtSelect = screen.getByLabelText(/School District/i);

      expect(districtSelect).toContainHTML('Poway Unified School District');
      expect(districtSelect).toContainHTML('San Diego Unified School District');
      expect(districtSelect).toContainHTML('Other');
    });

    test('REG-017: School district selection updates form', () => {
      render(<RegisterStudentPage />);
      const districtSelect = screen.getByLabelText(/School District/i);

      fireEvent.change(districtSelect, { target: { value: 'Poway Unified School District' } });
      expect(districtSelect).toHaveValue('Poway Unified School District');
    });
  });

  describe('New Fields - Home Address', () => {
    test('REG-018: Renders address section', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText('Home Address')).toBeInTheDocument();
    });

    test('REG-019: Renders all address fields', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ZIP Code/i)).toBeInTheDocument();
    });

    test('REG-020: Address fields can be filled', () => {
      render(<RegisterStudentPage />);

      const streetInput = screen.getByLabelText(/Street Address/i);
      const cityInput = screen.getByLabelText(/City/i);
      const zipInput = screen.getByLabelText(/ZIP Code/i);

      fireEvent.change(streetInput, { target: { value: '12345 Main Street' } });
      fireEvent.change(cityInput, { target: { value: 'San Diego' } });
      fireEvent.change(zipInput, { target: { value: '92128' } });

      expect(streetInput).toHaveValue('12345 Main Street');
      expect(cityInput).toHaveValue('San Diego');
      expect(zipInput).toHaveValue('92128');
    });
  });

  describe('New Fields - Parent Contacts', () => {
    test('REG-021: Renders parent information section', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText('Parent/Guardian Information')).toBeInTheDocument();
    });

    test('REG-022: Renders mother information subsection', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText("Mother's Information")).toBeInTheDocument();
    });

    test('REG-023: Renders father information subsection', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText("Father's Information")).toBeInTheDocument();
    });

    test('REG-024: Mother contact fields can be filled', async () => {
      render(<RegisterStudentPage />);

      // Get mother's section inputs (they are the first set of parent inputs)
      const motherSection = screen.getByText("Mother's Information").closest('div')?.parentElement;
      const nameInputs = screen.getAllByPlaceholderText('First Last');
      const emailInputs = screen.getAllByPlaceholderText('email@example.com');
      const phoneInputs = screen.getAllByPlaceholderText('(858) 555-1234');
      const employerInputs = screen.getAllByPlaceholderText('Company name');

      // First set is mother's
      fireEvent.change(nameInputs[0], { target: { value: 'Priya Kumar' } });
      fireEvent.change(emailInputs[0], { target: { value: 'priya@example.com' } });
      fireEvent.change(phoneInputs[0], { target: { value: '8585551234' } });
      fireEvent.change(employerInputs[0], { target: { value: 'Tech Corp' } });

      expect(nameInputs[0]).toHaveValue('Priya Kumar');
      expect(emailInputs[0]).toHaveValue('priya@example.com');
      expect(phoneInputs[0]).toHaveValue('8585551234');
      expect(employerInputs[0]).toHaveValue('Tech Corp');
    });

    test('REG-025: Father contact fields can be filled', async () => {
      render(<RegisterStudentPage />);

      const nameInputs = screen.getAllByPlaceholderText('First Last');
      const emailInputs = screen.getAllByPlaceholderText('email@example.com');
      const phoneInputs = screen.getAllByPlaceholderText('(858) 555-1234');
      const employerInputs = screen.getAllByPlaceholderText('Company name');

      // Second set is father's
      fireEvent.change(nameInputs[1], { target: { value: 'Raj Kumar' } });
      fireEvent.change(emailInputs[1], { target: { value: 'raj@example.com' } });
      fireEvent.change(phoneInputs[1], { target: { value: '8585555678' } });
      fireEvent.change(employerInputs[1], { target: { value: 'Finance Inc' } });

      expect(nameInputs[1]).toHaveValue('Raj Kumar');
      expect(emailInputs[1]).toHaveValue('raj@example.com');
      expect(phoneInputs[1]).toHaveValue('8585555678');
      expect(employerInputs[1]).toHaveValue('Finance Inc');
    });
  });

  describe('New Fields - Additional Information', () => {
    test('REG-026: Renders additional information section', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
    });

    test('REG-027: Renders medical notes textarea', () => {
      render(<RegisterStudentPage />);
      expect(screen.getByLabelText(/Medical Notes/i)).toBeInTheDocument();
    });

    test('REG-028: Medical notes can be filled', () => {
      render(<RegisterStudentPage />);
      const medicalNotes = screen.getByLabelText(/Medical Notes/i);

      fireEvent.change(medicalNotes, { target: { value: 'Peanut allergy' } });
      expect(medicalNotes).toHaveValue('Peanut allergy');
    });
  });

  describe('Full Form Submission with New Fields', () => {
    test('REG-029: Submits form with all new fields', async () => {
      (createStudent as jest.Mock).mockResolvedValue({});

      render(<RegisterStudentPage />);

      // Required fields
      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Arun' } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Kumar' } });
      fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2016-03-20' } });

      // New fields
      fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'Boy' } });
      fireEvent.change(screen.getByLabelText(/School District/i), {
        target: { value: 'Poway Unified School District' }
      });

      // Address
      fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '12345 Main St' } });
      fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'San Diego' } });
      fireEvent.change(screen.getByLabelText(/ZIP Code/i), { target: { value: '92128' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Register Student/i }));

      await waitFor(() => {
        expect(createStudent).toHaveBeenCalledWith(mockGetIdToken, expect.objectContaining({
          firstName: 'Arun',
          lastName: 'Kumar',
          dateOfBirth: '2016-03-20',
          gender: 'Boy',
          schoolDistrict: 'Poway Unified School District',
          address: expect.objectContaining({
            street: '12345 Main St',
            city: 'San Diego',
            zipCode: '92128',
          }),
        }));
      });
    });
  });
});
