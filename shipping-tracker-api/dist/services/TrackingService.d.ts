import { TrackingType, ShipmentData, TimelineEvent } from '../types';
export interface TrackingError {
    code: string;
    message: string;
    userMessage: string;
    statusCode: number;
    retryable: boolean;
    retryAfter?: number;
}
export interface TrackingResult {
    success: boolean;
    data?: ShipmentData;
    error?: TrackingError;
    fromCache?: boolean;
    dataAge?: number;
}
export declare class TrackingService {
    private shipmentService;
    private readonly CACHE_WARNING_AGE;
    private readonly STALE_DATA_AGE;
    constructor();
    /**
     * Main tracking method with comprehensive error handling
     * Requirements: 5.3, 5.4, 5.5, 7.1, 7.4
     */
    trackShipment(trackingNumber: string, trackingType?: TrackingType, userSession?: string, forceRefresh?: boolean): Promise<TrackingResult>;
    /**
     * Refresh tracking data by bypassing cache
     */
    refreshTrackingData(trackingNumber: string, trackingType?: TrackingType): Promise<TrackingResult>;
    /**
     * Get tracking timeline/history
     */
    getTrackingHistory(trackingNumber: string, trackingType?: TrackingType): Promise<{
        success: boolean;
        data?: TimelineEvent[];
        error?: TrackingError;
    }>;
    /**
     * Get search suggestions based on history
     */
    getSearchSuggestions(partialInput: string, userSession?: string, limit?: number): Promise<string[]>;
    /**
     * Get API provider health status
     */
    getProviderHealth(): {
        providers: {
            name: string;
            reliability: number;
            available: boolean;
        }[];
        overallHealth: 'healthy' | 'degraded' | 'unavailable';
    };
    /**
     * Perform fresh tracking without cache
     */
    private performFreshTracking;
    /**
     * Get cached tracking data
     */
    private getCachedTrackingData;
    /**
     * Get stale cached data (even if expired)
     */
    private getStaleTrackingData;
    /**
     * Validate tracking number format and content
     */
    private validateTrackingNumber;
    /**
     * Categorize errors into user-friendly messages
     */
    private categorizeError;
    /**
     * Calculate data age in minutes
     */
    private calculateDataAge;
    /**
     * Format data age for user display
     */
    private formatDataAge;
}
//# sourceMappingURL=TrackingService.d.ts.map