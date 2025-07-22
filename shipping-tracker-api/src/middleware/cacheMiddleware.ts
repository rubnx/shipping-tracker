import { Request, Response, NextFunction } from 'express';
import { TrackingCacheService } from '../services/TrackingCacheService';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
  namespace?: string;
}

/**
 * Cache middleware for Express routes
 * Implements Requirements 7.3, 9.1, 9.2 for response caching
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = (req, res) => req.method === 'GET' && res.statusCode === 200,
    skipCache = () => false,
    namespace = 'api_responses',
  } = options;

  const cacheService = TrackingCacheService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache if condition is met
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get cached response
      const cachedResponse = await cacheService.cache.get(namespace, cacheKey);

      if (cachedResponse) {
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`,
        });

        // Send cached response
        return res.json(cachedResponse);
      }

      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        // Check if we should cache this response
        if (condition(req, res)) {
          // Cache the response asynchronously
          cacheService.cache.set(namespace, cacheKey, body, ttl).catch(error => {
            console.error('Failed to cache response:', error);
          });

          // Set cache headers
          res.set({
            'Cache-Control': `public, max-age=${ttl}`,
            'X-Cache-Key': cacheKey,
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Tracking-specific cache middleware
 */
export function trackingCacheMiddleware(ttl: number = 900) { // 15 minutes
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const trackingNumber = req.params.trackingNumber || req.query.trackingNumber;
      return `tracking:${trackingNumber}`;
    },
    condition: (req, res) => {
      return req.method === 'GET' && 
             res.statusCode === 200 && 
             (req.params.trackingNumber || req.query.trackingNumber);
    },
    skipCache: (req) => {
      // Skip cache if refresh is requested
      return req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache';
    },
    namespace: 'tracking_responses',
  });
}

/**
 * API provider cache middleware
 */
export function apiProviderCacheMiddleware(ttl: number = 300) { // 5 minutes
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const provider = req.params.provider || req.query.provider;
      const trackingNumber = req.params.trackingNumber || req.query.trackingNumber;
      return `provider:${provider}:${trackingNumber}`;
    },
    condition: (req, res) => {
      return req.method === 'GET' && res.statusCode === 200;
    },
    namespace: 'api_provider_responses',
  });
}

/**
 * Search history cache middleware
 */
export function searchHistoryCacheMiddleware(ttl: number = 3600) { // 1 hour
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const userId = req.headers['user-id'] || req.ip;
      return `search_history:${userId}`;
    },
    condition: (req, res) => {
      return req.method === 'GET' && res.statusCode === 200;
    },
    namespace: 'search_history_responses',
  });
}

/**
 * Rate limit cache middleware
 */
export function rateLimitCacheMiddleware() {
  const cacheService = TrackingCacheService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip;
    const key = `rate_limit:${clientId}`;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    try {
      // Get current request count
      const currentCount = await cacheService.cache.increment(
        'rate_limits',
        key,
        1,
        Math.ceil(windowMs / 1000)
      );

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - currentCount).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });

      // Check if rate limit exceeded
      if (currentCount > maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit cache error:', error);
      // Continue without rate limiting on cache error
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 */
export function cacheInvalidationMiddleware(patterns: string[]) {
  const cacheService = TrackingCacheService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            // Replace placeholders in pattern with actual values
            let resolvedPattern = pattern;
            
            // Replace :trackingNumber with actual tracking number
            if (req.params.trackingNumber) {
              resolvedPattern = resolvedPattern.replace(':trackingNumber', req.params.trackingNumber);
            }
            
            // Replace :provider with actual provider
            if (req.params.provider) {
              resolvedPattern = resolvedPattern.replace(':provider', req.params.provider);
            }

            // Invalidate cache (simplified - in production you might want pattern-based deletion)
            await cacheService.cache.delete('tracking_responses', resolvedPattern);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
    };

    res.json = function(body: any) {
      invalidateCache();
      return originalJson(body);
    };

    res.send = function(body: any) {
      invalidateCache();
      return originalSend(body);
    };

    next();
  };
}

/**
 * Cache warming middleware - preloads popular data
 */
export function cacheWarmingMiddleware() {
  const cacheService = TrackingCacheService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    // This would typically run on application startup or periodically
    // For now, it's a placeholder that could be triggered by specific routes
    
    if (req.path === '/api/cache/warm' && req.method === 'POST') {
      try {
        // Get popular tracking numbers (this would come from analytics)
        const popularTrackingNumbers = [
          'DEMO123456789',
          'TEST987654321',
          // Add more based on actual usage data
        ];

        await cacheService.warmCache(popularTrackingNumbers);

        return res.json({
          success: true,
          message: `Cache warmed for ${popularTrackingNumbers.length} tracking numbers`,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Cache warming failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    next();
  };
}

export default cacheMiddleware;