import { APIAggregator } from './APIAggregator';
import { SmartContainerRouter } from './SmartContainerRouter';
import { RawTrackingData, TrackingType } from '../types';
export interface CacheEntry {
    data: RawTrackingData;
    timestamp: Date;
    ttl: number;
    accessCount: number;
    lastAccessed: Date;
    provider: string;
    trackingNumber: string;
}
export interface BatchRequest {
    id: string;
    trackingNumber: string;
    trackingType: TrackingType;
    priority: 'high' | 'medium' | 'low';
    timestamp: Date;
    resolve: (data: RawTrackingData[]) => void;
    reject: (error: Error) => void;
}
export interface PerformanceMetrics {
    cacheHitRate: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    batchEfficiency: number;
    costSavings: number;
    totalRequests: number;
    cachedRequests: number;
    batchedRequests: number;
    providerUsage: Record<string, number>;
    performanceTrends: Array<{
        timestamp: Date;
        responseTime: number;
        cacheHitRate: number;
        requestCount: number;
    }>;
}
export interface OptimizationRecommendation {
    type: 'cache_ttl' | 'batch_size' | 'provider_priority' | 'request_throttling';
    priority: 'high' | 'medium' | 'low';
    description: string;
    currentValue: any;
    recommendedValue: any;
    expectedImprovement: string;
    implementation: string;
}
/**
 * Container Tracking Performance Optimizer
 * Implements intelligent caching, request batching, and API call optimization
 * Requirements 7.3, 9.1, 9.2 for performance optimization
 */
export declare class PerformanceOptimizer {
    private cache;
    private batchQueue;
    private performanceHistory;
    private aggregator;
    private smartRouter;
    private readonly defaultTTL;
    private readonly maxCacheSize;
    private readonly batchSize;
    private readonly batchTimeout;
    private readonly cleanupInterval;
    private requestCount;
    private cacheHits;
    private batchedRequestCount;
    private totalResponseTime;
    private startTime;
    constructor(aggregator: APIAggregator, smartRouter: SmartContainerRouter);
    /**
     * Optimized tracking with intelligent caching and batching
     */
    trackWithOptimization(trackingNumber: string, trackingType?: TrackingType, options?: {
        forceFresh?: boolean;
        priority?: 'high' | 'medium' | 'low';
        maxAge?: number;
    }): Promise<RawTrackingData[]>;
    /**
     * Batch multiple tracking requests for efficiency
     */
    trackMultiple(requests: Array<{
        trackingNumber: string;
        trackingType?: TrackingType;
    }>, options?: {
        maxConcurrency?: number;
        prioritizeCache?: boolean;
    }): Promise<Map<string, RawTrackingData[]>>;
    /**
     * Get cached data if available and not expired
     */
    private getCachedData;
    /**
     * Cache tracking results with intelligent TTL
     */
    private cacheResults;
    /**
     * Calculate intelligent TTL based on data characteristics
     */
    private calculateIntelligentTTL;
    /**
     * Add request to batch queue
     */
    private addToBatch;
    /**
     * Process a batch of requests
     */
    private processBatch;
    /**
     * Group batch requests by optimal provider
     */
    private groupByOptimalProvider;
    /**
     * Update access statistics for cache entry
     */
    private updateAccessStats;
    /**
     * Evict least recently used cache entries
     */
    private evictLRU;
    /**
     * Generate cache key
     */
    private generateCacheKey;
    /**
     * Chunk array into smaller arrays
     */
    private chunkArray;
    /**
     * Start cleanup timer for expired cache entries
     */
    private startCleanupTimer;
    /**
     * Clean up expired cache entries
     */
    private cleanupExpiredEntries;
    /**
     * Start performance tracking
     */
    private startPerformanceTracking;
    /**
     * Record current performance metrics
     */
    private recordPerformanceMetrics;
    /**
     * Calculate cost savings from optimization
     */
    private calculateCostSavings;
    /**
     * Get provider usage statistics
     */
    private getProviderUsage;
    /**
     * Get performance trends
     */
    private getPerformanceTrends;
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics;
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(): OptimizationRecommendation[];
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        totalHits: number;
        totalRequests: number;
        averageAge: number;
        topProviders: Array<{
            provider: string;
            count: number;
        }>;
    };
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Warm up cache with common tracking numbers
     */
    warmUpCache(trackingNumbers: string[]): Promise<void>;
}
//# sourceMappingURL=PerformanceOptimizer.d.ts.map