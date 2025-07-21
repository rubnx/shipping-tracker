import { TrackingType, RawTrackingData } from '../../types';
export interface YangMingTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface YangMingAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: YangMingEvent[];
    containers?: YangMingContainer[];
    vessel?: YangMingVessel;
    route?: YangMingRoute;
    lastUpdated: string;
}
export interface YangMingEvent {
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
export interface YangMingContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface YangMingVessel {
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
export interface YangMingRoute {
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
 * Yang Ming Marine Transport API Service for container, booking, and BOL tracking
 * Taiwan-based carrier with Asia-Pacific focus and regional route optimization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class YangMingAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using Yang Ming API
     * Supports container numbers, booking numbers, and BOL numbers
     * Specialized for Asia-Pacific focus with regional route optimization
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform Yang Ming API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Yang Ming events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Yang Ming containers to our format
     */
    private transformContainers;
    /**
     * Transform Yang Ming vessel info to our format
     */
    private transformVessel;
    /**
     * Transform Yang Ming route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get appropriate timezone for regional Asia-Pacific ports
     */
    private getRegionalTimezone;
    /**
     * Map Yang Ming service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Yang Ming status to our standard status
     */
    private mapStatus;
    /**
     * Map Yang Ming event types to readable status
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
        coverage: string[];
        specialization: string;
    };
}
//# sourceMappingURL=YangMingAPIService.d.ts.map