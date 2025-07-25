import axios, { AxiosInstance } from 'axios';
import { 
  VesselPosition,
  VesselRoute,
  PortCongestion,
  VesselInfo,
  LatLng,
  Port,
  APIError,
  RawTrackingData
} from '../../types';
import { config } from '../../config/environment';

export interface VesselFinderVesselRequest {
  imo?: string;
  mmsi?: string;
  vesselName?: string;
}

export interface VesselFinderAPIResponse {
  success: boolean;
  data: VesselFinderVessel[];
  message?: string;
  error?: string;
}

export interface VesselFinderVessel {
  imo: number;
  mmsi: number;
  name: string;
  type: string;
  flag: string;
  built: number;
  length: number;
  beam: number;
  dwt: number;
  gt: number;
  position: {
    lat: number;
    lon: number;
    timestamp: string;
    course: number;
    speed: number;
    heading: number;
    status: string;
  };
  destination: string;
  eta: string;
  draught: number;
  route: VesselFinderRoutePoint[];
}

export interface VesselFinderRoutePoint {
  lat: number;
  lon: number;
  timestamp: string;
  port?: string;
  event?: string;
}

export interface VesselFinderPortResponse {
  success: boolean;
  data: VesselFinderPort[];
}

export interface VesselFinderPort {
  id: number;
  name: string;
  country: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  vessels: {
    total: number;
    anchored: number;
    moored: number;
    underway: number;
  };
  congestion: {
    level: string;
    factor: number;
    averageWaitTime: number;
  };
  lastUpdated: string;
}

/**
 * Vessel Finder API Service for vessel tracking and ETA predictions
 * Implements Requirements 3.1, 3.3, 7.1 for real-time vessel tracking
 */
