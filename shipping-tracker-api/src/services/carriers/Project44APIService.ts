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

export interface Project44TrackingRequest {
  trackingNumber: string;
  trackingType: TrackingType;
  carrierScac?: string; // Standard Carrier Alpha Code for specific carrier routing
  includeEvents?: boolean;
  includeContainers?: boolean;
  includeVessel?: boolean;
  includeRoute?: boolean;
}

export interface Project44APIResponse {
  trackingNumber: string;
  status: string;
  carrier: {
    name: string;
    scac: string;
    code: string;
  };
  service: string;
  shipment: {
    type: 'FCL' | 'LCL';
    mode: 'OCEAN' | 'AIR' | 'RAIL' | 'TRUCK';
    priority: 'STANDARD' | 'EXPRESS' | 'PRIORITY';
  };
  events: Project44Event[];
  containers?: Project44Container[];
  vessel?: Project44Vessel;
  route?: Project44Route;
  tracking: {
    lastUpdated: string;
    nextUpdate: string;
    confidence: number;
    dataSource: string;
  };
  metadata: {
    requestId: string;
    processingTime: number;
    apiVersion: string;
    fallbackUsed?: boolean;
    fallbackProviders?: string[];
  };
}

export interface Project44Event {
  eventId: string;
  eventDateTime: string;
  eventType: string;
  eventCode: string;
  eventDescription: string;
  location: {
    locationName: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    locationType: 'PORT' | 'TERMINAL' | 'WAREHOUSE' | 'CUSTOMS' | 'VESSEL';
  };
  isCompleted: boolean;
  isMilestone: boolean;
  isEstimated: boolean;
  carrier?: {
    name: string;
    scac: string;
  };
}

export interface Project44Container {
  containerNumber: string;
  containerSize: string;
  containerType: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: 'KG' | 'LB';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'CM' | 'IN';
  };
  status: string;
  lastKnownLocation?: string;
  carrier?: {
    name: string;
    scac: string;
  };
}

export interface Project44Vessel {
  vesselName: string;
  vesselIMO: string;
  vesselMMSI?: string;
  voyageNumber: string;
  currentPosition?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  speed?: {
    value: number;
    unit: 'KNOTS';
  };
  heading?: number;
  destination?: string;
  estimatedTimeOfArrival?: string;
  actualTimeOfArrival?: string;
  estimatedTimeOfDeparture?: string;
  actualTimeOfDeparture?: string;
  carrier?: {
    name: string;
    scac: string;
  };
}

export interface Project44Route {
  origin: {
    portCode: string;
    portName: string;
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    timezone: string;
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
    timezone: string;
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
    estimatedDeparture?: string;
    actualDeparture?: string;
    sequence: number;
  }>;
  totalDistance?: {
    value: number;
    unit: 'NM' | 'KM';
  };
  estimatedTransitTime?: {
    value: number;
    unit: 'DAYS' | 'HOURS';
  };
  actualTransitTime?: {
    value: number;
    unit: 'DAYS' | 'HOURS';
  };
}

/**
 * Project44 Premium Logistics Platform API Service
 * Enterprise-grade container tracking with comprehensive multi-carrier fallback
 * Implements Requirements 7.1, 7.2, 7.3 for premium logistics platform integration
 */
