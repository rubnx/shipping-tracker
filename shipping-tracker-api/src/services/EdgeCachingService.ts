import { advancedCachingService } from './AdvancedCachingService';
import { loggingService } from './LoggingService';

export interface EdgeCacheConfig {
  enabled: boolean;
  regions: string[];
  defaultTTL: number;
  maxSize: number;
  compressionEnabled: boolean;
  geoDistribution: boolean;
}

export interface CacheWarmupStrategy {
  popular: boolean;
  predictive: boolean;
  scheduled: boolean;
  userBased: boolean;
}

export interface EdgeLocation {
  region: string;
  endpoint: string;
  latency: number;
  hitRate: number;
  capacity: number;
  usage: number;
}

class EdgeCachingService {
  private config: EdgeCacheConfig;
  private edgeLocations: Map<string, EdgeLocation> = new Map();
  private warmupPatterns: Map<string, number> = new Map();
  private userLocationCache: Map<string, string> = new Map();

  constructor() {
    this.config = {
      enabled: process.env.EDGE_CACHE_ENABLED === 'true',
      regions: (process.env.EDGE_CACHE_REGIONS || 'us-east,us-west,eu-west,asia-pacific').split(','),
      defaultTTL: parseInt(process.env.EDGE_CACHE_TTL || '1800'), // 30 minutes
      maxSize: parseInt(process.env.EDGE_CACHE_MAX_SIZE || '1073741824'), // 1GB
      compressionEnabled: process.env.EDGE_CACHE_COMPRESSION === 'true',
      geoDistribution: process.env.EDGE_GEO_DISTRIBUTION === 'true',
    };

    this.initializeEdgeLocations();
    this.startWarmupScheduler();
  }

  private initializeEdgeLocations(): void {
    const locations = [
      { region: 'us-east', endpoint: 'cache-us-east.example.com', latency: 50 },
      { region: 'us-west', endpoint: 'cache-us-west.example.com', latency: 45 },
      { region: 'eu-west', endpoint: 'cache-eu-west.example.com', latency: 60 },
      { region: 'asia-pacific', endpoint: 'cache-ap.example.com', latency: 80 },
    ];

    for (const location of locations) {
      if (this.config.regions.includes(location.region)) {
        this.edgeLocations.set(location.region, {
          ...location,
          hitRate: 0,
          capacity: this.config.maxSize,
          usage: 0,
        });
      }
    }

    loggingService.info('Edge cache locations initialized', {
      regions: Array.from(this.edgeLocations.keys()),
    });
  }

  public async getFromEdge<T>(
    key: string,
    userRegion?: string
  ): Promise<{ data: T | null; region: string; fromEdge: boolean }> {
    if (!this.config.enabled) {
      const data = await advancedCachingService.get<T>(key);
      return { data, region: 'origin', fromEdge: false };
    }

    const targetRegion = this.selectOptimalRegion(userRegion);
    const edgeLocation = this.edgeLocations.get(targetRegion);

    if (!edgeLocation) {
      // Fallback to origin cache
      const data = await advancedCachingService.get<T>(key);
      return { data, region: 'origin', fromEdge: false };
    }

    try {
      // Simulate edge cache lookup
      const edgeKey = `edge:${targetRegion}:${key}`;
      const data = await advancedCachingService.get<T>(edgeKey);

      if (data) {
        edgeLocation.hitRate = (edgeLocation.hitRate * 0.9) + (1 * 0.1); // Moving average
        return { data, region: targetRegion, fromEdge: true };
      }

      // Cache miss - fetch from origin and populate edge
      const originData = await advancedCachingService.get<T>(key);
      if (originData) {
        await this.setToEdge(key, originData, targetRegion);
      }

      return { data: originData, region: targetRegion, fromEdge: false };
    } catch (error) {
      loggingService.error('Edge cache get error', error as Error, { key, region: targetRegion });
      
      // Fallback to origin
      const data = await advancedCachingService.get<T>(key);
      return { data, region: 'origin', fromEdge: false };
    }
  }

  public async setToEdge<T>(
    key: string,
    data: T,
    region?: string,
    ttl: number = this.config.defaultTTL
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return advancedCachingService.set(key, data, ttl);
    }

