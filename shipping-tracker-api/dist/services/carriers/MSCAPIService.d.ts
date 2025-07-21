import { TrackingType, RawTrackingData } from '../../types';
export interface MSCTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface MSCAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: MSCEvent[];
    containers?: MSCContainer[];
    vessel?: MSCVessel;
    route?: MSCRoute;
    lastUpdated: string;
}
export interface MSCEvent {
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
export interface MSCContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface MSCVessel {
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
export interface MSCRoute {
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
 * MSC API Service for container, booking, and BOL tracking
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class MSCAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using MSC API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform MSC API response to our standard format
     */
    private transformResponse;
    /**
     * Transform MSC events to our timeline format
     */
    private transformEvents;
    /**
     * Transform MSC containers to our format
     */
    private transformContainers;
    /**
     * Transform MSC vessel info to our format
     */
    private transformVessel;
    /**
     * Transform MSC route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Map MSC service types to our standard types
     */
    private mapServiceType;
    /**
     * Map MSC status to our standard status
     */
    private mapStatus;
    /**
     * Map MSC event codes to readable status
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
//# sourceMappingURL=MSCAPIService.d.ts.map