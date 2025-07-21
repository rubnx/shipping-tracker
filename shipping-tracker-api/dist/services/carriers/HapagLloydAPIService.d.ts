import { TrackingType, RawTrackingData } from '../../types';
export interface HapagLloydTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface HapagLloydAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: HapagLloydEvent[];
    containers?: HapagLloydContainer[];
    vessel?: HapagLloydVessel;
    route?: HapagLloydRoute;
    lastUpdated: string;
}
export interface HapagLloydEvent {
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
export interface HapagLloydContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface HapagLloydVessel {
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
export interface HapagLloydRoute {
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
 * Hapag-Lloyd API Service for container, booking, and BOL tracking
 * German carrier with strong global coverage and European route optimization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
export declare class HapagLloydAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using Hapag-Lloyd API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform Hapag-Lloyd API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Hapag-Lloyd events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Hapag-Lloyd containers to our format
     */
    private transformContainers;
    /**
     * Transform Hapag-Lloyd vessel info to our format
     */
    private transformVessel;
    /**
     * Transform Hapag-Lloyd route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get timezone for port based on country (Hapag-Lloyd has global coverage)
     */
    private getPortTimezone;
    /**
     * Map Hapag-Lloyd service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Hapag-Lloyd status to our standard status
     */
    private mapStatus;
    /**
     * Map Hapag-Lloyd event codes to readable status (includes German translations)
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
//# sourceMappingURL=HapagLloydAPIService.d.ts.map