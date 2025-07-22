import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../../App';

// Mock multiple API endpoints to test fallback mechanisms
const server = setupServer(
  // Primary API endpoint
  rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
    const trackingNumber = req.url.searchParams.get('trackingNumber');
    
    if (trackingNumber === 'PRIMARY_SUCCESS') {
      return res(
        ctx.json({
          data: {
            trackingNumber: 'PRIMARY_SUCCESS',
            status: 'In Transit',
            source: 'primary',
            timeline: [
              { date: '2024-01-01', event: 'Shipped', location: 'Primary Source' }
            ]
          }
        })
      );
    }
    
    if (trackingNumber === 'PRIMARY_FAIL') {
      return res(ctx.status(500));
    }
    
    if (trackingNumber === 'FALLBACK_TEST') {
      return res(ctx.status(503)); // Service unavailable
    }
    
    return res(ctx.status(404));
  }),

  // Fallback API endpoint
  rest.get('http://localhost:3001/api/track/fallback', (req, res, ctx) => {
    const trackingNumber = req.url.searchParams.get('trackingNumber');
    
    if (trackingNumber === 'FALLBACK_TEST') {
      return res(
        ctx.json({
          data: {
            trackingNumber: 'FALLBACK_TEST',
            status: 'Delivered',
            source: 'fallback',
            timeline: [
              { date: '2024-01-01', event: 'Shipped', location: 'Fallback Source' },
              { date: '2024-01-05', event: 'Delivered', location: 'Destination' }
            ]
          }
        })
      );
    }
    
    return res(ctx.status(404));
  }),

  // Cache endpoint
  rest.get('http://localhost:3001/api/cache/:trackingNumber', (req, res, ctx) => {
    const { trackingNumber } = req.params;
    
    if (trackingNumber === 'CACHED_DATA') {
      return res(
        ctx.json({
          data: {
            trackingNumber: 'CACHED_DATA',
            status: 'Cached Status',
            source: 'cache',
            cached: true,
            timeline: [
              { date: '2024-01-01', event: 'Cached Event', location: 'Cache' }
            ]
          }
        })
      );
    }
    
    return res(ctx.status(404));
  })
);

describe('API Fallback Mechanism Tests', () => {
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

  it('should use primary API when available', async () => {
    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'PRIMARY_SUCCESS' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should show data from primary source
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('Primary Source')).toBeInTheDocument();
  });

  it('should fallback to secondary API when primary fails', async () => {
    // Mock primary API to fail, secondary to succeed
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(ctx.status(500)); // Primary fails
      }),
      rest.get('http://localhost:3001/api/track/fallback', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'FALLBACK_TEST',
              status: 'Delivered',
              source: 'fallback',
              timeline: [
                { date: '2024-01-05', event: 'Delivered', location: 'Fallback Source' }
              ]
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'FALLBACK_TEST' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should show data from fallback source
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Fallback Source')).toBeInTheDocument();
  });

  it('should use cached data when all APIs fail', async () => {
    // Mock all APIs to fail
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
      rest.get('http://localhost:3001/api/track/fallback', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
      rest.get('http://localhost:3001/api/cache/:trackingNumber', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'CACHED_DATA',
              status: 'Cached Status',
              source: 'cache',
              cached: true,
              timeline: [
                { date: '2024-01-01', event: 'Cached Event', location: 'Cache' }
              ]
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'CACHED_DATA' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should show cached data
    expect(screen.getByText('Cached Status')).toBeInTheDocument();
    expect(screen.getByText('Cache')).toBeInTheDocument();
  });

  it('should handle timeout and retry with fallback', async () => {
    let primaryAttempts = 0;
    
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        primaryAttempts++;
        if (primaryAttempts <= 2) {
          return res(ctx.delay(15000)); // Timeout
        }
        return res(ctx.status(500));
      }),
      rest.get('http://localhost:3001/api/track/fallback', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'TIMEOUT_TEST',
              status: 'Fallback Success',
              source: 'fallback'
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'TIMEOUT_TEST' } });
    fireEvent.click(searchButton);

    // Should eventually show fallback data
    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    }, { timeout: 20000 });

    expect(screen.getByText('Fallback Success')).toBeInTheDocument();
  });

  it('should handle rate limiting with exponential backoff', async () => {
    let requestCount = 0;
    
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        requestCount++;
        
        if (requestCount <= 3) {
          return res(
            ctx.status(429),
            ctx.json({ error: 'Rate limit exceeded', retryAfter: 1 })
          );
        }
        
        return res(
          ctx.json({
            data: {
              trackingNumber: 'RATE_LIMIT_TEST',
              status: 'Success After Retry',
              source: 'primary'
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'RATE_LIMIT_TEST' } });
    fireEvent.click(searchButton);

    // Should eventually succeed after retries
    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText('Success After Retry')).toBeInTheDocument();
    expect(requestCount).toBeGreaterThan(3);
  });

  it('should aggregate data from multiple sources', async () => {
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'AGGREGATE_TEST',
              status: 'In Transit',
              source: 'primary',
              timeline: [
                { date: '2024-01-01', event: 'Shipped', location: 'Origin' }
              ]
            }
          })
        );
      }),
      rest.get('http://localhost:3001/api/track/secondary', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'AGGREGATE_TEST',
              vessel: {
                name: 'Secondary Vessel',
                imo: 'IMO123'
              },
              timeline: [
                { date: '2024-01-03', event: 'Port Departure', location: 'Port A' }
              ]
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'AGGREGATE_TEST' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should show aggregated data from multiple sources
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('Origin')).toBeInTheDocument();
  });

  it('should handle partial failures gracefully', async () => {
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'PARTIAL_SUCCESS',
              status: 'In Transit',
              timeline: [
                { date: '2024-01-01', event: 'Shipped', location: 'Origin' }
              ]
            }
          })
        );
      }),
      rest.get('http://localhost:3001/api/vessel/:trackingNumber', (req, res, ctx) => {
        return res(ctx.status(500)); // Vessel data fails
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'PARTIAL_SUCCESS' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should show available data even if some sources fail
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('Origin')).toBeInTheDocument();
    
    // Should not crash due to missing vessel data
    expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
  });

  it('should prioritize data sources by reliability', async () => {
    // Mock premium source (highest priority)
    server.use(
      rest.get('http://localhost:3001/api/premium/track', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'PRIORITY_TEST',
              status: 'Premium Data',
              source: 'premium',
              confidence: 'high'
            }
          })
        );
      }),
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'PRIORITY_TEST',
              status: 'Standard Data',
              source: 'standard',
              confidence: 'medium'
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    fireEvent.change(searchInput, { target: { value: 'PRIORITY_TEST' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    // Should prioritize premium data source
    expect(screen.getByText('Premium Data')).toBeInTheDocument();
  });

  it('should show appropriate error messages for different failure types', async () => {
    const errorScenarios = [
      { status: 404, expectedMessage: /not found/i },
      { status: 429, expectedMessage: /rate limit/i },
      { status: 500, expectedMessage: /server error/i },
      { status: 503, expectedMessage: /service unavailable/i }
    ];

    for (const scenario of errorScenarios) {
      server.use(
        rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
          return res(ctx.status(scenario.status));
        }),
        rest.get('http://localhost:3001/api/track/fallback', (req, res, ctx) => {
          return res(ctx.status(scenario.status));
        })
      );

      renderWithProviders(<App />);

      const searchInput = screen.getByTestId('search-input');
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'ERROR_TEST' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(scenario.expectedMessage);

      // Reset for next iteration
      server.resetHandlers();
    }
  });
});