/**
 * Demo mode configuration and utilities
 * Implements Requirements 5.1, 5.2, 9.3 for demo mode functionality
 */

export interface DemoConfig {
  enabled: boolean;
  enableMockData: boolean;
  showAPIStatus: boolean;
  simulateDelay: boolean;
  defaultDelayMs: number;
  maxDelayMs: number;
}

export interface DemoTrackingNumber {
  number: string;
  description: string;
  category: 'container' | 'booking' | 'bol' | 'carrier' | 'error' | 'status';
  expectedStatus?: string;
  expectedError?: string;
}

// Demo configuration from environment variables
export const demoConfig: DemoConfig = {
  enabled: import.meta.env.VITE_DEMO_MODE === 'true',
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  showAPIStatus: import.meta.env.VITE_SHOW_API_STATUS === 'true',
  simulateDelay: true,
  defaultDelayMs: 1000,
  maxDelayMs: 3000,
};

// Predefined demo tracking numbers with descriptions
export const demoTrackingNumbers: DemoTrackingNumber[] = [
  // Standard demo numbers
  {
    number: 'DEMO123456789',
    description: 'Standard demo shipment with complete timeline',
    category: 'container',
    expectedStatus: 'In Transit',
  },
  {
    number: 'TEST987654321',
    description: 'Test shipment for development',
    category: 'container',
    expectedStatus: 'Departed Origin Port',
  },
  {
    number: 'SAMPLE123ABC',
    description: 'Sample tracking data',
    category: 'booking',
    expectedStatus: 'Booking Confirmed',
  },

  // Container tracking numbers
  {
    number: 'CONTAINER001',
    description: 'Container tracking example',
    category: 'container',
    expectedStatus: 'Container Loaded',
  },
  {
    number: 'CONTAINER002',
    description: 'Container in transit',
    category: 'container',
    expectedStatus: 'In Transit',
  },
  {
    number: 'CONTAINER003',
    description: 'Container delivered',
    category: 'container',
    expectedStatus: 'Delivered',
  },

  // Booking numbers
  {
    number: 'BOOKING001',
    description: 'Booking confirmation example',
    category: 'booking',
    expectedStatus: 'Booking Confirmed',
  },
  {
    number: 'BOOKING002',
    description: 'Booking with vessel assigned',
    category: 'booking',
    expectedStatus: 'Container Loaded',
  },
  {
    number: 'BOOKING003',
    description: 'Booking in progress',
    category: 'booking',
    expectedStatus: 'Departed Origin Port',
  },

  // Bill of Lading numbers
  {
    number: 'BOL001',
    description: 'Bill of lading example',
    category: 'bol',
    expectedStatus: 'In Transit',
  },
  {
    number: 'BOL002',
    description: 'BOL with arrival confirmation',
    category: 'bol',
    expectedStatus: 'Arrived Destination Port',
  },
  {
    number: 'BOL003',
    description: 'BOL ready for pickup',
    category: 'bol',
    expectedStatus: 'Available for Pickup',
  },

  // Carrier-specific demo numbers
  {
    number: 'MAERSK123456',
    description: 'Maersk Line shipment',
    category: 'carrier',
    expectedStatus: 'In Transit',
  },
  {
    number: 'MSC987654321',
    description: 'MSC container shipment',
    category: 'carrier',
    expectedStatus: 'Departed Origin Port',
  },
  {
    number: 'CMACGM123456',
    description: 'CMA CGM shipment',
    category: 'carrier',
    expectedStatus: 'Container Loaded',
  },

  // Status-specific demo numbers
  {
    number: 'DELIVERED001',
    description: 'Completed delivery example',
    category: 'status',
    expectedStatus: 'Delivered',
  },
  {
    number: 'INTRANSIT002',
    description: 'Currently in transit',
    category: 'status',
    expectedStatus: 'In Transit',
  },
  {
    number: 'DEPARTED003',
    description: 'Recently departed port',
    category: 'status',
    expectedStatus: 'Departed Origin Port',
  },
  {
    number: 'ARRIVED004',
    description: 'Arrived at destination',
    category: 'status',
    expectedStatus: 'Arrived Destination Port',
  },
  {
    number: 'LOADING005',
    description: 'Container loading in progress',
    category: 'status',
    expectedStatus: 'Container Loading',
  },

  // Error testing numbers
  {
    number: 'ERROR123',
    description: 'Simulates API error',
    category: 'error',
    expectedError: 'Mock API error for testing',
  },
  {
    number: 'TIMEOUT456',
    description: 'Simulates request timeout',
    category: 'error',
    expectedError: 'Request timeout',
  },
  {
    number: 'NOTFOUND789',
    description: 'Simulates tracking not found',
    category: 'error',
    expectedError: 'Tracking number not found',
  },
  {
    number: 'RATELIMIT123',
    description: 'Simulates rate limit exceeded',
    category: 'error',
    expectedError: 'Rate limit exceeded',
  },
];

// Demo mode utilities
export class DemoModeUtils {
  /**
   * Check if demo mode is enabled
   */
  static isEnabled(): boolean {
    return demoConfig.enabled;
  }

