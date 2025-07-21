import { TrackingType, RawTrackingData } from '../../types';
export interface MaerskTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface MaerskAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: MaerskEvent[];
    containers?: MaerskContainer[];
    vessel?: MaerskVessel;
    route?: MaerskRoute;
    lastUpdated: string;
}
export interface MaerskEvent {
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
export interface MaerskContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface MaerskVessel {
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
export interface MaerskRoute {
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
 * Maersk API Service for container, booking, and BOL tracking
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class MaerskAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using Maersk API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform Maersk API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Maersk events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Maersk containers to our format
     */
    private transformContainers;
    /**
     * Transform Maersk vessel info to our format
     */
    private transformVessel;
    /**
     * Transform Maersk route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Map Maersk service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Maersk status to our standard status
     */
    private mapStatus;
    /**
     * Map Maersk event types to readable status
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
    };
}
//# sourceMappingURL=MaerskAPIService.d.ts.map