    const regions = region ? [region] : Array.from(this.edgeLocations.keys());
    const results: boolean[] = [];

    for (const reg of regions) {
      try {
        const edgeKey = `edge:${reg}:${key}`;
        const success = await advancedCachingService.set(
          edgeKey,
          data,
          ttl,
          ['edge', reg, 'distributed']
        );
        results.push(success);

        if (success) {
          const location = this.edgeLocations.get(reg);
          if (location) {
            location.usage += this.estimateDataSize(data);
          }
        }
      } catch (error) {
        loggingService.error('Edge cache set error', error as Error, { key, region: reg });
        results.push(false);
      }
    }

    return results.some(Boolean);
  }

  private selectOptimalRegion(userRegion?: string): string {
    if (!this.config.geoDistribution || !userRegion) {
      // Return region with lowest latency
      return Array.from(this.edgeLocations.entries())
        .sort(([, a], [, b]) => a.latency - b.latency)[0][0];
    }

    // Try to match user region
    if (this.edgeLocations.has(userRegion)) {
      return userRegion;
    }

    // Find closest region based on simple mapping
    const regionMapping: Record<string, string> = {
      'us': 'us-east',
      'canada': 'us-east',
      'europe': 'eu-west',
      'uk': 'eu-west',
      'asia': 'asia-pacific',
      'australia': 'asia-pacific',
    };

    const mappedRegion = regionMapping[userRegion.toLowerCase()];
    if (mappedRegion && this.edgeLocations.has(mappedRegion)) {
      return mappedRegion;
    }

    // Default to lowest latency
    return Array.from(this.edgeLocations.entries())
      .sort(([, a], [, b]) => a.latency - b.latency)[0][0];
  }

  public async warmupEdgeCache(strategy: CacheWarmupStrategy): Promise<void> {
    loggingService.info('Starting edge cache warmup', strategy);

    if (strategy.popular) {
      await this.warmupPopularContent();
    }

    if (strategy.predictive) {
      await this.warmupPredictiveContent();
    }

    if (strategy.userBased) {
      await this.warmupUserBasedContent();
    }

    loggingService.info('Edge cache warmup completed');
  }

  private async warmupPopularContent(): Promise<void> {
    const popularKeys = [
      'tracking:DEMO123456789',
      'tracking:BOOK123456789',
      'tracking:BOL123456789',
      'carriers:list',
      'ports:major',
    ];

    for (const key of popularKeys) {
      try {
        const data = await advancedCachingService.get(key);
        if (data) {
          await this.setToEdge(key, data);
          this.warmupPatterns.set(key, (this.warmupPatterns.get(key) || 0) + 1);
        }
      } catch (error) {
        loggingService.warn('Popular content warmup failed', { key, error });
      }
    }
  }

  private async warmupPredictiveContent(): Promise<void> {
    // Analyze patterns and predict what might be requested
    const patterns = Array.from(this.warmupPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    for (const [pattern] of patterns) {
      // Generate related keys based on pattern
      const relatedKeys = this.generateRelatedKeys(pattern);
      
      for (const key of relatedKeys) {
        try {
          const data = await advancedCachingService.get(key);
          if (data) {
            await this.setToEdge(key, data, undefined, this.config.defaultTTL * 2);
          }
        } catch (error) {
          loggingService.debug('Predictive warmup failed', { key, error });
        }
      }
    }
  }

  private async warmupUserBasedContent(): Promise<void> {
    // Warmup content based on user location patterns
    const locationPatterns = Array.from(this.userLocationCache.entries());
    
    for (const [userId, region] of locationPatterns) {
      const userSpecificKeys = [
        `user:${userId}:preferences`,
        `user:${userId}:history`,
      ];

      for (const key of userSpecificKeys) {
        try {
          const data = await advancedCachingService.get(key);
          if (data) {
            await this.setToEdge(key, data, region);
          }
        } catch (error) {
          loggingService.debug('User-based warmup failed', { key, userId, error });
        }
      }
    }
  }

  private generateRelatedKeys(pattern: string): string[] {
    const related: string[] = [];
    
    if (pattern.startsWith('tracking:')) {
      const trackingNumber = pattern.split(':')[1];
      related.push(
        `vessel:${trackingNumber}`,
        `route:${trackingNumber}`,
        `timeline:${trackingNumber}`
      );
    }

    return related;
  }

  public async invalidateEdgeCache(key: string, regions?: string[]): Promise<number> {
    const targetRegions = regions || Array.from(this.edgeLocations.keys());
    let invalidated = 0;

    for (const region of targetRegions) {
      try {
        const edgeKey = `edge:${region}:${key}`;
        const success = await advancedCachingService.del(edgeKey);
        if (success) {
          invalidated++;
        }
      } catch (error) {
        loggingService.error('Edge cache invalidation failed', error as Error, {
          key,
          region,
        });
      }
    }

    loggingService.info('Edge cache invalidated', { key, regions: targetRegions, invalidated });
    return invalidated;
  }

  public async getEdgeStats(): Promise<{
    locations: EdgeLocation[];
    totalHitRate: number;
    totalUsage: number;
    totalCapacity: number;
    warmupPatterns: Array<{ key: string; count: number }>;
  }> {
    const locations = Array.from(this.edgeLocations.values());
    const totalHitRate = locations.reduce((sum, loc) => sum + loc.hitRate, 0) / locations.length;
    const totalUsage = locations.reduce((sum, loc) => sum + loc.usage, 0);
    const totalCapacity = locations.reduce((sum, loc) => sum + loc.capacity, 0);

    const warmupPatterns = Array.from(this.warmupPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    return {
      locations,
      totalHitRate,
      totalUsage,
      totalCapacity,
      warmupPatterns,
    };
  }

  private estimateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private startWarmupScheduler(): void {
    if (!this.config.enabled) return;

    // Schedule warmup every 6 hours
    setInterval(() => {
      this.warmupEdgeCache({
        popular: true,
        predictive: true,
        scheduled: true,
        userBased: false,
      });
    }, 6 * 60 * 60 * 1000);
  }

  public trackUserLocation(userId: string, region: string): void {
    this.userLocationCache.set(userId, region);
    
    // Keep only recent user locations (last 1000)
    if (this.userLocationCache.size > 1000) {
      const entries = Array.from(this.userLocationCache.entries());
      this.userLocationCache.clear();
      entries.slice(-1000).forEach(([id, reg]) => {
        this.userLocationCache.set(id, reg);
      });
    }
  }

  public createEdgeCacheMiddleware() {
    return async (req: any, res: any, next: any) => {
      if (!this.config.enabled || req.method !== 'GET') {
        return next();
      }

      const cacheKey = `http:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      const userRegion = req.headers['cf-ipcountry'] || req.headers['x-user-region'];

      try {
        const result = await this.getFromEdge(cacheKey, userRegion);
        
        if (result.data) {
          res.setHeader('X-Cache', result.fromEdge ? 'HIT-EDGE' : 'HIT-ORIGIN');
          res.setHeader('X-Cache-Region', result.region);
          return res.json(result.data);
        }

        // Cache miss - continue to handler and cache response
        const originalSend = res.json;
        res.json = (data: any) => {
          // Cache the response
          this.setToEdge(cacheKey, data, userRegion, this.config.defaultTTL);
          res.setHeader('X-Cache', 'MISS');
          return originalSend.call(res, data);
        };

        next();
      } catch (error) {
        loggingService.error('Edge cache middleware error', error as Error);
        next();
      }
    };
  }

  public updateConfig(newConfig: Partial<EdgeCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    loggingService.info('Edge cache configuration updated', newConfig);
  }

  public async healthCheck(): Promise<{
    enabled: boolean;
    regions: number;
    totalHitRate: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    if (!this.config.enabled) {
      issues.push('Edge caching is disabled');
    }

    if (this.edgeLocations.size === 0) {
      issues.push('No edge locations configured');
    }

    const stats = await this.getEdgeStats();
    
    if (stats.totalHitRate < 0.5) {
      issues.push('Low hit rate across edge locations');
    }

    return {
      enabled: this.config.enabled,
      regions: this.edgeLocations.size,
      totalHitRate: stats.totalHitRate,
      issues,
    };
  }
}

export const edgeCachingService = new EdgeCachingService();