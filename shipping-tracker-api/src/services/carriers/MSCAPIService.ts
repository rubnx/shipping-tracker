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

export interface MSCTrackingRequest {
  trackingNumber: string;
  trackingType: TrackingType;
}

export interface MSCAPIResponse {
  trackingNumber: string;
  status: string;
  carrier: string;
  service: string;
  events: MSCEvent[];
  containers?: MSCContainer[];
  vessel?: MSCVessel;
  route?: MSCRoute;
  lastUpdated: string;
}

export interface MSCEvent {
  eventId: string;
  eventDateTime: string;
  eventCode: string;
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

export interface MSCContainer {
  containerNumber: string;
  containerSize: string;
  containerType: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

export interface MSCVessel {
  vesselName: string;
  vesselIMO: string;
  voyageNumber: string;
  currentPosition?: {
    latitude: number;
    longitude: number;
  };
  estimatedTimeOfArrival?: string;
  actualTimeOfArrival?: string;
}

export interface MSCRoute {
  origin: {
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  destination: {
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  intermediateStops?: Array<{
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    estimatedArrival?: string;
    actualArrival?: string;
  }>;
}

/**
 * MSC API Service for container, booking, and BOL tracking
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export class MSCAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 12000;
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://api.msc.com/track';
    this.apiKey = config.apiKeys.msc;
    
    if (!this.apiKey) {
      console.warn('⚠️ MSC API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'X-API-Version': '2.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚢 MSC API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ MSC API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ MSC API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ MSC API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using MSC API
   * Supports container numbers, booking numbers, and BOL numbers
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType
  ): Promise<RawTrackingData> {
    if (!this.apiKey) {
      return {
        provider: 'msc',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'msc',
          errorType: 'AUTH_ERROR',
          message: 'MSC API key not configured'
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 MSC API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const endpoint = this.getTrackingEndpoint(trackingType);
        const response = await this.client.get(endpoint, {
          params: {
            trackingNumber: trackingNumber.trim().toUpperCase(),
            includeEvents: true,
            includeContainers: true,
            includeVessel: true,
            includeRoute: true
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ MSC API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ MSC API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, handle the error
        if (attempt >= this.retryAttempts) {
          return this.handleError(trackingNumber, error);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Get the appropriate API endpoint based on tracking type
   */
  private getTrackingEndpoint(trackingType: TrackingType): string {
    switch (trackingType) {
      case 'container':
        return '/containers';
      case 'booking':
        return '/bookings';
      case 'bol':
        return '/bills-of-lading';
      default:
        return '/containers'; // Default to container tracking
    }
  }

  /**
   * Transform MSC API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: MSCAPIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: 'MSC',
        service: this.mapServiceType(data.service),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.lastUpdated || new Date())
      };

      return {
        provider: 'msc',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability: 0.88, // MSC has good reliability
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming MSC response:', error);
      throw new Error(`Failed to transform MSC API response: ${error}`);
    }
  }

  /**
   * Transform MSC events to our timeline format
   */
  private transformEvents(events: MSCEvent[]): TimelineEvent[] {
    return events.map((event, index) => ({
      id: event.eventId || `msc-event-${index}`,
      timestamp: new Date(event.eventDateTime),
      status: this.mapEventStatus(event.eventCode),
      location: this.formatLocation(event.location),
      description: event.eventDescription || event.eventCode,
      isCompleted: event.isCompleted,
      coordinates: event.location.coordinates ? {
        lat: event.location.coordinates.latitude,
        lng: event.location.coordinates.longitude
      } : undefined
    }));
  }

  /**
   * Transform MSC containers to our format
   */
  private transformContainers(containers: MSCContainer[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize),
      type: this.mapContainerType(container.containerType),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: undefined // MSC doesn't typically provide dimensions in tracking
    }));
  }

  /**
   * Transform MSC vessel info to our format
   */
  private transformVessel(vessel?: MSCVessel): VesselInfo | undefined {
    if (!vessel) return undefined;

    return {
      name: vessel.vesselName,
      imo: vessel.vesselIMO,
      voyage: vessel.voyageNumber,
      currentPosition: vessel.currentPosition ? {
        lat: vessel.currentPosition.latitude,
        lng: vessel.currentPosition.longitude
      } : undefined,
      eta: vessel.estimatedTimeOfArrival ? new Date(vessel.estimatedTimeOfArrival) : undefined,
      ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined
    };
  }

  /**
   * Transform MSC route info to our format
   */
  private transformRoute(route?: MSCRoute) {
    if (!route) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
      estimatedTransitTime: 0, // MSC doesn't provide this directly
      actualTransitTime: undefined
    };
  }

  /**
   * Transform port information
   */
  private transformPort(port: any): Port {
    return {
      code: port.portCode,
      name: port.portName,
      city: port.city,
      country: port.country,
      coordinates: {
        lat: port.coordinates.latitude,
        lng: port.coordinates.longitude
      },
      timezone: 'UTC' // Default timezone, MSC doesn't provide this
    };
  }

  /**
   * Map MSC service types to our standard types
   */
  private mapServiceType(service: string): 'FCL' | 'LCL' {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('lcl') || serviceLower.includes('less than container')) {
      return 'LCL';
    }
    return 'FCL'; // Default to FCL
  }

  /**
   * Map MSC status to our standard status
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
      'ARRIVED': 'Arrived'
    };

    return statusMap[status.toUpperCase()] || status;
  }

  /**
   * Map MSC event codes to readable status
   */
  private mapEventStatus(eventCode: string): string {
    const eventMap: Record<string, string> = {
      'GATE_OUT': 'Departed',
      'GATE_IN': 'Arrived',
      'LOAD': 'Loaded',
      'DISC': 'Discharged',
      'DEPA': 'Vessel Departed',
      'ARRI': 'Vessel Arrived',
      'CREL': 'Customs Released',
      'DLVR': 'Delivered',
      'PICK': 'Picked Up',
      'RETU': 'Returned'
    };

    return eventMap[eventCode.toUpperCase()] || eventCode.replace(/_/g, ' ');
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
  private formatLocation(location: MSCEvent['location']): string {
    const parts = [location.locationName];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  }

  /**
   * Handle API errors and convert to our error format
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
            provider: 'msc',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired MSC API key',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'msc',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in MSC system`,
            statusCode: status
          };
          break;
        case 429:
          apiError = {
            provider: 'msc',
            errorType: 'RATE_LIMIT',
            message: 'MSC API rate limit exceeded',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 60
          };
          break;
        default:
          apiError = {
            provider: 'msc',
            errorType: 'INVALID_RESPONSE',
            message: `MSC API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'msc',
        errorType: 'TIMEOUT',
        message: 'MSC API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'msc',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to MSC API'
      };
    } else {
      apiError = {
        provider: 'msc',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown MSC API error'
      };
    }

    return {
      provider: 'msc',
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
      name: 'msc',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container', 'booking', 'bol'] as TrackingType[],
      reliability: 0.88
    };
  }
}