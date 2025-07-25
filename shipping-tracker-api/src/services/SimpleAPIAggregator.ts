import { config } from '../config/environment';

/**
 * Simplified API Aggregator for basic functionality
 * This is a temporary implementation to get the server running
 */
export class APIAggregator {
  private providers: Map<string, any> = new Map();

  constructor() {
    // Initialize with available providers from config
    Object.entries(config.apiProviders).forEach(([key, provider]) => {
      if (provider.enabled) {
        this.providers.set(key, provider);
      }
    });
  }

  /**
   * Fetch tracking data from multiple sources
   */
  async fetchFromMultipleSources(trackingNumber: string, trackingType?: string): Promise<any[]> {
    // For now, return mock data
    return [
      {
        provider: 'demo',
        data: this.generateMockTrackingData(trackingNumber),
        success: true,
        responseTime: Math.random() * 2000 + 500
      }
    ];
  }

  /**
   * Prioritize and merge data from multiple sources
   */
  prioritizeDataSources(rawData: any[]): any {
    // Return the first successful result or mock data
    const successfulResult = rawData.find(result => result.success);
    return successfulResult?.data || this.generateMockTrackingData('UNKNOWN');
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): { name: string; reliability: number; available: boolean }[] {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      name: provider.name,
      reliability: 0.85,
      available: true
    }));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // No-op for now
  }

  /**
   * Generate mock tracking data
   */
  private generateMockTrackingData(trackingNumber: string): any {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return {
      trackingNumber,
      trackingType: 'container',
      carrier: 'Demo Carrier',
      status: 'In Transit',
      estimatedDelivery: futureDate,
      timeline: [
        {
          status: 'Booked',
          timestamp: pastDate,
          location: 'Shanghai, China',
          description: 'Shipment booked and confirmed',
          isCompleted: true,
        },
        {
          status: 'Departed',
          timestamp: new Date(pastDate.getTime() + 2 * 24 * 60 * 60 * 1000),
          location: 'Shanghai Port, China',
          description: 'Container departed from origin port',
          isCompleted: true,
        },
        {
          status: 'In Transit',
          timestamp: new Date(pastDate.getTime() + 4 * 24 * 60 * 60 * 1000),
          location: 'Pacific Ocean',
          description: 'Vessel en route to destination',
          isCompleted: true,
        },
        {
          status: 'Arriving',
          timestamp: futureDate,
          location: 'Los Angeles, CA',
          description: 'Expected arrival at destination port',
          isCompleted: false,
        },
      ],
      route: {
        origin: {
          name: 'Shanghai Port',
          code: 'CNSHA',
          country: 'China',
          coordinates: { lat: 31.2304, lng: 121.4737 },
        },
        destination: {
          name: 'Los Angeles Port',
          code: 'USLAX',
          country: 'United States',
          coordinates: { lat: 33.7361, lng: -118.2922 },
        },
        intermediateStops: [],
        distance: 11500,
        estimatedTransitTime: 14,
      },
      container: {
        number: trackingNumber,
        size: '40HC',
        type: 'High Cube',
        sealNumber: 'SEAL' + Math.random().toString().substr(2, 6),
      },
      vessel: {
        name: 'Demo Vessel',
        imo: 'IMO1234567',
        flag: 'Panama',
        currentPosition: { lat: 35.0, lng: -140.0 },
        eta: futureDate,
      },
    };
  }
}