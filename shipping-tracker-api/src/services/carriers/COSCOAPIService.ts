import axios, { AxiosInstance } from 'axios';
import { 
  TrackingType, 
  RawTrackingData, 
  APIError, 
  TimelineEvent,
  Container,
  VesselInfo,
  Port
} from '../../types';
import { config } from '../../config/environment';

export interface COSCOTrackingRequest {
  trackingNumber: string;
  trackingType: TrackingType;
}

export interface COSCOAPIResponse {
  trackingNumber: string;
  status: string;
  carrier: string;
  service: string;
  events: COSCOEvent[];
  containers?: COSCOContainer[];
  vessel?: COSCOVessel;
  route?: COSCORoute;
  lastUpdated: string;
}

export interface COSCOEvent {
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

export interface COSCOContainer {
  containerNumber: string;
  containerSize: string;
  containerType: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

export interface COSCOVessel {
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

export interface COSCORoute {
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
 * COSCO API Service for container, booking, and BOL tracking
 * Chinese carrier with strong Asia-Pacific coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export class COSCOAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 15000; // Longer timeout for Asia-Pacific routes
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://api.cosco-shipping.com/tracking';
    this.apiKey = config.apiProviders.cosco?.apiKey || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ COSCO API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'X-API-Version': '2.0',
        'Accept-Language': 'en-US,zh-CN'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚢 COSCO API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ COSCO API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ COSCO API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ COSCO API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track shipment using COSCO API
   * Supports container numbers, booking numbers, and BOL numbers
   */
  async trackShipment(
    trackingNumber: string,
    trackingType: TrackingType
  ): Promise<RawTrackingData> {
    if (!this.apiKey) {
      return {
        provider: 'cosco',
        trackingNumber,
        data: null,
        timestamp: new Date(),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'cosco',
          errorType: 'AUTH_ERROR',
          message: 'COSCO API key not configured'
        }
      };
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 COSCO API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);

