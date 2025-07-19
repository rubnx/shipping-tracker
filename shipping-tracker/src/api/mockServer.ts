import type { 
  ShipmentTracking, 
  ValidationResult, 
  TrackingType,
  TimelineEvent,
  Container,
  VesselInfo,
  RouteInfo,
  Port
} from '../types';

// Mock data
const mockPorts: Port[] = [
  {
    code: 'USNYC',
    name: 'New York',
    city: 'New York',
    country: 'United States',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    timezone: 'America/New_York',
  },
  {
    code: 'NLRTM',
    name: 'Rotterdam',
    city: 'Rotterdam',
    country: 'Netherlands',
    coordinates: { lat: 51.9244, lng: 4.4777 },
    timezone: 'Europe/Amsterdam',
  },
  {
    code: 'GBFXT',
    name: 'Felixstowe',
    city: 'Felixstowe',
    country: 'United Kingdom',
    coordinates: { lat: 51.9539, lng: 1.3518 },
    timezone: 'Europe/London',
  },
];

const mockRoute: RouteInfo = {
  origin: mockPorts[0],
  destination: mockPorts[1],
  intermediateStops: [mockPorts[2]],
  estimatedTransitTime: 14,
  routePath: [
    { lat: 40.7128, lng: -74.0060 },
    { lat: 45.0, lng: -30.0 },
    { lat: 51.9539, lng: 1.3518 },
    { lat: 51.9244, lng: 4.4777 },
  ],
};

const mockVessel: VesselInfo = {
  name: 'MSC OSCAR',
  imo: '9729428',
  voyage: 'W001E',
  currentPosition: { lat: 45.0, lng: -30.0 },
  eta: new Date('2024-01-15T16:45:00Z'),
};

const mockContainers: Container[] = [
  {
    number: 'ABCD1234567',
    size: '40ft',
    type: 'HC',
    sealNumber: 'SL123456',
    weight: 28500,
    dimensions: {
      length: 40,
      width: 8,
      height: 9.6,
      unit: 'ft',
    },
  },
];

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    status: 'Booking Confirmed',
    location: 'New York, USA',
    description: 'Shipment booking has been confirmed and container allocated',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '2',
    timestamp: new Date('2024-01-02T14:30:00Z'),
    status: 'Container Loaded',
    location: 'New York Port, USA',
    description: 'Container loaded onto vessel MSC OSCAR',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '3',
    timestamp: new Date('2024-01-03T08:15:00Z'),
    status: 'Departed Origin',
    location: 'New York Port, USA',
    description: 'Vessel departed from origin port',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '4',
    timestamp: new Date('2024-01-10T12:00:00Z'),
    status: 'In Transit',
    location: 'Atlantic Ocean',
    description: 'Shipment is currently in transit across the Atlantic',
    isCompleted: false,
    isCurrentStatus: true,
  },
  {
    id: '5',
    timestamp: new Date('2024-01-15T16:45:00Z'),
    status: 'Arrived Destination',
    location: 'Rotterdam, Netherlands',
    description: 'Vessel arrived at destination port',
    isCompleted: false,
    isCurrentStatus: false,
  },
];

// Mock API functions
export class MockAPIServer {
  private delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateTrackingNumber(trackingNumber: string): Promise<ValidationResult> {
    await this.delay(300);

    // Simple validation logic
    if (trackingNumber.length < 4) {
      return {
        isValid: false,
        error: 'Tracking number too short',
      };
    }

    if (trackingNumber.match(/^[A-Z]{4}\d{7}$/)) {
      return {
        isValid: true,
        detectedType: 'container',
      };
    }

    if (trackingNumber.match(/^[A-Z]{3}\d{9}$/)) {
      return {
        isValid: true,
        detectedType: 'booking',
      };
    }

    if (trackingNumber.match(/^[A-Z]{4}\d{12}$/)) {
      return {
        isValid: true,
        detectedType: 'bol',
      };
    }

    return {
      isValid: false,
      error: 'Invalid tracking number format',
      suggestions: ['ABCD1234567', 'ABC123456789', 'ABCD123456789012'],
    };
  }

  async searchShipment(
    trackingNumber: string,
    type?: TrackingType
  ): Promise<ShipmentTracking> {
    await this.delay(1500);

    // Simulate API errors for certain inputs
    if (trackingNumber.toLowerCase().includes('error')) {
      throw new Error('Shipment not found');
    }

    if (trackingNumber.toLowerCase().includes('timeout')) {
      await this.delay(10000);
      throw new Error('Request timeout');
    }

    // Return mock shipment data
    return {
      id: Math.random().toString(36).substr(2, 9),
      trackingNumber,
      trackingType: type || 'container',
      carrier: 'MSC',
      service: 'FCL',
      status: 'in_transit',
      timeline: mockTimelineEvents,
      route: mockRoute,
      containers: mockContainers,
      vessel: mockVessel,
      lastUpdated: new Date(),
      dataSource: 'mock-api',
    };
  }

  async getShipmentDetails(trackingNumber: string): Promise<ShipmentTracking> {
    return this.searchShipment(trackingNumber);
  }

  async refreshShipment(trackingNumber: string): Promise<ShipmentTracking> {
    await this.delay(2000);
    
    const shipment = await this.searchShipment(trackingNumber);
    
    // Update last updated timestamp
    shipment.lastUpdated = new Date();
    
    // Simulate some progress in timeline
    const currentEventIndex = shipment.timeline.findIndex(e => e.isCurrentStatus);
    if (currentEventIndex >= 0 && currentEventIndex < shipment.timeline.length - 1) {
      shipment.timeline[currentEventIndex].isCurrentStatus = false;
      shipment.timeline[currentEventIndex].isCompleted = true;
      shipment.timeline[currentEventIndex + 1].isCurrentStatus = true;
    }
    
    return shipment;
  }

  async getShipments(trackingNumbers: string[]): Promise<ShipmentTracking[]> {
    await this.delay(2000);
    
    const shipments = await Promise.all(
      trackingNumbers.map(tn => this.searchShipment(tn))
    );
    
    return shipments;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    await this.delay(100);
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
export const mockAPIServer = new MockAPIServer();