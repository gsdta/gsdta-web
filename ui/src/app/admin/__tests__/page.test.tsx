import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../page';

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('AdminDashboard', () => {
  test('AD-001: Renders dashboard heading', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('AD-002: Renders description', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/manage students, teachers, classes, and content/i)).toBeInTheDocument();
  });

  test('AD-003: Renders quick actions section', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /quick actions/i })).toBeInTheDocument();
  });

  test('AD-004: Renders pending review quick action', () => {
    render(<AdminDashboard />);

    const pendingLink = screen.getAllByRole('link', { name: /pending review/i })[0];
    expect(pendingLink).toHaveAttribute('href', '/admin/students?status=pending');
  });

  test('AD-005: Renders invite teacher quick action', () => {
    render(<AdminDashboard />);

    const inviteLink = screen.getAllByRole('link', { name: /invite teacher/i })[0];
    expect(inviteLink).toHaveAttribute('href', '/admin/teachers/invite');
  });

  test('AD-006: Renders create class quick action', () => {
    render(<AdminDashboard />);

    const createLink = screen.getAllByRole('link', { name: /create class/i })[0];
    expect(createLink).toHaveAttribute('href', '/admin/classes/create');
  });

  test('AD-007: Renders hero content quick action', () => {
    render(<AdminDashboard />);

    const heroLink = screen.getAllByRole('link', { name: /hero content/i })[0];
    expect(heroLink).toHaveAttribute('href', '/admin/content/hero');
  });

  test('AD-008: Renders management sections', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /^students$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^teachers$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^classes$/i })).toBeInTheDocument();
  });

  test('AD-009: Students section has correct links', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /view all students/i })).toHaveAttribute('href', '/admin/students');
  });

  test('AD-010: Teachers section has correct links', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /view all teachers/i })).toHaveAttribute('href', '/admin/users/teachers/list');
  });

  test('AD-011: Classes section has correct links', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('link', { name: /view all classes/i })).toHaveAttribute('href', '/admin/classes');
  });

  test('AD-012: Content management section exists', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: /content management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage hero content/i })).toHaveAttribute('href', '/admin/content/hero');
  });
});