        const endpoint = this.getTrackingEndpoint(trackingType);
        const response = await this.client.get(endpoint, {
          params: {
            trackingNumber: trackingNumber.trim().toUpperCase(),
            includeEvents: true,
            includeContainers: true,
            includeVessel: true,
            includeRoute: true,
            language: 'en'
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ COSCO API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);

        return this.transformResponse(trackingNumber, response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ COSCO API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

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
   * Transform COSCO API response to our standard format
   */
  private transformResponse(trackingNumber: string, data: COSCOAPIResponse): RawTrackingData {
    try {
      const transformedData = {
        trackingNumber,
        carrier: 'COSCO',
        service: this.mapServiceType(data.service),
        status: this.mapStatus(data.status),
        timeline: this.transformEvents(data.events || []),
        containers: this.transformContainers(data.containers || []),
        vessel: this.transformVessel(data.vessel),
        route: this.transformRoute(data.route),
        lastUpdated: new Date(data.lastUpdated || new Date())
      };

      return {
        provider: 'cosco',
        trackingNumber,
        data: transformedData,
        timestamp: new Date(),
        reliability: 0.82, // COSCO has good reliability, especially for Asia-Pacific routes
        status: 'success'
      };
    } catch (error) {
      console.error('❌ Error transforming COSCO response:', error);
      throw new Error(`Failed to transform COSCO API response: ${error}`);
    }
  }

  /**
   * Transform COSCO events to our timeline format
   */
  private transformEvents(events: COSCOEvent[]): TimelineEvent[] {
    return events.map((event, index) => ({
      id: event.eventId || `cosco-event-${index}`,
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
   * Transform COSCO containers to our format
   */
  private transformContainers(containers: COSCOContainer[]): Container[] {
    return containers.map(container => ({
      number: container.containerNumber,
      size: this.mapContainerSize(container.containerSize),
      type: this.mapContainerType(container.containerType),
      sealNumber: container.sealNumber || '',
      weight: container.weight ? container.weight.value : undefined,
      dimensions: undefined // COSCO doesn't typically provide dimensions in tracking
    }));
  }

  /**
   * Transform COSCO vessel info to our format
   */
  private transformVessel(vessel?: COSCOVessel): VesselInfo | undefined {
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
   * Transform COSCO route info to our format
   */
  private transformRoute(route?: COSCORoute) {
    if (!route) return undefined;

    return {
      origin: this.transformPort(route.origin),
      destination: this.transformPort(route.destination),
      intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
      estimatedTransitTime: 0, // COSCO doesn't provide this directly
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
      timezone: this.getPortTimezone(port.country) // COSCO provides better timezone info for Asia-Pacific ports
    };
  }

  /**
   * Get timezone for port based on country (COSCO specializes in Asia-Pacific routes)
   */
  private getPortTimezone(country: string): string {
    const timezoneMap: Record<string, string> = {
      'China': 'Asia/Shanghai',
      'Japan': 'Asia/Tokyo',
      'South Korea': 'Asia/Seoul',
      'Singapore': 'Asia/Singapore',
      'Malaysia': 'Asia/Kuala_Lumpur',
      'Thailand': 'Asia/Bangkok',
      'Vietnam': 'Asia/Ho_Chi_Minh',
      'Philippines': 'Asia/Manila',
      'Indonesia': 'Asia/Jakarta',
      'Taiwan': 'Asia/Taipei',
      'Hong Kong': 'Asia/Hong_Kong',
      'Australia': 'Australia/Sydney',
      'New Zealand': 'Pacific/Auckland',
      'United States': 'America/Los_Angeles', // West Coast focus
      'Canada': 'America/Vancouver'
    };

    return timezoneMap[country] || 'UTC';
  }

  /**
   * Map COSCO service types to our standard types
   */
  private mapServiceType(service: string): 'FCL' | 'LCL' {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('拼箱')) {
      return 'LCL';
    }
    return 'FCL'; // Default to FCL
  }

  /**
   * Map COSCO status to our standard status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PLANNED': 'Planned',
      '计划中': 'Planned', // Chinese: "Planned"
      'IN_TRANSIT': 'In Transit',
      '运输中': 'In Transit', // Chinese: "In Transit"
      'DELIVERED': 'Delivered',
      '已交付': 'Delivered', // Chinese: "Delivered"
      'DELAYED': 'Delayed',
      '延误': 'Delayed', // Chinese: "Delayed"
      'ON_HOLD': 'On Hold',
      '暂停': 'On Hold', // Chinese: "On Hold"
      'CANCELLED': 'Cancelled',
      '取消': 'Cancelled', // Chinese: "Cancelled"
      'DEPARTED': 'Departed',
      '已出发': 'Departed', // Chinese: "Departed"
      'ARRIVED': 'Arrived',
      '已到达': 'Arrived' // Chinese: "Arrived"
    };

    return statusMap[status.toUpperCase()] || statusMap[status] || status;
  }

  /**
   * Map COSCO event codes to readable status (includes Chinese translations)
   */
  private mapEventStatus(eventCode: string): string {
    const eventMap: Record<string, string> = {
      'GATE_OUT': 'Departed',
      '出闸': 'Departed', // Chinese
      'GATE_IN': 'Arrived',
      '进闸': 'Arrived', // Chinese
      'LOAD': 'Loaded',
      '装船': 'Loaded', // Chinese
      'DISC': 'Discharged',
      '卸船': 'Discharged', // Chinese
      'DEPA': 'Vessel Departed',
      '船舶离港': 'Vessel Departed', // Chinese
      'ARRI': 'Vessel Arrived',
      '船舶到港': 'Vessel Arrived', // Chinese
      'CREL': 'Customs Released',
      '海关放行': 'Customs Released', // Chinese
      'DLVR': 'Delivered',
      '交付': 'Delivered', // Chinese
      'PICK': 'Picked Up',
      '提货': 'Picked Up', // Chinese
      'RETU': 'Returned',
      '退回': 'Returned' // Chinese
    };

    return eventMap[eventCode.toUpperCase()] || eventMap[eventCode] || eventCode.replace(/_/g, ' ');
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
    if (typeLower.includes('reefer') || typeLower.includes('rf') || typeLower.includes('冷藏')) return 'RF';
    if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat') || typeLower.includes('开顶')) return 'OT';
    return 'GP'; // Default to General Purpose
  }

  /**
   * Format location string
   */
  private formatLocation(location: COSCOEvent['location']): string {
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

      switch (status) {
        case 401:
          apiError = {
            provider: 'cosco',
            errorType: 'AUTH_ERROR',
            message: 'Invalid or expired COSCO API key',
            statusCode: status
          };
          break;
        case 404:
          apiError = {
            provider: 'cosco',
            errorType: 'NOT_FOUND',
            message: `Tracking number ${trackingNumber} not found in COSCO system`,
            statusCode: status
          };
          break;
        case 429:
          apiError = {
            provider: 'cosco',
            errorType: 'RATE_LIMIT',
            message: 'COSCO API rate limit exceeded',
            statusCode: status,
            retryAfter: parseInt(error.response.headers['retry-after']) || 60
          };
          break;
        default:
          apiError = {
            provider: 'cosco',
            errorType: 'INVALID_RESPONSE',
            message: `COSCO API error: ${status} ${statusText}`,
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError = {
        provider: 'cosco',
        errorType: 'TIMEOUT',
        message: 'COSCO API request timeout'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      apiError = {
        provider: 'cosco',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to COSCO API'
      };
    } else {
      apiError = {
        provider: 'cosco',
        errorType: 'INVALID_RESPONSE',
        message: error.message || 'Unknown COSCO API error'
      };
    }

    return {
      provider: 'cosco',
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
      name: 'cosco',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['container', 'booking', 'bol'] as TrackingType[],
      reliability: 0.82,
      specialization: 'Asia-Pacific routes and Chinese carrier data'
    };
  }
}