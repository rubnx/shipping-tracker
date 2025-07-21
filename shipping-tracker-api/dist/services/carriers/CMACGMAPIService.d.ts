import { TrackingType, RawTrackingData } from '../../types';
export interface CMACGMTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface CMACGMAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: CMACGMEvent[];
    containers?: CMACGMContainer[];
    vessel?: CMACGMVessel;
    route?: CMACGMRoute;
    lastUpdated: string;
}
export interface CMACGMEvent {
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
export interface CMACGMContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface CMACGMVessel {
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
export interface CMACGMRoute {
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
 * CMA CGM API Service for container, booking, and BOL tracking
 * French carrier with strong European route coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class CMACGMAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using CMA CGM API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform CMA CGM API response to our standard format
     */
    private transformResponse;
    /**
     * Transform CMA CGM events to our timeline format
     */
    private transformEvents;
    /**
     * Transform CMA CGM containers to our format
     */
    private transformContainers;
    /**
     * Transform CMA CGM vessel info to our format
     */
    private transformVessel;
    /**
     * Transform CMA CGM route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get timezone for port based on country (CMA CGM specializes in European routes)
     */
    private getPortTimezone;
    /**
     * Map CMA CGM service types to our standard types
     */
    private mapServiceType;
    /**
     * Map CMA CGM status to our standard status
     */
    private mapStatus;
    /**
     * Map CMA CGM event codes to readable status (includes French translations)
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
//# sourceMappingURL=CMACGMAPIService.d.ts.map