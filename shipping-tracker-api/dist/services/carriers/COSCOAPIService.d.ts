import { TrackingType, RawTrackingData } from '../../types';
export interface COSCOTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface COSCOAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: COSCOEvent[];
    containers?: COSCOContainer[];
    vessel?: COSCOVessel;
    route?: COSCORoute;
    lastUpdated: string;
}
export interface COSCOEvent {
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
export interface COSCOContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface COSCOVessel {
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
export interface COSCORoute {
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
 * COSCO API Service for container, booking, and BOL tracking
 * Chinese carrier with strong Asia-Pacific coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class COSCOAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using COSCO API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform COSCO API response to our standard format
     */
    private transformResponse;
    /**
     * Transform COSCO events to our timeline format
     */
    private transformEvents;
    /**
     * Transform COSCO containers to our format
     */
    private transformContainers;
    /**
     * Transform COSCO vessel info to our format
     */
    private transformVessel;
    /**
     * Transform COSCO route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get timezone for port based on country (COSCO specializes in Asia-Pacific routes)
     */
    private getPortTimezone;
    /**
     * Map COSCO service types to our standard types
     */
    private mapServiceType;
    /**
     * Map COSCO status to our standard status
     */
    private mapStatus;
    /**
     * Map COSCO event codes to readable status (includes Chinese translations)
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
        specialization: string;
    };
}
//# sourceMappingURL=COSCOAPIService.d.ts.map