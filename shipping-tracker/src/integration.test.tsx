import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the API client to use mock data
vi.mock('./api/client', () => {
  const mockShipment = {
    id: 'test-123',
    trackingNumber: 'ABCD1234567',
    trackingType: 'container',
    carrier: 'MSC',
    service: 'FCL',
    status: 'in_transit',
    timeline: [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        status: 'Booking Confirmed',
        location: 'New York, USA',
        description: 'Shipment booking confirmed',
        isCompleted: true,
        isCurrentStatus: false,
      },
      {
        id: '2',
        timestamp: new Date('2024-01-02T14:30:00Z'),
        status: 'In Transit',
        location: 'Atlantic Ocean',
        description: 'Shipment in transit',
        isCompleted: false,
        isCurrentStatus: true,
      },
    ],
    route: {
      origin: { 
        code: 'USNYC', 
        name: 'New York', 
        city: 'New York', 
        country: 'United States',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        timezone: 'America/New_York',
      },
      destination: { 
        code: 'NLRTM', 
        name: 'Rotterdam', 
        city: 'Rotterdam', 
        country: 'Netherlands',
        coordinates: { lat: 51.9244, lng: 4.4777 },
        timezone: 'Europe/Amsterdam',
      },
      intermediateStops: [],
      estimatedTransitTime: 14,
      routePath: [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 51.9244, lng: 4.4777 },
      ],
    },
    containers: [
      {
        number: 'ABCD1234567',
        size: '40ft',
        type: 'HC',
        sealNumber: 'SL123456',
        weight: 28500,
      },
    ],
    vessel: {
      name: 'MSC OSCAR',
      imo: '9729428',
      voyage: 'W001E',
      currentPosition: { lat: 45.0, lng: -30.0 },
      eta: new Date('2024-01-15T16:45:00Z'),
    },
    lastUpdated: new Date(),
    dataSource: 'mock-api',
  };

  return {
    apiClient: {
      searchShipment: vi.fn().mockResolvedValue(mockShipment),
      validateTrackingNumber: vi.fn().mockResolvedValue({
        isValid: true,
        detectedType: 'container',
      }),
      healthCheck: vi.fn().mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
    },
    shouldUseMockAPI: vi.fn(() => true),
  };
});

// Mock complex components to focus on integration flow
vi.mock('./components/MapComponent', () => ({
  MapComponent: ({ route }: any) => (
    <div data-testid="map-component">
      Map: {route?.origin?.name} → {route?.destination?.name}
    </div>
  ),
}));

vi.mock('./components/NetworkStatus', () => ({
  NetworkStatus: () => <div data-testid="network-status">Online</div>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderApp = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe('End-to-End Application Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full user journey from search to results display', async () => {
    const user = userEvent.setup();
    renderApp();

    // 1. Initial state - should show empty state
    expect(screen.getByText('Shipping Tracker')).toBeInTheDocument();
    expect(screen.getByText('Track Your Shipment')).toBeInTheDocument();
    expect(screen.getByText(/enter a tracking number above/i)).toBeInTheDocument();

    // 2. User enters tracking number
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    await user.type(searchInput, 'ABCD1234567');
    expect(searchInput).toHaveValue('ABCD1234567');

    // 3. User submits search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // 4. Loading state should appear
    expect(screen.getByText(/searching for tracking information/i)).toBeInTheDocument();

    // 5. Wait for results to load
    await waitFor(() => {
      expect(screen.queryByText(/searching for tracking information/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // 6. Results should be displayed
    await waitFor(() => {
      expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
    });

    // 7. Verify shipment details are shown
    expect(screen.getByText('MSC')).toBeInTheDocument();
    expect(screen.getByText('FCL')).toBeInTheDocument();

    // 8. Verify timeline is displayed
    expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();

    // 9. Verify map is displayed
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
    expect(screen.getByText('Map: New York → Rotterdam')).toBeInTheDocument();

    // 10. Verify network status is shown
    expect(screen.getByTestId('network-status')).toBeInTheDocument();
  });

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock API to return error
    const { apiClient } = await import('./api/client');
    vi.mocked(apiClient.searchShipment).mockRejectedValue(new Error('Shipment not found'));

    renderApp();

    // Enter invalid tracking number
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    await user.type(searchInput, 'INVALID123');

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByText('Shipment not found')).toBeInTheDocument();
    });

    // Should have dismiss button
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();

    // Dismiss error
    await user.click(dismissButton);

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Search Error')).not.toBeInTheDocument();
    });
  });

  it('shows proper loading states throughout the flow', async () => {
    const user = userEvent.setup();
    
    // Mock API with delay
    const { apiClient } = await import('./api/client');
    vi.mocked(apiClient.searchShipment).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        id: 'test-123',
        trackingNumber: 'ABCD1234567',
        trackingType: 'container',
        carrier: 'MSC',
        service: 'FCL',
        status: 'in_transit',
        timeline: [],
        route: {
          origin: { 
            code: 'USNYC', 
            name: 'New York', 
            city: 'New York', 
            country: 'United States',
            coordinates: { lat: 40.7128, lng: -74.0060 },
            timezone: 'America/New_York',
          },
          destination: { 
            code: 'NLRTM', 
            name: 'Rotterdam', 
            city: 'Rotterdam', 
            country: 'Netherlands',
            coordinates: { lat: 51.9244, lng: 4.4777 },
            timezone: 'Europe/Amsterdam',
          },
          intermediateStops: [],
          estimatedTransitTime: 14,
          routePath: [],
        },
        containers: [],
        vessel: {
          name: 'MSC OSCAR',
          imo: '9729428',
          voyage: 'W001E',
        },
        lastUpdated: new Date(),
        dataSource: 'mock-api',
      }), 1000))
    );

    renderApp();

    // Enter tracking number and search
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    await user.type(searchInput, 'ABCD1234567');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // Should show loading state
    expect(screen.getByText(/searching for tracking information/i)).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/searching for tracking information/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Should show results
    expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
  });

  it('maintains responsive design and accessibility', () => {
    renderApp();

    // Check main structure
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();

    // Check search input accessibility
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');

    // Check button accessibility
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeInTheDocument();
  });
});