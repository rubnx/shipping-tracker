import { TrackingCacheService } from './TrackingCacheService';
import { APIMonitoringService } from './APIMonitoringService';
import { config, apiProviders } from '../config/environment';
import { EventEmitter } from 'events';

interface RequestPattern {
  trackingNumber: string;
  provider: string;
  timestamp: number;
  responseTime: number;
  success: boolean;
  cost: number;
  cacheHit: boolean;
}

interface BatchConfiguration {
  maxBatchSize: number;
  batchTimeoutMs: number;
  maxConcurrentBatches: number;
  priorityWeights: Record<string, number>;
}

interface CostOptimizationRule {
  id: string;
  name: string;
  condition: (request: any) => boolean;
  action: (request: any) => any;
  estimatedSavings: number;
}

interface RequestQueue {
  high: QueuedRequest[];
  medium: QueuedRequest[];
  low: QueuedRequest[];
}

interface QueuedRequest {
  id: string;
  trackingNumber: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  userId?: string;
  callback?: (result: any) => void;
  timeout?: number;
}

/**
 * API Request Optimizer with intelligent batching, cost optimization, and pattern analysis
 * Implements Requirements 7.3, 9.1, 10.3 for optimized API request patterns
 */
export class APIRequestOptimizer extends EventEmitter {
  private static instance: APIRequestOptimizer;
  private cacheService: TrackingCacheService;
  private monitoringService: APIMonitoringService;
  private requestPatterns: RequestPattern[] = [];
  private requestQueue: RequestQueue = { high: [], medium: [], low: [] };
  private activeBatches: Map<string, any> = new Map();
  private rateLimiters: Map<string, { tokens: number; lastRefill: number; capacity: number; refillRate: number }> = new Map();
  private costTracker: Map<string, { daily: number; monthly: number; lastReset: number }> = new Map();
  
  private readonly batchConfig: BatchConfiguration = {
    maxBatchSize: 10,
    batchTimeoutMs: 2000,
    maxConcurrentBatches: 3,
    priorityWeights: { high: 3, medium: 2, low: 1 },
  };

  private readonly costOptimizationRules: CostOptimizationRule[] = [
    {
      id: 'cache_first',
      name: 'Cache First Strategy',
      condition: (request) => !request.skipCache,
      action: (request) => ({ ...request, checkCache: true }),
      estimatedSavings: 0.8, // 80% cost reduction when cache hit
    },
    {
      id: 'batch_similar',
      name: 'Batch Similar Requests',
      condition: (request) => request.batchable !== false,
      action: (request) => ({ ...request, batched: true }),
      estimatedSavings: 0.3, // 30% cost reduction through batching
    },
    {
      id: 'tier_optimization',
      name: 'API Tier Optimization',
      condition: (request) => !request.requiresPremium,
      action: (request) => ({ ...request, preferredTier: 'free' }),
      estimatedSavings: 0.6, // 60% cost reduction using free tier
    },
    {
      id: 'deduplication',
      name: 'Request Deduplication',
      condition: (request) => request.allowDeduplication !== false,
      action: (request) => ({ ...request, deduplicated: true }),
      estimatedSavings: 0.9, // 90% cost reduction for duplicate requests
    },
  ];

