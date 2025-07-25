import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  TrackingType, 
  RawTrackingData, 
  APIError, 
  TimelineEvent,
  Container,
  VesselInfo,
  Port,
  LatLng
} from '../../types';
import { config } from '../../config/environment';

export interface TrackTraceRequest {
  trackingNumber: string;
  trackingType: TrackingType;
}

export interface TrackTraceAPIResponse {
  trackingNumber: string;
  status: string;
  carrier?: string;
  service?: string;
  events: TrackTraceEvent[];
  containers?: TrackTraceContainer[];
  vessel?: TrackTraceVessel;
  route?: TrackTraceRoute;
  lastUpdated: string;
  dataSource: string;
}

export interface TrackTraceEvent {
  eventId?: string;
  eventDateTime: string;
  eventType: string;
  eventDescription: string;
  location: {
    locationName: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  isCompleted: boolean;
}

export interface TrackTraceContainer {
  containerNumber: string;
  containerSize?: string;
  containerType?: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

export interface TrackTraceVessel {
  vesselName?: string;
  vesselIMO?: string;
  voyageNumber?: string;
  currentPosition?: {
    latitude: number;
    longitude: number;
  };
  estimatedTimeOfArrival?: string;
  actualTimeOfArrival?: string;
}

export interface TrackTraceRoute {
  origin?: {
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  destination?: {
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Track-Trace Free API Service for basic container tracking
 * Implements Requirements 7.1, 7.4 for free tier fallback integration
 * This service provides basic tracking functionality with rate limitations
 */
export class TrackTraceAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 8000;
  private readonly retryAttempts: number = 2;
  private readonly rateLimitPerMinute: number = 50;
  private readonly rateLimitPerHour: number = 500;

  constructor() {
    this.baseUrl = 'https://api.track-trace.com/v1/tracking';
    this.apiKey = config.apiProviders.trackTrace?.apiKey || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ Track-Trace API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'X-API-Version': '1.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🆓 Track-Trace API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Track-Trace API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Track-Trace API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ Track-Trace API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using Track-Trace Free API
   * Primarily supports container numbers with basic tracking information
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType
  ): Promise<RawTrackingData> {
    // If no API key is configured, provide enhanced mock data
    if (!this.apiKey || config.demo.enabled) {
      console.log(`🎭 Track-Trace API: Using mock data for ${trackingNumber} (demo mode or no API key)`);
      return await this.generateMockData(trackingNumber, trackingType);
    }

    // Check if tracking type is supported
    if (trackingType !== 'container') {
      return {
        provider: 'track-trace',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'track-trace',
          errorType: 'INVALID_RESPONSE',
          message: `Track-Trace API only supports container tracking, not ${trackingType}`
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 Track-Trace API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const response = await this.client.get('/container', {
          params: {
            container: trackingNumber.trim().toUpperCase(),
            includeEvents: true,
            includeVessel: false, // Free tier limitation
            includeRoute: false   // Free tier limitation
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ Track-Trace API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Track-Trace API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, handle the error
        if (attempt >= this.retryAttempts) {
          return this.handleError(trackingNumber, error);
        }

        // Wait before retrying (shorter delay for free tier)
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Generate realistic mock data for testing and demo purposes
   */
  private async generateMockData(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData> {
    // Simulate API delay
    const delay = Math.random() * 2000 + 500; // 500-2500ms delay
    
    return new Promise(resolve => {
      setTimeout(() => {
        // Generate different scenarios based on tracking number patterns
        const scenario = this.getMockScenario(trackingNumber);
        
        const mockData = {
          trackingNumber,
          trackingType,
          carrier: scenario.carrier,
          service: 'FCL' as const,
          status: scenario.status,
          timeline: scenario.timeline,
          containers: [{
            number: trackingNumber,
            size: '40ft' as const,
            type: 'HC' as const,
            sealNumber: 'TT' + Math.random().toString().substr(2, 6),
          }],
          vessel: scenario.vessel,
          route: scenario.route,
          lastUpdated: new Date(),
          dataSource: 'track-trace-mock',
          reliability: 0.85, // High reliability for Track-Trace
        };

        resolve({
          provider: 'track-trace',
          trackingNumber,
          data: mockData,
          timestamp: new Date(),
          reliability: 0.85,
          status: 'success',
        });
      }, delay);
    });
  }

  /**
   * Get mock scenario based on tracking number pattern
   */
  private getMockScenario(trackingNumber: string) {
    const scenarios = [
      {
        carrier: 'Maersk Line',
        status: 'In Transit',
        timeline: [
          {
            id: 'tt-1',
            status: 'Booked',
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            location: 'Hamburg, Germany',
            description: 'Container booking confirmed',
            isCompleted: true,
          },
          {
            id: 'tt-2',
            status: 'Gate In',
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            location: 'Hamburg Port, Germany',
            description: 'Container received at terminal',
            isCompleted: true,
          },
          {
            id: 'tt-3',
            status: 'Loaded',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            location: 'Hamburg Port, Germany',
            description: 'Container loaded on vessel',
            isCompleted: true,
          },
          {
            id: 'tt-4',
            status: 'Departed',
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            location: 'Hamburg Port, Germany',
            description: 'Vessel departed from origin port',
            isCompleted: true,
          },
          {
            id: 'tt-5',
            status: 'In Transit',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            location: 'North Atlantic Ocean',
            description: 'Vessel en route to destination',
            isCompleted: true,
          },
        ],
        vessel: {
          name: 'Maersk Edinburgh',
          imo: 'IMO9632179',
          flag: 'Denmark',
          voyage: 'ME2401',
          currentPosition: { lat: 50.1109, lng: -30.2589 },
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
        route: {
          origin: {
            name: 'Hamburg Port',
            code: 'DEHAM',
            city: 'Hamburg',
            country: 'Germany',
            timezone: 'Europe/Berlin',
            coordinates: { lat: 53.5511, lng: 9.9937 },
          },
          destination: {
            name: 'New York Port',
            code: 'USNYC',
            city: 'New York',
            country: 'United States',
            timezone: 'America/New_York',
            coordinates: { lat: 40.7128, lng: -74.0060 },
          },
          intermediateStops: [],
          estimatedTransitTime: 12,
        },
      },
      {
        carrier: 'COSCO Shipping',
        status: 'Delivered',
        timeline: [
          {
            id: 'tt-d1',
            status: 'Booked',
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            location: 'Shanghai, China',
            description: 'Shipment booked successfully',
            isCompleted: true,
          },
          {
            id: 'tt-d2',
            status: 'Departed',
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            location: 'Shanghai Port, China',
            description: 'Container departed from origin',
            isCompleted: true,
          },
          {
            id: 'tt-d3',
            status: 'Arrived',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            location: 'Los Angeles Port, CA',
            description: 'Container arrived at destination port',
            isCompleted: true,
          },
          {
            id: 'tt-d4',
            status: 'Delivered',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            location: 'Los Angeles, CA',
            description: 'Container delivered to consignee',
            isCompleted: true,
          },
        ],
        vessel: {
          name: 'COSCO Shipping Universe',
          imo: 'IMO9795478',
          flag: 'China',
          voyage: 'CSU024',
          currentPosition: { lat: 33.7361, lng: -118.2922 },
          eta: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        route: {
          origin: {
            name: 'Shanghai Port',
            code: 'CNSHA',
            city: 'Shanghai',
            country: 'China',
            timezone: 'Asia/Shanghai',
            coordinates: { lat: 31.2304, lng: 121.4737 },
          },
          destination: {
            name: 'Los Angeles Port',
            code: 'USLAX',
            city: 'Los Angeles',
            country: 'United States',
            timezone: 'America/Los_Angeles',
            coordinates: { lat: 33.7361, lng: -118.2922 },
          },
          intermediateStops: [],
          estimatedTransitTime: 14,
        },
      },
    ];

    // Choose scenario based on tracking number hash
    const hash = trackingNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return scenarios[hash % scenarios.length];
  }

  /**
   * Transform Track-Trace API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: TrackTraceAPIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: data.carrier || 'Unknown',
        service: this.mapServiceType(data.service || 'FCL'),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.lastUpdated || new Date()),
        dataSource: data.dataSource || 'track-trace'
      };

      return {
        provider: 'track-trace',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability: 0.68, // Lower reliability for free tier
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming Track-Trace response:', error);
      throw new Error(`Failed to transform Track-Trace API response: ${error}`);
    }
  }

  /**
   * Transform Track-Trace events to our timeline format
   */
  private transformEvents(events: TrackTraceEvent[]): TimelineEvent[] {
    return events.map((event, index) => ({
      id: event.eventId || `track-trace-event-${index}`,
      timestamp: new Date(event.eventDateTime),
      status: this.mapEventStatus(event.eventType),
      location: this.formatLocation(event.location),
      description: event.eventDescription || event.eventType,
      isCompleted: event.isCompleted,
      coordinates: event.location.coordinates ? {
        lat: event.location.coordinates.latitude,
        lng: event.location.coordinates.longitude
      } : undefined
    }));
  }

  /**
   * Transform Track-Trace containers to our format
   */
  private transformContainers(containers: TrackTraceContainer[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize || '40ft'),
      type: this.mapContainerType(container.containerType || 'GP'),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: undefined // Free tier doesn't provide dimensions
    }));
  }

  /**
   * Transform Track-Trace vessel info to our format (limited in free tier)
   */
  private transformVessel(vessel?: TrackTraceVessel): VesselInfo | undefined {
    if (!vessel) return undefined;

    return {
      name: vessel.vesselName || 'Unknown',
      imo: vessel.vesselIMO || '',
      voyage: vessel.voyageNumber || '',
      currentPosition: vessel.currentPosition ? {
        lat: vessel.currentPosition.latitude,
        lng: vessel.currentPosition.longitude
      } : undefined,
      eta: vessel.estimatedTimeOfArrival ? new Date(vessel.estimatedTimeOfArrival) : undefined,
      ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined
    };
  }

  /**
   * Transform Track-Trace route info to our format (limited in free tier)
   */
  private transformRoute(route?: TrackTraceRoute) {
    if (!route || !route.origin || !route.destination) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: [], // Free tier doesn't provide intermediate stops
      estimatedTransitTime: 0,
      actualTransitTime: undefined
    };
  }

  /**
   * Transform port information (with defaults for missing data)
   */
  private transformPort(port: any): Port {
    return {
      code: port.portCode || '',
      name: port.portName || 'Unknown Port',
      city: port.city || '',
      country: port.country || '',
      coordinates: port.coordinates ? {
        lat: port.coordinates.latitude,
        lng: port.coordinates.longitude
      } : { lat: 0, lng: 0 },
      timezone: 'UTC'
    };
  }

  /**
   * Map Track-Trace service types to our standard types
   */
  private mapServiceType(service: string): 'FCL' | 'LCL' {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('lcl') || serviceLower.includes('less than container')) {
      return 'LCL';
    }
    return 'FCL'; // Default to FCL
  }

  /**
   * Map Track-Trace status to our standard status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PLANNED': 'Planned',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'DELAYED': 'Delayed',
      'ON_HOLD': 'On Hold',
      'CANCELLED': 'Cancelled',
      'DEPARTED': 'Departed',
      'ARRIVED': 'Arrived',
      'UNKNOWN': 'Unknown'
    };

    return statusMap[status.toUpperCase()] || status;
  }

  /**
   * Map Track-Trace event types to readable status
   */
  private mapEventStatus(eventType: string): string {
    const eventMap: Record<string, string> = {
      'GATE_OUT': 'Departed',
      'GATE_IN': 'Arrived',
      'LOADED': 'Loaded',
      'DISCHARGED': 'Discharged',
      'VESSEL_DEPARTURE': 'Vessel Departed',
      'VESSEL_ARRIVAL': 'Vessel Arrived',
      'CUSTOMS_RELEASE': 'Customs Released',
      'DELIVERED': 'Delivered',
      'PICKED_UP': 'Picked Up',
      'RETURNED': 'Returned'
    };

    return eventMap[eventType.toUpperCase()] || eventType.replace(/_/g, ' ');
  }

  /**
   * Map container sizes
   */
  private mapContainerSize(size: string): '20ft' | '40ft' | '45ft' {
    if (size.includes('20')) return '20ft';
    if (size.includes('45')) return '45ft';
    return '40ft'; // Default to 40ft
  }

  /**
   * Map container types
   */
  private mapContainerType(type: string): 'GP' | 'HC' | 'RF' | 'OT' {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('high') || typeLower.includes('hc')) return 'HC';
    if (typeLower.includes('reefer') || typeLower.includes('rf')) return 'RF';
    if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat')) return 'OT';
    return 'GP'; // Default to General Purpose
  }

  /**
   * Format location string
   */
  private formatLocation(location: TrackTraceEvent['location']): string {
    const parts = [location.locationName];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  }

  /**
   * Handle API errors and convert to our error format
   * Special handling for free tier limitations
   */
  private handleError(trackingNumber: string, error: any): RawTrackingData {
    let apiError: APIError;

    if (error.response) {
      // HTTP error response
      const status = error.response.status;
      const statusText = error.response.statusText;
      const data = error.response.data;

      switch (status) {
        case 401:
          apiError = {
            provider: 'track-trace',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired Track-Trace API key',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'track-trace',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in Track-Trace system`,
            statusCode: status
          };
          break;
        case 429:
          // Free tier rate limiting is more aggressive
          apiError = {
            provider: 'track-trace',
            errorType: 'RATE_LIMIT',
            message: 'Track-Trace API rate limit exceeded (free tier)',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 120 // Longer wait for free tier
          };
          break;
        case 402:
          // Payment required - free tier limitation
          apiError = {
            provider: 'track-trace',
            errorType: 'RATE_LIMIT',
            message: 'Track-Trace free tier quota exceeded',
            statusCode: status,
            retryAfter: 3600 // 1 hour wait for quota reset
          };
          break;
        default:
          apiError = {
            provider: 'track-trace',
            errorType: 'INVALID_RESPONSE',
            message: `Track-Trace API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'track-trace',
        errorType: 'TIMEOUT',
        message: 'Track-Trace API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'track-trace',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to Track-Trace API'
      };
    } else {
      apiError = {
        provider: 'track-trace',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown Track-Trace API error'
      };
    }

    return {
      provider: 'track-trace',
      trackingNumber,
      data: null,
      timestamp: new Date(),
      reliability: 0,
      status: 'error',
      error: apiError
    };
  }

  /**
   * Check if API is available and configured
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get API configuration info
   */
  getConfig() {
    return {
      name: 'track-trace',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container'] as TrackingType[], // Only container tracking in free tier
      reliability: 0.68,
      rateLimits: {
        perMinute: this.rateLimitPerMinute,
        perHour: this.rateLimitPerHour
      },
      tier: 'free',
      limitations: [
        'Container tracking only',
        'Limited vessel information',
        'No route details',
        'Basic event information',
        'Rate limited to 50 requests/minute'
      ]
    };
  }

  /**
   * Check current rate limit status (useful for free tier management)
   */
  getRateLimitStatus(): {
    remainingMinute: number;
    remainingHour: number;
    resetTime: Date;
  } {
    // This would typically be tracked in a database or cache
    // For now, return mock data
    return {
      remainingMinute: this.rateLimitPerMinute - 10, // Mock usage
      remainingHour: this.rateLimitPerHour - 50,     // Mock usage
      resetTime: new Date(Date.now() + 60000) // Next minute
    };
  }
}