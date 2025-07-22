import { CacheService } from './CacheService';
import type { ShipmentTracking } from '../types';

/**
 * Tracking-specific cache service
 * Implements Requirements 7.3, 9.1, 9.2 for tracking data caching
 */
export class TrackingCacheService {
  private static instance: TrackingCacheService;
  private cache: CacheService;
  
  // Cache namespaces
  private readonly NAMESPACES = {
    TRACKING: 'tracking',
    API_RESPONSES: 'api_responses',
    RATE_LIMITS: 'rate_limits',
    SEARCH_HISTORY: 'search_history',
    POPULAR_ROUTES: 'popular_routes',
    CARRIER_STATUS: 'carrier_status',
    VESSEL_INFO: 'vessel_info',
  };

  // Cache TTL values (in seconds)
  private readonly TTL = {
    TRACKING_DATA: 15 * 60, // 15 minutes
    API_RESPONSE: 5 * 60, // 5 minutes
    RATE_LIMIT: 60 * 60, // 1 hour
    SEARCH_HISTORY: 7 * 24 * 60 * 60, // 7 days
    POPULAR_ROUTES: 24 * 60 * 60, // 24 hours
    CARRIER_STATUS: 30 * 60, // 30 minutes
    VESSEL_INFO: 60 * 60, // 1 hour
  };

  private constructor() {
    this.cache = CacheService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TrackingCacheService {
    if (!TrackingCacheService.instance) {
      TrackingCacheService.instance = new TrackingCacheService();
    }
    return TrackingCacheService.instance;
  }

  /**
   * Cache tracking data
   */
  public async cacheTrackingData(
    trackingNumber: string,
    data: ShipmentTracking,
    customTTL?: number
  ): Promise<boolean> {
    const key = this.generateTrackingKey(trackingNumber);
    const ttl = customTTL || this.TTL.TRACKING_DATA;
    
    // Add cache metadata
    const cacheData = {
      ...data,
      _cached: {
        timestamp: Date.now(),
        ttl,
        key,
      },
    };

    return await this.cache.set(this.NAMESPACES.TRACKING, key, cacheData, ttl);
  }

  /**
   * Get cached tracking data
   */
  public async getCachedTrackingData(trackingNumber: string): Promise<ShipmentTracking | null> {
    const key = this.generateTrackingKey(trackingNumber);
    const data = await this.cache.get<ShipmentTracking>(this.NAMESPACES.TRACKING, key);
    
    if (data) {
      // Remove cache metadata before returning
      const { _cached, ...cleanData } = data as any;
      return cleanData;
    }
    
    return null;
  }

  /**
   * Cache API response
   */
  public async cacheAPIResponse(
    provider: string,
    trackingNumber: string,
    response: any,
    customTTL?: number
  ): Promise<boolean> {
    const key = `${provider}:${this.generateTrackingKey(trackingNumber)}`;
    const ttl = customTTL || this.TTL.API_RESPONSE;
    
    const cacheData = {
      provider,
      trackingNumber,
      response,
      timestamp: Date.now(),
    };

    return await this.cache.set(this.NAMESPACES.API_RESPONSES, key, cacheData, ttl);
  }

  /**
   * Get cached API response
   */
  public async getCachedAPIResponse(
    provider: string,
    trackingNumber: string
  ): Promise<any | null> {
    const key = `${provider}:${this.generateTrackingKey(trackingNumber)}`;
    const data = await this.cache.get(this.NAMESPACES.API_RESPONSES, key);
    
    return data ? data.response : null;
  }

  /**
   * Cache rate limit information
   */
  public async cacheRateLimit(
    provider: string,
    remaining: number,
    resetTime: Date,
    limit: number
  ): Promise<boolean> {
    const key = provider;
    const ttl = Math.max(60, Math.floor((resetTime.getTime() - Date.now()) / 1000));
    
    const rateLimitData = {
      provider,
      remaining,
      resetTime: resetTime.toISOString(),
      limit,
      timestamp: Date.now(),
    };

    return await this.cache.set(this.NAMESPACES.RATE_LIMITS, key, rateLimitData, ttl);
  }

  /**
   * Get cached rate limit information
   */
  public async getCachedRateLimit(provider: string): Promise<{
    remaining: number;
    resetTime: Date;
    limit: number;
  } | null> {
    const data = await this.cache.get(this.NAMESPACES.RATE_LIMITS, provider);
    
    if (data) {
      return {
        remaining: data.remaining,
        resetTime: new Date(data.resetTime),
        limit: data.limit,
      };
    }
    
    return null;
  }

  /**
   * Add to search history
   */
  public async addToSearchHistory(
    userId: string,
    trackingNumber: string,
    searchData?: any
  ): Promise<boolean> {
    const key = `user:${userId}`;
    const searchEntry = {
      trackingNumber,
      timestamp: Date.now(),
      data: searchData,
    };

    // Get existing history
    const existingHistory = await this.cache.get<any[]>(this.NAMESPACES.SEARCH_HISTORY, key) || [];
    
    // Remove duplicate if exists
    const filteredHistory = existingHistory.filter(
      entry => entry.trackingNumber !== trackingNumber
    );
    
    // Add new entry at the beginning
    const updatedHistory = [searchEntry, ...filteredHistory].slice(0, 50); // Keep last 50 searches
    
    return await this.cache.set(
      this.NAMESPACES.SEARCH_HISTORY,
      key,
      updatedHistory,
      this.TTL.SEARCH_HISTORY
    );
  }

  /**
   * Get search history
   */
  public async getSearchHistory(userId: string, limit: number = 10): Promise<any[]> {
    const key = `user:${userId}`;
    const history = await this.cache.get<any[]>(this.NAMESPACES.SEARCH_HISTORY, key) || [];
    
    return history.slice(0, limit);
  }

  /**
   * Cache popular routes
   */
  public async cachePopularRoutes(routes: any[]): Promise<boolean> {
    return await this.cache.set(
      this.NAMESPACES.POPULAR_ROUTES,
      'global',
      routes,
      this.TTL.POPULAR_ROUTES
    );
  }

  /**
   * Get popular routes
   */
  public async getPopularRoutes(): Promise<any[]> {
    return await this.cache.get<any[]>(this.NAMESPACES.POPULAR_ROUTES, 'global') || [];
  }

  /**
   * Cache carrier status
   */
  public async cacheCarrierStatus(
    carrier: string,
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    error?: string
  ): Promise<boolean> {
    const statusData = {
      carrier,
      status,
      responseTime,
      error,
      timestamp: Date.now(),
    };

    return await this.cache.set(
      this.NAMESPACES.CARRIER_STATUS,
      carrier,
      statusData,
      this.TTL.CARRIER_STATUS
    );
  }

  /**
   * Get carrier status
   */
  public async getCarrierStatus(carrier: string): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    error?: string;
    timestamp: number;
  } | null> {
    return await this.cache.get(this.NAMESPACES.CARRIER_STATUS, carrier);
  }

