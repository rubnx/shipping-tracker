import { VesselPosition, VesselRoute, PortCongestion } from '../../types';
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
export declare class MarineTrafficAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Get vessel position by IMO number
     */
    getVesselPosition(imo: string): Promise<VesselPosition | null>;
    /**
     * Get vessel route and waypoints
     */
    getVesselRoute(imo: string, timespan?: number): Promise<VesselRoute | null>;
    /**
     * Get port congestion information
     */
    getPortCongestion(portId?: number): Promise<PortCongestion[]>;
    /**
     * Search vessels by name or other criteria
     */
    searchVessels(query: string): Promise<VesselPosition[]>;
    /**
     * Get vessels in a specific area (bounding box)
     */
    getVesselsInArea(minLat: number, maxLat: number, minLon: number, maxLon: number): Promise<VesselPosition[]>;
    /**
     * Transform Marine Traffic vessel data to our VesselPosition format
     */
    private transformVesselPosition;
    /**
     * Transform vessel list data
     */
    private transformVesselList;
    /**
     * Transform vessel route data
     */
    private transformVesselRoute;
    /**
     * Transform port congestion data
     */
    private transformPortCongestion;
    /**
     * Map Marine Traffic vessel status codes to readable status
     */
    private mapVesselStatus;
    /**
     * Map congestion factor to congestion level
     */
    private mapCongestionLevel;
    /**
     * Handle API errors and convert to our error format
     */
    private handleError;
    /**
     * Check if API is available and configured
     */
    isAvailable(): boolean;
    /**
     * Get API configuration info
     */
    getConfig(): {
        name: string;
        baseUrl: string;
        hasApiKey: boolean;
        timeout: number;
        retryAttempts: number;
        supportedTypes: string[];
        reliability: number;
    };
}
//# sourceMappingURL=MarineTrafficAPIService.d.ts.map