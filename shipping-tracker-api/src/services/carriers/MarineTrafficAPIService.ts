import axios, { AxiosInstance, AxiosResponse } from 'axios';
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

export interface MarineTrafficVesselRequest {
  imo?: string;
  mmsi?: string;
  vesselName?: string;
}

export interface MarineTrafficAPIResponse {
  success: boolean;
  data: MarineTrafficVessel[];
  message?: string;
}

export interface MarineTrafficVessel {
  MMSI: number;
  IMO: number;
  SHIP_ID: number;
  LAT: number;
  LON: number;
  SPEED: number;
  HEADING: number;
  COURSE: number;
  STATUS: number;
  TIMESTAMP: string;
  DSRC: string;
  UTC_SECONDS: number;
  SHIPNAME: string;
  SHIPTYPE: number;
  CALLSIGN: string;
  FLAG: string;
  LENGTH: number;
  WIDTH: number;
  GRT: number;
  DWT: number;
  DRAUGHT: number;
  YEAR_BUILT: number;
  ROT: number;
  TYPE_NAME: string;
  AIS_TYPE_SUMMARY: string;
  DESTINATION: string;
  ETA: string;
  CURRENT_PORT: string;
  LAST_PORT: string;
  LAST_PORT_TIME: string;
  CURRENT_PORT_ID: number;
  LAST_PORT_ID: number;
  NEXT_PORT_NAME: string;
  NEXT_PORT_ID: number;
  ETA_CALC: string;
}

export interface MarineTrafficPortResponse {
  success: boolean;
  data: MarineTrafficPort[];
}

export interface MarineTrafficPort {
  port_id: number;
  port_name: string;
  country: string;
  lat: number;
  lon: number;
  vessels_in_port: number;
  vessels_expected: number;
  congestion_factor: number;
  average_waiting_time: number;
  last_updated: string;
}

/**
 * Marine Traffic API Service for vessel tracking and port information
 * Implements Requirements 3.1, 3.3, 7.1 for real-time vessel tracking
 */
