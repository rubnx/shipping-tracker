import { ShipmentTracking, TimelineEvent, Container, VesselInfo, RouteInfo, Port } from '../types';

/**
 * Mock data service for demo mode and testing
 * Implements Requirements 5.1, 5.2, 9.3 for demo mode functionality
 */
export class MockDataService {
  private static readonly DEMO_TRACKING_NUMBERS = [
    // Standard demo numbers
    'DEMO123456789',
    'TEST987654321',
    'SAMPLE123ABC',
    'MOCK456DEF',
    'DEMO789GHI',
    
    // Container tracking numbers
    'CONTAINER001',
    'CONTAINER002',
    'CONTAINER003',
    'CNTR123456789',
    'CNTR987654321',
    
    // Booking numbers
    'BOOKING001',
    'BOOKING002',
    'BOOKING003',
    'BKG123456789',
    'BKG987654321',
    
    // Bill of Lading numbers
    'BOL001',
    'BOL002',
    'BOL003',
    'BILL123456789',
    'BILL987654321',
    
    // Carrier-specific demo numbers
    'MAERSK123456',
    'MSC987654321',
    'CMACGM123456',
    'COSCO987654321',
    'HAPAG123456',
    'EVERGREEN987',
    'ONE123456789',
    'YANGMING123',
    'ZIM987654321',
    
    // Error testing numbers
    'ERROR123',
    'TIMEOUT456',
    'NOTFOUND789',
    'RATELIMIT123',
    
    // Different status demo numbers
    'DELIVERED001',
    'INTRANSIT002',
    'DEPARTED003',
    'ARRIVED004',
    'LOADING005',
  ];

