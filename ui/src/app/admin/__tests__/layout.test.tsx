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

import { useAuth } from '@/components/AuthProvider';

jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: { roles: ['admin'] },
    getIdToken: jest.fn(),
  })),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AdminLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default admin user
    mockUseAuth.mockReturnValue({
      user: { roles: ['admin'] },
      getIdToken: jest.fn(),
    } as ReturnType<typeof useAuth>);
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

  test('AL-003: Renders Admin Portal title in header', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Admin Portal link should be in the header
    expect(screen.getByRole('link', { name: /Admin Portal/i })).toBeInTheDocument();
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

  test('AL-010: Super Admin section NOT shown for regular admin', () => {
    mockUsePathname.mockReturnValue('/admin');

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Super Admin section should not be visible for regular admin
    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
  });

  test('AL-011: Super Admin section shown for super_admin role', () => {
    mockUsePathname.mockReturnValue('/admin');
    mockUseAuth.mockReturnValue({
      user: { roles: ['super_admin'] },
      getIdToken: jest.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Super Admin section should be visible for super_admin
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recovery/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /data export/i })).toBeInTheDocument();
  });

  test('AL-012: Super Admin links have correct href', () => {
    mockUsePathname.mockReturnValue('/admin');
    mockUseAuth.mockReturnValue({
      user: { roles: ['super_admin'] },
      getIdToken: jest.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByRole('link', { name: /admin users/i })).toHaveAttribute('href', '/admin/super-admin/admins');
    expect(screen.getByRole('link', { name: /audit log/i })).toHaveAttribute('href', '/admin/super-admin/audit-log');
    expect(screen.getByRole('link', { name: /security/i })).toHaveAttribute('href', '/admin/super-admin/security');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/admin/super-admin/settings');
    expect(screen.getByRole('link', { name: /recovery/i })).toHaveAttribute('href', '/admin/super-admin/recovery');
    expect(screen.getByRole('link', { name: /data export/i })).toHaveAttribute('href', '/admin/super-admin/export');
  });
});
