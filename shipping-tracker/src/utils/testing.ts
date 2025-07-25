/**
 * Testing utilities and helpers
 * Implements comprehensive testing support for unit, integration, and accessibility testing
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test wrapper with providers
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data generators
export const createMockShipment = (overrides = {}) => ({
  trackingNumber: 'TEST123456789',
  trackingType: 'container' as const,
  carrier: 'Test Carrier',
  status: 'In Transit',
  estimatedDelivery: new Date('2024-12-31'),
  timeline: [
    {
      status: 'Booked',
      timestamp: new Date('2024-01-01'),
      location: 'Test Origin',
      description: 'Shipment booked',
      isCompleted: true,
    }
  ],
  route: {
    origin: {
      name: 'Test Origin',
      code: 'TO',
      country: 'Test Country',
      coordinates: { lat: 0, lng: 0 },
    },
    destination: {
      name: 'Test Destination',
      code: 'TD',
      country: 'Test Country',
      coordinates: { lat: 1, lng: 1 },
    },
    intermediateStops: [],
    distance: 1000,
    estimatedTransitTime: 14,
  },
  lastUpdated: new Date(),
  ...overrides,
});

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // Basic accessibility checks
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const buttons = container.querySelectorAll('button');
  const inputs = container.querySelectorAll('input');
  
  // Check for proper heading hierarchy
  let previousLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (level > previousLevel + 1) {
      console.warn(`Heading level skipped: ${heading.textContent}`);
    }
    previousLevel = level;
  });
  
  // Check for button accessibility
  buttons.forEach((button) => {
    if (!button.textContent && !button.getAttribute('aria-label')) {
      console.warn('Button without accessible text found');
    }
  });
  
  // Check for input labels
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    if (!label && !input.getAttribute('aria-label')) {
      console.warn('Input without label found');
    }
  });
};

// Performance testing helpers
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Integration test helpers
export const waitForApiCall = (timeout = 5000) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};