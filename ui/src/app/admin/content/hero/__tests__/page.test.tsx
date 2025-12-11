import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminHeroContentPage from '../page';
import * as apiClient from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn(),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/admin/content/hero',
}));

describe('AdminHeroContentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page rendering', () => {
    it('should render page header and controls', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      expect(screen.getByText('Hero Content Management')).toBeInTheDocument();
      expect(screen.getByText(/Manage event banners/i)).toBeInTheDocument();
      expect(screen.getByText('+ Create New')).toBeInTheDocument();
    });

    it('should render filter buttons', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while fetching data', () => {
      (apiClient.apiFetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AdminHeroContentPage />);

      expect(screen.getByText('Loading hero content...')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no items exist', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        expect(screen.getByText('No hero content found')).toBeInTheDocument();
        expect(screen.getByText(/Create your first event banner/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hero content list', () => {
    const mockItems = [
      {
        id: '1',
        type: 'event',
        title: { en: 'Annual Day 2024', ta: 'ஆண்டு விழா 2024' },
        subtitle: { en: 'Join us for celebration', ta: 'கொண்டாட்டத்தில் சேரவும்' },
        isActive: true,
        priority: 10,
        startDate: '2024-12-15T00:00:00Z',
        endDate: '2025-01-31T00:00:00Z',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
        createdBy: 'admin',
      },
      {
        id: '2',
        type: 'event',
        title: { en: 'Tamil Classes', ta: 'தமிழ் வகுப்புகள்' },
        subtitle: { en: 'Enrollment open', ta: 'பதிவு திறந்துள்ளது' },
        isActive: false,
        priority: 5,
        createdAt: '2024-11-01T00:00:00Z',
        updatedAt: '2024-11-01T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    it('should display list of hero content items', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Day 2024')).toBeInTheDocument();
        expect(screen.getByText('Tamil Classes')).toBeInTheDocument();
      });
    });

    it('should show active/inactive badges', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const badges = screen.getAllByText(/Active|Inactive/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display dates when available', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        expect(screen.getByText(/Start:/)).toBeInTheDocument();
        expect(screen.getByText(/End:/)).toBeInTheDocument();
      });
    });
  });

  describe('Create form', () => {
    beforeEach(() => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });
    });

    it('should show form when "Create New" is clicked', async () => {
      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const createButton = screen.getByText('+ Create New');
        fireEvent.click(createButton);
      });

      expect(screen.getByText('Create Event Banner')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/example.com/)).toBeInTheDocument();
    });

    it('should hide form when "Cancel" is clicked', async () => {
      render(<AdminHeroContentPage />);

      // Open form
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      // Close form
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Create Event Banner')).not.toBeInTheDocument();
      });
    });

    it('should have form submit button', async () => {
      render(<AdminHeroContentPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      expect(screen.getByText('Create Banner')).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      // Get form inputs by type and position
      const inputs = screen.getAllByRole('textbox');
      const titleEn = inputs[0]; // Title (English)
      const subtitleEn = inputs[2]; // Subtitle (English)

      // Fill form
      fireEvent.change(titleEn, { target: { value: 'Test Event' } });
      fireEvent.change(subtitleEn, { target: { value: 'Test Subtitle' } });

      // Submit
      const createButton = screen.getByText('Create Banner');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(apiClient.apiFetch).toHaveBeenCalledWith(
          '/v1/admin/hero-content',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test Event'),
          })
        );
      });
    });

    it('should show success message after creation', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      // Fill and submit
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Test Event' } });
      fireEvent.change(inputs[2], { target: { value: 'Test Subtitle' } });
      fireEvent.click(screen.getByText('Create Banner'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Hero content created successfully!');
      });

      alertSpy.mockRestore();
    });

    it('should reset form after successful creation', async () => {
      jest.spyOn(window, 'alert').mockImplementation(() => {});
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      // Fill form
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Test Event' } });
      fireEvent.change(inputs[2], { target: { value: 'Test Subtitle' } });

      // Submit
      fireEvent.click(screen.getByText('Create Banner'));

      await waitFor(() => {
        expect(screen.queryByText('Create Event Banner')).not.toBeInTheDocument();
      });
    });

    it('should handle submission errors', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      (apiClient.apiFetch as any).mockRejectedValue(new Error('Network error'));

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create New'));
      });

      // Fill and submit
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Test Event' } });
      fireEvent.change(inputs[2], { target: { value: 'Test Subtitle' } });
      fireEvent.click(screen.getByText('Create Banner'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Network error');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Actions', () => {
    const mockItems = [
      {
        id: '1',
        type: 'event',
        title: { en: 'Test Event', ta: 'Test Event' },
        subtitle: { en: 'Test', ta: 'Test' },
        isActive: true,
        priority: 10,
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    it('should toggle active status', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const deactivateButton = screen.getByText('Deactivate');
        fireEvent.click(deactivateButton);
      });

      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/v1/admin/hero-content/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('false'),
        })
      );
    });

    it('should delete item with confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/v1/admin/hero-content/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      confirmSpy.mockRestore();
    });

    it('should not delete if user cancels confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: mockItems },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });

      expect(confirmSpy).toHaveBeenCalled();
      // Should not call delete API
      expect(apiClient.apiFetch).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: 'DELETE' })
      );

      confirmSpy.mockRestore();
    });
  });

  describe('Filtering', () => {
    it('should filter by "all" status', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const allButtons = screen.getAllByText('All');
        fireEvent.click(allButtons[0]);
      });

      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/v1/admin/hero-content?status=all',
        expect.any(Object)
      );
    });

    it('should filter by "active" status', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const activeButtons = screen.getAllByText('Active');
        // Filter button is at index 1 (after loading completes)
        fireEvent.click(activeButtons[activeButtons.length - 1]);
      });

      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/v1/admin/hero-content?status=active',
        expect.any(Object)
      );
    });

    it('should filter by "inactive" status', async () => {
      (apiClient.apiFetch as any).mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        const inactiveButtons = screen.getAllByText('Inactive');
        fireEvent.click(inactiveButtons[inactiveButtons.length - 1]);
      });

      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/v1/admin/hero-content?status=inactive',
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('should display error message on fetch failure', async () => {
      (apiClient.apiFetch as any).mockRejectedValue(new Error('Failed to fetch'));

      render(<AdminHeroContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });
    });
  });
});
