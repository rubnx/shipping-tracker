import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ShipmentDetailsComponent from './ShipmentDetailsComponent';
import type { ShipmentTracking } from '../../types';

// Mock shipment data for testing
const mockShipment: ShipmentTracking = {
  id: 'test-shipment-1',
  trackingNumber: 'ABCD1234567',
  trackingType: 'container',
  carrier: 'Maersk Line',
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
      timezone: 'America/New_York'
    },
    destination: {
      code: 'NLRTM',
      name: 'Rotterdam',
      city: 'Rotterdam',
      country: 'Netherlands',
      coordinates: { lat: 51.9244, lng: 4.4777 },
      timezone: 'Europe/Amsterdam'
    },
    intermediateStops: [],
    estimatedTransitTime: 14
  },
  containers: [
    {
      number: 'ABCD1234567',
      size: '40ft',
      type: 'GP',
      sealNumber: 'SL123456',
      weight: 25000,
      dimensions: {
        length: 40,
        width: 8,
        height: 8.5,
        unit: 'ft'
      }
    },
    {
      number: 'EFGH7890123',
      size: '20ft',
      type: 'HC',
      sealNumber: 'SL789012'
    }
  ],
  vessel: {
    name: 'MSC OSCAR',
    imo: 'IMO9729428',
    voyage: 'VOY001W',
    eta: new Date('2024-02-15T10:00:00Z'),
    currentPosition: { lat: 45.5017, lng: -73.5673 }
  },
  lastUpdated: new Date('2024-02-01T12:00:00Z'),
  dataSource: 'maersk'
};

describe('ShipmentDetailsComponent', () => {
  it('renders loading state correctly', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={true}
        error={null}
      />
    );

    // Check for loading skeleton by class
    const loadingSkeleton = document.querySelector('.animate-pulse');
    expect(loadingSkeleton).toBeTruthy();
    
    // Check for skeleton elements
    expect(document.querySelector('.h-6.bg-gray-200')).toBeTruthy();
    expect(document.querySelector('.h-4.bg-gray-200')).toBeTruthy();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load shipment data';
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={errorMessage}
      />
    );

    expect(screen.getByText('Unable to Load Shipment Details')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const mockOnRefresh = vi.fn();
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error="Network error"
        onRefresh={mockOnRefresh}
      />
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders shipment details correctly', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    // Check header
    expect(screen.getByText('Shipment Details')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();

    // Check basic information
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
    expect(screen.getByText('Maersk Line')).toBeInTheDocument();
    expect(screen.getByText('FCL')).toBeInTheDocument();
    expect(screen.getByText('IN TRANSIT')).toBeInTheDocument();

    // Check vessel information
    expect(screen.getByText('Vessel Information')).toBeInTheDocument();
    expect(screen.getByText('MSC OSCAR')).toBeInTheDocument();
    expect(screen.getByText('IMO9729428')).toBeInTheDocument();
    expect(screen.getByText('VOY001W')).toBeInTheDocument();
  });

  it('renders container details correctly', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    // Check container details section
    expect(screen.getByText('Container Details (2 containers)')).toBeInTheDocument();
    
    // Check first container
    expect(screen.getByText('Container #ABCD1234567')).toBeInTheDocument();
    expect(screen.getByText('40ft')).toBeInTheDocument();
    expect(screen.getByText('GP')).toBeInTheDocument();
    expect(screen.getByText('SL123456')).toBeInTheDocument();
    expect(screen.getByText('25000 kg')).toBeInTheDocument();
    expect(screen.getByText('40 × 8 × 8.5 ft')).toBeInTheDocument();

    // Check second container
    expect(screen.getByText('Container #EFGH7890123')).toBeInTheDocument();
    expect(screen.getByText('20ft')).toBeInTheDocument();
    expect(screen.getByText('HC')).toBeInTheDocument();
    expect(screen.getByText('SL789012')).toBeInTheDocument();
  });

  it('renders vessel ETA correctly', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Estimated Arrival')).toBeInTheDocument();
    // The exact format may vary based on locale, so we check for the presence of date elements
    expect(screen.getByText(/2\/15\/2024|15\/2\/2024/)).toBeInTheDocument();
  });

  it('renders vessel current position correctly', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Current Position')).toBeInTheDocument();
    expect(screen.getByText('45.5017, -73.5673')).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    const mockOnRefresh = vi.fn();
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not render refresh button when showActions is false', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        showActions={false}
      />
    );

    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles shipment without containers', () => {
    const shipmentWithoutContainers = {
      ...mockShipment,
      containers: []
    };

    render(
      <ShipmentDetailsComponent
        shipment={shipmentWithoutContainers}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.queryByText(/Container Details/)).not.toBeInTheDocument();
  });

  it('handles vessel without ETA', () => {
    const shipmentWithoutETA = {
      ...mockShipment,
      vessel: {
        ...mockShipment.vessel,
        eta: undefined
      }
    };

    render(
      <ShipmentDetailsComponent
        shipment={shipmentWithoutETA}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.queryByText('Estimated Arrival')).not.toBeInTheDocument();
  });

  it('handles vessel without current position', () => {
    const shipmentWithoutPosition = {
      ...mockShipment,
      vessel: {
        ...mockShipment.vessel,
        currentPosition: undefined
      }
    };

    render(
      <ShipmentDetailsComponent
        shipment={shipmentWithoutPosition}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.queryByText('Current Position')).not.toBeInTheDocument();
  });

  it('renders container without optional fields', () => {
    const shipmentWithMinimalContainer = {
      ...mockShipment,
      containers: [{
        number: 'TEST123',
        size: '20ft' as const,
        type: 'GP' as const,
        sealNumber: 'SEAL123'
      }]
    };

    render(
      <ShipmentDetailsComponent
        shipment={shipmentWithMinimalContainer}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Container #TEST123')).toBeInTheDocument();
    expect(screen.getByText('20ft')).toBeInTheDocument();
    expect(screen.getByText('GP')).toBeInTheDocument();
    expect(screen.getByText('SEAL123')).toBeInTheDocument();
    
    // Should not show weight or dimensions
    expect(screen.queryByText(/kg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it('displays service type badges with correct colors', () => {
    // Test FCL service
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    const fclBadge = screen.getByText('FCL');
    expect(fclBadge).toHaveClass('bg-blue-100', 'text-blue-800');

    // Test LCL service
    const lclShipment = { ...mockShipment, service: 'LCL' as const };
    const { rerender } = render(
      <ShipmentDetailsComponent
        shipment={lclShipment}
        isLoading={false}
        error={null}
      />
    );

    rerender(
      <ShipmentDetailsComponent
        shipment={lclShipment}
        isLoading={false}
        error={null}
      />
    );

    const lclBadge = screen.getByText('LCL');
    expect(lclBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('displays container size badges with correct colors', () => {
    render(
      <ShipmentDetailsComponent
        shipment={mockShipment}
        isLoading={false}
        error={null}
      />
    );

    const container40ft = screen.getByText('40ft');
    expect(container40ft).toHaveClass('bg-green-100', 'text-green-800');

    const container20ft = screen.getByText('20ft');
    expect(container20ft).toHaveClass('bg-blue-100', 'text-blue-800');
  });
});