import { TrackingType, RawTrackingData } from '../../types';
export interface TrackTraceRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface TrackTraceAPIResponse {
    trackingNumber: string;
    status: string;
    carrier?: string;
    service?: string;
    events: TrackTraceEvent[];
    containers?: TrackTraceContainer[];
    vessel?: TrackTraceVessel;
    route?: TrackTraceRoute;
    lastUpdated: string;
    dataSource: string;
}
export interface TrackTraceEvent {
    eventId?: string;
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
export interface TrackTraceContainer {
    containerNumber: string;
    containerSize?: string;
    containerType?: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface TrackTraceVessel {
    vesselName?: string;
    vesselIMO?: string;
    voyageNumber?: string;
    currentPosition?: {
        latitude: number;
        longitude: number;
    };
    estimatedTimeOfArrival?: string;
    actualTimeOfArrival?: string;
}
export interface TrackTraceRoute {
    origin?: {
        portCode: string;
        portName: string;
        city: string;
        country: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    destination?: {
        portCode: string;
        portName: string;
        city: string;
        country: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
}
/**
 * Track-Trace Free API Service for basic container tracking
 * Implements Requirements 7.1, 7.4 for free tier fallback integration
 * This service provides basic tracking functionality with rate limitations
 */
export declare class TrackTraceAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    private readonly rateLimitPerMinute;
    private readonly rateLimitPerHour;
    constructor();
    /**
     * Track shipment using Track-Trace Free API
     * Primarily supports container numbers with basic tracking information
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Transform Track-Trace API response to our standard format
     */
    private transformResponse;
    /**
     * Transform Track-Trace events to our timeline format
     */
    private transformEvents;
    /**
     * Transform Track-Trace containers to our format
     */
    private transformContainers;
    /**
     * Transform Track-Trace vessel info to our format (limited in free tier)
     */
    private transformVessel;
    /**
     * Transform Track-Trace route info to our format (limited in free tier)
     */
    private transformRoute;
    /**
     * Transform port information (with defaults for missing data)
     */
    private transformPort;
    /**
     * Map Track-Trace service types to our standard types
     */
    private mapServiceType;
    /**
     * Map Track-Trace status to our standard status
     */
    private mapStatus;
    /**
     * Map Track-Trace event types to readable status
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
     * Special handling for free tier limitations
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
        rateLimits: {
            perMinute: number;
            perHour: number;
        };
        tier: string;
        limitations: string[];
    };
    /**
     * Check current rate limit status (useful for free tier management)
     */
    getRateLimitStatus(): {
        remainingMinute: number;
        remainingHour: number;
        resetTime: Date;
    };
}
//# sourceMappingURL=TrackTraceAPIService.d.ts.map