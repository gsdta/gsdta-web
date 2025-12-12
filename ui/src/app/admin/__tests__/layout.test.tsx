import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminLayout from '../layout';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('@/components/Protected', () => ({
  Protected: ({ children }: { children: React.ReactNode }) => <div data-testid="protected">{children}</div>,
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('AdminLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AL-001: Renders Protected wrapper', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  test('AL-002: Renders admin portal header', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  test('AL-003: Renders dashboard and home links in header', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Desktop navigation links (not dropdowns)
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
  });

  test('AL-004: Renders sidebar with all navigation sections', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Sidebar should show all sections
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Teachers')).toBeInTheDocument();
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('AL-005: Sidebar shows navigation links', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Check for navigation links in sidebar
    expect(screen.getByRole('link', { name: /all students/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all teachers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all classes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hero content/i })).toBeInTheDocument();
  });

  test('AL-006: Highlights active link based on pathname', () => {
    mockUsePathname.mockReturnValue('/admin/students');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const studentsLink = screen.getByRole('link', { name: /all students/i });
    expect(studentsLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  test('AL-007: Renders children content', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div data-testid="child-content">Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('AL-008: Sidebar always visible on desktop', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Sidebar should be present (has aside element)
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toBeInTheDocument();
  });

  test('AL-009: Mobile menu button exists', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });
});