export class Project44APIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 15000; // Premium service with higher timeout
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://api.project44.com/v4/tracking';
    this.apiKey = config.apiKeys.project44;
    
    if (!this.apiKey) {
      console.warn('⚠️ Project44 API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'X-API-Version': 'v4',
        'X-Client-Type': 'enterprise',
        'X-Request-Source': 'shipping-tracker'
      }
    });

    // Add request interceptor for logging and request enhancement
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🏢 Project44 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = `st-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return config;
      },
      (error) => {
        console.error('❌ Project44 API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for enhanced error handling and metrics
    this.client.interceptors.response.use(
      (response) => {
        const processingTime = response.headers['x-processing-time'] || 'unknown';
        console.log(`✅ Project44 API Response: ${response.status} ${response.statusText} (${processingTime}ms)`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const processingTime = error.response?.headers['x-processing-time'] || 'unknown';
        console.error(`❌ Project44 API Response Error: ${status} ${error.response?.statusText} (${processingTime}ms)`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using Project44 premium logistics platform
   * Supports container numbers, booking numbers, and BOL numbers with multi-carrier fallback
   * Enterprise-grade tracking with comprehensive coverage
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType,
    carrierScac?: string
  ): Promise<RawTrackingData> {
    if (!this.apiKey) {
      return {
        provider: 'project44',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'project44',
          errorType: 'AUTH_ERROR',
          message: 'Project44 API key not configured'
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 Project44 API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const requestPayload: Project44TrackingRequest = {
          trackingNumber: trackingNumber.trim().toUpperCase(),
          trackingType,
          carrierScac,
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true
        };

        const response = await this.client.post('/shipments/track', requestPayload);

        const processingTime = Date.now() - startTime;
        console.log(`✅ Project44 API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Project44 API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, throw the error
        if (attempt >= this.retryAttempts) {
          return this.handleError(trackingNumber, error);
        }

        // Wait before retrying (exponential backoff with jitter)
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Get multi-carrier tracking with fallback providers
   * Premium feature that tries multiple carriers automatically
   */
  async trackWithFallback(
    trackingNumber: string,
    trackingType: TrackingType,
    preferredCarriers?: string[]
  ): Promise<RawTrackingData> {
    const requestPayload = {
      trackingNumber: trackingNumber.trim().toUpperCase(),
      trackingType,
      preferredCarriers,
      enableFallback: true,
      maxFallbackAttempts: 5,
      includeEvents: true,
      includeContainers: true,
      includeVessel: true,
      includeRoute: true
    };

    try {
      const response = await this.client.post('/shipments/track-with-fallback', requestPayload);
      return this.transformResponse(trackingNumber, response.data);
    } catch (error) {
      return this.handleError(trackingNumber, error);
    }
  }

  /**
   * Transform Project44 API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: Project44APIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: data.carrier.name,
        service: this.mapServiceType(data.service, data.shipment.type),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.tracking.lastUpdated || new Date()),
        metadata: {
          requestId: data.metadata.requestId,
          processingTime: data.metadata.processingTime,
          apiVersion: data.metadata.apiVersion,
          fallbackUsed: data.metadata.fallbackUsed,
          fallbackProviders: data.metadata.fallbackProviders,
          confidence: data.tracking.confidence,
          dataSource: data.tracking.dataSource,
          nextUpdate: data.tracking.nextUpdate
        }
      };

      // Calculate reliability based on confidence and data source
      const baseReliability = 0.93; // Project44 base reliability
      const confidenceBonus = (data.tracking.confidence - 0.8) * 0.1; // Bonus for high confidence
      const fallbackPenalty = data.metadata.fallbackUsed ? -0.05 : 0; // Small penalty for fallback
      const reliability = Math.max(0.7, Math.min(0.98, baseReliability + confidenceBonus + fallbackPenalty));

      return {
        provider: 'project44',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability,
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming Project44 response:', error);
      throw new Error(`Failed to transform Project44 API response: ${error}`);
    }
  }

  /**
   * Transform Project44 events to our timeline format
   */
  private transformEvents(events: Project44Event[]): TimelineEvent[] {
    return events
      .sort((a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime())
      .map((event, index) => ({
        id: event.eventId || `project44-event-${index}`,
        timestamp: new Date(event.eventDateTime),
        status: this.mapEventStatus(event.eventType, event.eventCode),
        location: this.formatLocation(event.location),
        description: event.eventDescription || `${event.eventType} - ${event.eventCode}`,
        isCompleted: event.isCompleted,
        isMilestone: event.isMilestone,
        isEstimated: event.isEstimated,
        coordinates: event.location.coordinates ? {
          lat: event.location.coordinates.latitude,
          lng: event.location.coordinates.longitude
        } : undefined,
        metadata: {
          eventCode: event.eventCode,
          locationType: event.location.locationType,
          carrier: event.carrier
        }
      }));
  }

  /**
   * Transform Project44 containers to our format
   */
  private transformContainers(containers: Project44Container[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize),
      type: this.mapContainerType(container.containerType),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: container.dimensions ? {
        length: container.dimensions.length,
        width: container.dimensions.width,
        height: container.dimensions.height,
        unit: container.dimensions.unit === 'CM' ? 'm' : 'ft' // Convert to our standard units
      } : undefined
    }));
  }

  /**
   * Transform Project44 vessel info to our format
   */
  private transformVessel(vessel?: Project44Vessel): VesselInfo | undefined {
    if (!vessel) return undefined;

    return {
      name: vessel.vesselName,
      imo: vessel.vesselIMO,
      voyage: vessel.voyageNumber,
      currentPosition: vessel.currentPosition ? {
        lat: vessel.currentPosition.latitude,
        lng: vessel.currentPosition.longitude
      } : undefined,
      speed: vessel.speed ? vessel.speed.value : undefined,
      heading: vessel.heading,
      destination: vessel.destination,
      eta: vessel.estimatedTimeOfArrival ? new Date(vessel.estimatedTimeOfArrival) : undefined,
      ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined
    };
  }

  /**
   * Transform Project44 route info to our format
   */
  private transformRoute(route?: Project44Route) {
    if (!route) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: route.intermediateStops?.map(stop => ({
        ...this.transformPort(stop),
        estimatedArrival: stop.estimatedArrival ? new Date(stop.estimatedArrival) : undefined,
        actualArrival: stop.actualArrival ? new Date(stop.actualArrival) : undefined,
        estimatedDeparture: stop.estimatedDeparture ? new Date(stop.estimatedDeparture) : undefined,
        actualDeparture: stop.actualDeparture ? new Date(stop.actualDeparture) : undefined,
        sequence: stop.sequence
      })) || [],
      totalDistance: route.totalDistance,
      estimatedTransitTime: route.estimatedTransitTime?.value || 0,
      actualTransitTime: route.actualTransitTime?.value
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
      timezone: port.timezone || this.getTimezoneForCountry(port.country)
    };
  }

  /**
   * Get timezone for country (fallback for missing timezone data)
   */
  private getTimezoneForCountry(country: string): string {
    const timezoneMap: Record<string, string> = {
      'United States': 'America/New_York',
      'China': 'Asia/Shanghai',
      'Germany': 'Europe/Berlin',
      'Netherlands': 'Europe/Amsterdam',
      'Singapore': 'Asia/Singapore',
      'United Kingdom': 'Europe/London',
      'Japan': 'Asia/Tokyo',
      'South Korea': 'Asia/Seoul',
      'Taiwan': 'Asia/Taipei',
      'Hong Kong': 'Asia/Hong_Kong',
      'Australia': 'Australia/Sydney',
      'Canada': 'America/Toronto',
      'France': 'Europe/Paris',
      'Italy': 'Europe/Rome',
      'Spain': 'Europe/Madrid',
      'Belgium': 'Europe/Brussels',
      'India': 'Asia/Kolkata',
      'Thailand': 'Asia/Bangkok',
      'Malaysia': 'Asia/Kuala_Lumpur',
      'Indonesia': 'Asia/Jakarta',
      'Philippines': 'Asia/Manila',
      'Vietnam': 'Asia/Ho_Chi_Minh',
      'United Arab Emirates': 'Asia/Dubai',
      'Saudi Arabia': 'Asia/Riyadh',
      'Egypt': 'Africa/Cairo',
      'South Africa': 'Africa/Johannesburg',
      'Brazil': 'America/Sao_Paulo',
      'Mexico': 'America/Mexico_City',
      'Chile': 'America/Santiago',
      'Argentina': 'America/Buenos_Aires'
    };

    return timezoneMap[country] || 'UTC';
  }

  /**
   * Map Project44 service types to our standard types
   */
  private mapServiceType(service: string, shipmentType: 'FCL' | 'LCL'): 'FCL' | 'LCL' {
    // Project44 provides detailed service info, but we simplify to FCL/LCL
    return shipmentType;
  }

  /**
   * Map Project44 status to our standard status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PLANNED': 'Planned',
      'BOOKING_CONFIRMED': 'Booking Confirmed',
      'CONTAINER_LOADED': 'Container Loaded',
      'GATE_OUT': 'Gate Out',
      'VESSEL_LOADED': 'Loaded on Vessel',
      'VESSEL_DEPARTED': 'Vessel Departed',
      'IN_TRANSIT': 'In Transit',
      'TRANSSHIPMENT': 'Transshipment',
      'VESSEL_ARRIVED': 'Vessel Arrived',
      'VESSEL_DISCHARGED': 'Discharged from Vessel',
      'GATE_IN': 'Gate In',
      'CUSTOMS_CLEARED': 'Customs Cleared',
      'OUT_FOR_DELIVERY': 'Out for Delivery',
      'DELIVERED': 'Delivered',
      'DELAYED': 'Delayed',
      'ON_HOLD': 'On Hold',
      'CANCELLED': 'Cancelled',
      'EXCEPTION': 'Exception',
      'UNKNOWN': 'Unknown'
    };

    return statusMap[status.toUpperCase()] || status;
  }

  /**
   * Map Project44 event types to readable status
   */
  private mapEventStatus(eventType: string, eventCode: string): string {
    const eventMap: Record<string, string> = {
      // Container events
      'CONTAINER_GATE_OUT': 'Container Gate Out',
      'CONTAINER_GATE_IN': 'Container Gate In',
      'CONTAINER_LOADED': 'Container Loaded',
      'CONTAINER_DISCHARGED': 'Container Discharged',
      'CONTAINER_DELIVERED': 'Container Delivered',
      'CONTAINER_RETURNED': 'Container Returned',
      
      // Vessel events
      'VESSEL_DEPARTURE': 'Vessel Departed',
      'VESSEL_ARRIVAL': 'Vessel Arrived',
      'VESSEL_LOADED': 'Loaded on Vessel',
      'VESSEL_DISCHARGED': 'Discharged from Vessel',
      
      // Port events
      'PORT_ARRIVAL': 'Arrived at Port',
      'PORT_DEPARTURE': 'Departed from Port',
      'TRANSSHIPMENT': 'Transshipment',
      
      // Customs and delivery
      'CUSTOMS_CLEARED': 'Customs Cleared',
      'CUSTOMS_HOLD': 'Customs Hold',
      'OUT_FOR_DELIVERY': 'Out for Delivery',
      'DELIVERED': 'Delivered',
      
      // Exceptions
      'DELAYED': 'Delayed',
      'EXCEPTION': 'Exception',
      'ON_HOLD': 'On Hold'
    };

    const mappedEvent = eventMap[`${eventType}_${eventCode}`] || eventMap[eventType] || eventMap[eventCode];
    return mappedEvent || `${eventType} ${eventCode}`.replace(/_/g, ' ');
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
    if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('top') || typeLower.includes('flat')) return 'OT';
    return 'GP'; // Default to General Purpose
  }

  /**
   * Format location string
   */
  private formatLocation(location: Project44Event['location']): string {
    const parts = [location.locationName];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
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
            provider: 'project44',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired Project44 API key',
            statusCode: status
          };
          break;
        case 403:
          apiError = {
            provider: 'project44',
            errorType: 'AUTH_ERROR',
            message: 'Project44 API access forbidden - check subscription level',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'project44',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in Project44 network`,
            statusCode: status
          };
          break;
        case 429:
          apiError = {
            provider: 'project44',
            errorType: 'RATE_LIMIT',
            message: 'Project44 API rate limit exceeded',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 60
          };
          break;
        case 422:
          apiError = {
            provider: 'project44',
            errorType: 'INVALID_RESPONSE',
            message: `Invalid tracking request: ${data?.message || 'Invalid parameters'}`,
            statusCode: status
          };
          break;
        case 503:
          apiError = {
            provider: 'project44',
            errorType: 'NETWORK_ERROR',
            message: 'Project44 API service temporarily unavailable',
            statusCode: status
          };
          break;
        default:
          apiError = {
            provider: 'project44',
            errorType: 'INVALID_RESPONSE',
            message: `Project44 API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'project44',
        errorType: 'TIMEOUT',
        message: 'Project44 API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'project44',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to Project44 API'
      };
    } else {
      apiError = {
        provider: 'project44',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown Project44 API error'
      };
    }

    return {
      provider: 'project44',
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
      name: 'project44',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container', 'booking', 'bol'] as TrackingType[],
      reliability: 0.93,
      coverage: ['global'],
      tier: 'premium',
      features: [
        'multi-carrier-fallback',
        'enterprise-grade',
        'high-volume-support',
        'comprehensive-coverage',
        'real-time-updates',
        'advanced-analytics'
      ]
    };
  }

  /**
   * Get supported carriers (premium feature)
   */
  async getSupportedCarriers(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Project44 API key not configured');
    }

    try {
      const response = await this.client.get('/carriers');
      return response.data.carriers.map((carrier: any) => carrier.scac);
    } catch (error) {
      console.error('❌ Error fetching Project44 supported carriers:', error);
      return [];
    }
  }

  /**
   * Get API usage statistics (premium feature)
   */
  async getUsageStats(): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Project44 API key not configured');
    }

    try {
      const response = await this.client.get('/usage/stats');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Project44 usage stats:', error);
      return null;
    }
  }
}