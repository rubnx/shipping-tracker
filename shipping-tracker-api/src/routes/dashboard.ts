import express from 'express';
import { APIProviderDashboard } from '../services/APIProviderDashboard';
import { APIAggregator } from '../services/APIAggregator';
import { SmartContainerRouter } from '../services/SmartContainerRouter';

const router = express.Router();

// Initialize services
const aggregator = new APIAggregator();
const smartRouter = new SmartContainerRouter();
const dashboard = new APIProviderDashboard(aggregator, smartRouter);

/**
 * GET /api/dashboard/summary
 * Get dashboard summary with key metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await dashboard.getDashboardSummary();
    res.json({
      success: true,
      data: summary,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/providers
 * Get detailed status of all API providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = await dashboard.getProviderStatuses();
    res.json({
      success: true,
      data: providers,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Provider status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/health
 * Get overall API health metrics
 */
router.get('/health', async (req, res) => {
  try {
    const health = await dashboard.getHealthMetrics();
    res.json({
      success: true,
      data: health,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Health metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/analytics/:provider
 * Get detailed analytics for a specific provider
 */
router.get('/analytics/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const analytics = await dashboard.getProviderAnalytics(provider);
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`❌ Analytics error for ${req.params.provider}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/recommendations
 * Get cost optimization recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await dashboard.getCostOptimizationRecommendations();
    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/costs
 * Get cost analysis and breakdown
 */
router.get('/costs', async (req, res) => {
  try {
    const providers = await dashboard.getProviderStatuses();
    const costAnalysis = {
      totalMonthlyCost: providers.reduce((sum, p) => sum + p.cost.monthlyCost, 0),
      totalRequests: providers.reduce((sum, p) => sum + p.cost.monthlyUsage, 0),
      averageCostPerRequest: 0,
      costByTier: {
        free: 0,
        freemium: 0,
        paid: 0,
        premium: 0
      },
      topExpensiveProviders: providers
        .sort((a, b) => b.cost.monthlyCost - a.cost.monthlyCost)
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          cost: p.cost.monthlyCost,
          requests: p.cost.monthlyUsage,
          costPerRequest: p.cost.costPerRequest
        })),
      costTrends: [] // Would be populated with historical data
    };

    // Calculate cost by tier
    providers.forEach(p => {
      costAnalysis.costByTier[p.cost.tier] += p.cost.monthlyCost;
    });

    // Calculate average cost per request
    const totalRequests = costAnalysis.totalRequests;
    costAnalysis.averageCostPerRequest = totalRequests > 0 
      ? costAnalysis.totalMonthlyCost / totalRequests 
      : 0;

    res.json({
      success: true,
      data: costAnalysis,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Cost analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dashboard/alerts/configure
 * Configure alert thresholds
 */
router.post('/alerts/configure', async (req, res) => {
  try {
    const { responseTime, errorRate, uptime } = req.body;
    
    // Validate thresholds
    if (responseTime && (responseTime < 1000 || responseTime > 60000)) {
      return res.status(400).json({
        success: false,
        error: 'Response time threshold must be between 1000ms and 60000ms'
      });
    }
    
    if (errorRate && (errorRate < 0 || errorRate > 1)) {
      return res.status(400).json({
        success: false,
        error: 'Error rate threshold must be between 0 and 1'
      });
    }
    
    if (uptime && (uptime < 0 || uptime > 1)) {
      return res.status(400).json({
        success: false,
        error: 'Uptime threshold must be between 0 and 1'
      });
    }

    // In a real implementation, this would update the dashboard configuration
    console.log('🔧 Alert thresholds updated:', { responseTime, errorRate, uptime });
    
    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      data: { responseTime, errorRate, uptime }
    });
  } catch (error) {
    console.error('❌ Alert configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/performance
 * Get performance metrics across all providers
 */
router.get('/performance', async (req, res) => {
  try {
    const providers = await dashboard.getProviderStatuses();
    const performanceMetrics = {
      averageResponseTime: providers.reduce((sum, p) => sum + p.responseTime, 0) / providers.length,
      fastestProvider: providers.reduce((fastest, p) => 
        p.responseTime < fastest.responseTime ? p : fastest
      ),
      slowestProvider: providers.reduce((slowest, p) => 
        p.responseTime > slowest.responseTime ? p : slowest
      ),
      reliabilityDistribution: {
        excellent: providers.filter(p => p.reliability >= 0.95).length,
        good: providers.filter(p => p.reliability >= 0.85 && p.reliability < 0.95).length,
        fair: providers.filter(p => p.reliability >= 0.75 && p.reliability < 0.85).length,
        poor: providers.filter(p => p.reliability < 0.75).length
      },
      responseTimeDistribution: {
        fast: providers.filter(p => p.responseTime < 1000).length,
        medium: providers.filter(p => p.responseTime >= 1000 && p.responseTime < 3000).length,
        slow: providers.filter(p => p.responseTime >= 3000).length
      }
    };

    res.json({
      success: true,
      data: performanceMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;