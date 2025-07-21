import { TrackingType, RawTrackingData } from '../../types';
export interface ONELineTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface ONELineAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: ONELineEvent[];
    containers?: ONELineContainer[];
    vessel?: ONELineVessel;
    route?: ONELineRoute;
    lastUpdated: string;
}
export interface ONELineEvent {
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
export interface ONELineContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface ONELineVessel {
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
export interface ONELineRoute {
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
 * Ocean Network Express (ONE) API Service for container, booking, and BOL tracking
 * Japanese alliance carrier with comprehensive Asia-Pacific and global coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class ONELineAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using ONE Line API
     * Supports container numbers, booking numbers, and BOL numbers
     * Comprehensive Asia-Pacific coverage with global routes
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform ONE Line API response to our standard format
     */
    private transformResponse;
    /**
     * Transform ONE Line events to our timeline format
     */
    private transformEvents;
    /**
     * Transform ONE Line containers to our format
     */
    private transformContainers;
    /**
     * Transform ONE Line vessel info to our format
     */
    private transformVessel;
    /**
     * Transform ONE Line route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get appropriate timezone for global ports
     */
    private getGlobalTimezone;
    /**
     * Map ONE Line service types to our standard types
     */
    private mapServiceType;
    /**
     * Map ONE Line status to our standard status
     */
    private mapStatus;
    /**
     * Map ONE Line event types to readable status
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
        alliance: string;
    };
}
//# sourceMappingURL=ONELineAPIService.d.ts.map