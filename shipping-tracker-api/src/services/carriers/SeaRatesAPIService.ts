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

export interface SeaRatesTrackingRequest {
  trackingNumber: string;
  trackingType: TrackingType;
}

export interface SeaRatesAPIResponse {
  trackingNumber: string;
  status: string;
  carrier: string;
  service: string;
  events: SeaRatesEvent[];
  containers?: SeaRatesContainer[];
  vessel?: SeaRatesVessel;
  route?: SeaRatesRoute;
  rates?: SeaRatesInfo;
  lastUpdated: string;
  dataSource: string;
}

export interface SeaRatesEvent {
  eventId?: string;
  eventDateTime: string;
  eventType: string;
  eventDescription: string;
  location: {
    locationName: string;
    city?: string;
    country?: string;
    portCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  isCompleted: boolean;
  estimatedDateTime?: string;
}

export interface SeaRatesContainer {
  containerNumber: string;
  containerSize?: string;
  containerType?: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

export interface SeaRatesVessel {
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

export interface SeaRatesRoute {
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
  transitTime?: number;
  distance?: number;
}

export interface SeaRatesInfo {
  estimatedCost?: {
    value: number;
    currency: string;
  };
  transitTime?: number;
  routeOptimization?: string;
  alternativeRoutes?: Array<{
    route: string;
    cost: number;
    transitTime: number;
  }>;
}

/**
 * SeaRates API Service for container tracking with shipping rates and route optimization
 * Implements Requirements 7.1, 7.2 for container-focused aggregator with cost analysis
 * SeaRates provides freemium access to tracking data with shipping cost insights
 */
export class SeaRatesAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 8000;
  private readonly retryAttempts: number = 2;
  private readonly rateLimitPerMinute: number = 60;
  private readonly rateLimitPerHour: number = 1000;

