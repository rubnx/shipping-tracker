import { TrackingType, RawTrackingData } from '../../types';
export interface Project44TrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
    carrierScac?: string;
    includeEvents?: boolean;
    includeContainers?: boolean;
    includeVessel?: boolean;
    includeRoute?: boolean;
}
export interface Project44APIResponse {
    trackingNumber: string;
    status: string;
    carrier: {
        name: string;
        scac: string;
        code: string;
    };
    service: string;
    shipment: {
        type: 'FCL' | 'LCL';
        mode: 'OCEAN' | 'AIR' | 'RAIL' | 'TRUCK';
        priority: 'STANDARD' | 'EXPRESS' | 'PRIORITY';
    };
    events: Project44Event[];
    containers?: Project44Container[];
    vessel?: Project44Vessel;
    route?: Project44Route;
    tracking: {
        lastUpdated: string;
        nextUpdate: string;
        confidence: number;
        dataSource: string;
    };
    metadata: {
        requestId: string;
        processingTime: number;
        apiVersion: string;
        fallbackUsed?: boolean;
        fallbackProviders?: string[];
    };
}
export interface Project44Event {
    eventId: string;
    eventDateTime: string;
    eventType: string;
    eventCode: string;
    eventDescription: string;
    location: {
        locationName: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
        locationType: 'PORT' | 'TERMINAL' | 'WAREHOUSE' | 'CUSTOMS' | 'VESSEL';
    };
    isCompleted: boolean;
    isMilestone: boolean;
    isEstimated: boolean;
    carrier?: {
        name: string;
        scac: string;
    };
}
export interface Project44Container {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: 'KG' | 'LB';
    };
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: 'CM' | 'IN';
    };
    status: string;
    lastKnownLocation?: string;
    carrier?: {
        name: string;
        scac: string;
    };
}
export interface Project44Vessel {
    vesselName: string;
    vesselIMO: string;
    vesselMMSI?: string;
    voyageNumber: string;
    currentPosition?: {
        latitude: number;
        longitude: number;
        timestamp: string;
    };
    speed?: {
        value: number;
        unit: 'KNOTS';
    };
    heading?: number;
    destination?: string;
    estimatedTimeOfArrival?: string;
    actualTimeOfArrival?: string;
    estimatedTimeOfDeparture?: string;
    actualTimeOfDeparture?: string;
    carrier?: {
        name: string;
        scac: string;
    };
}
export interface Project44Route {
    origin: {
        portCode: string;
        portName: string;
        city: string;
        country: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
        timezone: string;
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
        timezone: string;
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
        sequence: number;
    }>;
    totalDistance?: {
        value: number;
        unit: 'NM' | 'KM';
    };
    estimatedTransitTime?: {
        value: number;
        unit: 'DAYS' | 'HOURS';
    };
    actualTransitTime?: {
        value: number;
        unit: 'DAYS' | 'HOURS';
    };
}
/**
 * Project44 Premium Logistics Platform API Service
 * Enterprise-grade container tracking with comprehensive multi-carrier fallback
 * Implements Requirements 7.1, 7.2, 7.3 for premium logistics platform integration
 */
export declare class Project44APIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    constructor();
    /**
     * Track shipment using Project44 premium logistics platform
     * Supports container numbers, booking numbers, and BOL numbers with multi-carrier fallback
     * Enterprise-grade tracking with comprehensive coverage
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType, carrierScac?: string): Promise<RawTrackingData>;
    /**
     * Get multi-carrier tracking with fallback providers
     * Premium feature that tries multiple carriers automatically
     */
    trackWithFallback(trackingNumber: string, trackingType: TrackingType, preferredCarriers?: string[]): Promise<RawTrackingData>;
    /**
     * Transform Project44 API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Project44 events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Project44 containers to our format
     */
    private transformContainers;
    /**
     * Transform Project44 vessel info to our format
     */
    private transformVessel;
    /**
     * Transform Project44 route info to our format
     */
    private transformRoute;
    /**
     * Transform port information
     */
    private transformPort;
    /**
     * Get timezone for country (fallback for missing timezone data)
     */
    private getTimezoneForCountry;
    /**
     * Map Project44 service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Project44 status to our standard status
     */
    private mapStatus;
    /**
     * Map Project44 event types to readable status
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
        tier: string;
        features: string[];
    };
    /**
     * Get supported carriers (premium feature)
     */
    getSupportedCarriers(): Promise<string[]>;
    /**
     * Get API usage statistics (premium feature)
     */
    getUsageStats(): Promise<any>;
}
//# sourceMappingURL=Project44APIService.d.ts.map