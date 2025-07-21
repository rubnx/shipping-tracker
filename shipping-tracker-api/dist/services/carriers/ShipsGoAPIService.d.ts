import { TrackingType, RawTrackingData } from '../../types';
export interface ShipsGoTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface ShipsGoAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: ShipsGoEvent[];
    containers?: ShipsGoContainer[];
    vessel?: ShipsGoVessel;
    route?: ShipsGoRoute;
    ports?: ShipsGoPortInfo[];
    lastUpdated: string;
    dataSource: string;
    aggregatedFrom: string[];
}
export interface ShipsGoEvent {
    eventId: string;
    eventDateTime: string;
    eventCode: string;
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
    actualDateTime?: string;
}
export interface ShipsGoContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: string;
    };
}
export interface ShipsGoVessel {
    vesselName: string;
    vesselIMO: string;
    voyageNumber: string;
    currentPosition?: {
        latitude: number;
        longitude: number;
        timestamp: string;
    };
    estimatedTimeOfArrival?: string;
    actualTimeOfArrival?: string;
    nextPort?: string;
    speed?: number;
    heading?: number;
}
export interface ShipsGoRoute {
    origin: {
        portCode: string;
        portName: string;
        city: string;
        country: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
        departureTime?: string;
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
        arrivalTime?: string;
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
    }>;
    totalDistance?: number;
    estimatedTransitTime?: number;
}
export interface ShipsGoPortInfo {
    portCode: string;
    portName: string;
    congestionLevel: 'low' | 'medium' | 'high';
    averageWaitTime?: number;
    weatherConditions?: string;
    operationalStatus: 'normal' | 'delayed' | 'closed';
}
/**
 * ShipsGo API Service for multi-carrier container tracking
 * Implements Requirements 7.1, 7.2, 7.3 for container-focused aggregator integration
 * ShipsGo provides freemium access to multiple carrier data with vessel tracking
 */
export declare class ShipsGoAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    private readonly rateLimitPerMinute;
    private readonly rateLimitPerHour;
    constructor();
    /**
     * Track shipment using ShipsGo API
     * Supports container numbers and booking numbers with multi-carrier aggregation
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get vessel tracking information
     */
    trackVessel(vesselIMO: string): Promise<RawTrackingData>;
    /**
     * Get port information and congestion data
     */
    getPortInfo(portCode: string): Promise<ShipsGoPortInfo | null>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform ShipsGo API response to our standard format
     */
    private transformResponse;
    /**
     * Transform vessel tracking response
     */
    private transformVesselResponse;
    /**
     * Transform ShipsGo events to our timeline format
     */
    private transformEvents;
    /**
     * Transform ShipsGo containers to our format
     */
    private transformContainers;
    /**
     * Transform ShipsGo vessel info to our format
     */
    private transformVessel;
    /**
     * Transform ShipsGo route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Map ShipsGo service types to our standard types
     */
    private mapServiceType;
    /**
     * Map ShipsGo status to our standard status
     */
    private mapStatus;
    /**
     * Map ShipsGo event codes to readable status
     */
    private mapEventStatus;
    /**
     * Map container sizes
     */
    private mapContainerSize;
    /**
     * Map container types
     */
    private mapContainerType;
    /**
     * Format location string
     */
    private formatLocation;
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
        supportedTypes: TrackingType[];
        reliability: number;
        rateLimits: {
            perMinute: number;
            perHour: number;
        };
        tier: string;
        features: string[];
        limitations: string[];
    };
    /**
     * Get supported carriers (aggregated data sources)
     */
    getSupportedCarriers(): string[];
}
//# sourceMappingURL=ShipsGoAPIService.d.ts.map