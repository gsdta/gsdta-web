import React from 'react';
import { render, screen } from '@testing-library/react';
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

  test('should render Protected wrapper', () => {
    mockUsePathname.mockReturnValue('/admin');
    
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  test('should render admin portal header', () => {
    mockUsePathname.mockReturnValue('/admin');
    
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  test('should render navigation sections', () => {
    mockUsePathname.mockReturnValue('/admin');
    
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Desktop navigation
    expect(screen.getByRole('button', { name: /teachers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /classes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /content/i })).toBeInTheDocument();
  });

  test('should highlight active section based on pathname', () => {
    mockUsePathname.mockReturnValue('/admin/users/teachers/list');
    
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const teachersButton = screen.getByRole('button', { name: /teachers/i });
    expect(teachersButton).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  test('should render children content', () => {
    mockUsePathname.mockReturnValue('/admin');
    
    render(
      <AdminLayout>
        <div data-testid="child-content">Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('should not show sidebar when on admin home', () => {
    mockUsePathname.mockReturnValue('/admin');
    
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    // Sidebar should not exist when no active section
    const sidebar = screen.queryByRole('complementary', { hidden: true });
    expect(sidebar).not.toBeInTheDocument();
  });
});
