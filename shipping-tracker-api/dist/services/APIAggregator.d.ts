import { RawTrackingData, ShipmentData, APIError, TrackingType } from '../types';
export declare class APIAggregator {
    private providers;
    private rateLimitTracker;
    private cache;
    private maerskService;
    private mscService;
    private trackTraceService;
    private shipsGoService;
    private searatesService;
    private cmaCgmService;
    private coscoService;
    private hapagLloydService;
    private evergreenService;
    private oneLineService;
    private yangMingService;
    private project44Service;
    private zimService;
    private marineTrafficService;
    private vesselFinderService;
    private smartRouter;
    constructor();
    private initializeProviders;
    /**
     * Fetch tracking data from multiple sources with smart routing
     * Requirement 7.1: Attempt to retrieve data from alternative APIs
     * Requirement 7.2: Prioritize the most reliable source
     * Requirement 7.4: Gracefully degrade when all APIs are unavailable
     */
    fetchFromMultipleSources(trackingNumber: string, trackingType?: TrackingType, userTier?: 'free' | 'premium' | 'enterprise', costOptimization?: boolean): Promise<RawTrackingData[]>;
    /**
     * Prioritize data sources and resolve conflicts
     * Requirement 7.2: Prioritize the most reliable source
     */
    prioritizeDataSources(data: RawTrackingData[]): ShipmentData;
    /**
     * Handle API failures gracefully
     * Requirement 7.4: Gracefully degrade when all APIs are unavailable
     */
    handleAPIFailures(errors: APIError[]): void;
    private fetchFromProvider;
    private mockAPICall;
    private getAvailableProviders;
    /**
     * Smart provider prioritization for world-class coverage
     * Strategy: Free APIs first, then high-reliability paid, then aggregators as fallback
     */
    private prioritizeProviders;
    /**
     * Detect likely carriers based on tracking number format
     */
    private detectLikelyCarriers;
    private checkRateLimit;
    private updateRateLimit;
    private getCachedData;
    private setCachedData;
    private categorizeError;
    private mergeTrackingData;
    private deduplicateTimelineEvents;
    getProviderStats(): {
        name: string;
        reliability: number;
        available: boolean;
    }[];
    clearCache(): void;
    /**
     * Get recent failures for smart routing
     */
    private getRecentFailures;
    /**
     * Determine if we should stop searching based on routing strategy
     */
    private shouldStopSearch;
    /**
     * Handle Marine Traffic API tracking for vessel information
     */
    private handleMarineTrafficTracking;
    /**
     * Check if a tracking number looks like an IMO number
     */
    private isIMONumber;
    /**
     * Transform Marine Traffic data to our standard shipment format
     */
    private transformMarineTrafficData;
    /**
     * Handle Vessel Finder API tracking for vessel information with ETA predictions
     */
    private handleVesselFinderTracking;
    /**
     * Transform Vessel Finder data to our standard shipment format
     */
    private transformVesselFinderData;
    /**
     * Get vessel tracking information for enhanced shipment data
     */
    getVesselTrackingInfo(imo: string): Promise<{
        position?: any;
        route?: any;
        congestion?: any[];
        etaPredictions?: any;
        portNotifications?: any;
    }>;
    /**
     * Get smart routing statistics for monitoring
     */
    getSmartRoutingStats(): {
        providerStats: Array<{
            provider: string;
            cost: number;
            reliability: number;
            recentFailures: number;
            lastFailure?: Date;
        }>;
        routingDecisions: number;
    };
}
//# sourceMappingURL=APIAggregator.d.ts.map