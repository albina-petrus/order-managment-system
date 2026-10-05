import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { fetchApi } from '../lib/api';

// Mock the AuthContext
vi.mock('../App', () => ({
  useAuth: () => ({
    user: { name: 'Admin User', role: 'admin' },
  }),
}));

// Mock the API fetcher
vi.mock('../lib/api', () => ({
  fetchApi: vi.fn(),
}));

describe('Dashboard Component', () => {
  const mockDashboardData = {
    kpis: {
      totalClients: 10,
      totalOrders: 15,
      totalRevenue: 50000,
      completedRevenue: 25000,
      orders: { pending: 2, in_progress: 5, completed: 8 }
    },
    charts: {
      ordersByStatus: [],
      monthlyTrend: []
    },
    recentOrders: [
      { id: 1, title: 'Test Order', client_name: 'Test Client', status: 'pending', total_amount: 1000, created_at: '2026-10-01' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // API response promise that doesn't resolve immediately
    fetchApi.mockImplementation(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Loading your workspace.../i)).toBeInTheDocument();
  });

  it('renders dashboard data after loading', async () => {
    fetchApi.mockResolvedValue(mockDashboardData);
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    // Wait for the API to resolve and check for the content
    await waitFor(() => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome back, Admin User/i)).toBeInTheDocument();
      
      // Check KPI values
      expect(screen.getByText(/\$50,000/)).toBeInTheDocument(); // total revenue
      expect(screen.getByText('15')).toBeInTheDocument(); // total orders
      
      // Check recent orders table
      expect(screen.getByText('Test Order')).toBeInTheDocument();
    });
  });
});
