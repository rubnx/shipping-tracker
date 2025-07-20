import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from './App';

// Mock the API client
vi.mock('./api/client', () => ({
  apiClient: {
    searchShipment: vi.fn(),
    validateTrackingNumber: vi.fn(),
  },
  shouldUseMockAPI: vi.fn(() => true),
}));

// Mock the store
vi.mock('./store', () => ({
  useTrackingStore: () => ({
    isSearching: false,
    searchError: null,
    currentShipment: null,
    searchHistory: [],
    setIsSearching: vi.fn(),
    setSearchError: vi.fn(),
    setCurrentShipment: vi.fn(),
    addToSearchHistory: vi.fn(),
    cacheShipment: vi.fn(),
    getCachedShipment: vi.fn(),
  }),
}));

// Mock components that might have complex dependencies
vi.mock('./components/MapComponent', () => ({
  MapComponent: ({ route, onMarkerClick }: any) => (
    <div data-testid="map-component">
      <div>Map showing route from {route?.origin?.name} to {route?.destination?.name}</div>
      <button onClick={() => onMarkerClick({ name: 'Test Port' })}>
        Click Marker
      </button>
    </div>
  ),
}));

vi.mock('./components/NetworkStatus', () => ({
  NetworkStatus: () => <div data-testid="network-status">Network Status</div>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('App - End-to-End Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the initial state correctly', () => {
    renderWithProviders(<App />);
    
    // Check header
    expect(screen.getByText('Shipping Tracker')).toBeInTheDocument();
    expect(screen.getByText('Track your shipments in real-time')).toBeInTheDocument();
    
    // Check search component
    expect(screen.getByPlaceholderText(/enter tracking number/i)).toBeInTheDocument();
    
    // Check empty state
    expect(screen.getByText('Track Your Shipment')).toBeInTheDocument();
    expect(screen.getByText(/enter a tracking number above/i)).toBeInTheDocument();
    
    // Check supported formats
    expect(screen.getByText('Container Numbers')).toBeInTheDocument();
    expect(screen.getByText('Booking Numbers')).toBeInTheDocument();
    expect(screen.getByText('Bill of Lading')).toBeInTheDocument();
  });

  it('should handle search input and validation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    
    // Type a tracking number
    await user.type(searchInput, 'ABCD1234567');
    
    expect(searchInput).toHaveValue('ABCD1234567');
  });

  it('should display loading state during search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    
    const searchInput = screen.getByPlaceholderText(/enter tracking number/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Enter tracking number and search
    await user.type(searchInput, 'ABCD1234567');
    await user.click(searchButton);
    
    // Should show loading message
    expect(screen.getByText(/searching for tracking information/i)).toBeInTheDocument();
  });

  it('should display error message when search fails', async () => {
    const user = userEvent.setup();
    
    // Mock the store to return an error state
    vi.doMock('./store', () => ({
      useTrackingStore: () => ({
        isSearching: false,
        searchError: 'Shipment not found',
        currentShipment: null,
        searchHistory: [],
        setIsSearching: vi.fn(),
        setSearchError: vi.fn(),
        setCurrentShipment: vi.fn(),
        addToSearchHistory: vi.fn(),
        cacheShipment: vi.fn(),
        getCachedShipment: vi.fn(),
      }),
    }));
    
    renderWithProviders(<App />);
    
    // Should show error message
    expect(screen.getByText('Search Error')).toBeInTheDocument();
    expect(screen.getByText('Shipment not found')).toBeInTheDocument();
    
    // Should have dismiss button
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should display shipment results when search succeeds', async () => {
    const mockShipment = {
      id: 'test-123',
      trackingNumber: 'ABCD1234567',
      trackingType: 'container' as const,
      carrier: 'MSC',
      service: 'FCL' as const,
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
          size: '40ft' as const,
          type: 'HC' as const,
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

    // Mock the store to return shipment data
    vi.doMock('./store', () => ({
      useTrackingStore: () => ({
        isSearching: false,
        searchError: null,
        currentShipment: mockShipment,
        searchHistory: [],
        setIsSearching: vi.fn(),
        setSearchError: vi.fn(),
        setCurrentShipment: vi.fn(),
        addToSearchHistory: vi.fn(),
        cacheShipment: vi.fn(),
        getCachedShipment: vi.fn(),
      }),
    }));
    
    renderWithProviders(<App />);
    
    // Should show shipment details
    expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
    expect(screen.getByText('MSC')).toBeInTheDocument();
    expect(screen.getByText('FCL')).toBeInTheDocument();
    
    // Should show timeline
    expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    
    // Should show map
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
    expect(screen.getByText('Map showing route from New York to Rotterdam')).toBeInTheDocument();
  });

  it('should handle map marker clicks', async () => {
    const user = userEvent.setup();
    const mockShipment = {
      id: 'test-123',
      trackingNumber: 'ABCD1234567',
      trackingType: 'container' as const,
      carrier: 'MSC',
      service: 'FCL' as const,
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
    };

    // Mock console.log to verify marker click handling
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.doMock('./store', () => ({
      useTrackingStore: () => ({
        isSearching: false,
        searchError: null,
        currentShipment: mockShipment,
        searchHistory: [],
        setIsSearching: vi.fn(),
        setSearchError: vi.fn(),
        setCurrentShipment: vi.fn(),
        addToSearchHistory: vi.fn(),
        cacheShipment: vi.fn(),
        getCachedShipment: vi.fn(),
      }),
    }));
    
    renderWithProviders(<App />);
    
    // Click on map marker
    const markerButton = screen.getByText('Click Marker');
    await user.click(markerButton);
    
    // Should log the port click
    expect(consoleSpy).toHaveBeenCalledWith('Port clicked:', { name: 'Test Port' });
    
    consoleSpy.mockRestore();
  });

  it('should handle refresh functionality', async () => {
    const user = userEvent.setup();
    const mockShipment = {
      id: 'test-123',
      trackingNumber: 'ABCD1234567',
      trackingType: 'container' as const,
      carrier: 'MSC',
      service: 'FCL' as const,
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
    };

    vi.doMock('./store', () => ({
      useTrackingStore: () => ({
        isSearching: false,
        searchError: null,
        currentShipment: mockShipment,
        searchHistory: [],
        setIsSearching: vi.fn(),
        setSearchError: vi.fn(),
        setCurrentShipment: vi.fn(),
        addToSearchHistory: vi.fn(),
        cacheShipment: vi.fn(),
        getCachedShipment: vi.fn(),
      }),
    }));
    
    renderWithProviders(<App />);
    
    // Look for refresh button (it should be in the ShipmentDetailsComponent)
    const refreshButton = screen.queryByRole('button', { name: /refresh/i });
    if (refreshButton) {
      await user.click(refreshButton);
      // The refresh functionality should trigger a new search
    }
  });

  it('should show footer information', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText(/© 2024 Shipping Tracker/)).toBeInTheDocument();
    expect(screen.getByText(/Built with modern web technologies/)).toBeInTheDocument();
  });

  it('should be responsive and show network status', () => {
    renderWithProviders(<App />);
    
    // Should show network status component
    expect(screen.getByTestId('network-status')).toBeInTheDocument();
  });
});