  constructor() {
    this.baseUrl = 'https://api.searates.com/tracking';
    this.apiKey = config.apiProviders.seaRates?.apiKey || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ SeaRates API key not configured');
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
        console.log(`💰 SeaRates API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ SeaRates API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ SeaRates API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ SeaRates API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using SeaRates API
   * Supports container numbers and booking numbers with cost analysis
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType
  ): Promise<RawTrackingData> {
    if (!this.apiKey) {
      return {
        provider: 'searates',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'searates',
          errorType: 'AUTH_ERROR',
          message: 'SeaRates API key not configured'
        }
      };
    }

    // Check if tracking type is supported
    if (trackingType === 'bol') {
      return {
        provider: 'searates',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'searates',
          errorType: 'INVALID_RESPONSE',
          message: `SeaRates API does not support BOL tracking, only container and booking`
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 SeaRates API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const endpoint = this.getTrackingEndpoint(trackingType);
        const response = await this.client.get(endpoint, {
          params: {
            trackingNumber: trackingNumber.trim().toUpperCase(),
            includeEvents: true,
            includeContainers: true,
            includeVessel: true,
            includeRoute: true,
            includeRates: true, // SeaRates' cost analysis feature
            includeOptimization: true
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ SeaRates API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ SeaRates API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, handle the error
        if (attempt >= this.retryAttempts) {
          return this.handleError(trackingNumber, error);
        }

        // Wait before retrying (shorter delay for aggregator)
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Get shipping rates and route optimization
   */
  async getShippingRates(
    origin: string,
    destination: string,
    containerType: '20ft' | '40ft' | '45ft' = '40ft'
  ): Promise<SeaRatesInfo | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      console.log(`💰 SeaRates API: Getting rates from ${origin} to ${destination}`);

      const response = await this.client.get('/rates', {
        params: {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          containerType,
          includeAlternatives: true,
          includeOptimization: true
        }
      });

      return response.data;

    } catch (error) {
      console.error(`❌ SeaRates API: Failed to get rates from ${origin} to ${destination}:`, error);
      return null;
    }
  }

  /**
   * Get route optimization suggestions
   */
  async getRouteOptimization(
    origin: string,
    destination: string,
    preferences: {
      priority: 'cost' | 'time' | 'reliability';
      maxTransshipments?: number;
    } = { priority: 'cost' }
  ): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      console.log(`🗺️ SeaRates API: Getting route optimization from ${origin} to ${destination}`);

      const response = await this.client.get('/optimize', {
        params: {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          priority: preferences.priority,
          maxTransshipments: preferences.maxTransshipments || 2
        }
      });

      return response.data;

    } catch (error) {
      console.error(`❌ SeaRates API: Failed to get route optimization:`, error);
      return null;
    }
  }

  /**
   * Get the appropriate API endpoint based on tracking type
   */
  private getTrackingEndpoint(trackingType: TrackingType): string {
    switch (trackingType) {
      case 'container':
        return '/container';
      case 'booking':
        return '/booking';
      default:
        return '/container'; // Default to container tracking
    }
  }

  /**
   * Transform SeaRates API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: SeaRatesAPIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: data.carrier || 'Multiple Carriers',
        service: this.mapServiceType(data.service),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.lastUpdated || new Date()),
        dataSource: data.dataSource || 'searates',
        rates: data.rates // Include cost analysis data
      };

      return {
        provider: 'searates',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability: 0.85, // Good reliability for aggregator with cost features
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming SeaRates response:', error);
      throw new Error(`Failed to transform SeaRates API response: ${error}`);
    }
  }

  /**
   * Transform SeaRates events to our timeline format
   */
  private transformEvents(events: SeaRatesEvent[]): TimelineEvent[] {
    return events.map((event, index) => ({
      id: event.eventId || `searates-event-${index}`,
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
   * Transform SeaRates containers to our format
   */
  private transformContainers(containers: SeaRatesContainer[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize || '40ft'),
      type: this.mapContainerType(container.containerType || 'GP'),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: undefined // SeaRates doesn't typically provide dimensions
    }));
  }

  /**
   * Transform SeaRates vessel info to our format
   */
  private transformVessel(vessel?: SeaRatesVessel): VesselInfo | undefined {
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
   * Transform SeaRates route info to our format
   */
  private transformRoute(route?: SeaRatesRoute) {
    if (!route || !route.origin || !route.destination) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: [], // SeaRates doesn't provide detailed intermediate stops
      estimatedTransitTime: route.transitTime || 0,
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
   * Map SeaRates service types to our standard types
   */
  private mapServiceType(service: string): 'FCL' | 'LCL' {
    const serviceLower = service?.toLowerCase() || '';
    if (serviceLower.includes('lcl') || serviceLower.includes('less than container')) {
      return 'LCL';
    }
    return 'FCL'; // Default to FCL
  }

  /**
   * Map SeaRates status to our standard status
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
      'LOADING': 'Loading',
      'DISCHARGING': 'Discharging'
    };

    return statusMap[status?.toUpperCase()] || status || 'Unknown';
  }

  /**
   * Map SeaRates event types to readable status
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
      'RETURNED': 'Returned',
      'TRANSSHIPMENT': 'Transshipment'
    };

    return eventMap[eventType?.toUpperCase()] || eventType?.replace(/_/g, ' ') || 'Unknown';
  }

  /**
   * Map container sizes
   */
  private mapContainerSize(size: string): '20ft' | '40ft' | '45ft' {
    if (!size) return '40ft';
    if (size.includes('20')) return '20ft';
    if (size.includes('45')) return '45ft';
    return '40ft'; // Default to 40ft
  }

  /**
   * Map container types
   */
  private mapContainerType(type: string): 'GP' | 'HC' | 'RF' | 'OT' {
    if (!type) return 'GP';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('high') || typeLower.includes('hc')) return 'HC';
    if (typeLower.includes('reefer') || typeLower.includes('rf')) return 'RF';
    if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat')) return 'OT';
    return 'GP'; // Default to General Purpose
  }

  /**
   * Format location string
   */
  private formatLocation(location: SeaRatesEvent['location']): string {
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
            provider: 'searates',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired SeaRates API key',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'searates',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in SeaRates system`,
            statusCode: status
          };
          break;
        case 429:
          apiError = {
            provider: 'searates',
            errorType: 'RATE_LIMIT',
            message: 'SeaRates API rate limit exceeded',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 60
          };
          break;
        case 402:
          // Payment required - freemium limitation
          apiError = {
            provider: 'searates',
            errorType: 'RATE_LIMIT',
            message: 'SeaRates freemium quota exceeded',
            statusCode: status,
            retryAfter: 3600 // 1 hour wait for quota reset
          };
          break;
        default:
          apiError = {
            provider: 'searates',
            errorType: 'INVALID_RESPONSE',
            message: `SeaRates API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'searates',
        errorType: 'TIMEOUT',
        message: 'SeaRates API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'searates',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to SeaRates API'
      };
    } else {
      apiError = {
        provider: 'searates',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown SeaRates API error'
      };
    }

    return {
      provider: 'searates',
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
      name: 'searates',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container', 'booking'] as TrackingType[],
      reliability: 0.85,
      rateLimits: {
        perMinute: this.rateLimitPerMinute,
        perHour: this.rateLimitPerHour
      },
      tier: 'freemium',
      features: [
        'Container tracking',
        'Booking tracking',
        'Shipping rates analysis',
        'Route optimization',
        'Cost comparison',
        'Transit time estimation',
        'Alternative routes'
      ],
      limitations: [
        'No BOL tracking',
        'Freemium rate limits',
        'Limited vessel details',
        'Basic event information'
      ],
      specialties: [
        'Cost analysis',
        'Route optimization',
        'Shipping rates',
        'Alternative routes'
      ]
    };
  }

  /**
   * Get supported route optimization priorities
   */
  getOptimizationPriorities(): string[] {
    return ['cost', 'time', 'reliability'];
  }

  /**
   * Get supported container types for rate calculation
   */
  getSupportedContainerTypes(): string[] {
    return ['20ft', '40ft', '45ft'];
  }
}