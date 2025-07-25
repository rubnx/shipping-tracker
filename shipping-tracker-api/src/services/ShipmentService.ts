import { ShipmentRepository } from '../repositories/ShipmentRepository';
import { SearchHistoryRepository } from '../repositories/SearchHistoryRepository';
import { APIAggregator } from './SimpleAPIAggregator';
import { 
  ShipmentRecord, 
  CreateShipmentData, 
  UpdateShipmentData, 
  SearchHistoryData,
  TrackingType,
  ShipmentData
} from '../types';

export class ShipmentService {
  private shipmentRepo: ShipmentRepository;
  private searchHistoryRepo: SearchHistoryRepository;
  private apiAggregator: APIAggregator;

  constructor() {
    this.shipmentRepo = new ShipmentRepository();
    this.searchHistoryRepo = new SearchHistoryRepository();
    this.apiAggregator = new APIAggregator();
  }

  // Cache shipment data
  async cacheShipment(data: CreateShipmentData): Promise<ShipmentRecord> {
    try {
      // Set expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const shipmentData = {
        ...data,
        expires_at: data.expires_at || expiresAt
      };

      return await this.shipmentRepo.upsert(shipmentData);
    } catch (error) {
      console.error('Error caching shipment:', error);
      throw error;
    }
  }

  // Get cached shipment data
  async getCachedShipment(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<ShipmentRecord | null> {
    try {
      const shipment = await this.shipmentRepo.findByTrackingNumber(trackingNumber, trackingType);
      
      // Check if shipment is expired
      if (shipment && shipment.expires_at && new Date() > shipment.expires_at) {
        console.log(`Cached shipment ${trackingNumber} has expired`);
        return null;
      }

      return shipment;
    } catch (error) {
      console.error('Error getting cached shipment:', error);
      throw error;
    }
  }

  // Update cached shipment
  async updateCachedShipment(
    trackingNumber: string, 
    trackingType: TrackingType,
    updateData: UpdateShipmentData
  ): Promise<ShipmentRecord | null> {
    try {
      const existing = await this.shipmentRepo.findByTrackingNumber(trackingNumber, trackingType);
      if (!existing) {
        return null;
      }

      return await this.shipmentRepo.update(existing.id, updateData);
    } catch (error) {
      console.error('Error updating cached shipment:', error);
      throw error;
    }
  }

  // Record search in history
  async recordSearch(data: SearchHistoryData): Promise<void> {
    try {
      await this.searchHistoryRepo.upsertSearch(data);
    } catch (error) {
      console.error('Error recording search history:', error);
      // Don't throw error for search history failures
    }
  }

  // Get search suggestions
  async getSearchSuggestions(
    partialInput: string, 
    userSession?: string, 
    limit: number = 5
  ): Promise<string[]> {
    try {
      return await this.searchHistoryRepo.getSearchSuggestions(partialInput, userSession, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Get user search history
  async getUserSearchHistory(
    userSession: string, 
    limit: number = 10
  ): Promise<string[]> {
    try {
      const history = await this.searchHistoryRepo.getByUserSession(userSession, limit);
      return history.map(record => record.tracking_number);
    } catch (error) {
      console.error('Error getting user search history:', error);
      return [];
    }
  }

  // Clean up expired data
  async cleanupExpiredData(): Promise<{ shipments: number; searchHistory: number }> {
    try {
      const [expiredShipments, oldSearchHistory] = await Promise.all([
        this.shipmentRepo.cleanupExpired(),
        this.searchHistoryRepo.cleanupOldHistory(30) // Clean up searches older than 30 days
      ]);

      console.log(`Cleaned up ${expiredShipments} expired shipments and ${oldSearchHistory} old search records`);
      
      return {
        shipments: expiredShipments,
        searchHistory: oldSearchHistory
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  // Get system statistics
  async getSystemStats(): Promise<{
    shipments: any;
    searchHistory: any;
  }> {
    try {
      const [shipmentStats, searchStats] = await Promise.all([
        this.shipmentRepo.getStats(),
        this.searchHistoryRepo.getStats()
      ]);

      return {
        shipments: shipmentStats,
        searchHistory: searchStats
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Main tracking method that integrates APIAggregator
   * Implements requirements 7.1-7.4 through APIAggregator
   */
  async trackShipment(
    trackingNumber: string, 
    trackingType?: TrackingType,
    userSession?: string
  ): Promise<ShipmentData> {
    try {
      console.log(`🔍 Tracking shipment: ${trackingNumber} (type: ${trackingType || 'auto'})`);

      // Record search in history (don't await to avoid blocking)
      if (userSession) {
        this.recordSearch({
          tracking_number: trackingNumber,
          tracking_type: trackingType,
          user_session: userSession
        }).catch(err => console.warn('Failed to record search:', err));
      }

      // Check cache first
      const cached = await this.getCachedShipment(trackingNumber, trackingType);
      if (cached && cached.data) {
        console.log(`📦 Returning cached data for ${trackingNumber}`);
        return this.transformCachedToShipmentData(cached);
      }

      // Fetch from multiple API sources using APIAggregator
      const rawData = await this.apiAggregator.fetchFromMultipleSources(trackingNumber, trackingType);
      
      // Prioritize and merge data from multiple sources
      const shipmentData = this.apiAggregator.prioritizeDataSources(rawData);

      // Cache the result
      await this.cacheShipment({
        tracking_number: trackingNumber,
        tracking_type: shipmentData.trackingType,
        carrier: shipmentData.carrier,
        service: shipmentData.service,
        status: shipmentData.status,
        data: shipmentData
      });

      console.log(`✅ Successfully tracked ${trackingNumber} from ${shipmentData.dataSource}`);
      return shipmentData;

    } catch (error) {
      console.error(`❌ Error tracking shipment ${trackingNumber}:`, error);
      
      // Try to return stale cached data as fallback
      const staleCache = await this.getStaleCache(trackingNumber, trackingType);
      if (staleCache) {
        console.log(`⚠️ Returning stale cached data for ${trackingNumber}`);
        return {
          ...this.transformCachedToShipmentData(staleCache),
          lastUpdated: staleCache.last_updated
        };
      }

      throw error;
    }
  }

  /**
   * Refresh tracking data by bypassing cache
   */
  async refreshTrackingData(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<ShipmentData> {
    try {
      console.log(`🔄 Refreshing tracking data for ${trackingNumber}`);

      // Clear cache for this tracking number
      const existing = await this.shipmentRepo.findByTrackingNumber(trackingNumber, trackingType);
      if (existing) {
        await this.shipmentRepo.delete(existing.id);
      }

      // Fetch fresh data
      const rawData = await this.apiAggregator.fetchFromMultipleSources(trackingNumber, trackingType);
      const shipmentData = this.apiAggregator.prioritizeDataSources(rawData);

      // Cache the fresh result
      await this.cacheShipment({
        tracking_number: trackingNumber,
        tracking_type: shipmentData.trackingType,
        carrier: shipmentData.carrier,
        service: shipmentData.service,
        status: shipmentData.status,
        data: shipmentData
      });

      return shipmentData;
    } catch (error) {
      console.error(`❌ Error refreshing tracking data for ${trackingNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get tracking history/timeline for a shipment
   */
  async getTrackingHistory(trackingNumber: string, trackingType?: TrackingType): Promise<any[]> {
    try {
      const shipmentData = await this.trackShipment(trackingNumber, trackingType);
      return shipmentData.timeline || [];
    } catch (error) {
      console.error(`❌ Error getting tracking history for ${trackingNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get API provider statistics
   */
  getAPIProviderStats(): { name: string; reliability: number; available: boolean }[] {
    return this.apiAggregator.getProviderStats();
  }

  /**
   * Clear API cache
   */
  clearAPICache(): void {
    this.apiAggregator.clearCache();
  }

  /**
   * Transform cached database record to ShipmentData format
   */
  private transformCachedToShipmentData(cached: ShipmentRecord): ShipmentData {
    const data = cached.data as ShipmentData;
    return {
      trackingNumber: cached.tracking_number,
      trackingType: cached.tracking_type,
      carrier: cached.carrier || data.carrier || 'Unknown',
      service: cached.service || data.service || 'FCL',
      status: cached.status || data.status || 'Unknown',
      timeline: data.timeline || [],
      route: data.route,
      containers: data.containers,
      vessel: data.vessel,
      lastUpdated: cached.last_updated,
      dataSource: data.dataSource || 'cache',
      reliability: data.reliability || 0.5
    };
  }

  /**
   * Get stale cached data (even if expired) as fallback
   */
  private async getStaleCache(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<ShipmentRecord | null> {
    try {
      // Get data even if expired
      return await this.shipmentRepo.findByTrackingNumber(trackingNumber, trackingType);
    } catch (error) {
      console.error('Error getting stale cache:', error);
      return null;
    }
  }
}