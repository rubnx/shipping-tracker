"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceOptimizer = void 0;
/**
 * Container Tracking Performance Optimizer
 * Implements intelligent caching, request batching, and API call optimization
 * Requirements 7.3, 9.1, 9.2 for performance optimization
 */
class PerformanceOptimizer {
    constructor(aggregator, smartRouter) {
        this.cache = new Map();
        this.batchQueue = new Map();
        this.performanceHistory = [];
        // Configuration
        this.defaultTTL = 15 * 60 * 1000; // 15 minutes
        this.maxCacheSize = 10000;
        this.batchSize = 10;
        this.batchTimeout = 2000; // 2 seconds
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        // Performance tracking
        this.requestCount = 0;
        this.cacheHits = 0;
        this.batchedRequestCount = 0;
        this.totalResponseTime = 0;
        this.startTime = Date.now();
        this.aggregator = aggregator;
        this.smartRouter = smartRouter;
        this.startCleanupTimer();
        this.startPerformanceTracking();
    }
    /**
     * Optimized tracking with intelligent caching and batching
     */
    async trackWithOptimization(trackingNumber, trackingType, options = {}) {
        const startTime = Date.now();
        this.requestCount++;
        try {
            // Check cache first (unless forced fresh)
            if (!options.forceFresh) {
                const cached = this.getCachedData(trackingNumber, trackingType);
                if (cached) {
                    this.cacheHits++;
                    this.updateAccessStats(cached);
                    console.log(`📦 Cache hit for ${trackingNumber} (age: ${Date.now() - cached.timestamp.getTime()}ms)`);
                    return [cached.data];
                }
            }
            // Use batching for non-high priority requests
            if (options.priority !== 'high') {
                return this.addToBatch(trackingNumber, trackingType || 'container', options.priority || 'medium');
            }
            // Direct API call for high priority requests
            const results = await this.aggregator.fetchFromMultipleSources(trackingNumber, trackingType, 'premium', // Use premium tier for high priority
            false // Don't optimize cost for high priority
            );
            // Cache the results
            this.cacheResults(trackingNumber, trackingType, results);
            const responseTime = Date.now() - startTime;
            this.totalResponseTime += responseTime;
            console.log(`⚡ Direct API call for ${trackingNumber} completed in ${responseTime}ms`);
            return results;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.totalResponseTime += responseTime;
            throw error;
        }
    }
    /**
     * Batch multiple tracking requests for efficiency
     */
    async trackMultiple(requests, options = {}) {
        const { maxConcurrency = 5, prioritizeCache = true } = options;
        const results = new Map();
        const uncachedRequests = [];
        // Check cache for all requests first
        if (prioritizeCache) {
            for (const request of requests) {
                const cached = this.getCachedData(request.trackingNumber, request.trackingType);
                if (cached) {
                    results.set(request.trackingNumber, [cached.data]);
                    this.cacheHits++;
                }
                else {
                    uncachedRequests.push(request);
                }
            }
        }
        else {
            uncachedRequests.push(...requests);
        }
        console.log(`📊 Batch processing: ${results.size} from cache, ${uncachedRequests.length} from API`);
        // Process uncached requests in batches
        const batches = this.chunkArray(uncachedRequests, maxConcurrency);
        for (const batch of batches) {
            const batchPromises = batch.map(async (request) => {
                try {
                    const data = await this.aggregator.fetchFromMultipleSources(request.trackingNumber, request.trackingType);
                    this.cacheResults(request.trackingNumber, request.trackingType, data);
                    return { trackingNumber: request.trackingNumber, data };
                }
                catch (error) {
                    console.error(`❌ Batch request failed for ${request.trackingNumber}:`, error);
                    return { trackingNumber: request.trackingNumber, data: [] };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(result => {
                results.set(result.trackingNumber, result.data);
            });
            this.batchedRequestCount += batch.length;
        }
        return results;
    }
    /**
     * Get cached data if available and not expired
     */
    getCachedData(trackingNumber, trackingType) {
        const cacheKey = this.generateCacheKey(trackingNumber, trackingType);
        const entry = this.cache.get(cacheKey);
        if (!entry) {
            return null;
        }
        // Check if expired
        const age = Date.now() - entry.timestamp.getTime();
        if (age > entry.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }
        return entry;
    }
    /**
     * Cache tracking results with intelligent TTL
     */
    cacheResults(trackingNumber, trackingType, results) {
        if (results.length === 0)
            return;
        const primaryResult = results[0];
        const cacheKey = this.generateCacheKey(trackingNumber, trackingType);
        // Intelligent TTL based on data freshness and provider reliability
        const intelligentTTL = this.calculateIntelligentTTL(primaryResult);
        const entry = {
            data: primaryResult,
            timestamp: new Date(),
            ttl: intelligentTTL,
            accessCount: 1,
            lastAccessed: new Date(),
            provider: primaryResult.provider,
            trackingNumber
        };
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxCacheSize) {
            this.evictLRU();
        }
        this.cache.set(cacheKey, entry);
        console.log(`💾 Cached ${trackingNumber} from ${primaryResult.provider} (TTL: ${intelligentTTL / 1000}s)`);
    }
    /**
     * Calculate intelligent TTL based on data characteristics
     */
    calculateIntelligentTTL(data) {
        let baseTTL = this.defaultTTL;
        // Adjust based on provider reliability
        const reliabilityMultiplier = data.reliability > 0.9 ? 1.5 : data.reliability > 0.8 ? 1.2 : 1.0;
        // Adjust based on data freshness
        const dataAge = data.timestamp ? Date.now() - data.timestamp.getTime() : 0;
        const freshnessMultiplier = dataAge < 60000 ? 1.3 : dataAge < 300000 ? 1.1 : 0.8;
        // Adjust based on shipment status (completed shipments can be cached longer)
        const statusMultiplier = data.data?.status === 'Delivered' ? 2.0 :
            data.data?.status === 'In Transit' ? 0.8 : 1.0;
        const intelligentTTL = baseTTL * reliabilityMultiplier * freshnessMultiplier * statusMultiplier;
        // Ensure TTL is within reasonable bounds
        return Math.max(5 * 60 * 1000, Math.min(60 * 60 * 1000, intelligentTTL)); // 5 minutes to 1 hour
    }
    /**
     * Add request to batch queue
     */
    async addToBatch(trackingNumber, trackingType, priority) {
        return new Promise((resolve, reject) => {
            const batchKey = `${trackingType}-${priority}`;
            if (!this.batchQueue.has(batchKey)) {
                this.batchQueue.set(batchKey, []);
                // Start batch timer
                setTimeout(() => this.processBatch(batchKey), this.batchTimeout);
            }
            const batch = this.batchQueue.get(batchKey);
            batch.push({
                id: `${trackingNumber}-${Date.now()}`,
                trackingNumber,
                trackingType,
                priority,
                timestamp: new Date(),
                resolve,
                reject
            });
            // Process immediately if batch is full
            if (batch.length >= this.batchSize) {
                this.processBatch(batchKey);
            }
        });
    }
    /**
     * Process a batch of requests
     */
    async processBatch(batchKey) {
        const batch = this.batchQueue.get(batchKey);
        if (!batch || batch.length === 0)
            return;
        this.batchQueue.delete(batchKey);
        console.log(`🔄 Processing batch of ${batch.length} requests (${batchKey})`);
        // Group by provider preference for optimal routing
        const providerGroups = this.groupByOptimalProvider(batch);
        for (const [provider, requests] of providerGroups.entries()) {
            try {
                // Process requests for this provider
                const results = await Promise.all(requests.map(async (request) => {
                    try {
                        const data = await this.aggregator.fetchFromMultipleSources(request.trackingNumber, request.trackingType);
                        this.cacheResults(request.trackingNumber, request.trackingType, data);
                        return { request, data };
                    }
                    catch (error) {
                        return { request, error };
                    }
                }));
                // Resolve/reject individual requests
                results.forEach(({ request, data, error }) => {
                    if (error) {
                        request.reject(error);
                    }
                    else {
                        request.resolve(data);
                    }
                });
                this.batchedRequestCount += requests.length;
            }
            catch (error) {
                // Reject all requests in this group
                requests.forEach(request => {
                    request.reject(error);
                });
            }
        }
    }
    /**
     * Group batch requests by optimal provider
     */
    groupByOptimalProvider(batch) {
        const groups = new Map();
        batch.forEach(request => {
            // Use smart router to determine optimal provider
            const routingContext = {
                trackingNumber: request.trackingNumber,
                trackingType: request.trackingType,
                userTier: 'premium',
                previousFailures: []
            };
            const routing = this.smartRouter.analyzeRouting(routingContext);
            const optimalProvider = routing.prioritizedProviders[0] || 'default';
            if (!groups.has(optimalProvider)) {
                groups.set(optimalProvider, []);
            }
            groups.get(optimalProvider).push(request);
        });
        return groups;
    }
    /**
     * Update access statistics for cache entry
     */
    updateAccessStats(entry) {
        entry.accessCount++;
        entry.lastAccessed = new Date();
    }
    /**
     * Evict least recently used cache entries
     */
    evictLRU() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
        // Remove oldest 10% of entries
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
        console.log(`🧹 Evicted ${toRemove} LRU cache entries`);
    }
    /**
     * Generate cache key
     */
    generateCacheKey(trackingNumber, trackingType) {
        return `${trackingNumber}-${trackingType || 'container'}`.toLowerCase();
    }
    /**
     * Chunk array into smaller arrays
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Start cleanup timer for expired cache entries
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.cleanupInterval);
    }
    /**
     * Clean up expired cache entries
     */
    cleanupExpiredEntries() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp.getTime();
            if (age > entry.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
        }
    }
    /**
     * Start performance tracking
     */
    startPerformanceTracking() {
        setInterval(() => {
            this.recordPerformanceMetrics();
        }, 60000); // Record every minute
    }
    /**
     * Record current performance metrics
     */
    recordPerformanceMetrics() {
        const now = Date.now();
        const uptime = now - this.startTime;
        const requestsPerSecond = this.requestCount / (uptime / 1000);
        const cacheHitRate = this.requestCount > 0 ? this.cacheHits / this.requestCount : 0;
        const averageResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
        const batchEfficiency = this.requestCount > 0 ? this.batchedRequestCount / this.requestCount : 0;
        const metrics = {
            cacheHitRate,
            averageResponseTime,
            requestsPerSecond,
            batchEfficiency,
            costSavings: this.calculateCostSavings(),
            totalRequests: this.requestCount,
            cachedRequests: this.cacheHits,
            batchedRequests: this.batchedRequestCount,
            providerUsage: this.getProviderUsage(),
            performanceTrends: this.getPerformanceTrends()
        };
        this.performanceHistory.push(metrics);
        // Keep only last 24 hours of data
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        this.performanceHistory = this.performanceHistory.filter(m => m.performanceTrends[0]?.timestamp.getTime() > oneDayAgo);
    }
    /**
     * Calculate cost savings from optimization
     */
    calculateCostSavings() {
        // Estimate cost savings from cache hits and batching
        const avgCostPerRequest = 0.15; // Average cost across all providers
        const cacheSavings = this.cacheHits * avgCostPerRequest;
        const batchSavings = this.batchedRequestCount * avgCostPerRequest * 0.2; // 20% savings from batching
        return cacheSavings + batchSavings;
    }
    /**
     * Get provider usage statistics
     */
    getProviderUsage() {
        const usage = {};
        for (const entry of this.cache.values()) {
            usage[entry.provider] = (usage[entry.provider] || 0) + entry.accessCount;
        }
        return usage;
    }
    /**
     * Get performance trends
     */
    getPerformanceTrends() {
        // Return last 24 data points (hours)
        return this.performanceHistory.slice(-24).map(m => ({
            timestamp: new Date(),
            responseTime: m.averageResponseTime,
            cacheHitRate: m.cacheHitRate,
            requestCount: m.totalRequests
        }));
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        const now = Date.now();
        const uptime = now - this.startTime;
        const requestsPerSecond = this.requestCount / (uptime / 1000);
        const cacheHitRate = this.requestCount > 0 ? this.cacheHits / this.requestCount : 0;
        const averageResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
        const batchEfficiency = this.requestCount > 0 ? this.batchedRequestCount / this.requestCount : 0;
        return {
            cacheHitRate,
            averageResponseTime,
            requestsPerSecond,
            batchEfficiency,
            costSavings: this.calculateCostSavings(),
            totalRequests: this.requestCount,
            cachedRequests: this.cacheHits,
            batchedRequests: this.batchedRequestCount,
            providerUsage: this.getProviderUsage(),
            performanceTrends: this.getPerformanceTrends()
        };
    }
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations() {
        const metrics = this.getPerformanceMetrics();
        const recommendations = [];
        // Cache hit rate recommendations
        if (metrics.cacheHitRate < 0.6) {
            recommendations.push({
                type: 'cache_ttl',
                priority: 'high',
                description: 'Increase cache TTL to improve hit rate',
                currentValue: `${this.defaultTTL / 1000}s`,
                recommendedValue: `${Math.round(this.defaultTTL * 1.5 / 1000)}s`,
                expectedImprovement: 'Increase cache hit rate by 15-25%',
                implementation: 'Update defaultTTL configuration'
            });
        }
        // Batch efficiency recommendations
        if (metrics.batchEfficiency < 0.3) {
            recommendations.push({
                type: 'batch_size',
                priority: 'medium',
                description: 'Increase batch size for better efficiency',
                currentValue: this.batchSize,
                recommendedValue: Math.min(this.batchSize * 1.5, 20),
                expectedImprovement: 'Reduce API calls by 20-30%',
                implementation: 'Update batchSize configuration'
            });
        }
        // Response time recommendations
        if (metrics.averageResponseTime > 3000) {
            recommendations.push({
                type: 'provider_priority',
                priority: 'high',
                description: 'Optimize provider priority for faster responses',
                currentValue: 'Current routing',
                recommendedValue: 'Prioritize faster providers',
                expectedImprovement: 'Reduce average response time by 25-40%',
                implementation: 'Update smart router provider weights'
            });
        }
        // Request throttling recommendations
        if (metrics.requestsPerSecond > 10) {
            recommendations.push({
                type: 'request_throttling',
                priority: 'medium',
                description: 'Implement request throttling to prevent rate limits',
                currentValue: 'No throttling',
                recommendedValue: 'Max 8 requests/second',
                expectedImprovement: 'Reduce rate limit errors by 80%',
                implementation: 'Add request throttling middleware'
            });
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let totalAge = 0;
        const providerCounts = {};
        for (const entry of this.cache.values()) {
            totalAge += now - entry.timestamp.getTime();
            providerCounts[entry.provider] = (providerCounts[entry.provider] || 0) + 1;
        }
        const topProviders = Object.entries(providerCounts)
            .map(([provider, count]) => ({ provider, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.requestCount > 0 ? this.cacheHits / this.requestCount : 0,
            totalHits: this.cacheHits,
            totalRequests: this.requestCount,
            averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
            topProviders
        };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }
    /**
     * Warm up cache with common tracking numbers
     */
    async warmUpCache(trackingNumbers) {
        console.log(`🔥 Warming up cache with ${trackingNumbers.length} tracking numbers`);
        const results = await this.trackMultiple(trackingNumbers.map(tn => ({ trackingNumber: tn })), { maxConcurrency: 3, prioritizeCache: false });
        console.log(`🔥 Cache warmed up: ${results.size} entries cached`);
    }
}
exports.PerformanceOptimizer = PerformanceOptimizer;
//# sourceMappingURL=PerformanceOptimizer.js.map