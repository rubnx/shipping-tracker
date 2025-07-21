import { TrackingType, RawTrackingData } from '../../types';
export interface SeaRatesTrackingRequest {
    trackingNumber: string;
    trackingType: TrackingType;
}
export interface SeaRatesAPIResponse {
    trackingNumber: string;
    status: string;
    carrier: string;
    service: string;
    events: SeaRatesEvent[];
    containers?: SeaRatesContainer[];
    vessel?: SeaRatesVessel;
    route?: SeaRatesRoute;
    rates?: SeaRatesInfo;
    lastUpdated: string;
    dataSource: string;
}
export interface SeaRatesEvent {
    eventId?: string;
    eventDateTime: string;
    eventType: string;
    eventDescription: string;
    location: {
        locationName: string;
        city?: string;
        country?: string;
        portCode?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    isCompleted: boolean;
    estimatedDateTime?: string;
}
export interface SeaRatesContainer {
    containerNumber: string;
    containerSize?: string;
    containerType?: string;
    sealNumber?: string;
    weight?: {
        value: number;
        unit: string;
    };
}
export interface SeaRatesVessel {
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
export interface SeaRatesRoute {
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
    transitTime?: number;
    distance?: number;
}
export interface SeaRatesInfo {
    estimatedCost?: {
        value: number;
        currency: string;
    };
    transitTime?: number;
    routeOptimization?: string;
    alternativeRoutes?: Array<{
        route: string;
        cost: number;
        transitTime: number;
    }>;
}
/**
 * SeaRates API Service for container tracking with shipping rates and route optimization
 * Implements Requirements 7.1, 7.2 for container-focused aggregator with cost analysis
 * SeaRates provides freemium access to tracking data with shipping cost insights
 */
export declare class SeaRatesAPIService {
    private client;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly retryAttempts;
    private readonly rateLimitPerMinute;
    private readonly rateLimitPerHour;
    constructor();
    /**
     * Track shipment using SeaRates API
     * Supports container numbers and booking numbers with cost analysis
     */
    trackShipment(trackingNumber: string, trackingType: TrackingType): Promise<RawTrackingData>;
    /**
     * Get shipping rates and route optimization
     */
    getShippingRates(origin: string, destination: string, containerType?: '20ft' | '40ft' | '45ft'): Promise<SeaRatesInfo | null>;
    /**
     * Get route optimization suggestions
     */
    getRouteOptimization(origin: string, destination: string, preferences?: {
        priority: 'cost' | 'time' | 'reliability';
        maxTransshipments?: number;
    }): Promise<any>;
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    private getTrackingEndpoint;
    /**
     * Transform SeaRates API response to our standard format
     */
    private transformResponse;
    /**
     * Transform SeaRates events to our timeline format
     */
    private transformEvents;
    /**
     * Transform SeaRates containers to our format
     */
    private transformContainers;
    /**
     * Transform SeaRates vessel info to our format
     */
    private transformVessel;
    /**
     * Transform SeaRates route info to our format
     */
    private transformRoute;
    /**
     * Transform port information (with defaults for missing data)
     */
    private transformPort;
    /**
     * Map SeaRates service types to our standard types
     */
    private mapServiceType;
    /**
     * Map SeaRates status to our standard status
     */
    private mapStatus;
    /**
     * Map SeaRates event types to readable status
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
        rateLimits: {
            perMinute: number;
            perHour: number;
        };
        tier: string;
        features: string[];
        limitations: string[];
        specialties: string[];
    };
    /**
     * Get supported route optimization priorities
     */
    getOptimizationPriorities(): string[];
    /**
     * Get supported container types for rate calculation
     */
    getSupportedContainerTypes(): string[];
}
//# sourceMappingURL=SeaRatesAPIService.d.ts.map