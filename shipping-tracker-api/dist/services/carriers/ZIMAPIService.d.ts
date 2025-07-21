import { TrackingType, RawTrackingData } from '../../types';
export interface ZIMTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface ZIMAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: ZIMEvent[];
    containers?: ZIMContainer[];
    vessel?: ZIMVessel;
    route?: ZIMRoute;
    lastUpdated: string;
    metadata: {
        requestId: string;
        processingTime: number;
        dataSource: string;
    };
}
export interface ZIMEvent {
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
        portCode?: string;
    };
    isCompleted: boolean;
    isMilestone: boolean;
}
export interface ZIMContainer {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
    status: string;
}
export interface ZIMVessel {
    vesselName: string;
    vesselIMO: string;
    voyageNumber: string;
    currentPosition?: {
        latitude: number;
        longitude: number;
    };
    estimatedTimeOfArrival?: string;
    actualTimeOfArrival?: string;
    flag?: string;
}
export interface ZIMRoute {
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
        sequence: number;
    }>;
    routeType: 'MEDITERRANEAN' | 'GLOBAL' | 'FEEDER';
}
/**
 * ZIM Integrated Shipping Services API Service
 * Israeli shipping company with Mediterranean and global container tracking
 * Implements Requirements 7.1, 7.2 for specialized route coverage
 */
export declare class ZIMAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using ZIM API
     * Supports container numbers and booking numbers
     * Specialized for Mediterranean and global route coverage
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform ZIM API response to our standard format
     */
    private transformResponse;
    /**
     * Transform ZIM events to our timeline format
     */
    private transformEvents;
    /**
     * Transform ZIM containers to our format
     */
    private transformContainers;
    /**
     * Transform ZIM vessel info to our format
     */
    private transformVessel;
    /**
     * Transform ZIM route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get route specialization description
     */
    private getRouteSpecialization;
    /**
     * Get appropriate timezone for countries (focusing on Mediterranean region)
     */
    private getTimezoneForCountry;
    /**
     * Map ZIM service types to our standard types
     */
    private mapServiceType;
    /**
     * Map ZIM status to our standard status
     */
    private mapStatus;
    /**
     * Map ZIM event types to readable status
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
        features: string[];
    };
    /**
     * Get Mediterranean route information (specialized feature)
     */
    getMediterraneanRoutes(): Promise<any[]>;
    /**
     * Get port congestion information for Mediterranean ports
     */
    getMediterraneanPortCongestion(): Promise<any[]>;
}
//# sourceMappingURL=ZIMAPIService.d.ts.map