  /**
   * Cache vessel information
   */
  public async cacheVesselInfo(
    vesselId: string,
    vesselInfo: any
  ): Promise<boolean> {
    return await this.cache.set(
      this.NAMESPACES.VESSEL_INFO,
      vesselId,
      vesselInfo,
      this.TTL.VESSEL_INFO
    );
  }

  /**
   * Get vessel information
   */
  public async getVesselInfo(vesselId: string): Promise<any | null> {
    return await this.cache.get(this.NAMESPACES.VESSEL_INFO, vesselId);
  }

  /**
   * Batch cache multiple tracking data
   */
  public async batchCacheTrackingData(
    trackingDataMap: Record<string, ShipmentTracking>,
    customTTL?: number
  ): Promise<boolean> {
    const ttl = customTTL || this.TTL.TRACKING_DATA;
    const cacheMap: Record<string, any> = {};

    Object.entries(trackingDataMap).forEach(([trackingNumber, data]) => {
      const key = this.generateTrackingKey(trackingNumber);
      cacheMap[key] = {
        ...data,
        _cached: {
          timestamp: Date.now(),
          ttl,
          key,
        },
      };
    });

    return await this.cache.setMultiple(this.NAMESPACES.TRACKING, cacheMap, ttl);
  }

  /**
   * Batch get multiple tracking data
   */
  public async batchGetTrackingData(
    trackingNumbers: string[]
  ): Promise<Record<string, ShipmentTracking | null>> {
    const keys = trackingNumbers.map(num => this.generateTrackingKey(num));
    const cachedData = await this.cache.getMultiple<ShipmentTracking>(
      this.NAMESPACES.TRACKING,
      keys
    );

    const result: Record<string, ShipmentTracking | null> = {};
    
    trackingNumbers.forEach((trackingNumber, index) => {
      const key = keys[index];
      const data = cachedData[key];
      
      if (data) {
        // Remove cache metadata
        const { _cached, ...cleanData } = data as any;
        result[trackingNumber] = cleanData;
      } else {
        result[trackingNumber] = null;
      }
    });

    return result;
  }

