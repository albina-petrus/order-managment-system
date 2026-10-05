import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Login from '../pages/Login';

// Mock the App Context (useAuth)
vi.mock('../App', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

describe('Login Component', () => {
  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    // Check if email and password inputs are present
    expect(screen.getByPlaceholderText('admin@oms.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    
    // Check if the Sign In button is present
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});