export class VesselFinderAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 12000;
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://api.vesselfinder.com/v1';
    this.apiKey = config.apiProviders.vesselFinder?.apiKey || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ Vessel Finder API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚢 Vessel Finder API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Vessel Finder API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Vessel Finder API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ Vessel Finder API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get vessel position by IMO number
   */
  async getVesselPosition(imo: string): Promise<VesselPosition | null> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 Vessel Finder API: Getting vessel position for IMO ${imo} (attempt ${attempt}/${this.retryAttempts})`);

        const response = await this.client.get('/vessel/position', {
          params: {
            imo: imo,
            format: 'json'
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ Vessel Finder API: Successfully retrieved vessel position in ${processingTime}ms`);

        return this.transformVesselPosition(response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Vessel Finder API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

        // If this is the last attempt, throw the error
        if (attempt >= this.retryAttempts) {
          throw this.handleError(error);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * Get vessel route and ETA predictions
   */
  async getVesselRoute(imo: string, timespan: number = 48): Promise<VesselRoute | null> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    try {
      console.log(`🔍 Vessel Finder API: Getting vessel route for IMO ${imo}`);

      const response = await this.client.get('/vessel/track', {
        params: {
          imo: imo,
          timespan: timespan, // hours
          format: 'json'
        }
      });

      console.log(`✅ Vessel Finder API: Successfully retrieved vessel route`);
      return this.transformVesselRoute(imo, response.data);

    } catch (error) {
      console.error('❌ Vessel Finder API: Failed to get vessel route:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get ETA predictions for a vessel
   */
  async getVesselETA(imo: string, destinationPort?: string): Promise<{
    estimatedArrival: Date;
    confidence: number;
    weatherDelay?: number;
    congestionDelay?: number;
  } | null> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    try {
      console.log(`🔍 Vessel Finder API: Getting ETA predictions for IMO ${imo}`);

      const params: any = {
        imo: imo,
        format: 'json'
      };

      if (destinationPort) {
        params.destination = destinationPort;
      }

      const response = await this.client.get('/vessel/eta', {
        params
      });

      console.log(`✅ Vessel Finder API: Successfully retrieved ETA predictions`);
      return this.transformETAData(response.data);

    } catch (error) {
      console.error('❌ Vessel Finder API: Failed to get ETA predictions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get port arrival/departure notifications
   */
  async getPortNotifications(portId?: number, vesselImo?: string): Promise<{
    arrivals: Array<{
      vessel: VesselInfo;
      estimatedArrival: Date;
      actualArrival?: Date;
      berth?: string;
    }>;
    departures: Array<{
      vessel: VesselInfo;
      estimatedDeparture: Date;
      actualDeparture?: Date;
      destination?: string;
    }>;
  }> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    try {
      console.log(`🔍 Vessel Finder API: Getting port notifications`);

      const params: any = {
        format: 'json'
      };

      if (portId) {
        params.port_id = portId;
      }

      if (vesselImo) {
        params.imo = vesselImo;
      }

      const response = await this.client.get('/port/movements', {
        params
      });

      console.log(`✅ Vessel Finder API: Successfully retrieved port notifications`);
      return this.transformPortNotifications(response.data);

    } catch (error) {
      console.error('❌ Vessel Finder API: Failed to get port notifications:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search vessels by name or other criteria
   */
  async searchVessels(query: string): Promise<VesselPosition[]> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    try {
      console.log(`🔍 Vessel Finder API: Searching vessels with query: ${query}`);

      const response = await this.client.get('/vessel/search', {
        params: {
          query: query,
          format: 'json'
        }
      });

      console.log(`✅ Vessel Finder API: Successfully found vessels`);
      return this.transformVesselList(response.data);

    } catch (error) {
      console.error('❌ Vessel Finder API: Failed to search vessels:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get vessels in a specific area (bounding box)
   */
  async getVesselsInArea(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number
  ): Promise<VesselPosition[]> {
    if (!this.apiKey) {
      throw new Error('Vessel Finder API key not configured');
    }

    try {
      console.log(`🔍 Vessel Finder API: Getting vessels in area`);

      const response = await this.client.get('/vessel/area', {
        params: {
          min_lat: minLat,
          max_lat: maxLat,
          min_lon: minLon,
          max_lon: maxLon,
          format: 'json'
        }
      });

      console.log(`✅ Vessel Finder API: Successfully retrieved vessels in area`);
      return this.transformVesselList(response.data);

    } catch (error) {
      console.error('❌ Vessel Finder API: Failed to get vessels in area:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Transform Vessel Finder vessel data to our VesselPosition format
   */
  private transformVesselPosition(data: VesselFinderAPIResponse): VesselPosition | null {
    if (!data.success || !data.data || data.data.length === 0) {
      return null;
    }

    const vessel = data.data[0];
    
    return {
      imo: vessel.imo.toString(),
      mmsi: vessel.mmsi.toString(),
      name: vessel.name,
      position: {
        lat: vessel.position.lat,
        lng: vessel.position.lon
      },
      timestamp: new Date(vessel.position.timestamp),
      speed: vessel.position.speed,
      heading: vessel.position.heading,
      status: this.mapVesselStatus(vessel.position.status),
      destination: vessel.destination,
      eta: vessel.eta ? new Date(vessel.eta) : undefined
    };
  }

  /**
   * Transform vessel list data
   */
  private transformVesselList(data: VesselFinderAPIResponse): VesselPosition[] {
    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map(vessel => ({
      imo: vessel.imo.toString(),
      mmsi: vessel.mmsi.toString(),
      name: vessel.name,
      position: {
        lat: vessel.position.lat,
        lng: vessel.position.lon
      },
      timestamp: new Date(vessel.position.timestamp),
      speed: vessel.position.speed,
      heading: vessel.position.heading,
      status: this.mapVesselStatus(vessel.position.status),
      destination: vessel.destination,
      eta: vessel.eta ? new Date(vessel.eta) : undefined
    }));
  }

  /**
   * Transform vessel route data
   */
  private transformVesselRoute(imo: string, data: any): VesselRoute | null {
    if (!data.success || !data.data) {
      return null;
    }

    const vessel = data.data;
    const routePoints = vessel.route?.map((point: VesselFinderRoutePoint) => ({
      lat: point.lat,
      lng: point.lon
    })) || [];

    const waypoints = vessel.route?.map((point: VesselFinderRoutePoint) => ({
      position: {
        lat: point.lat,
        lng: point.lon
      },
      timestamp: new Date(point.timestamp),
      port: point.port ? {
        code: '',
        name: point.port,
        city: '',
        country: '',
        coordinates: { lat: point.lat, lng: point.lon },
        timezone: ''
      } : undefined,
      event: point.event
    })) || [];

    return {
      imo,
      name: vessel.name || '',
      route: routePoints,
      waypoints,
      estimatedArrival: vessel.eta ? new Date(vessel.eta) : undefined
    };
  }

  /**
   * Transform ETA prediction data
   */
  private transformETAData(data: any): {
    estimatedArrival: Date;
    confidence: number;
    weatherDelay?: number;
    congestionDelay?: number;
  } | null {
    if (!data.success || !data.data) {
      return null;
    }

    const etaData = data.data;
    
    return {
      estimatedArrival: new Date(etaData.eta),
      confidence: etaData.confidence || 0.8,
      weatherDelay: etaData.weather_delay,
      congestionDelay: etaData.congestion_delay
    };
  }

  /**
   * Transform port notifications data
   */
  private transformPortNotifications(data: any): {
    arrivals: Array<{
      vessel: VesselInfo;
      estimatedArrival: Date;
      actualArrival?: Date;
      berth?: string;
    }>;
    departures: Array<{
      vessel: VesselInfo;
      estimatedDeparture: Date;
      actualDeparture?: Date;
      destination?: string;
    }>;
  } {
    if (!data.success || !data.data) {
      return { arrivals: [], departures: [] };
    }

    const arrivals = (data.data.arrivals || []).map((arrival: any) => ({
      vessel: {
        name: arrival.vessel.name,
        imo: arrival.vessel.imo.toString(),
        voyage: arrival.voyage || 'N/A',
        flag: arrival.vessel.flag,
        type: arrival.vessel.type
      },
      estimatedArrival: new Date(arrival.eta),
      actualArrival: arrival.ata ? new Date(arrival.ata) : undefined,
      berth: arrival.berth
    }));

    const departures = (data.data.departures || []).map((departure: any) => ({
      vessel: {
        name: departure.vessel.name,
        imo: departure.vessel.imo.toString(),
        voyage: departure.voyage || 'N/A',
        flag: departure.vessel.flag,
        type: departure.vessel.type
      },
      estimatedDeparture: new Date(departure.etd),
      actualDeparture: departure.atd ? new Date(departure.atd) : undefined,
      destination: departure.destination
    }));

    return { arrivals, departures };
  }

  /**
   * Map Vessel Finder vessel status to readable status
   */
  private mapVesselStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'underway': 'Under way using engine',
      'anchored': 'At anchor',
      'moored': 'Moored',
      'not_under_command': 'Not under command',
      'restricted_maneuverability': 'Restricted manoeuvrability',
      'constrained_by_draught': 'Constrained by her draught',
      'aground': 'Aground',
      'fishing': 'Engaged in fishing',
      'sailing': 'Under way sailing',
      'towing': 'Power-driven vessel towing astern',
      'pushing': 'Power-driven vessel pushing ahead'
    };

    return statusMap[status.toLowerCase()] || status;
  }

  /**
   * Handle API errors and convert to our error format
   */
  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          throw new Error('Invalid Vessel Finder API key');
        case 403:
          throw new Error('Vessel Finder API access forbidden - check subscription');
        case 404:
          throw new Error('Vessel not found in Vessel Finder database');
        case 429:
          throw new Error('Vessel Finder API rate limit exceeded');
        default:
          throw new Error(`Vessel Finder API error: ${status} ${error.response.statusText}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Vessel Finder API request timeout');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to Vessel Finder API');
    } else {
      throw new Error(error.message || 'Unknown Vessel Finder API error');
    }
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
      name: 'vessel-finder',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['vessel'],
      reliability: 0.72
    };
  }
}