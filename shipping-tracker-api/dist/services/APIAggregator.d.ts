import { RawTrackingData, ShipmentData, APIError, TrackingType } from '../types';
export declare class APIAggregator {
    private providers;
    private rateLimitTracker;
    private cache;
    constructor();
    private initializeProviders;
    /**
     * Fetch tracking data from multiple sources
     * Requirement 7.1: Attempt to retrieve data from alternative APIs
     */
    fetchFromMultipleSources(trackingNumber: string, trackingType?: TrackingType): Promise<RawTrackingData[]>;
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
}
//# sourceMappingURL=APIAggregator.d.ts.map