export class MarineTrafficAPIService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 15000;
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = 'https://services.marinetraffic.com/api';
    this.apiKey = config.apiKeys.marineTraffic;
    
    if (!this.apiKey) {
      console.warn('⚠️ Marine Traffic API key not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ShippingTracker/1.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚢 Marine Traffic API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Marine Traffic API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Marine Traffic API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ Marine Traffic API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get vessel position by IMO number
   */
  async getVesselPosition(imo: string): Promise<VesselPosition | null> {
    if (!this.apiKey) {
      throw new Error('Marine Traffic API key not configured');
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔍 Marine Traffic API: Getting vessel position for IMO ${imo} (attempt ${attempt}/${this.retryAttempts})`);

        const response = await this.client.get('/exportvessel/v:8', {
          params: {
            key: this.apiKey,
            imo: imo,
            protocol: 'jsono'
          }
        });

        const processingTime = Date.now() - startTime;
        console.log(`✅ Marine Traffic API: Successfully retrieved vessel position in ${processingTime}ms`);

        return this.transformVesselPosition(response.data);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Marine Traffic API: Attempt ${attempt} failed after ${processingTime}ms:`, error);

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
   * Get vessel route and waypoints
   */
  async getVesselRoute(imo: string, timespan: number = 24): Promise<VesselRoute | null> {
    if (!this.apiKey) {
      throw new Error('Marine Traffic API key not configured');
    }

    try {
      console.log(`🔍 Marine Traffic API: Getting vessel route for IMO ${imo}`);

      const response = await this.client.get('/exportvesseltrack/v:2', {
        params: {
          key: this.apiKey,
          imo: imo,
          timespan: timespan, // hours
          protocol: 'jsono'
        }
      });

      console.log(`✅ Marine Traffic API: Successfully retrieved vessel route`);
      return this.transformVesselRoute(imo, response.data);

    } catch (error) {
      console.error('❌ Marine Traffic API: Failed to get vessel route:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get port congestion information
   */
  async getPortCongestion(portId?: number): Promise<PortCongestion[]> {
    if (!this.apiKey) {
      throw new Error('Marine Traffic API key not configured');
    }

    try {
      console.log(`🔍 Marine Traffic API: Getting port congestion data`);

      const params: any = {
        key: this.apiKey,
        protocol: 'jsono'
      };

      if (portId) {
        params.portid = portId;
      }

      const response = await this.client.get('/portcongestion/v:1', {
        params
      });

      console.log(`✅ Marine Traffic API: Successfully retrieved port congestion data`);
      return this.transformPortCongestion(response.data);

    } catch (error) {
      console.error('❌ Marine Traffic API: Failed to get port congestion:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search vessels by name or other criteria
   */
  async searchVessels(query: string): Promise<VesselPosition[]> {
    if (!this.apiKey) {
      throw new Error('Marine Traffic API key not configured');
    }

    try {
      console.log(`🔍 Marine Traffic API: Searching vessels with query: ${query}`);

      const response = await this.client.get('/exportvessel/v:8', {
        params: {
          key: this.apiKey,
          shipname: query,
          protocol: 'jsono'
        }
      });

      console.log(`✅ Marine Traffic API: Successfully found vessels`);
      return this.transformVesselList(response.data);

    } catch (error) {
      console.error('❌ Marine Traffic API: Failed to search vessels:', error);
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
      throw new Error('Marine Traffic API key not configured');
    }

    try {
      console.log(`🔍 Marine Traffic API: Getting vessels in area`);

      const response = await this.client.get('/exportvessel/v:8', {
        params: {
          key: this.apiKey,
          minlat: minLat,
          maxlat: maxLat,
          minlon: minLon,
          maxlon: maxLon,
          protocol: 'jsono'
        }
      });

      console.log(`✅ Marine Traffic API: Successfully retrieved vessels in area`);
      return this.transformVesselList(response.data);

    } catch (error) {
      console.error('❌ Marine Traffic API: Failed to get vessels in area:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Transform Marine Traffic vessel data to our VesselPosition format
   */
  private transformVesselPosition(data: MarineTrafficAPIResponse): VesselPosition | null {
    if (!data.success || !data.data || data.data.length === 0) {
      return null;
    }

    const vessel = data.data[0];
    
    return {
      imo: vessel.IMO.toString(),
      mmsi: vessel.MMSI.toString(),
      name: vessel.SHIPNAME,
      position: {
        lat: vessel.LAT,
        lng: vessel.LON
      },
      timestamp: new Date(vessel.TIMESTAMP),
      speed: vessel.SPEED,
      heading: vessel.HEADING,
      status: this.mapVesselStatus(vessel.STATUS),
      destination: vessel.DESTINATION,
      eta: vessel.ETA ? new Date(vessel.ETA) : undefined
    };
  }

  /**
   * Transform vessel list data
   */
  private transformVesselList(data: MarineTrafficAPIResponse): VesselPosition[] {
    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map(vessel => ({
      imo: vessel.IMO.toString(),
      mmsi: vessel.MMSI.toString(),
      name: vessel.SHIPNAME,
      position: {
        lat: vessel.LAT,
        lng: vessel.LON
      },
      timestamp: new Date(vessel.TIMESTAMP),
      speed: vessel.SPEED,
      heading: vessel.HEADING,
      status: this.mapVesselStatus(vessel.STATUS),
      destination: vessel.DESTINATION,
      eta: vessel.ETA ? new Date(vessel.ETA) : undefined
    }));
  }

  /**
   * Transform vessel route data
   */
  private transformVesselRoute(imo: string, data: any): VesselRoute | null {
    if (!data.success || !data.data) {
      return null;
    }

    const routePoints = data.data.map((point: any) => ({
      lat: point.LAT,
      lng: point.LON
    }));

    const waypoints = data.data.map((point: any) => ({
      position: {
        lat: point.LAT,
        lng: point.LON
      },
      timestamp: new Date(point.TIMESTAMP),
      event: point.STATUS_NAME
    }));

    return {
      imo,
      name: data.data[0]?.SHIPNAME || '',
      route: routePoints,
      waypoints
    };
  }

  /**
   * Transform port congestion data
   */
  private transformPortCongestion(data: MarineTrafficPortResponse): PortCongestion[] {
    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map(port => ({
      portCode: port.port_id.toString(),
      portName: port.port_name,
      congestionLevel: this.mapCongestionLevel(port.congestion_factor),
      averageWaitTime: port.average_waiting_time,
      vesselsWaiting: port.vessels_in_port,
      lastUpdated: new Date(port.last_updated)
    }));
  }

  /**
   * Map Marine Traffic vessel status codes to readable status
   */
  private mapVesselStatus(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'Under way using engine',
      1: 'At anchor',
      2: 'Not under command',
      3: 'Restricted manoeuvrability',
      4: 'Constrained by her draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in fishing',
      8: 'Under way sailing',
      9: 'Reserved for future amendment',
      10: 'Reserved for future amendment',
      11: 'Power-driven vessel towing astern',
      12: 'Power-driven vessel pushing ahead',
      13: 'Reserved for future use',
      14: 'AIS-SART',
      15: 'Undefined'
    };

    return statusMap[status] || 'Unknown';
  }

  /**
   * Map congestion factor to congestion level
   */
  private mapCongestionLevel(factor: number): 'low' | 'medium' | 'high' | 'critical' {
    if (factor < 0.3) return 'low';
    if (factor < 0.6) return 'medium';
    if (factor < 0.8) return 'high';
    return 'critical';
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
          throw new Error('Invalid Marine Traffic API key');
        case 403:
          throw new Error('Marine Traffic API access forbidden - check subscription');
        case 404:
          throw new Error('Vessel not found in Marine Traffic database');
        case 429:
          throw new Error('Marine Traffic API rate limit exceeded');
        default:
          throw new Error(`Marine Traffic API error: ${status} ${error.response.statusText}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Marine Traffic API request timeout');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to Marine Traffic API');
    } else {
      throw new Error(error.message || 'Unknown Marine Traffic API error');
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
      name: 'marine-traffic',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedTypes: ['vessel'],
      reliability: 0.90
    };
  }
}