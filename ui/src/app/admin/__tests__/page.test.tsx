import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../page';
import { FeatureFlagsProvider } from '@/context/FeatureFlagsContext';

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

// Mock fetch for feature flags
const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <FeatureFlagsProvider>
      {component}
    </FeatureFlagsProvider>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock feature flags API to return all features enabled
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          flags: {
            admin: {
              Students: { enabled: true },
              Teachers: { enabled: true },
              Classes: { enabled: true },
              Grades: { enabled: true },
              Textbooks: { enabled: true },
              Volunteers: { enabled: true },
              AttendanceAnalytics: { enabled: true },
              HeroContent: { enabled: true },
              Calendar: { enabled: true },
            },
          },
          descriptions: {},
        },
      }),
    });
  });

  test('AD-001: Renders dashboard heading', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('AD-002: Renders description', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByText(/manage students, teachers, classes, and content/i)).toBeInTheDocument();
  });

  test('AD-003: Renders Students section', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /^students$/i })).toBeInTheDocument();
  });

  test('AD-004: Renders pending review tile', () => {
    renderWithProvider(<AdminDashboard />);

    const pendingLink = screen.getByRole('link', { name: /pending review/i });
    expect(pendingLink).toHaveAttribute('href', '/admin/students?status=pending');
  });

  test('AD-005: Renders invite teacher tile', () => {
    renderWithProvider(<AdminDashboard />);

    const inviteLink = screen.getByRole('link', { name: /invite teacher/i });
    expect(inviteLink).toHaveAttribute('href', '/admin/teachers/invite');
  });

  test('AD-006: Renders create class tile', () => {
    renderWithProvider(<AdminDashboard />);

    const createLink = screen.getByRole('link', { name: /create class/i });
    expect(createLink).toHaveAttribute('href', '/admin/classes/create');
  });

  test('AD-007: Renders hero content tile', () => {
    renderWithProvider(<AdminDashboard />);

    const heroLink = screen.getByRole('link', { name: /hero content/i });
    expect(heroLink).toHaveAttribute('href', '/admin/content/hero');
  });

  test('AD-008: Renders all navigation sections', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /^students$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^teachers$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^classes$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^resources$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^volunteers$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^analytics$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^content$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^calendar$/i })).toBeInTheDocument();
  });

  test('AD-009: Students section has correct links', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /all students/i })).toHaveAttribute('href', '/admin/students');
  });

  test('AD-010: Teachers section has correct links', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /all teachers/i })).toHaveAttribute('href', '/admin/users/teachers/list');
  });

  test('AD-011: Classes section has correct links', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /all classes/i })).toHaveAttribute('href', '/admin/classes');
  });

  test('AD-012: Content section has hero content link', () => {
    renderWithProvider(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /^content$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hero content/i })).toHaveAttribute('href', '/admin/content/hero');
  });
});
