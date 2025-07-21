import { TrackingType, RawTrackingData } from '../../types';
export interface EvergreenTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface EvergreenAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: EvergreenEvent[];
    containers?: EvergreenContainer[];
    vessel?: EvergreenVessel;
    route?: EvergreenRoute;
    lastUpdated: string;
}
export interface EvergreenEvent {
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
export interface EvergreenContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface EvergreenVessel {
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
export interface EvergreenRoute {
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
 * Evergreen Line API Service for container, booking, and BOL tracking
 * Taiwan-based carrier with strong Asia-Pacific route specialization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class EvergreenAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using Evergreen API
     * Supports container numbers, booking numbers, and BOL numbers
     * Specialized for Asia-Pacific routes and intra-Asia services
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform Evergreen API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Evergreen events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Evergreen containers to our format
     */
    private transformContainers;
    /**
     * Transform Evergreen vessel info to our format
     */
    private transformVessel;
    /**
     * Transform Evergreen route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get appropriate timezone for Asian ports
     */
    private getAsianTimezone;
    /**
     * Map Evergreen service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Evergreen status to our standard status
     */
    private mapStatus;
    /**
     * Map Evergreen event types to readable status
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
//# sourceMappingURL=EvergreenAPIService.d.ts.map