  private static readonly MOCK_PORTS: Port[] = [
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
      code: 'SGSIN',
      name: 'Singapore',
      city: 'Singapore',
      country: 'Singapore',
      coordinates: { lat: 1.2966, lng: 103.7764 },
      timezone: 'Asia/Singapore',
    },
    {
      code: 'CNSHA',
      name: 'Shanghai',
      city: 'Shanghai',
      country: 'China',
      coordinates: { lat: 31.2304, lng: 121.4737 },
      timezone: 'Asia/Shanghai',
    },
    {
      code: 'DEHAM',
      name: 'Hamburg',
      city: 'Hamburg',
      country: 'Germany',
      coordinates: { lat: 53.5511, lng: 9.9937 },
      timezone: 'Europe/Berlin',
    },
    {
      code: 'GBFXT',
      name: 'Felixstowe',
      city: 'Felixstowe',
      country: 'United Kingdom',
      coordinates: { lat: 51.9542, lng: 1.3464 },
      timezone: 'Europe/London',
    },
  ];

  private static readonly MOCK_CARRIERS = [
    'Maersk Line',
    'MSC',
    'CMA CGM',
    'COSCO Shipping',
    'Hapag-Lloyd',
    'Evergreen Line',
    'ONE (Ocean Network Express)',
    'Yang Ming',
    'ZIM',
  ];

  private static readonly MOCK_VESSELS: VesselInfo[] = [
    {
      name: 'MSC GULSUN',
      imo: '9811000',
      voyage: 'FL1MA',
      currentPosition: { lat: 51.5074, lng: -0.1278 },
      eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      ata: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      name: 'EVER GIVEN',
      imo: '9811020',
      voyage: 'EG2024',
      currentPosition: { lat: 30.0444, lng: 31.2357 },
      eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      ata: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'MAERSK ESSEX',
      imo: '9811040',
      voyage: 'ME2024A',
      currentPosition: { lat: 1.2966, lng: 103.7764 },
      eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      ata: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  /**
   * Check if a tracking number is a demo tracking number
   */
  static isDemoTrackingNumber(trackingNumber: string): boolean {
    return this.DEMO_TRACKING_NUMBERS.includes(trackingNumber.toUpperCase()) ||
           trackingNumber.toUpperCase().startsWith('DEMO') ||
           trackingNumber.toUpperCase().startsWith('TEST') ||
           trackingNumber.toUpperCase().startsWith('MOCK') ||
           trackingNumber.toUpperCase().startsWith('SAMPLE');
  }

  /**
   * Get list of demo tracking numbers
   */
  static getDemoTrackingNumbers(): string[] {
    return [...this.DEMO_TRACKING_NUMBERS];
  }

  /**
   * Generate mock shipment data
   */
  static generateMockShipment(trackingNumber: string): ShipmentTracking {
    const hash = this.hashString(trackingNumber);
    const carrierIndex = hash % this.MOCK_CARRIERS.length;
    const vesselIndex = hash % this.MOCK_VESSELS.length;
    const originIndex = hash % this.MOCK_PORTS.length;
    const destinationIndex = (hash + 1) % this.MOCK_PORTS.length;

    const origin = this.MOCK_PORTS[originIndex];
    const destination = this.MOCK_PORTS[destinationIndex];
    const vessel = this.MOCK_VESSELS[vesselIndex];
    const carrier = this.MOCK_CARRIERS[carrierIndex];

    // Check for status-specific mock data
    const statusSpecific = this.generateStatusSpecificMockData(trackingNumber);
    
    // Generate timeline events (use status-specific if available)
    const timeline = statusSpecific?.timeline || this.generateMockTimeline(origin, destination, hash);
    
    // Generate containers
    const containers = this.generateMockContainers(hash);

    // Generate route
    const route = this.generateMockRoute(origin, destination, hash);

    // Determine current status (use status-specific if available)
    const currentStatus = statusSpecific?.status || this.getCurrentStatus(timeline);

    return {
      id: `mock-${trackingNumber.toLowerCase()}`,
      trackingNumber: trackingNumber.toUpperCase(),
      trackingType: this.detectTrackingType(trackingNumber),
      carrier,
      service: hash % 2 === 0 ? 'FCL' : 'LCL',
      status: currentStatus,
      timeline,
      route,
      containers,
      vessel,
      lastUpdated: new Date(),
      dataSource: 'Mock Data Service (Demo Mode)',
    };
  }

  /**
   * Generate mock timeline events
   */
  private static generateMockTimeline(origin: Port, destination: Port, hash: number): TimelineEvent[] {
    const baseTime = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
    const events: TimelineEvent[] = [];

    const timelineSteps = [
      { status: 'Booking Confirmed', description: 'Shipment booking has been confirmed', offset: 0 },
      { status: 'Container Loaded', description: `Container loaded at ${origin.name}`, offset: 1 },
      { status: 'Departed Origin Port', description: `Vessel departed from ${origin.name}`, offset: 2 },
      { status: 'In Transit', description: 'Shipment is in transit', offset: 5 },
      { status: 'Arrived Destination Port', description: `Vessel arrived at ${destination.name}`, offset: 8 },
      { status: 'Container Discharged', description: `Container discharged at ${destination.name}`, offset: 9 },
      { status: 'Available for Pickup', description: 'Container available for pickup', offset: 10 },
    ];

    // Determine how many steps to complete based on hash
    const completedSteps = (hash % 7) + 1;

    timelineSteps.forEach((step, index) => {
      const isCompleted = index < completedSteps;
      const isCurrentStatus = index === completedSteps - 1;
      
      events.push({
        id: `event-${index}`,
        timestamp: new Date(baseTime + step.offset * 24 * 60 * 60 * 1000),
        status: step.status,
        location: index <= 2 ? origin.name : destination.name,
        description: step.description,
        isCompleted,
        coordinates: index <= 2 ? origin.coordinates : destination.coordinates,
      });
    });

    return events;
  }

  /**
   * Generate mock containers
   */
  private static generateMockContainers(hash: number): Container[] {
    const containerCount = (hash % 3) + 1; // 1-3 containers
    const containers: Container[] = [];

    const sizes: Container['size'][] = ['20ft', '40ft', '45ft'];
    const types: Container['type'][] = ['GP', 'HC', 'RF', 'OT'];

    for (let i = 0; i < containerCount; i++) {
      const containerHash = hash + i;
      containers.push({
        number: `MOCK${String(containerHash).padStart(7, '0')}`,
        size: sizes[containerHash % sizes.length],
        type: types[containerHash % types.length],
        sealNumber: `SEAL${String(containerHash).padStart(6, '0')}`,
        weight: 15000 + (containerHash % 10000), // 15-25 tons
        dimensions: {
          length: 20,
          width: 8,
          height: 8.5,
        },
      });
    }

    return containers;
  }

  /**
   * Generate mock route
   */
  private static generateMockRoute(origin: Port, destination: Port, hash: number): RouteInfo {
    // Generate intermediate stops
    const availablePorts = this.MOCK_PORTS.filter(p => p.code !== origin.code && p.code !== destination.code);
    const stopCount = hash % 3; // 0-2 intermediate stops
    const intermediateStops: Port[] = [];

    for (let i = 0; i < stopCount; i++) {
      const stopIndex = (hash + i) % availablePorts.length;
      intermediateStops.push(availablePorts[stopIndex]);
    }

    return {
      origin,
      destination,
      intermediateStops,
      estimatedTransitTime: 14 + (hash % 14), // 14-28 days
      actualTransitTime: hash % 2 === 0 ? 16 + (hash % 10) : undefined,
    };
  }

  /**
   * Detect tracking type from tracking number
   */
  private static detectTrackingType(trackingNumber: string): 'booking' | 'container' | 'bol' {
    const upper = trackingNumber.toUpperCase();
    
    if (upper.includes('BOOKING') || upper.includes('BKG')) {
      return 'booking';
    } else if (upper.includes('CONTAINER') || upper.includes('CNT')) {
      return 'container';
    } else if (upper.includes('BOL') || upper.includes('BILL')) {
      return 'bol';
    }
    
    // Default based on format
    if (upper.length >= 10) {
      return 'container';
    } else if (upper.length >= 8) {
      return 'booking';
    } else {
      return 'bol';
    }
  }

  /**
   * Get current status from timeline
   */
  private static getCurrentStatus(timeline: TimelineEvent[]): string {
    const currentEvent = timeline.find(event => 
      event.isCompleted && 
      timeline.indexOf(event) === timeline.filter(e => e.isCompleted).length - 1
    );
    
    return currentEvent?.status || 'Booking Confirmed';
  }

  /**
   * Simple hash function for consistent mock data generation
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate mock search history
   */
  static generateMockSearchHistory(): string[] {
    return [
      'DEMO123456789',
      'CONTAINER001',
      'BOOKING002',
      'TEST987654321',
      'SAMPLE123ABC',
    ];
  }

  /**
   * Simulate API delay for realistic demo experience
   */
  static async simulateAPIDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate mock API error for testing error handling
   */
  static generateMockError(trackingNumber: string): Error | null {
    const upper = trackingNumber.toUpperCase();
    
    if (upper.includes('ERROR')) {
      return new Error('Mock API error for testing');
    } else if (upper.includes('TIMEOUT')) {
      return new Error('Request timeout');
    } else if (upper.includes('NOTFOUND')) {
      return new Error('Tracking number not found');
    } else if (upper.includes('RATELIMIT')) {
      return new Error('Rate limit exceeded');
    }
    
    return null;
  }

  /**
   * Check if mock data should return an error
   */
  static shouldReturnError(trackingNumber: string): boolean {
    const upper = trackingNumber.toUpperCase();
    return upper.includes('ERROR') || 
           upper.includes('TIMEOUT') || 
           upper.includes('NOTFOUND') || 
           upper.includes('RATELIMIT');
  }

  /**
   * Get mock API status for dashboard
   */
  static getMockAPIStatus() {
    return {
      trackTrace: { status: 'healthy', responseTime: 250, lastChecked: new Date() },
      shipsGo: { status: 'healthy', responseTime: 180, lastChecked: new Date() },
      seaRates: { status: 'healthy', responseTime: 320, lastChecked: new Date() },
      maersk: { status: 'demo', responseTime: 150, lastChecked: new Date() },
      msc: { status: 'demo', responseTime: 200, lastChecked: new Date() },
      project44: { status: 'demo', responseTime: 100, lastChecked: new Date() },
    };
  }

  /**
   * Get demo mode information and available demo tracking numbers
   */
  static getDemoModeInfo() {
    return {
      enabled: true,
      description: 'Demo mode provides realistic sample data for development and testing',
      availableTrackingNumbers: {
        containers: this.DEMO_TRACKING_NUMBERS.filter(num => 
          num.includes('CONTAINER') || num.includes('CNTR')
        ),
        bookings: this.DEMO_TRACKING_NUMBERS.filter(num => 
          num.includes('BOOKING') || num.includes('BKG')
        ),
        billsOfLading: this.DEMO_TRACKING_NUMBERS.filter(num => 
          num.includes('BOL') || num.includes('BILL')
        ),
        carriers: this.DEMO_TRACKING_NUMBERS.filter(num => 
          ['MAERSK', 'MSC', 'CMACGM', 'COSCO', 'HAPAG', 'EVERGREEN', 'ONE', 'YANGMING', 'ZIM'].some(carrier => 
            num.includes(carrier)
          )
        ),
        errorTesting: this.DEMO_TRACKING_NUMBERS.filter(num => 
          ['ERROR', 'TIMEOUT', 'NOTFOUND', 'RATELIMIT'].some(error => 
            num.includes(error)
          )
        ),
        statusTesting: this.DEMO_TRACKING_NUMBERS.filter(num => 
          ['DELIVERED', 'INTRANSIT', 'DEPARTED', 'ARRIVED', 'LOADING'].some(status => 
            num.includes(status)
          )
        ),
      },
      features: [
        'Realistic shipment data with multiple carriers',
        'Various container types and sizes',
        'Complete timeline with multiple status updates',
        'Interactive map with route visualization',
        'Error simulation for testing error handling',
        'Consistent data generation based on tracking number',
        'Simulated API response delays',
      ],
      usage: {
        examples: [
          { number: 'DEMO123456789', description: 'Standard demo shipment' },
          { number: 'CONTAINER001', description: 'Container tracking example' },
          { number: 'BOOKING002', description: 'Booking number example' },
          { number: 'BOL003', description: 'Bill of lading example' },
          { number: 'MAERSK123456', description: 'Maersk carrier example' },
          { number: 'ERROR123', description: 'Error simulation example' },
          { number: 'DELIVERED001', description: 'Delivered status example' },
        ],
      },
    };
  }

  /**
   * Generate status-specific mock data
   */
  static generateStatusSpecificMockData(trackingNumber: string): Partial<ShipmentTracking> | null {
    const upper = trackingNumber.toUpperCase();
    
    if (upper.includes('DELIVERED')) {
      return {
        status: 'Delivered',
        timeline: this.generateCompletedTimeline(),
      };
    } else if (upper.includes('INTRANSIT')) {
      return {
        status: 'In Transit',
        timeline: this.generateInTransitTimeline(),
      };
    } else if (upper.includes('DEPARTED')) {
      return {
        status: 'Departed Origin Port',
        timeline: this.generateDepartedTimeline(),
      };
    } else if (upper.includes('ARRIVED')) {
      return {
        status: 'Arrived Destination Port',
        timeline: this.generateArrivedTimeline(),
      };
    } else if (upper.includes('LOADING')) {
      return {
        status: 'Container Loading',
        timeline: this.generateLoadingTimeline(),
      };
    }
    
    return null;
  }

  /**
   * Generate completed timeline (delivered status)
   */
  private static generateCompletedTimeline(): TimelineEvent[] {
    const baseTime = Date.now() - (15 * 24 * 60 * 60 * 1000); // 15 days ago
    
    return [
      {
        id: 'event-1',
        timestamp: new Date(baseTime),
        status: 'Booking Confirmed',
        location: 'Shanghai',
        description: 'Shipment booking has been confirmed',
        isCompleted: true,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
      {
        id: 'event-2',
        timestamp: new Date(baseTime + 1 * 24 * 60 * 60 * 1000),
        status: 'Container Loaded',
        location: 'Shanghai',
        description: 'Container loaded at Shanghai port',
        isCompleted: true,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
      {
        id: 'event-3',
        timestamp: new Date(baseTime + 2 * 24 * 60 * 60 * 1000),
        status: 'Departed Origin Port',
        location: 'Shanghai',
        description: 'Vessel departed from Shanghai',
        isCompleted: true,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
      {
        id: 'event-4',
        timestamp: new Date(baseTime + 8 * 24 * 60 * 60 * 1000),
        status: 'In Transit',
        location: 'Pacific Ocean',
        description: 'Shipment is in transit',
        isCompleted: true,
        coordinates: { lat: 35.0, lng: -140.0 },
      },
      {
        id: 'event-5',
        timestamp: new Date(baseTime + 12 * 24 * 60 * 60 * 1000),
        status: 'Arrived Destination Port',
        location: 'Los Angeles',
        description: 'Vessel arrived at Los Angeles port',
        isCompleted: true,
        coordinates: { lat: 33.7701, lng: -118.1937 },
      },
      {
        id: 'event-6',
        timestamp: new Date(baseTime + 13 * 24 * 60 * 60 * 1000),
        status: 'Container Discharged',
        location: 'Los Angeles',
        description: 'Container discharged at Los Angeles port',
        isCompleted: true,
        coordinates: { lat: 33.7701, lng: -118.1937 },
      },
      {
        id: 'event-7',
        timestamp: new Date(baseTime + 14 * 24 * 60 * 60 * 1000),
        status: 'Delivered',
        location: 'Los Angeles',
        description: 'Container delivered to final destination',
        isCompleted: true,
        coordinates: { lat: 33.7701, lng: -118.1937 },
      },
    ];
  }

  /**
   * Generate in-transit timeline
   */
  private static generateInTransitTimeline(): TimelineEvent[] {
    const baseTime = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago
    
    return [
      {
        id: 'event-1',
        timestamp: new Date(baseTime),
        status: 'Booking Confirmed',
        location: 'Rotterdam',
        description: 'Shipment booking has been confirmed',
        isCompleted: true,
        coordinates: { lat: 51.9244, lng: 4.4777 },
      },
      {
        id: 'event-2',
        timestamp: new Date(baseTime + 1 * 24 * 60 * 60 * 1000),
        status: 'Container Loaded',
        location: 'Rotterdam',
        description: 'Container loaded at Rotterdam port',
        isCompleted: true,
        coordinates: { lat: 51.9244, lng: 4.4777 },
      },
      {
        id: 'event-3',
        timestamp: new Date(baseTime + 2 * 24 * 60 * 60 * 1000),
        status: 'Departed Origin Port',
        location: 'Rotterdam',
        description: 'Vessel departed from Rotterdam',
        isCompleted: true,
        coordinates: { lat: 51.9244, lng: 4.4777 },
      },
      {
        id: 'event-4',
        timestamp: new Date(baseTime + 3 * 24 * 60 * 60 * 1000),
        status: 'In Transit',
        location: 'Atlantic Ocean',
        description: 'Shipment is currently in transit',
        isCompleted: true,
        coordinates: { lat: 45.0, lng: -30.0 },
      },
      {
        id: 'event-5',
        timestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'Arrived Destination Port',
        location: 'New York',
        description: 'Expected arrival at New York port',
        isCompleted: false,
        coordinates: { lat: 40.7128, lng: -74.0060 },
      },
    ];
  }

  /**
   * Generate departed timeline
   */
  private static generateDepartedTimeline(): TimelineEvent[] {
    const baseTime = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days ago
    
    return [
      {
        id: 'event-1',
        timestamp: new Date(baseTime),
        status: 'Booking Confirmed',
        location: 'Singapore',
        description: 'Shipment booking has been confirmed',
        isCompleted: true,
        coordinates: { lat: 1.2966, lng: 103.7764 },
      },
      {
        id: 'event-2',
        timestamp: new Date(baseTime + 1 * 24 * 60 * 60 * 1000),
        status: 'Container Loaded',
        location: 'Singapore',
        description: 'Container loaded at Singapore port',
        isCompleted: true,
        coordinates: { lat: 1.2966, lng: 103.7764 },
      },
      {
        id: 'event-3',
        timestamp: new Date(baseTime + 2 * 24 * 60 * 60 * 1000),
        status: 'Departed Origin Port',
        location: 'Singapore',
        description: 'Vessel departed from Singapore port',
        isCompleted: true,
        coordinates: { lat: 1.2966, lng: 103.7764 },
      },
      {
        id: 'event-4',
        timestamp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'In Transit',
        location: 'Indian Ocean',
        description: 'Shipment will be in transit',
        isCompleted: false,
        coordinates: { lat: -10.0, lng: 80.0 },
      },
    ];
  }

  /**
   * Generate arrived timeline
   */
  private static generateArrivedTimeline(): TimelineEvent[] {
    const baseTime = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
    
    return [
      {
        id: 'event-1',
        timestamp: new Date(baseTime),
        status: 'Booking Confirmed',
        location: 'Hamburg',
        description: 'Shipment booking has been confirmed',
        isCompleted: true,
        coordinates: { lat: 53.5511, lng: 9.9937 },
      },
      {
        id: 'event-2',
        timestamp: new Date(baseTime + 1 * 24 * 60 * 60 * 1000),
        status: 'Container Loaded',
        location: 'Hamburg',
        description: 'Container loaded at Hamburg port',
        isCompleted: true,
        coordinates: { lat: 53.5511, lng: 9.9937 },
      },
      {
        id: 'event-3',
        timestamp: new Date(baseTime + 2 * 24 * 60 * 60 * 1000),
        status: 'Departed Origin Port',
        location: 'Hamburg',
        description: 'Vessel departed from Hamburg',
        isCompleted: true,
        coordinates: { lat: 53.5511, lng: 9.9937 },
      },
      {
        id: 'event-4',
        timestamp: new Date(baseTime + 7 * 24 * 60 * 60 * 1000),
        status: 'In Transit',
        location: 'North Sea',
        description: 'Shipment was in transit',
        isCompleted: true,
        coordinates: { lat: 56.0, lng: 3.0 },
      },
      {
        id: 'event-5',
        timestamp: new Date(baseTime + 9 * 24 * 60 * 60 * 1000),
        status: 'Arrived Destination Port',
        location: 'Felixstowe',
        description: 'Vessel arrived at Felixstowe port',
        isCompleted: true,
        coordinates: { lat: 51.9542, lng: 1.3464 },
      },
      {
        id: 'event-6',
        timestamp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: 'Container Discharged',
        location: 'Felixstowe',
        description: 'Container will be discharged',
        isCompleted: false,
        coordinates: { lat: 51.9542, lng: 1.3464 },
      },
    ];
  }

  /**
   * Generate loading timeline
   */
  private static generateLoadingTimeline(): TimelineEvent[] {
    const baseTime = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago
    
    return [
      {
        id: 'event-1',
        timestamp: new Date(baseTime),
        status: 'Booking Confirmed',
        location: 'Shanghai',
        description: 'Shipment booking has been confirmed',
        isCompleted: true,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now()),
        status: 'Container Loading',
        location: 'Shanghai',
        description: 'Container is currently being loaded',
        isCompleted: true,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
      {
        id: 'event-3',
        timestamp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: 'Departed Origin Port',
        location: 'Shanghai',
        description: 'Vessel will depart from Shanghai',
        isCompleted: false,
        coordinates: { lat: 31.2304, lng: 121.4737 },
      },
    ];
  }
}