  private processingInterval: NodeJS.Timeout | null = null;
  private analyticsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.cacheService = TrackingCacheService.getInstance();
    this.monitoringService = APIMonitoringService.getInstance();
    this.initializeRateLimiters();
    this.startProcessingLoop();
    this.startAnalyticsLoop();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): APIRequestOptimizer {
    if (!APIRequestOptimizer.instance) {
      APIRequestOptimizer.instance = new APIRequestOptimizer();
    }
    return APIRequestOptimizer.instance;
  }

  /**
   * Initialize rate limiters for each provider
   */
  private initializeRateLimiters(): void {
    Object.entries(apiProviders).forEach(([key, provider]) => {
      this.rateLimiters.set(key, {
        tokens: provider.rateLimit,
        lastRefill: Date.now(),
        capacity: provider.rateLimit,
        refillRate: provider.rateLimit / (60 * 60), // tokens per second
      });
    });
  }

  /**
   * Start the request processing loop
   */
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      this.processRequestQueue();
    }, 100); // Process every 100ms
  }

  /**
   * Start the analytics loop
   */
  private startAnalyticsLoop(): void {
    this.analyticsInterval = setInterval(() => {
      this.analyzeRequestPatterns();
      this.updateCostTracking();
    }, 60000); // Analyze every minute
  }

  /**
   * Add request to optimization queue
   */
  public async optimizeRequest(request: {
    trackingNumber: string;
    priority?: 'high' | 'medium' | 'low';
    userId?: string;
    skipCache?: boolean;
    requiresPremium?: boolean;
    timeout?: number;
    callback?: (result: any) => void;
  }): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedRequest: QueuedRequest = {
      id: requestId,
      trackingNumber: request.trackingNumber,
      priority: request.priority || 'medium',
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      userId: request.userId,
      callback: request.callback,
      timeout: request.timeout || 30000,
    };

    // Apply cost optimization rules
    const optimizedRequest = this.applyCostOptimizationRules(queuedRequest);

    // Add to appropriate priority queue
    this.requestQueue[optimizedRequest.priority].push(optimizedRequest);

    // Emit event for monitoring
    this.emit('requestQueued', {
      requestId,
      trackingNumber: request.trackingNumber,
      priority: optimizedRequest.priority,
      queueSize: this.getTotalQueueSize(),
    });

    return requestId;
  }

  /**
   * Apply cost optimization rules to request
   */
  private applyCostOptimizationRules(request: QueuedRequest): QueuedRequest {
    let optimizedRequest = { ...request };

    for (const rule of this.costOptimizationRules) {
      if (rule.condition(optimizedRequest)) {
        optimizedRequest = rule.action(optimizedRequest);
        
        // Track rule application for analytics
        this.emit('ruleApplied', {
          ruleId: rule.id,
          requestId: request.id,
          estimatedSavings: rule.estimatedSavings,
        });
      }
    }

    return optimizedRequest;
  }

  /**
   * Process the request queue
   */
  private async processRequestQueue(): void {
    if (this.activeBatches.size >= this.batchConfig.maxConcurrentBatches) {
      return; // Too many active batches
    }

    // Process high priority requests first
    const priorities: Array<keyof RequestQueue> = ['high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const queue = this.requestQueue[priority];
      if (queue.length === 0) continue;

      // Check if we can form a batch
      const batchSize = Math.min(queue.length, this.batchConfig.maxBatchSize);
      if (batchSize === 0) continue;

      // Extract batch from queue
      const batch = queue.splice(0, batchSize);
      
      // Process batch
      this.processBatch(batch, priority);
      
      // Only process one batch per cycle to avoid overwhelming
      break;
    }
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(requests: QueuedRequest[], priority: string): Promise<void> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeBatches.set(batchId, {
      requests,
      priority,
      startTime: Date.now(),
    });

    this.emit('batchStarted', {
      batchId,
      requestCount: requests.length,
      priority,
    });

    try {
      // Group requests by optimal provider
      const providerGroups = await this.groupRequestsByProvider(requests);
      
      // Process each provider group
      const results = await Promise.allSettled(
        Object.entries(providerGroups).map(([provider, providerRequests]) =>
          this.processProviderBatch(provider, providerRequests)
        )
      );

      // Handle results and callbacks
      results.forEach((result, index) => {
        const [provider, providerRequests] = Object.entries(providerGroups)[index];
        
        if (result.status === 'fulfilled') {
          this.handleBatchSuccess(providerRequests, result.value, provider);
        } else {
          this.handleBatchFailure(providerRequests, result.reason, provider);
        }
      });

    } catch (error) {
      console.error(`Batch ${batchId} failed:`, error);
      this.handleBatchFailure(requests, error);
    } finally {
      this.activeBatches.delete(batchId);
      
      this.emit('batchCompleted', {
        batchId,
        duration: Date.now() - this.activeBatches.get(batchId)?.startTime || 0,
      });
    }
  }

  /**
   * Group requests by optimal provider
   */
  private async groupRequestsByProvider(requests: QueuedRequest[]): Promise<Record<string, QueuedRequest[]>> {
    const groups: Record<string, QueuedRequest[]> = {};

    for (const request of requests) {
      // Check cache first
      const cachedData = await this.cacheService.getCachedTrackingData(request.trackingNumber);
      if (cachedData) {
        // Handle cached result immediately
        this.handleCacheHit(request, cachedData);
        continue;
      }

      // Find optimal provider
      const optimalProvider = await this.findOptimalProvider(request);
      if (optimalProvider) {
        if (!groups[optimalProvider]) {
          groups[optimalProvider] = [];
        }
        groups[optimalProvider].push(request);
      } else {
        // No provider available, handle as failure
        this.handleRequestFailure(request, new Error('No available provider'));
      }
    }

    return groups;
  }

  /**
   * Find optimal provider for request
   */
  private async findOptimalProvider(request: QueuedRequest): Promise<string | null> {
    const availableProviders = Object.entries(apiProviders)
      .filter(([key, provider]) => {
        // Check if provider is enabled
        if (!provider.enabled) return false;
        
        // Check rate limits
        if (!this.checkRateLimit(key)) return false;
        
        // Check provider health
        const healthStatus = this.monitoringService.getProviderHealthStatus(provider.name);
        if (healthStatus && healthStatus.status === 'down') return false;
        
        return true;
      });

    if (availableProviders.length === 0) {
      return null;
    }

    // Score providers based on multiple factors
    const scoredProviders = await Promise.all(
      availableProviders.map(async ([key, provider]) => {
        const score = await this.calculateProviderScore(key, provider, request);
        return { key, provider, score };
      })
    );

    // Sort by score (higher is better)
    scoredProviders.sort((a, b) => b.score - a.score);

    return scoredProviders[0].key;
  }

  /**
   * Calculate provider score
   */
  private async calculateProviderScore(
    providerKey: string,
    provider: any,
    request: QueuedRequest
  ): Promise<number> {
    let score = 0;

    // Base score by tier (free = 30, freemium = 20, premium = 10 for cost optimization)
    const tierScores = { free: 30, freemium: 20, premium: 10 };
    score += tierScores[provider.tier] || 0;

    // Health status score
    const healthStatus = this.monitoringService.getProviderHealthStatus(provider.name);
    if (healthStatus) {
      switch (healthStatus.status) {
        case 'healthy':
          score += 25;
          break;
        case 'degraded':
          score += 10;
          break;
        case 'down':
          score -= 100;
          break;
      }

      // Response time score (faster = better)
      const responseTimeScore = Math.max(0, 20 - (healthStatus.responseTime / 100));
      score += responseTimeScore;
    }

    // Rate limit availability score
    const rateLimiter = this.rateLimiters.get(providerKey);
    if (rateLimiter) {
      const availabilityRatio = rateLimiter.tokens / rateLimiter.capacity;
      score += availabilityRatio * 15;
    }

    // Priority boost
    const priorityBoost = this.batchConfig.priorityWeights[request.priority] || 1;
    score *= priorityBoost;

    // Cost efficiency for the current day
    const costData = this.costTracker.get(providerKey);
    if (costData && costData.daily > 100) { // If daily cost is high, prefer cheaper options
      score *= 0.5;
    }

    return score;
  }

  /**
   * Process batch for specific provider
   */
  private async processProviderBatch(
    provider: string,
    requests: QueuedRequest[]
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const startTime = Date.now();

    // Update rate limiter
    this.updateRateLimit(provider, requests.length);

    // Track cost
    this.trackCost(provider, requests.length);

    try {
      // In a real implementation, this would make actual API calls
      // For now, simulate with mock data or use demo mode
      for (const request of requests) {
        if (config.demo.enabled) {
          results[request.trackingNumber] = this.generateMockTrackingData(
            request.trackingNumber,
            provider
          );
        } else {
          // Placeholder for actual API call
          results[request.trackingNumber] = null;
        }
      }

      // Record successful pattern
      requests.forEach(request => {
        this.recordRequestPattern({
          trackingNumber: request.trackingNumber,
          provider,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: true,
          cost: this.calculateRequestCost(provider),
          cacheHit: false,
        });
      });

    } catch (error) {
      // Record failed pattern
      requests.forEach(request => {
        this.recordRequestPattern({
          trackingNumber: request.trackingNumber,
          provider,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: false,
          cost: 0,
          cacheHit: false,
        });
      });
      throw error;
    }

    return results;
  }

  /**
   * Handle batch success
   */
  private handleBatchSuccess(
    requests: QueuedRequest[],
    results: Record<string, any>,
    provider: string
  ): void {
    requests.forEach(request => {
      const result = results[request.trackingNumber];
      
      if (result) {
        // Cache the result
        this.cacheService.cacheTrackingData(request.trackingNumber, result);
        
        // Call callback if provided
        if (request.callback) {
          request.callback({ success: true, data: result });
        }
        
        this.emit('requestCompleted', {
          requestId: request.id,
          trackingNumber: request.trackingNumber,
          provider,
          success: true,
        });
      } else {
        this.handleRequestFailure(request, new Error('No data returned'));
      }
    });
  }

  /**
   * Handle batch failure
   */
  private handleBatchFailure(
    requests: QueuedRequest[],
    error: any,
    provider?: string
  ): void {
    requests.forEach(request => {
      if (request.retryCount < request.maxRetries) {
        // Retry with exponential backoff
        request.retryCount++;
        const delay = Math.pow(2, request.retryCount) * 1000; // 2s, 4s, 8s
        
        setTimeout(() => {
          this.requestQueue[request.priority].push(request);
        }, delay);
        
        this.emit('requestRetry', {
          requestId: request.id,
          retryCount: request.retryCount,
          delay,
        });
      } else {
        this.handleRequestFailure(request, error);
      }
    });
  }

  /**
   * Handle cache hit
   */
  private handleCacheHit(request: QueuedRequest, cachedData: any): void {
    // Record cache hit pattern
    this.recordRequestPattern({
      trackingNumber: request.trackingNumber,
      provider: 'cache',
      timestamp: Date.now(),
      responseTime: 0,
      success: true,
      cost: 0,
      cacheHit: true,
    });

    // Call callback if provided
    if (request.callback) {
      request.callback({ success: true, data: cachedData, cached: true });
    }

    this.emit('requestCompleted', {
      requestId: request.id,
      trackingNumber: request.trackingNumber,
      provider: 'cache',
      success: true,
      cached: true,
    });
  }

  /**
   * Handle request failure
   */
  private handleRequestFailure(request: QueuedRequest, error: any): void {
    // Call callback if provided
    if (request.callback) {
      request.callback({ success: false, error: error.message });
    }

    this.emit('requestFailed', {
      requestId: request.id,
      trackingNumber: request.trackingNumber,
      error: error.message,
      retryCount: request.retryCount,
    });
  }

  /**
   * Check rate limit for provider
   */
  private checkRateLimit(providerKey: string): boolean {
    const rateLimiter = this.rateLimiters.get(providerKey);
    if (!rateLimiter) return false;

    // Refill tokens based on time passed
    const now = Date.now();
    const timePassed = (now - rateLimiter.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * rateLimiter.refillRate;
    
    rateLimiter.tokens = Math.min(
      rateLimiter.capacity,
      rateLimiter.tokens + tokensToAdd
    );
    rateLimiter.lastRefill = now;

    return rateLimiter.tokens >= 1;
  }

  /**
   * Update rate limit after request
   */
  private updateRateLimit(providerKey: string, requestCount: number): void {
    const rateLimiter = this.rateLimiters.get(providerKey);
    if (rateLimiter) {
      rateLimiter.tokens = Math.max(0, rateLimiter.tokens - requestCount);
    }
  }

  /**
   * Track cost for provider
   */
  private trackCost(providerKey: string, requestCount: number): void {
    const cost = this.calculateRequestCost(providerKey) * requestCount;
    const now = Date.now();
    
    let costData = this.costTracker.get(providerKey);
    if (!costData) {
      costData = { daily: 0, monthly: 0, lastReset: now };
      this.costTracker.set(providerKey, costData);
    }

    // Reset daily cost if it's a new day
    const daysSinceReset = (now - costData.lastReset) / (24 * 60 * 60 * 1000);
    if (daysSinceReset >= 1) {
      costData.daily = 0;
      costData.lastReset = now;
    }

    costData.daily += cost;
    costData.monthly += cost;
  }

  /**
   * Calculate request cost for provider
   */
  private calculateRequestCost(providerKey: string): number {
    const provider = apiProviders[providerKey as keyof typeof apiProviders];
    if (!provider) return 0;

    const costMap = { free: 0, freemium: 0.01, premium: 0.05 };
    return costMap[provider.tier] || 0;
  }

  /**
   * Record request pattern for analysis
   */
  private recordRequestPattern(pattern: RequestPattern): void {
    this.requestPatterns.push(pattern);
    
    // Keep only last 1000 patterns
    if (this.requestPatterns.length > 1000) {
      this.requestPatterns.shift();
    }
  }

  /**
   * Analyze request patterns
   */
  private analyzeRequestPatterns(): void {
    if (this.requestPatterns.length < 10) return;

    const analysis = {
      totalRequests: this.requestPatterns.length,
      successRate: this.requestPatterns.filter(p => p.success).length / this.requestPatterns.length,
      averageResponseTime: this.requestPatterns.reduce((sum, p) => sum + p.responseTime, 0) / this.requestPatterns.length,
      cacheHitRate: this.requestPatterns.filter(p => p.cacheHit).length / this.requestPatterns.length,
      totalCost: this.requestPatterns.reduce((sum, p) => sum + p.cost, 0),
      providerUsage: this.getProviderUsageStats(),
    };

    this.emit('patternAnalysis', analysis);
  }

  /**
   * Get provider usage statistics
   */
  private getProviderUsageStats(): Record<string, { requests: number; successRate: number; avgResponseTime: number }> {
    const stats: Record<string, { requests: number; successRate: number; avgResponseTime: number }> = {};

    this.requestPatterns.forEach(pattern => {
      if (!stats[pattern.provider]) {
        stats[pattern.provider] = { requests: 0, successRate: 0, avgResponseTime: 0 };
      }
      stats[pattern.provider].requests++;
    });

    Object.keys(stats).forEach(provider => {
      const providerPatterns = this.requestPatterns.filter(p => p.provider === provider);
      const successfulPatterns = providerPatterns.filter(p => p.success);
      
      stats[provider].successRate = successfulPatterns.length / providerPatterns.length;
      stats[provider].avgResponseTime = providerPatterns.reduce((sum, p) => sum + p.responseTime, 0) / providerPatterns.length;
    });

    return stats;
  }

  /**
   * Update cost tracking
   */
  private updateCostTracking(): void {
    const now = Date.now();
    
    this.costTracker.forEach((costData, provider) => {
      // Reset monthly cost if it's a new month
      const monthsSinceReset = (now - costData.lastReset) / (30 * 24 * 60 * 60 * 1000);
      if (monthsSinceReset >= 1) {
        costData.monthly = 0;
      }
    });
  }

  /**
   * Generate mock tracking data
   */
  private generateMockTrackingData(trackingNumber: string, provider: string): any {
    // This is a simplified mock data generator
    return {
      trackingNumber,
      carrier: provider,
      status: 'In Transit',
      lastUpdated: new Date(),
      events: [
        {
          id: `${trackingNumber}-1`,
          status: 'Booked',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          location: 'Origin Port',
          description: 'Shipment booked',
          isCurrentStatus: false,
          isCompleted: true,
        },
        {
          id: `${trackingNumber}-2`,
          status: 'In Transit',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          location: 'At Sea',
          description: 'Vessel departed',
          isCurrentStatus: true,
          isCompleted: false,
        },
      ],
    };
  }

  /**
   * Get total queue size
   */
  private getTotalQueueSize(): number {
    return this.requestQueue.high.length + 
           this.requestQueue.medium.length + 
           this.requestQueue.low.length;
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats(): {
    queueSize: number;
    activeBatches: number;
    totalProcessed: number;
    cacheHitRate: number;
    averageResponseTime: number;
    costSavings: number;
  } {
    const totalProcessed = this.requestPatterns.length;
    const cacheHits = this.requestPatterns.filter(p => p.cacheHit).length;
    const avgResponseTime = totalProcessed > 0 
      ? this.requestPatterns.reduce((sum, p) => sum + p.responseTime, 0) / totalProcessed 
      : 0;
    
    // Calculate estimated cost savings from optimization
    const totalCost = this.requestPatterns.reduce((sum, p) => sum + p.cost, 0);
    const estimatedUnoptimizedCost = totalProcessed * 0.05; // Assume premium pricing
    const costSavings = Math.max(0, estimatedUnoptimizedCost - totalCost);

    return {
      queueSize: this.getTotalQueueSize(),
      activeBatches: this.activeBatches.size,
      totalProcessed,
      cacheHitRate: totalProcessed > 0 ? cacheHits / totalProcessed : 0,
      averageResponseTime: avgResponseTime,
      costSavings,
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }
}

export default APIRequestOptimizer;