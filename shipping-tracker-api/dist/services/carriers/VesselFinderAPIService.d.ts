import { VesselPosition, VesselRoute, VesselInfo } from '../../types';
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
export declare class VesselFinderAPIService {
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
     * Get vessel route and ETA predictions
     */
    getVesselRoute(imo: string, timespan?: number): Promise<VesselRoute | null>;
    /**
     * Get ETA predictions for a vessel
     */
    getVesselETA(imo: string, destinationPort?: string): Promise<{
        estimatedArrival: Date;
        confidence: number;
        weatherDelay?: number;
        congestionDelay?: number;
    } | null>;
    /**
     * Get port arrival/departure notifications
     */
    getPortNotifications(portId?: number, vesselImo?: string): Promise<{
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
    }>;
    /**
     * Search vessels by name or other criteria
     */
    searchVessels(query: string): Promise<VesselPosition[]>;
    /**
     * Get vessels in a specific area (bounding box)
     */
    getVesselsInArea(minLat: number, maxLat: number, minLon: number, maxLon: number): Promise<VesselPosition[]>;
    /**
     * Transform Vessel Finder vessel data to our VesselPosition format
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
     * Transform ETA prediction data
     */
    private transformETAData;
    /**
     * Transform port notifications data
     */
    private transformPortNotifications;
    /**
     * Map Vessel Finder vessel status to readable status
     */
    private mapVesselStatus;
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
//# sourceMappingURL=VesselFinderAPIService.d.ts.map