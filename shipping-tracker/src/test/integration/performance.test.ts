import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../../App';

// Performance testing utilities
const measurePerformance = async (operation: () => Promise<void>) => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

const server = setupServer(
  rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
    return res(
      ctx.delay(Math.random() * 1000), // Random delay 0-1000ms
      ctx.json({
        data: {
          trackingNumber: 'DEMO123456789',
          status: 'In Transit',
          timeline: Array.from({ length: 10 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            event: `Event ${i + 1}`,
            location: `Location ${i + 1}`,
            description: `Description for event ${i + 1}`
          }))
        }
      })
    );
  })
);

describe('Performance Integration Tests', () => {
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

  it('should render initial page within performance budget', async () => {
    const renderTime = await measurePerformance(async () => {
      renderWithProviders(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });
    });

    // Initial render should be under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle search within performance budget', async () => {
    renderWithProviders(<App />);

    const searchTime = await measurePerformance(async () => {
      const searchInput = screen.getByTestId('search-input');
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    // Search and render should complete within 2 seconds
    expect(searchTime).toBeLessThan(2000);
  });

  it('should handle multiple concurrent searches efficiently', async () => {
    const numSearches = 5;
    const apps = Array.from({ length: numSearches }, () => renderWithProviders(<App />));

    const concurrentSearchTime = await measurePerformance(async () => {
      const searchPromises = apps.map(async (_, index) => {
        const searchInput = screen.getAllByTestId('search-input')[index];
        const searchButton = screen.getAllByTestId('search-button')[index];

        fireEvent.change(searchInput, { target: { value: `DEMO12345678${index}` } });
        fireEvent.click(searchButton);

        return waitFor(() => {
          expect(screen.getAllByTestId('shipment-details')[index]).toBeInTheDocument();
        }, { timeout: 10000 });
      });

      await Promise.all(searchPromises);
    });

    // Concurrent searches should not take significantly longer than single search
    expect(concurrentSearchTime).toBeLessThan(5000);
  });

  it('should handle large datasets efficiently', async () => {
    // Mock large dataset response
    server.use(
      rest.get('http://localhost:3001/api/track', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              trackingNumber: 'DEMO123456789',
              status: 'In Transit',
              timeline: Array.from({ length: 100 }, (_, i) => ({
                date: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
                event: `Event ${i + 1}`,
                location: `Location ${i + 1}`,
                description: `Very long description for event ${i + 1} with lots of details about the shipment status and location information that might be quite lengthy`
              }))
            }
          })
        );
      })
    );

    renderWithProviders(<App />);

    const largeDataTime = await measurePerformance(async () => {
      const searchInput = screen.getByTestId('search-input');
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    // Large dataset should still render within reasonable time
    expect(largeDataTime).toBeLessThan(3000);
  });

  it('should maintain performance under memory pressure', async () => {
    // Create multiple app instances to simulate memory pressure
    const instances = Array.from({ length: 10 }, () => renderWithProviders(<App />));

    // Measure memory usage (approximate)
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Perform operations on all instances
    for (let i = 0; i < instances.length; i++) {
      const searchInputs = screen.getAllByTestId('search-input');
      const searchButtons = screen.getAllByTestId('search-button');

      if (searchInputs[i] && searchButtons[i]) {
        fireEvent.change(searchInputs[i], { target: { value: `DEMO12345678${i}` } });
        fireEvent.click(searchButtons[i]);
      }
    }

    // Wait for all to complete
    await waitFor(() => {
      const details = screen.getAllByTestId('shipment-details');
      expect(details.length).toBeGreaterThan(0);
    }, { timeout: 15000 });

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    if (initialMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  it('should handle rapid user interactions efficiently', async () => {
    renderWithProviders(<App />);

    const rapidInteractionTime = await measurePerformance(async () => {
      const searchInput = screen.getByTestId('search-input');

      // Simulate rapid typing
      const trackingNumber = 'DEMO123456789';
      for (let i = 0; i < trackingNumber.length; i++) {
        fireEvent.change(searchInput, { 
          target: { value: trackingNumber.substring(0, i + 1) } 
        });
        // Small delay to simulate typing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    // Rapid interactions should not significantly impact performance
    expect(rapidInteractionTime).toBeLessThan(3000);
  });

  it('should optimize re-renders efficiently', async () => {
    renderWithProviders(<App />);

    let renderCount = 0;
    const originalRender = React.createElement;
    
    // Mock createElement to count renders
    vi.spyOn(React, 'createElement').mockImplementation((...args) => {
      renderCount++;
      return originalRender.apply(React, args);
    });

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('search-button');

    const initialRenderCount = renderCount;

    fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
    });

    const finalRenderCount = renderCount;
    const additionalRenders = finalRenderCount - initialRenderCount;

    // Should not have excessive re-renders (less than 100 additional renders)
    expect(additionalRenders).toBeLessThan(100);

    vi.restoreAllMocks();
  });

  it('should handle API response caching for performance', async () => {
    renderWithProviders(<App />);

    // First search
    const firstSearchTime = await measurePerformance(async () => {
      const searchInput = screen.getByTestId('search-input');
      const searchButton = screen.getByTestId('search-button');

      fireEvent.change(searchInput, { target: { value: 'DEMO123456789' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
      });
    });

    // Clear and search again (should be cached)
    fireEvent.click(screen.getByTestId('search-input'));
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: '' } });

    const cachedSearchTime = await measurePerformance(async () => {
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'DEMO123456789' } });
      fireEvent.click(screen.getByTestId('search-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shipment-details')).toBeInTheDocument();
      });
    });

    // Cached search should be significantly faster
    expect(cachedSearchTime).toBeLessThan(firstSearchTime * 0.5);
  });
});