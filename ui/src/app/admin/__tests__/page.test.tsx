import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminPage from '../page';

describe('AdminPage', () => {
  test('should render welcome heading', () => {
    render(<AdminPage />);
    
    expect(screen.getByRole('heading', { name: /welcome to admin portal/i })).toBeInTheDocument();
  });

  test('should render description', () => {
    render(<AdminPage />);
    
    expect(screen.getByText(/use the navigation menu above/i)).toBeInTheDocument();
  });

  test('should render overview cards', () => {
    render(<AdminPage />);
    
    expect(screen.getByRole('heading', { name: /^teachers$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^classes$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^content$/i })).toBeInTheDocument();
  });

  test('should show teachers description', () => {
    render(<AdminPage />);
    
    expect(screen.getByText(/view all teachers and send invitations/i)).toBeInTheDocument();
  });

  test('should show classes description', () => {
    render(<AdminPage />);
    
    expect(screen.getByText(/manage classes, schedules, and student assignments/i)).toBeInTheDocument();
  });

  test('should show content description', () => {
    render(<AdminPage />);
    
    expect(screen.getByText(/manage hero banners and homepage content/i)).toBeInTheDocument();
  });

  test('should show quick tip', () => {
    render(<AdminPage />);
    
    expect(screen.getByText(/quick tip/i)).toBeInTheDocument();
    expect(screen.getByText(/click on any menu item in the header/i)).toBeInTheDocument();
  });
});
