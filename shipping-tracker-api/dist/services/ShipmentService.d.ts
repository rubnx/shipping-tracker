import { ShipmentRecord, CreateShipmentData, UpdateShipmentData, SearchHistoryData, TrackingType, ShipmentData } from '../types';
export declare class ShipmentService {
    private shipmentRepo;
    private searchHistoryRepo;
    private apiAggregator;
    constructor();
    cacheShipment(data: CreateShipmentData): Promise<ShipmentRecord>;
    getCachedShipment(trackingNumber: string, trackingType?: TrackingType): Promise<ShipmentRecord | null>;
    updateCachedShipment(trackingNumber: string, trackingType: TrackingType, updateData: UpdateShipmentData): Promise<ShipmentRecord | null>;
    recordSearch(data: SearchHistoryData): Promise<void>;
    getSearchSuggestions(partialInput: string, userSession?: string, limit?: number): Promise<string[]>;
    getUserSearchHistory(userSession: string, limit?: number): Promise<string[]>;
    cleanupExpiredData(): Promise<{
        shipments: number;
        searchHistory: number;
    }>;
    getSystemStats(): Promise<{
        shipments: any;
        searchHistory: any;
    }>;
    /**
     * Main tracking method that integrates APIAggregator
     * Implements requirements 7.1-7.4 through APIAggregator
     */
    trackShipment(trackingNumber: string, trackingType?: TrackingType, userSession?: string): Promise<ShipmentData>;
    /**
     * Refresh tracking data by bypassing cache
     */
    refreshTrackingData(trackingNumber: string, trackingType?: TrackingType): Promise<ShipmentData>;
    /**
     * Get tracking history/timeline for a shipment
     */
    getTrackingHistory(trackingNumber: string, trackingType?: TrackingType): Promise<any[]>;
    /**
     * Get API provider statistics
     */
    getAPIProviderStats(): {
        name: string;
        reliability: number;
        available: boolean;
    }[];
    /**
     * Clear API cache
     */
    clearAPICache(): void;
    /**
     * Transform cached database record to ShipmentData format
     */
    private transformCachedToShipmentData;
    /**
     * Get stale cached data (even if expired) as fallback
     */
    private getStaleCache;
}
//# sourceMappingURL=ShipmentService.d.ts.map