import { Request, Response } from 'express';
import { APIRequestOptimizer } from '../services/APIRequestOptimizer';
import { OptimizedAPIService } from '../services/OptimizedAPIService';
import { TrackingCacheService } from '../services/TrackingCacheService';

/**
 * Optimization Controller
 * Provides endpoints for API optimization features and analytics
 */
export class OptimizationController {
  private optimizer: APIRequestOptimizer;
  private apiService: OptimizedAPIService;
  private cacheService: TrackingCacheService;

  constructor() {
    this.optimizer = APIRequestOptimizer.getInstance();
    this.apiService = OptimizedAPIService.getInstance();
    this.cacheService = TrackingCacheService.getInstance();
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const optimizerStats = this.optimizer.getOptimizationStats();
      const usageStats = await this.apiService.getUsageStatistics();
      const cacheStats = await this.cacheService.getCacheStats();

      res.json({
        success: true,
        data: {
          optimizer: optimizerStats,
          usage: usageStats,
          cache: cacheStats,
          timestamp: new Date(),
        },
        message: 'Optimization statistics retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Optimize tracking request order
   */
  public optimizeRequestOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumbers, budget } = req.body;

      if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'trackingNumbers must be a non-empty array',
        });
        return;
      }

      const optimization = await this.apiService.optimizeRequestOrder(trackingNumbers, budget);

      res.json({
        success: true,
        data: optimization,
        message: 'Request order optimized successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to optimize request order',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Batch tracking requests with optimization
   */
  public batchTrackingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumbers, priority = 'medium', maxWaitTime = 5000 } = req.body;
      const userId = req.headers['user-id'] as string || req.ip;

      if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'trackingNumbers must be a non-empty array',
        });
        return;
      }

      if (trackingNumbers.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Too many requests',
          message: 'Maximum 50 tracking numbers per batch request',
        });
        return;
      }

      const results = await this.apiService.batchTrackingRequests(trackingNumbers, {
        priority,
        userId,
        maxWaitTime,
      });

      // Calculate success metrics
      const totalRequests = trackingNumbers.length;
      const successfulRequests = Object.values(results).filter(result => result !== null).length;
      const successRate = successfulRequests / totalRequests;

      res.json({
        success: true,
        data: {
          results,
          metrics: {
            totalRequests,
            successfulRequests,
            successRate,
            processingTime: Date.now() - Date.now(), // Placeholder
          },
        },
        message: `Batch request completed with ${successRate * 100}% success rate`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process batch request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get cost optimization recommendations
   */
  public getCostOptimizationRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const recommendations = await this.apiService.getCostOptimizationRecommendations();

      res.json({
        success: true,
        data: recommendations,
        message: 'Cost optimization recommendations retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost optimization recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Preload popular tracking numbers
   */
  public preloadPopularTracking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumbers } = req.body;

      if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'trackingNumbers must be a non-empty array',
        });
        return;
      }

      // Start preloading asynchronously
      this.apiService.preloadPopularTracking(trackingNumbers).catch(error => {
        console.error('Preloading failed:', error);
      });

      res.json({
        success: true,
        message: `Started preloading ${trackingNumbers.length} tracking numbers`,
        data: {
          trackingNumbers: trackingNumbers.length,
          status: 'started',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start preloading',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Clear cache for optimization
   */
  public clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      const { namespace } = req.query;

      let clearedCount = 0;
      
      if (namespace && typeof namespace === 'string') {
        // Clear specific namespace
        const validNamespaces = ['TRACKING', 'API_RESPONSES', 'RATE_LIMITS', 'SEARCH_HISTORY', 'POPULAR_ROUTES', 'CARRIER_STATUS', 'VESSEL_INFO'];
        
        if (validNamespaces.includes(namespace.toUpperCase())) {
          clearedCount = await this.cacheService.clearNamespaceCache(namespace.toUpperCase() as any);
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid namespace',
            message: `Valid namespaces: ${validNamespaces.join(', ')}`,
          });
          return;
        }
      } else {
        // Clear all cache
        clearedCount = await this.cacheService.clearAllCache();
      }

      res.json({
        success: true,
        data: {
          clearedCount,
          namespace: namespace || 'all',
        },
        message: `Cleared ${clearedCount} cache entries`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get cache statistics
   */
  public getCacheStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.cacheService.getCacheStats();

      res.json({
        success: true,
        data: stats,
        message: 'Cache statistics retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cache statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Warm cache with popular data
   */
  public warmCache = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumbers, routes } = req.body;

      if (trackingNumbers && Array.isArray(trackingNumbers)) {
        await this.cacheService.warmCache(trackingNumbers);
      }

      if (routes && Array.isArray(routes)) {
        await this.cacheService.cachePopularRoutes(routes);
      }

      res.json({
        success: true,
        message: 'Cache warming completed',
        data: {
          trackingNumbers: trackingNumbers?.length || 0,
          routes: routes?.length || 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to warm cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get optimal provider for tracking number
   */
  public getOptimalProvider = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;
      const { preferredTier, maxCost, maxResponseTime, requiresRealTime } = req.query;

      if (!trackingNumber) {
        res.status(400).json({
          success: false,
          error: 'Missing tracking number',
          message: 'trackingNumber parameter is required',
        });
        return;
      }

      const criteria = {
        trackingNumber,
        preferredTier: preferredTier as 'free' | 'freemium' | 'premium' | undefined,
        maxCost: maxCost ? parseFloat(maxCost as string) : undefined,
        maxResponseTime: maxResponseTime ? parseInt(maxResponseTime as string) : undefined,
        requiresRealTime: requiresRealTime === 'true',
      };

      const optimalProvider = await this.apiService.getOptimalProvider(criteria);

      res.json({
        success: true,
        data: {
          trackingNumber,
          optimalProvider,
          criteria,
        },
        message: optimalProvider 
          ? `Optimal provider found: ${optimalProvider}` 
          : 'No optimal provider available',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to find optimal provider',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Queue optimized request
   */
  public queueOptimizedRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumber, priority = 'medium', skipCache = false, requiresPremium = false, timeout = 30000 } = req.body;
      const userId = req.headers['user-id'] as string || req.ip;

      if (!trackingNumber) {
        res.status(400).json({
          success: false,
          error: 'Missing tracking number',
          message: 'trackingNumber is required',
        });
        return;
      }

      const requestId = await this.optimizer.optimizeRequest({
        trackingNumber,
        priority,
        userId,
        skipCache,
        requiresPremium,
        timeout,
      });

      res.json({
        success: true,
        data: {
          requestId,
          trackingNumber,
          priority,
          status: 'queued',
        },
        message: 'Request queued for optimization',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to queue optimized request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get request queue status
   */
  public getQueueStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.optimizer.getOptimizationStats();

      res.json({
        success: true,
        data: {
          queueSize: stats.queueSize,
          activeBatches: stats.activeBatches,
          totalProcessed: stats.totalProcessed,
          cacheHitRate: stats.cacheHitRate,
          averageResponseTime: stats.averageResponseTime,
          costSavings: stats.costSavings,
        },
        message: 'Queue status retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve queue status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export default OptimizationController;