import { TrackingCacheService } from './TrackingCacheService';
import { APIMonitoringService } from './APIMonitoringService';
import { config, apiProviders } from '../config/environment';
import type { ShipmentTracking } from '../types';

interface APIRequest {
  trackingNumber: string;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
  timestamp: number;
  retryCount: number;
}

interface BatchRequest {
  requests: APIRequest[];
  provider: string;
  batchId: string;
  timestamp: number;
}

interface APISelectionCriteria {
  trackingNumber: string;
  preferredTier?: 'free' | 'freemium' | 'premium';
  maxCost?: number;
  maxResponseTime?: number;
  requiresRealTime?: boolean;
}

/**
 * Optimized API Service with batching, intelligent selection, and cost optimization
 * Implements Requirements 7.3, 9.1, 10.3 for API optimization and cost management
 */
export class OptimizedAPIService {
  private static instance: OptimizedAPIService;
  private cacheService: TrackingCacheService;
  private monitoringService: APIMonitoringService;
  private requestQueue: Map<string, APIRequest[]> = new Map(); // provider -> requests
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private rateLimitTracking: Map<string, { count: number; resetTime: number }> = new Map();
  
  // Configuration
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT_MS = 2000; // 2 seconds
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private readonly COST_WEIGHTS = {
    free: 0,
    freemium: 1,
    premium: 5,
  };