  /**
   * Invalidate tracking cache
   */
  public async invalidateTrackingCache(trackingNumber: string): Promise<boolean> {
    const key = this.generateTrackingKey(trackingNumber);
    return await this.cache.delete(this.NAMESPACES.TRACKING, key);
  }

  /**
   * Invalidate all API responses for a tracking number
   */
  public async invalidateAPIResponses(trackingNumber: string): Promise<number> {
    const pattern = `*:${this.generateTrackingKey(trackingNumber)}`;
    // Note: This is a simplified approach. In production, you might want to maintain
    // a separate index of keys for more efficient pattern-based deletion
    return 0; // Placeholder - implement pattern-based deletion if needed
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    redis: any;
    namespaces: Record<string, number>;
  }> {
    const redisStats = await this.cache.getStats();
    
    // Count keys in each namespace (simplified approach)
    const namespaceStats: Record<string, number> = {};
    
    for (const [name, namespace] of Object.entries(this.NAMESPACES)) {
      // This is a placeholder - implement actual key counting if needed
      namespaceStats[name] = 0;
    }

    return {
      redis: redisStats,
      namespaces: namespaceStats,
    };
  }

  /**
   * Warm cache with popular tracking numbers
   */
  public async warmCache(popularTrackingNumbers: string[]): Promise<void> {
    // This would typically fetch data for popular tracking numbers
    // and cache them proactively
    console.log(`Warming cache for ${popularTrackingNumbers.length} tracking numbers`);
    
    // Implementation would depend on your data sources
    // For now, this is a placeholder
  }

  /**
   * Clear all tracking-related cache
   */
  public async clearAllCache(): Promise<number> {
    let totalCleared = 0;
    
    for (const namespace of Object.values(this.NAMESPACES)) {
      const cleared = await this.cache.clearNamespace(namespace);
      totalCleared += cleared;
    }
    
    return totalCleared;
  }

  /**
   * Clear cache for specific namespace
   */
  public async clearNamespaceCache(namespaceName: keyof typeof this.NAMESPACES): Promise<number> {
    const namespace = this.NAMESPACES[namespaceName];
    return await this.cache.clearNamespace(namespace);
  }

  /**
   * Generate standardized tracking key
   */
  private generateTrackingKey(trackingNumber: string): string {
    return trackingNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Check if tracking data is fresh (not expired)
   */
  public async isTrackingDataFresh(
    trackingNumber: string,
    maxAgeMinutes: number = 15
  ): Promise<boolean> {
    const key = this.generateTrackingKey(trackingNumber);
    const ttl = await this.cache.getTTL(this.NAMESPACES.TRACKING, key);
    
    if (ttl <= 0) {
      return false; // Key doesn't exist or has expired
    }
    
    const maxAgeSeconds = maxAgeMinutes * 60;
    const originalTTL = this.TTL.TRACKING_DATA;
    const ageSeconds = originalTTL - ttl;
    
    return ageSeconds <= maxAgeSeconds;
  }

  /**
   * Extend cache TTL for tracking data
   */
  public async extendTrackingCacheTTL(
    trackingNumber: string,
    additionalSeconds: number
  ): Promise<boolean> {
    const key = this.generateTrackingKey(trackingNumber);
    const currentTTL = await this.cache.getTTL(this.NAMESPACES.TRACKING, key);
    
    if (currentTTL <= 0) {
      return false; // Key doesn't exist
    }
    
    const newTTL = currentTTL + additionalSeconds;
    return await this.cache.setTTL(this.NAMESPACES.TRACKING, key, newTTL);
  }
}

export default TrackingCacheService;