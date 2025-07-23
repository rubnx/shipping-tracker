import Redis from 'ioredis';
import { loggingService } from './LoggingService';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; hits: number; size: number }>;
  tagStats: Record<string, number>;
}

export interface CacheConfig {
  defaultTTL: number;
  maxMemory: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enableAnalytics: boolean;
  warmupEnabled: boolean;
}

class AdvancedCachingService {
  private redis: Redis;
  private localCache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  
  private config: CacheConfig = {
    defaultTTL: 300, // 5 minutes
    maxMemory: 100 * 1024 * 1024, // 100MB
    compressionThreshold: 1024, // 1KB
    enableCompression: true,
    enableAnalytics: true,
    warmupEnabled: true,
  };

  private popularKeys: Map<string, number> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeRedis();
    this.startAnalytics();
    this.startCleanupScheduler();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      loggingService.info('Connected to Redis cache');
    });

    this.redis.on('error', (error) => {
      loggingService.error('Redis connection error', error);
    });

    this.redis.on('ready', () => {
      loggingService.info('Redis cache ready');
      if (this.config.warmupEnabled) {
        this.warmupCache();
      }
    });
  }

  private async warmupCache(): Promise<void> {
    loggingService.info('Starting cache warmup...');
    
    // Warm up frequently accessed data
    const popularTrackingNumbers = [
      'DEMO123456789',
      'BOOK123456789',
      'BOL123456789',
    ];

    for (const trackingNumber of popularTrackingNumbers) {
      try {
        // This would typically fetch from your data source
        const mockData = {
          trackingNumber,
          status: 'In Transit',
          lastUpdated: new Date().toISOString(),
        };
        
        await this.set(`tracking:${trackingNumber}`, mockData, 3600, ['tracking', 'popular']);
      } catch (error) {
        loggingService.warn('Cache warmup failed for key', { trackingNumber, error });
      }
    }

    loggingService.info('Cache warmup completed');
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      // Try local cache first (L1)
      const localEntry = this.localCache.get(key);
      if (localEntry && !this.isExpired(localEntry)) {
        localEntry.hits++;
        localEntry.lastAccessed = Date.now();
        this.stats.hits++;
        this.updatePopularity(key);
        return localEntry.data as T;
      }

      // Try Redis cache (L2)
      const redisData = await this.redis.get(key);
      if (redisData) {
        const entry: CacheEntry<T> = JSON.parse(redisData);
        
        if (!this.isExpired(entry)) {
          entry.hits++;
          entry.lastAccessed = Date.now();
          
          // Update Redis with new stats
          await this.redis.setex(key, entry.ttl, JSON.stringify(entry));
          
          // Store in local cache for faster access
          this.localCache.set(key, entry);
          this.enforceLocalCacheSize();
          
          this.stats.hits++;
          this.updatePopularity(key);
          return entry.data;
        } else {
          // Remove expired entry
          await this.redis.del(key);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      loggingService.error('Cache get error', error as Error, { key });
      this.stats.misses++;
      return null;
    }
  }

  public async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL,
    tags: string[] = [],
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        lastAccessed: Date.now(),
        tags,
        metadata,
      };

      const serialized = JSON.stringify(entry);
      
      // Compress if data is large
      const finalData = this.config.enableCompression && 
                       serialized.length > this.config.compressionThreshold
                       ? await this.compress(serialized)
                       : serialized;

      // Store in Redis
      await this.redis.setex(key, ttl, finalData);
      
      // Store in local cache
      this.localCache.set(key, entry);
      this.enforceLocalCacheSize();
      
      // Update tag index
      this.updateTagIndex(key, tags);
      
      this.stats.sets++;
      loggingService.debug('Cache set', { key, ttl, tags, size: serialized.length });
      
      return true;
    } catch (error) {
      loggingService.error('Cache set error', error as Error, { key });
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      // Remove from local cache
      const localEntry = this.localCache.get(key);
      if (localEntry) {
        this.removeFromTagIndex(key, localEntry.tags);
        this.localCache.delete(key);
      }

      // Remove from Redis
      const result = await this.redis.del(key);
      
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      loggingService.error('Cache delete error', error as Error, { key });
      return false;
    }
  }

  public async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = this.tagIndex.get(tag);
      if (!keys || keys.size === 0) {
        return 0;
      }

      let invalidated = 0;
      for (const key of keys) {
        if (await this.del(key)) {
          invalidated++;
        }
      }

      this.tagIndex.delete(tag);
      loggingService.info(`Invalidated ${invalidated} cache entries with tag: ${tag}`);
      
      return invalidated;
    } catch (error) {
      loggingService.error('Cache tag invalidation error', error as Error, { tag });
      return 0;
    }
  }

  public async mget<T>(keys: string[]): Promise<Array<T | null>> {
    const results: Array<T | null> = [];
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }
    
    return results;
  }

  public async mset<T>(entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const cacheEntry: CacheEntry<T> = {
          data: entry.data,
          timestamp: Date.now(),
          ttl: entry.ttl || this.config.defaultTTL,
          hits: 0,
          lastAccessed: Date.now(),
          tags: entry.tags || [],
        };

        const serialized = JSON.stringify(cacheEntry);
        pipeline.setex(entry.key, cacheEntry.ttl, serialized);
        
        // Update local cache
        this.localCache.set(entry.key, cacheEntry);
        this.updateTagIndex(entry.key, cacheEntry.tags);
      }

      await pipeline.exec();
      this.enforceLocalCacheSize();
      
      return true;
    } catch (error) {
      loggingService.error('Cache mset error', error as Error);
      return false;
    }
  }

  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.config.defaultTTL,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl, tags);
    return data;
  }

  public async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.config.defaultTTL,
    tags: string[] = []
  ): Promise<T> {
    const data = await fetcher();
    await this.set(key, data, ttl, tags);
    return data;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  private updatePopularity(key: string): void {
    if (!this.config.enableAnalytics) return;
    
    const current = this.popularKeys.get(key) || 0;
    this.popularKeys.set(key, current + 1);
  }

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private enforceLocalCacheSize(): void {
    const maxEntries = Math.floor(this.config.maxMemory / 1024); // Rough estimate
    
    if (this.localCache.size > maxEntries) {
      // Remove least recently used entries
      const entries = Array.from(this.localCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = entries.slice(0, this.localCache.size - maxEntries);
      for (const [key, entry] of toRemove) {
        this.removeFromTagIndex(key, entry.tags);
        this.localCache.delete(key);
      }
    }
  }

  private async compress(data: string): Promise<string> {
    // Simple compression placeholder - in production, use zlib or similar
    return data;
  }

  private startAnalytics(): void {
    if (!this.config.enableAnalytics) return;

    setInterval(() => {
      this.logAnalytics();
    }, 60000); // Every minute
  }

  private startCleanupScheduler(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // Every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.localCache.entries()) {
      if (this.isExpired(entry)) {
        this.removeFromTagIndex(key, entry.tags);
        this.localCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      loggingService.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  private logAnalytics(): void {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    
    loggingService.info('Cache analytics', {
      hitRate: hitRate.toFixed(2) + '%',
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      localCacheSize: this.localCache.size,
      popularKeysCount: this.popularKeys.size,
      tagsCount: this.tagIndex.size,
    });
  }

  public async getStats(): Promise<CacheStats> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;

    // Get top keys by popularity
    const topKeys = Array.from(this.popularKeys.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, hits]) => ({
        key,
        hits,
        size: JSON.stringify(this.localCache.get(key)?.data || {}).length,
      }));

    // Get tag statistics
    const tagStats: Record<string, number> = {};
    for (const [tag, keys] of this.tagIndex.entries()) {
      tagStats[tag] = keys.size;
    }

    return {
      totalKeys: this.localCache.size,
      hitRate,
      missRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.estimateMemoryUsage(),
      topKeys,
      tagStats,
    };
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.localCache.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    return totalSize;
  }

  public async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall();
      this.localCache.clear();
      this.popularKeys.clear();
      this.tagIndex.clear();
      
      // Reset stats
      this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      
      loggingService.info('Cache flushed');
      return true;
    } catch (error) {
      loggingService.error('Cache flush error', error as Error);
      return false;
    }
  }

  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    loggingService.info('Cache configuration updated', newConfig);
  }

  public async healthCheck(): Promise<{
    redis: boolean;
    localCache: boolean;
    stats: any;
  }> {
    let redisHealthy = false;
    
    try {
      await this.redis.ping();
      redisHealthy = true;
    } catch (error) {
      loggingService.error('Redis health check failed', error as Error);
    }

    return {
      redis: redisHealthy,
      localCache: this.localCache.size >= 0, // Always true if accessible
      stats: await this.getStats(),
    };
  }

  public cleanup(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
    this.localCache.clear();
    this.popularKeys.clear();
    this.tagIndex.clear();
  }
}

export const advancedCachingService = new AdvancedCachingService();