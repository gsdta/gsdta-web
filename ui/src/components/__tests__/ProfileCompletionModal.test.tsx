import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { useAuth } from '@/components/AuthProvider';

// Mock dependencies
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ProfileCompletionModal', () => {
  const mockGetIdToken = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { email: 'parent@example.com' },
      getIdToken: mockGetIdToken,
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue('parent-token-123');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  test('should render modal with all required fields', () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
  });

  test('should pre-populate form with initial data', () => {
    const initialData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '5551234567',
      address: {
        street: '123 Main St',
        city: 'San Diego',
        state: 'CA',
        zip: '92101',
      },
    };

    render(<ProfileCompletionModal initialData={initialData} onComplete={mockOnComplete} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('5551234567');
    expect(screen.getByLabelText(/street address/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/city/i)).toHaveValue('San Diego');
    expect(screen.getByLabelText(/state/i)).toHaveValue('CA');
    expect(screen.getByLabelText(/zip code/i)).toHaveValue('92101');
  });

  test('should show validation errors when submitting empty form', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument();
    expect(screen.getByText(/street address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/city is required/i)).toBeInTheDocument();
    expect(screen.getByText(/state is required/i)).toBeInTheDocument();
    expect(screen.getByText(/zip code is required/i)).toBeInTheDocument();
  });

  test('should validate phone number has at least 10 digits', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await userEvent.type(phoneInput, '12345');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument();
  });

  test('should accept phone with formatting (dashes, spaces)', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    // Fill all required fields
    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/phone number/i), '555-123-4567');
    await userEvent.type(screen.getByLabelText(/street address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/city/i), 'San Diego');
    await userEvent.type(screen.getByLabelText(/state/i), 'CA');
    await userEvent.type(screen.getByLabelText(/zip code/i), '92101');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    // Should not show phone validation error
    expect(screen.queryByText(/phone number must be at least 10 digits/i)).not.toBeInTheDocument();
  });

  test('should clear field error when user types', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await userEvent.type(firstNameInput, 'John');

    expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
  });

  test('should submit form successfully with valid data', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/phone number/i), '5551234567');
    await userEvent.type(screen.getByLabelText(/street address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/city/i), 'San Diego');
    await userEvent.type(screen.getByLabelText(/state/i), 'CA');
    await userEvent.type(screen.getByLabelText(/zip code/i), '92101');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/me/', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer parent-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe',
          phone: '5551234567',
          address: {
            street: '123 Main St',
            city: 'San Diego',
            state: 'CA',
            zip: '92101',
          },
        }),
      });
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  test('should display error when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Profile update failed' }),
    });

    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/phone number/i), '5551234567');
    await userEvent.type(screen.getByLabelText(/street address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/city/i), 'San Diego');
    await userEvent.type(screen.getByLabelText(/state/i), 'CA');
    await userEvent.type(screen.getByLabelText(/zip code/i), '92101');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/profile update failed/i)).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  test('should display error when not authenticated', async () => {
    mockGetIdToken.mockResolvedValueOnce(null);

    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/phone number/i), '5551234567');
    await userEvent.type(screen.getByLabelText(/street address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/city/i), 'San Diego');
    await userEvent.type(screen.getByLabelText(/state/i), 'CA');
    await userEvent.type(screen.getByLabelText(/zip code/i), '92101');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  test('should show loading state while saving', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/phone number/i), '5551234567');
    await userEvent.type(screen.getByLabelText(/street address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/city/i), 'San Diego');
    await userEvent.type(screen.getByLabelText(/state/i), 'CA');
    await userEvent.type(screen.getByLabelText(/zip code/i), '92101');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  test('should display info alert about required fields', () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    expect(screen.getByText(/all fields marked with/i)).toBeInTheDocument();
    expect(screen.getByText(/are required to access the Parent Portal/i)).toBeInTheDocument();
  });

  test('should trim whitespace from input values', async () => {
    render(<ProfileCompletionModal onComplete={mockOnComplete} />);

    await userEvent.type(screen.getByLabelText(/first name/i), '  John  ');
    await userEvent.type(screen.getByLabelText(/last name/i), '  Doe  ');
    await userEvent.type(screen.getByLabelText(/phone number/i), '  5551234567  ');
    await userEvent.type(screen.getByLabelText(/street address/i), '  123 Main St  ');
    await userEvent.type(screen.getByLabelText(/city/i), '  San Diego  ');
    await userEvent.type(screen.getByLabelText(/state/i), '  CA  ');
    await userEvent.type(screen.getByLabelText(/zip code/i), '  92101  ');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/me/', {
        method: 'PUT',
        headers: expect.any(Object),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe',
          phone: '5551234567',
          address: {
            street: '123 Main St',
            city: 'San Diego',
            state: 'CA',
            zip: '92101',
          },
        }),
      });
    });
  });
});