  private constructor() {
    this.cacheService = TrackingCacheService.getInstance();
    this.monitoringService = APIMonitoringService.getInstance();
    this.setupCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OptimizedAPIService {
    if (!OptimizedAPIService.instance) {
      OptimizedAPIService.instance = new OptimizedAPIService();
    }
    return OptimizedAPIService.instance;
  }

  /**
   * Setup cleanup interval for expired data
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredRateLimits();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired rate limit tracking
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [provider, data] of this.rateLimitTracking.entries()) {
      if (data.resetTime <= now) {
        this.rateLimitTracking.delete(provider);
      }
    }
  }

  /**
   * Get optimal API provider for tracking request
   */
  public async getOptimalProvider(criteria: APISelectionCriteria): Promise<string | null> {
    const { trackingNumber, preferredTier, maxCost, maxResponseTime, requiresRealTime } = criteria;

    // Get available providers
    const availableProviders = Object.entries(apiProviders)
      .filter(([_, provider]) => provider.enabled)
      .map(([key, provider]) => ({ key, ...provider }));

    if (availableProviders.length === 0) {
      return null;
    }

    // Score each provider
    const scoredProviders = await Promise.all(
      availableProviders.map(async (provider) => {
        const score = await this.calculateProviderScore(provider, criteria);
        return { ...provider, score };
      })
    );

    // Filter by constraints
    const filteredProviders = scoredProviders.filter(provider => {
      // Tier preference
      if (preferredTier && provider.tier !== preferredTier) {
        return false;
      }

      // Cost constraint
      if (maxCost !== undefined && this.COST_WEIGHTS[provider.tier] > maxCost) {
        return false;
      }

      // Response time constraint
      if (maxResponseTime !== undefined && provider.timeout > maxResponseTime) {
        return false;
      }

      // Real-time requirement (premium providers only)
      if (requiresRealTime && provider.tier === 'free') {
        return false;
      }

      return true;
    });

    if (filteredProviders.length === 0) {
      // Fallback to any available provider
      return scoredProviders.length > 0 ? scoredProviders[0].key : null;
    }

    // Sort by score (higher is better)
    filteredProviders.sort((a, b) => b.score - a.score);

    return filteredProviders[0].key;
  }

  /**
   * Calculate provider score based on various factors
   */
  private async calculateProviderScore(
    provider: any,
    criteria: APISelectionCriteria
  ): Promise<number> {
    let score = 0;

    // Base score by tier (higher tier = higher base score)
    const tierScores = { free: 10, freemium: 20, premium: 30 };
    score += tierScores[provider.tier];

    // Health status score
    const healthStatus = this.monitoringService.getProviderHealthStatus(provider.name);
    if (healthStatus) {
      switch (healthStatus.status) {
        case 'healthy':
          score += 20;
          break;
        case 'degraded':
          score += 10;
          break;
        case 'down':
          score -= 50;
          break;
      }

      // Response time score (lower is better)
      const responseTimeScore = Math.max(0, 20 - (healthStatus.responseTime / 100));
      score += responseTimeScore;
    }

    // Rate limit availability score
    const rateLimitData = await this.cacheService.getCachedRateLimit(provider.name);
    if (rateLimitData) {
      const availabilityRatio = rateLimitData.remaining / rateLimitData.limit;
      score += availabilityRatio * 15;
    } else {
      // Assume full availability if no rate limit data
      score += 15;
    }

    // Cost efficiency score (lower cost = higher score for cost-conscious requests)
    if (criteria.maxCost !== undefined) {
      const costEfficiency = Math.max(0, criteria.maxCost - this.COST_WEIGHTS[provider.tier]);
      score += costEfficiency * 5;
    }

    // Cache hit rate bonus (if we have cached data for this provider)
    const cachedResponse = await this.cacheService.getCachedAPIResponse(
      provider.name,
      criteria.trackingNumber
    );
    if (cachedResponse) {
      score += 25; // Significant bonus for cached data
    }

    return score;
  }

  /**
   * Batch multiple tracking requests
   */
  public async batchTrackingRequests(
    trackingNumbers: string[],
    options: {
      priority?: 'low' | 'medium' | 'high';
      userId?: string;
      maxWaitTime?: number;
    } = {}
  ): Promise<Record<string, ShipmentTracking | null>> {
    const { priority = 'medium', userId, maxWaitTime = 5000 } = options;
    const results: Record<string, ShipmentTracking | null> = {};

    // First, check cache for all tracking numbers
    const cachedResults = await this.cacheService.batchGetTrackingData(trackingNumbers);
    
    // Separate cached and uncached requests
    const uncachedNumbers: string[] = [];
    for (const [trackingNumber, cachedData] of Object.entries(cachedResults)) {
      if (cachedData) {
        results[trackingNumber] = cachedData;
      } else {
        uncachedNumbers.push(trackingNumber);
      }
    }

    if (uncachedNumbers.length === 0) {
      return results; // All data was cached
    }

    // Group uncached requests by optimal provider
    const providerGroups: Record<string, string[]> = {};
    
    for (const trackingNumber of uncachedNumbers) {
      const optimalProvider = await this.getOptimalProvider({
        trackingNumber,
        preferredTier: 'free', // Start with free tier for batch requests
      });

      if (optimalProvider) {
        if (!providerGroups[optimalProvider]) {
          providerGroups[optimalProvider] = [];
        }
        providerGroups[optimalProvider].push(trackingNumber);
      }
    }

    // Execute batch requests for each provider
    const batchPromises = Object.entries(providerGroups).map(
      ([provider, numbers]) => this.executeBatchRequest(provider, numbers, { priority, userId })
    );

    // Wait for all batch requests with timeout
    const batchResults = await Promise.allSettled(
      batchPromises.map(promise => 
        Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Batch request timeout')), maxWaitTime)
          )
        ])
      )
    );

    // Merge batch results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        Object.assign(results, result.value);
      } else {
        console.error(`Batch request failed:`, result.reason);
        // Mark failed tracking numbers as null
        const providerNumbers = Object.values(providerGroups)[index];
        providerNumbers.forEach(num => {
          if (!(num in results)) {
            results[num] = null;
          }
        });
      }
    });

    return results;
  }

  /**
   * Execute batch request for a specific provider
   */
  private async executeBatchRequest(
    provider: string,
    trackingNumbers: string[],
    options: { priority: string; userId?: string }
  ): Promise<Record<string, ShipmentTracking | null>> {
    const results: Record<string, ShipmentTracking | null> = {};

    // Check rate limits
    if (!this.checkRateLimit(provider)) {
      console.warn(`Rate limit exceeded for provider ${provider}`);
      trackingNumbers.forEach(num => results[num] = null);
      return results;
    }

    // For now, simulate batch processing by processing individually
    // In a real implementation, you would use the provider's batch API if available
    const promises = trackingNumbers.map(async (trackingNumber) => {
      try {
        const data = await this.fetchTrackingData(provider, trackingNumber);
        if (data) {
          // Cache the result
          await this.cacheService.cacheTrackingData(trackingNumber, data);
          results[trackingNumber] = data;
        } else {
          results[trackingNumber] = null;
        }
      } catch (error) {
        console.error(`Failed to fetch ${trackingNumber} from ${provider}:`, error);
        results[trackingNumber] = null;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Fetch tracking data from specific provider
   */
  private async fetchTrackingData(
    provider: string,
    trackingNumber: string
  ): Promise<ShipmentTracking | null> {
    // This is a placeholder - in real implementation, you would call the actual API
    // For now, return mock data based on demo mode
    if (config.demo.enabled) {
      return this.generateMockTrackingData(trackingNumber, provider);
    }

    // In real implementation, this would make actual API calls
    return null;
  }

  /**
   * Generate mock tracking data for demo mode
   */
  private generateMockTrackingData(
    trackingNumber: string,
    provider: string
  ): ShipmentTracking {
    const statuses = ['Booked', 'In Transit', 'At Port', 'Delivered'];
    const currentStatusIndex = Math.floor(Math.random() * statuses.length);
    
    return {
      trackingNumber,
      carrier: provider,
      status: statuses[currentStatusIndex],
      origin: 'Shanghai, China',
      destination: 'Los Angeles, USA',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastUpdated: new Date(),
      events: statuses.slice(0, currentStatusIndex + 1).map((status, index) => ({
        id: `${trackingNumber}-${index}`,
        status,
        timestamp: new Date(Date.now() - (statuses.length - index) * 24 * 60 * 60 * 1000),
        location: index === 0 ? 'Shanghai, China' : index === statuses.length - 1 ? 'Los Angeles, USA' : 'Pacific Ocean',
        description: `Shipment ${status.toLowerCase()}`,
        isCurrentStatus: index === currentStatusIndex,
        isCompleted: index < currentStatusIndex,
      })),
    };
  }

  /**
   * Check rate limit for provider
   */
  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    const rateLimitData = this.rateLimitTracking.get(provider);
    
    if (!rateLimitData) {
      // Initialize rate limit tracking
      const providerConfig = Object.values(apiProviders).find(p => p.name === provider);
      if (providerConfig) {
        this.rateLimitTracking.set(provider, {
          count: 1,
          resetTime: now + 60 * 60 * 1000, // 1 hour from now
        });
        return true;
      }
      return false;
    }

    // Check if rate limit window has reset
    if (now >= rateLimitData.resetTime) {
      rateLimitData.count = 1;
      rateLimitData.resetTime = now + 60 * 60 * 1000;
      return true;
    }

    // Check if under rate limit
    const providerConfig = Object.values(apiProviders).find(p => p.name === provider);
    if (providerConfig && rateLimitData.count < providerConfig.rateLimit) {
      rateLimitData.count++;
      return true;
    }

    return false;
  }

  /**
   * Optimize API request order based on cost and performance
   */
  public async optimizeRequestOrder(
    trackingNumbers: string[],
    budget?: number
  ): Promise<{
    order: Array<{ trackingNumber: string; provider: string; estimatedCost: number }>;
    totalEstimatedCost: number;
    budgetExceeded: boolean;
  }> {
    const optimizedOrder: Array<{ trackingNumber: string; provider: string; estimatedCost: number }> = [];
    let totalCost = 0;

    for (const trackingNumber of trackingNumbers) {
      // Check cache first
      const cachedData = await this.cacheService.getCachedTrackingData(trackingNumber);
      if (cachedData) {
        optimizedOrder.push({
          trackingNumber,
          provider: 'cache',
          estimatedCost: 0,
        });
        continue;
      }

      // Find optimal provider
      const optimalProvider = await this.getOptimalProvider({
        trackingNumber,
        maxCost: budget ? (budget - totalCost) / (trackingNumbers.length - optimizedOrder.length) : undefined,
      });

      if (optimalProvider) {
        const providerConfig = Object.values(apiProviders).find(p => p.name === optimalProvider);
        const estimatedCost = providerConfig ? this.COST_WEIGHTS[providerConfig.tier] : 0;
        
        optimizedOrder.push({
          trackingNumber,
          provider: optimalProvider,
          estimatedCost,
        });
        
        totalCost += estimatedCost;
      }
    }

    return {
      order: optimizedOrder,
      totalEstimatedCost: totalCost,
      budgetExceeded: budget ? totalCost > budget : false,
    };
  }

  /**
   * Get API usage statistics
   */
  public async getUsageStatistics(): Promise<{
    totalRequests: number;
    requestsByProvider: Record<string, number>;
    costByProvider: Record<string, number>;
    cacheHitRate: number;
    averageResponseTime: number;
  }> {
    // This would typically come from monitoring service and cache
    const stats = await this.monitoringService.getSystemHealthStatus();
    
    return {
      totalRequests: 0, // Placeholder
      requestsByProvider: {},
      costByProvider: {},
      cacheHitRate: 0.75, // 75% cache hit rate (placeholder)
      averageResponseTime: 1500, // 1.5 seconds average (placeholder)
    };
  }

  /**
   * Preload cache for popular tracking numbers
   */
  public async preloadPopularTracking(trackingNumbers: string[]): Promise<void> {
    console.log(`Preloading cache for ${trackingNumbers.length} popular tracking numbers`);
    
    // Batch process popular tracking numbers during off-peak hours
    const batchSize = 5;
    for (let i = 0; i < trackingNumbers.length; i += batchSize) {
      const batch = trackingNumbers.slice(i, i + batchSize);
      
      try {
        await this.batchTrackingRequests(batch, { priority: 'low' });
        
        // Small delay between batches to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to preload batch ${i / batchSize + 1}:`, error);
      }
    }
  }

  /**
   * Get cost optimization recommendations
   */
  public async getCostOptimizationRecommendations(): Promise<{
    recommendations: string[];
    potentialSavings: number;
    currentMonthlyEstimate: number;
  }> {
    const recommendations: string[] = [];
    let potentialSavings = 0;
    const currentMonthlyEstimate = 100; // Placeholder

    // Analyze usage patterns and suggest optimizations
    const cacheStats = await this.cacheService.getCacheStats();
    
    if (cacheStats.redis.connected) {
      recommendations.push('Increase cache TTL for stable tracking data to reduce API calls');
      potentialSavings += 20;
    }

    recommendations.push('Use batch requests when possible to reduce per-request overhead');
    recommendations.push('Implement request deduplication to avoid duplicate API calls');
    recommendations.push('Schedule non-urgent requests during off-peak hours for better rates');

    return {
      recommendations,
      potentialSavings,
      currentMonthlyEstimate,
    };
  }
}

export default OptimizedAPIService;