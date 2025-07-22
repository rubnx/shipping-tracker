import { Router } from 'express';
import { OptimizationController } from '../controllers/OptimizationController';
import { asyncHandler } from '../middleware/errorHandler';
import { rateLimitCacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();
const optimizationController = new OptimizationController();

/**
 * Optimization Routes
 */

// Apply rate limiting to all optimization routes
router.use(rateLimitCacheMiddleware());

// GET /api/optimization/stats
// Get optimization statistics
router.get('/stats', asyncHandler(optimizationController.getOptimizationStats));

// POST /api/optimization/order
// Optimize request order for multiple tracking numbers
router.post('/order', asyncHandler(optimizationController.optimizeRequestOrder));

// POST /api/optimization/batch
// Batch tracking requests with optimization
router.post('/batch', asyncHandler(optimizationController.batchTrackingRequests));

// GET /api/optimization/recommendations
// Get cost optimization recommendations
router.get('/recommendations', asyncHandler(optimizationController.getCostOptimizationRecommendations));

// POST /api/optimization/preload
// Preload popular tracking numbers
router.post('/preload', asyncHandler(optimizationController.preloadPopularTracking));

// GET /api/optimization/provider/:trackingNumber
// Get optimal provider for specific tracking number
router.get('/provider/:trackingNumber', asyncHandler(optimizationController.getOptimalProvider));

// POST /api/optimization/queue
// Queue optimized request
router.post('/queue', asyncHandler(optimizationController.queueOptimizedRequest));

// GET /api/optimization/queue/status
// Get request queue status
router.get('/queue/status', asyncHandler(optimizationController.getQueueStatus));

// Cache management routes
// GET /api/optimization/cache/stats
// Get cache statistics
router.get('/cache/stats', asyncHandler(optimizationController.getCacheStats));

// POST /api/optimization/cache/warm
// Warm cache with popular data
router.post('/cache/warm', asyncHandler(optimizationController.warmCache));

// DELETE /api/optimization/cache
// Clear cache (optionally by namespace)
router.delete('/cache', asyncHandler(optimizationController.clearCache));

export default router;