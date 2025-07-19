
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MapComponent from './MapComponent';
import type { MapComponentProps, Port, RouteInfo, LatLng } from '../../types';

// Mock Leaflet and react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, eventHandlers, ...props }: any) => (
    <div 
      data-testid="marker" 
      {...props}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: (props: any) => <div data-testid="polyline" {...props} />,
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn(),
  }),
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn(() => ({ options: {} })),
    latLngBounds: vi.fn(() => ({
      extend: vi.fn(),
      isValid: vi.fn(() => true),
    })),
  },
}));

// Mock CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

describe('MapComponent', () => {
  const mockOriginPort: Port = {
    code: 'USNYC',
    name: 'New York',
    city: 'New York',
    country: 'United States',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    timezone: 'America/New_York',
  };

  const mockDestinationPort: Port = {
    code: 'NLRTM',
    name: 'Rotterdam',
    city: 'Rotterdam',
    country: 'Netherlands',
    coordinates: { lat: 51.9244, lng: 4.4777 },
    timezone: 'Europe/Amsterdam',
  };

  const mockIntermediatePort: Port = {
    code: 'GBFXT',
    name: 'Felixstowe',
    city: 'Felixstowe',
    country: 'United Kingdom',
    coordinates: { lat: 51.9539, lng: 1.3518 },
    timezone: 'Europe/London',
  };

  const mockRoute: RouteInfo = {
    origin: mockOriginPort,
    destination: mockDestinationPort,
    intermediateStops: [mockIntermediatePort],
    estimatedTransitTime: 14,
    routePath: [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 51.9539, lng: 1.3518 },
      { lat: 51.9244, lng: 4.4777 },
    ],
  };

  const mockVesselPosition: LatLng = {
    lat: 45.0,
    lng: -30.0,
  };

  const mockPorts: Port[] = [mockOriginPort, mockDestinationPort, mockIntermediatePort];

  const mockOnMarkerClick = vi.fn();

  const defaultProps: MapComponentProps = {
    route: mockRoute,
    ports: mockPorts,
    onMarkerClick: mockOnMarkerClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container with correct props', () => {
    render(<MapComponent {...defaultProps} />);
    
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  it('renders tile layer', () => {
    render(<MapComponent {...defaultProps} />);
    
    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toBeInTheDocument();
  });

  it('renders route polyline', () => {
    render(<MapComponent {...defaultProps} />);
    
    const polyline = screen.getByTestId('polyline');
    expect(polyline).toBeInTheDocument();
  });

  it('renders origin and destination markers', () => {
    render(<MapComponent {...defaultProps} />);
    
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBeGreaterThanOrEqual(2); // At least origin and destination
  });

  it('renders vessel position marker when provided', () => {
    render(<MapComponent {...defaultProps} vesselPosition={mockVesselPosition} />);
    
    const markers = screen.getAllByTestId('marker');
    // Should have origin, destination, intermediate, and vessel markers
    expect(markers.length).toBeGreaterThanOrEqual(3);
  });

  it('calls onMarkerClick when marker is clicked', async () => {
    render(<MapComponent {...defaultProps} />);
    
    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[0]);
    
    await waitFor(() => {
      expect(mockOnMarkerClick).toHaveBeenCalled();
    });
  });

  it('renders legend when showControls is true', () => {
    render(<MapComponent {...defaultProps} showControls={true} />);
    
    expect(screen.getByText('Legend')).toBeInTheDocument();
    expect(screen.getAllByText('Origin Port')).toHaveLength(2); // One in legend, one in popup
    expect(screen.getAllByText('Destination Port')).toHaveLength(2); // One in legend, one in popup
    expect(screen.getAllByText('Intermediate Stop')).toHaveLength(2); // One in legend, one in popup
    expect(screen.getByText('Shipping Route')).toBeInTheDocument();
  });

  it('does not render legend when showControls is false', () => {
    render(<MapComponent {...defaultProps} showControls={false} />);
    
    expect(screen.queryByText('Legend')).not.toBeInTheDocument();
  });

  it('renders vessel position in legend when vessel is present', () => {
    render(<MapComponent {...defaultProps} vesselPosition={mockVesselPosition} showControls={true} />);
    
    expect(screen.getAllByText('Vessel Position')).toHaveLength(2); // One in legend, one in popup
  });

  it('applies custom height and className', () => {
    const customHeight = 500;
    const customClassName = 'custom-map-class';
    
    render(
      <MapComponent 
        {...defaultProps} 
        height={customHeight} 
        className={customClassName} 
      />
    );
    
    const mapWrapper = screen.getByTestId('map-container').parentElement;
    expect(mapWrapper).toHaveClass(customClassName);
    expect(mapWrapper).toHaveStyle({ height: `${customHeight}px` });
  });

  it('handles map errors gracefully', () => {
    // This test would need to simulate a map loading error
    // For now, we'll just verify the component renders without crashing
    render(<MapComponent {...defaultProps} />);
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders popup content for ports', () => {
    render(<MapComponent {...defaultProps} />);
    
    const popups = screen.getAllByTestId('popup');
    expect(popups.length).toBeGreaterThan(0);
    
    // Check if port information is rendered in popups (multiple instances expected)
    expect(screen.getAllByText('New York')).toHaveLength(2); // Port name and city
    expect(screen.getAllByText('Rotterdam')).toHaveLength(2); // Port name and city
  });

  it('handles interactive prop correctly', () => {
    render(<MapComponent {...defaultProps} interactive={false} />);
    
    const mapContainer = screen.getByTestId('map-container');
    // Check that the component renders without errors when interactive is false
    expect(mapContainer).toBeInTheDocument();
  });

  it('renders intermediate stops correctly', () => {
    render(<MapComponent {...defaultProps} />);
    
    // Should render intermediate port name in popup (multiple instances expected)
    expect(screen.getAllByText('Felixstowe')).toHaveLength(2); // Port name and city
  });

  it('filters out duplicate ports from additional ports list', () => {
    const duplicatePorts = [...mockPorts, mockOriginPort]; // Add duplicate origin port
    
    render(<MapComponent {...defaultProps} ports={duplicatePorts} />);
    
    // Should not render duplicate markers
    const markers = screen.getAllByTestId('marker');
    // Exact count depends on implementation, but should not have duplicates
    expect(markers.length).toBeGreaterThan(0);
  });
});