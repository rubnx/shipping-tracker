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

export interface ONELineTrackingRequest {
  trackingNumber: string;
  trackingType: TrackingType;
}

export interface ONELineAPIResponse {
  trackingNumber: string;
  status: string;
  carrier: string;
  service: string;
  events: ONELineEvent[];
  containers?: ONELineContainer[];
  vessel?: ONELineVessel;
  route?: ONELineRoute;
  lastUpdated: string;
}

export interface ONELineEvent {
  eventId: string;
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

export interface ONELineContainer {
  containerNumber: string;
  containerSize: string;
  containerType: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

export interface ONELineVessel {
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

export interface ONELineRoute {
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
 * Ocean Network Express (ONE) API Service for container, booking, and BOL tracking
 * Japanese alliance carrier with comprehensive Asia-Pacific and global coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export class ONELineAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 15000; // Longer timeout for global coverage
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://api.one-line.com/track';
    this.apiKey = config.apiProviders.oneLine?.apiKey || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ ONE Line API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'X-API-Alliance': 'ocean-network-express', // ONE alliance identifier
        'X-API-Coverage': 'global' // Global coverage indicator
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚢 ONE Line API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ ONE Line API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ ONE Line API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ ONE Line API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using ONE Line API
   * Supports container numbers, booking numbers, and BOL numbers
   * Comprehensive Asia-Pacific coverage with global routes
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType
  ): Promise<RawTrackingData> {
    if (!this.apiKey) {
      return {
        provider: 'one-line',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'one-line',
          errorType: 'AUTH_ERROR',
          message: 'ONE Line API key not configured'
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 ONE Line API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const endpoint = this.getTrackingEndpoint(trackingType);
        const response = await this.client.get(endpoint, {
          params: {
            trackingNumber: trackingNumber.trim().toUpperCase(),
            includeEvents: true,
            includeContainers: true,
            includeVessel: true,
            includeRoute: true,
            alliance: 'ocean-network-express', // ONE alliance parameter
            coverage: 'global' // Request global coverage data
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ ONE Line API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ ONE Line API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, throw the error
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
   * Transform ONE Line API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: ONELineAPIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: 'Ocean Network Express (ONE)',
        service: this.mapServiceType(data.service),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.lastUpdated || new Date())
      };

      return {
        provider: 'one-line',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability: 0.94, // High reliability for Japanese alliance carrier
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming ONE Line response:', error);
      throw new Error(`Failed to transform ONE Line API response: ${error}`);
    }
  }

  /**
   * Transform ONE Line events to our timeline format
   */
  private transformEvents(events: ONELineEvent[]): TimelineEvent[] {
    return events.map((event, index) => ({
      id: event.eventId || `one-line-event-${index}`,
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
   * Transform ONE Line containers to our format
   */
  private transformContainers(containers: ONELineContainer[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize),
      type: this.mapContainerType(container.containerType),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: undefined // ONE Line doesn't typically provide dimensions in tracking
    }));
  }

  /**
   * Transform ONE Line vessel info to our format
   */
  private transformVessel(vessel?: ONELineVessel): VesselInfo | undefined {
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
   * Transform ONE Line route info to our format
   */
  private transformRoute(route?: ONELineRoute) {
    if (!route) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
      estimatedTransitTime: 0, // ONE Line doesn't provide this directly
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
      timezone: this.getGlobalTimezone(port.country, port.city) // ONE has global coverage
    };
  }

  /**
   * Get appropriate timezone for global ports
   */
  private getGlobalTimezone(country: string, city?: string): string {
    const timezoneMap: Record<string, string> = {
      // Asia-Pacific (ONE's primary region)
      'Japan': 'Asia/Tokyo',
      'South Korea': 'Asia/Seoul',
      'China': 'Asia/Shanghai',
      'Taiwan': 'Asia/Taipei',
      'Singapore': 'Asia/Singapore',
      'Malaysia': 'Asia/Kuala_Lumpur',
      'Thailand': 'Asia/Bangkok',
      'Vietnam': 'Asia/Ho_Chi_Minh',
      'Philippines': 'Asia/Manila',
      'Indonesia': 'Asia/Jakarta',
      'Hong Kong': 'Asia/Hong_Kong',
      
      // Americas
      'United States': 'America/New_York',
      'Canada': 'America/Toronto',
      'Mexico': 'America/Mexico_City',
      'Brazil': 'America/Sao_Paulo',
      'Chile': 'America/Santiago',
      
      // Europe
      'United Kingdom': 'Europe/London',
      'Germany': 'Europe/Berlin',
      'Netherlands': 'Europe/Amsterdam',
      'France': 'Europe/Paris',
      'Italy': 'Europe/Rome',
      'Spain': 'Europe/Madrid',
      
      // Middle East & Africa
      'UAE': 'Asia/Dubai',
      'Saudi Arabia': 'Asia/Riyadh',
      'South Africa': 'Africa/Johannesburg',
      'Egypt': 'Africa/Cairo'
    };

    // Special handling for US cities
    if (country === 'United States' && city) {
      const cityLower = city.toLowerCase();
      if (cityLower.includes('los angeles') || cityLower.includes('long beach') || cityLower.includes('oakland')) {
        return 'America/Los_Angeles';
      }
      if (cityLower.includes('new york') || cityLower.includes('newark') || cityLower.includes('baltimore')) {
        return 'America/New_York';
      }
    }

    return timezoneMap[country] || 'UTC';
  }

  /**
   * Map ONE Line service types to our standard types
   */
  private mapServiceType(service: string): 'FCL' | 'LCL' {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('consolidation')) {
      return 'LCL';
    }
    return 'FCL'; // Default to FCL
  }

  /**
   * Map ONE Line status to our standard status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PLANNED': 'Planned',
      'BOOKING_CONFIRMED': 'Booking Confirmed',
      'CONTAINER_LOADED': 'Container Loaded',
      'VESSEL_DEPARTED': 'Vessel Departed',
      'IN_TRANSIT': 'In Transit',
      'TRANSSHIPMENT': 'In Transshipment',
      'VESSEL_ARRIVED': 'Vessel Arrived',
      'CONTAINER_DISCHARGED': 'Container Discharged',
      'CUSTOMS_CLEARED': 'Customs Cleared',
      'OUT_FOR_DELIVERY': 'Out for Delivery',
      'DELIVERED': 'Delivered',
      'DELAYED': 'Delayed',
      'ON_HOLD': 'On Hold',
      'CANCELLED': 'Cancelled'
    };

    return statusMap[status.toUpperCase()] || status;
  }

  /**
   * Map ONE Line event types to readable status
   */
  private mapEventStatus(eventType: string): string {
    const eventMap: Record<string, string> = {
      'GATE_OUT': 'Departed Terminal',
      'GATE_IN': 'Arrived at Terminal',
      'LOADED_ON_VESSEL': 'Loaded on Vessel',
      'DISCHARGED_FROM_VESSEL': 'Discharged from Vessel',
      'VESSEL_DEPARTURE': 'Vessel Departed',
      'VESSEL_ARRIVAL': 'Vessel Arrived',
      'CUSTOMS_RELEASE': 'Customs Released',
      'DELIVERED_TO_CONSIGNEE': 'Delivered',
      'EMPTY_RETURN': 'Empty Container Returned',
      'TRANSSHIPMENT_LOADED': 'Transshipment Loaded',
      'TRANSSHIPMENT_DISCHARGED': 'Transshipment Discharged',
      'PORT_ARRIVAL': 'Arrived at Port',
      'PORT_DEPARTURE': 'Departed from Port',
      'RAIL_DEPARTURE': 'Rail Departed',
      'RAIL_ARRIVAL': 'Rail Arrived',
      'TRUCK_DEPARTURE': 'Truck Departed',
      'TRUCK_ARRIVAL': 'Truck Arrived'
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
    if (typeLower.includes('high') || typeLower.includes('hc') || typeLower.includes('cube')) return 'HC';
    if (typeLower.includes('reefer') || typeLower.includes('rf') || typeLower.includes('refrigerated')) return 'RF';
    if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('top')) return 'OT';
    return 'GP'; // Default to General Purpose
  }

  /**
   * Format location string
   */
  private formatLocation(location: ONELineEvent['location']): string {
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
            provider: 'one-line',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired ONE Line API key',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'one-line',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in ONE Line system`,
            statusCode: status
          };
          break;
        case 429:
          apiError = {
            provider: 'one-line',
            errorType: 'RATE_LIMIT',
            message: 'ONE Line API rate limit exceeded',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 60
          };
          break;
        default:
          apiError = {
            provider: 'one-line',
            errorType: 'INVALID_RESPONSE',
            message: `ONE Line API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'one-line',
        errorType: 'TIMEOUT',
        message: 'ONE Line API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'one-line',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to ONE Line API'
      };
    } else {
      apiError = {
        provider: 'one-line',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown ONE Line API error'
      };
    }

    return {
      provider: 'one-line',
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
      name: 'one-line',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container', 'booking', 'bol'] as TrackingType[],
      reliability: 0.94,
      coverage: ['asia-pacific', 'global', 'americas', 'europe'],
      alliance: 'ocean-network-express'
    };
  }
}