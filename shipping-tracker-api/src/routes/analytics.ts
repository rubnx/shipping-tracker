import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { apiKeyValidation, recordAPIUsage } from '../middleware/apiKeyMiddleware';
import { generalRateLimit } from '../middleware/securityMiddleware';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply middleware to all routes
router.use(generalRateLimit);
router.use(apiKeyValidation('analytics'));
router.use(recordAPIUsage);

// Event tracking routes
router.post('/events', analyticsController.trackEvent);

// Analytics data routes
router.get('/shipping-routes', analyticsController.getShippingRouteAnalytics);
router.get('/api-usage', analyticsController.getAPIUsageAnalytics);
router.get('/business-intelligence', analyticsController.getBusinessIntelligence);
router.get('/cost-optimization', analyticsController.getCostOptimizationRecommendations);

// Dashboard routes
router.get('/dashboard', analyticsController.getDashboardData);

// Data management routes
router.post('/clear', analyticsController.clearAnalyticsData);
router.get('/export', analyticsController.exportAnalyticsData);

export { router as analyticsRoutes };