  /**
   * Check if mock data is enabled
   */
  static isMockDataEnabled(): boolean {
    return demoConfig.enableMockData;
  }

  /**
   * Check if a tracking number is a demo number
   */
  static isDemoTrackingNumber(trackingNumber: string): boolean {
    const upper = trackingNumber.toUpperCase();
    return demoTrackingNumbers.some(demo => demo.number === upper) ||
           upper.startsWith('DEMO') ||
           upper.startsWith('TEST') ||
           upper.startsWith('MOCK') ||
           upper.startsWith('SAMPLE');
  }

  /**
   * Get demo tracking numbers by category
   */
  static getDemoNumbersByCategory(category?: DemoTrackingNumber['category']): DemoTrackingNumber[] {
    if (!category) {
      return demoTrackingNumbers;
    }
    return demoTrackingNumbers.filter(demo => demo.category === category);
  }

  /**
   * Get demo tracking number info
   */
  static getDemoNumberInfo(trackingNumber: string): DemoTrackingNumber | null {
    const upper = trackingNumber.toUpperCase();
    return demoTrackingNumbers.find(demo => demo.number === upper) || null;
  }

  /**
   * Get quick demo examples for UI
   */
  static getQuickExamples(): DemoTrackingNumber[] {
    return [
      demoTrackingNumbers.find(d => d.number === 'DEMO123456789')!,
      demoTrackingNumbers.find(d => d.number === 'CONTAINER001')!,
      demoTrackingNumbers.find(d => d.number === 'BOOKING002')!,
      demoTrackingNumbers.find(d => d.number === 'BOL003')!,
      demoTrackingNumbers.find(d => d.number === 'MAERSK123456')!,
      demoTrackingNumbers.find(d => d.number === 'DELIVERED001')!,
    ];
  }

  /**
   * Simulate API delay for realistic demo experience
   */
  static async simulateDelay(customDelayMs?: number): Promise<void> {
    if (!demoConfig.simulateDelay) {
      return;
    }

    const delay = customDelayMs || 
      Math.random() * (demoConfig.maxDelayMs - demoConfig.defaultDelayMs) + demoConfig.defaultDelayMs;
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get demo mode status message
   */
  static getStatusMessage(): string {
    if (!demoConfig.enabled) {
      return 'Demo mode is disabled';
    }

    return 'Demo mode is active - using sample data for development and testing';
  }

  /**
   * Get demo mode features list
   */
  static getFeatures(): string[] {
    return [
      'Realistic shipment data with multiple carriers',
      'Various container types and sizes',
      'Complete timeline with multiple status updates',
      'Interactive map with route visualization',
      'Error simulation for testing error handling',
      'Consistent data generation based on tracking number',
      'Simulated API response delays',
      'Multiple tracking number formats (container, booking, BOL)',
      'Carrier-specific demo data',
      'Status-specific examples',
    ];
  }

  /**
   * Get demo mode configuration for display
   */
  static getConfiguration(): DemoConfig {
    return { ...demoConfig };
  }

  /**
   * Format tracking number for display
   */
  static formatTrackingNumber(trackingNumber: string): string {
    return trackingNumber.toUpperCase();
  }

  /**
   * Get category display name
   */
  static getCategoryDisplayName(category: DemoTrackingNumber['category']): string {
    const displayNames: Record<DemoTrackingNumber['category'], string> = {
      container: 'Container Numbers',
      booking: 'Booking Numbers',
      bol: 'Bill of Lading',
      carrier: 'Carrier Examples',
      error: 'Error Testing',
      status: 'Status Examples',
    };

    return displayNames[category];
  }

  /**
   * Get category description
   */
  static getCategoryDescription(category: DemoTrackingNumber['category']): string {
    const descriptions: Record<DemoTrackingNumber['category'], string> = {
      container: 'Container tracking numbers for FCL and LCL shipments',
      booking: 'Booking confirmation numbers from carriers',
      bol: 'Bill of lading numbers for shipment documentation',
      carrier: 'Carrier-specific tracking examples',
      error: 'Numbers that simulate various error conditions',
      status: 'Numbers that demonstrate different shipment statuses',
    };

    return descriptions[category];
  }

  /**
   * Check if should show API status
   */
  static shouldShowAPIStatus(): boolean {
    return demoConfig.showAPIStatus;
  }

  /**
   * Get demo mode help text
   */
  static getHelpText(): string {
    return `
Demo mode provides realistic sample data for development and testing. 
Try any of the demo tracking numbers to see different scenarios:

• Standard examples: DEMO123456789, TEST987654321
• Container tracking: CONTAINER001, CONTAINER002
• Booking numbers: BOOKING001, BOOKING002
• Error testing: ERROR123, TIMEOUT456, NOTFOUND789
• Status examples: DELIVERED001, INTRANSIT002

All demo numbers generate consistent, realistic data including:
- Complete shipment timelines
- Container and vessel information
- Interactive route maps
- Multiple carrier examples
    `.trim();
  }
}

export default DemoModeUtils;