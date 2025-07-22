import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../../App';
import { apiClient } from '../../api/client';

// Mock server for API integration testing
const server = setupServer(
  rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
    const trackingNumber = req.url.searchParams.get('trackingNumber');
    
    if (trackingNumber === 'DEMO123456789') {
      return res(
        ctx.json({
          data: {
            trackingNumber: 'DEMO123456789',
            status: 'In Transit',
            carrier: 'Demo Carrier',
            timeline: [
              {
                date: '2024-01-01T00:00:00Z',
                event: 'Shipped',
                location: 'Shanghai, China',
                description: 'Package shipped from origin'
              },
              {
                date: '2024-01-05T00:00:00Z',
                event: 'In Transit',
                location: 'Pacific Ocean',
                description: 'Package in transit'
              }
            ],
            container: {
              number: 'DEMO123456789',
              size: '40HC',
              sealNumber: 'SEAL123'
            },
            vessel: {
              name: 'Demo Vessel',
              imo: 'IMO1234567',
              voyage: 'V001'
            }
          }
        })
      );
    }
    
    if (trackingNumber === 'ERROR123') {
      return res(
        ctx.status(500),
        ctx.json({ error: 'Internal server error' })
      );
    }
    
    if (trackingNumber === 'NOTFOUND123') {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Tracking number not found' })
      );
    }
    
    return res(
      ctx.status(400),
      ctx.json({ error: 'Invalid tracking number' })
    );
  }),

  rest.get('http://localhost:3001/health', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: 12345
      })
    );
  }),

  rest.post('http://localhost:3001/api/validate', (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          isValid: true,
          format: 'container',
          carrier: 'demo'
        }
      })
    );
  })
);

describe('API Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    server.listen();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  afterAll(() => {
    server.close();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should successfully fetch and display tracking data', async () => {
    renderWithProviders(<App />);

    // Find search input and button
    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    // Enter tracking number
    fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
    fireEvent.click(searchButton);

    // Wait for API call and results
    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify tracking data is displayed
    expect(screen.getByTestId('tracking-number')).toHaveTextContent('DEMO123456789');
    expect(screen.getByTestId('shipment-status')).toHaveTextContent('In Transit');
    
    // Verify timeline is displayed
    expect(screen.getByTestId('timeline-component')).toBeInTheDocument();
    
    // Verify container details
    expect(screen.getByText('40HC')).toBeInTheDocument();
    expect(screen.getByText('SEAL123')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    // Test server error
    fireEvent.change(searchInput, { target: { value: 'ERROR123' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent(/server error/i);
  });

  it('should handle not found errors', async () => {
    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'NOTFOUND123' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent(/not found/i);
  });

  it('should show loading states during API calls', async () => {
    // Add delay to API response
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(
          ctx.delay(1000),
          ctx.json({
            data: {
              trackingNumber: 'DEMO123456789',
              status: 'In Transit'
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
    fireEvent.click(searchButton);

    // Should show loading indicator
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle network timeouts', async () => {
    // Simulate network timeout
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(ctx.delay(15000)); // 15 second delay
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
    fireEvent.click(searchButton);

    // Should eventually show timeout error
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('should retry failed requests', async () => {
    let requestCount = 0;
    
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        requestCount++;
        
        if (requestCount === 1) {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server error' })
          );
        }
        
        return res(
          ctx.json({
            data: {
              trackingNumber: 'DEMO123456789',
              status: 'In Transit'
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
    fireEvent.click(searchButton);

    // Should show error first
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    // Should eventually show results
    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    expect(requestCount).toBe(2);
  });

  it('should validate API client methods directly', async () => {
    // Test API client methods directly
    const result = await apiClient.searchShipment('DEMO123456789');
    
    expect(result).toEqual({
      trackingNumber: 'DEMO123456789',
      status: 'In Transit',
      carrier: 'Demo Carrier',
      timeline: expect.any(Array),
      container: expect.any(Object),
      vessel: expect.any(Object)
    });
  });

  it('should handle concurrent API requests', async () => {
    const promises = [
      apiClient.searchShipment('DEMO123456789'),
      apiClient.searchShipment('DEMO123456789'),
      apiClient.searchShipment('DEMO123456789')
    ];

    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.trackingNumber).toBe('DEMO123456789');
      expect(result.status).toBe('In Transit');
    });
  });

  it('should handle API response caching', async () => {
    // First request
    const result1 = await apiClient.searchShipment('DEMO123456789');
    
    // Second request (should be cached)
    const result2 = await apiClient.searchShipment('DEMO123456789');
    
    expect(result1).toEqual(result2);
  });
});