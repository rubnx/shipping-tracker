import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { TrackingService } from '../services/TrackingService';
import { APIProviderDashboard } from '../services/APIProviderDashboard';

const router = Router();
const trackingService = new TrackingService();

// GET /api/dashboard/providers
// Get comprehensive provider status dashboard
router.get('/providers', asyncHandler(async (req: Request, res: Response) => {
  const providerHealth = trackingService.getProviderHealth();
  
  // Create dashboard instance (in real implementation, this would be injected)
  const dashboard = new APIProviderDashboard(new Map());
  const stats = dashboard.getDashboardStats();
  const providersByCategory = dashboard.getProvidersByCategory();
  const recommendations = dashboard.getRecommendations();

  res.json({
    success: true,
    data: {
      overview: {
        totalProviders: stats.totalProviders,
        activeProviders: stats.activeProviders,
        averageReliability: stats.averageReliability,
        overallHealth: providerHealth.overallHealth,
        successRateToday: stats.successRateToday,
        totalRequestsToday: stats.totalRequestsToday
      },
      costBreakdown: stats.costBreakdown,
      coverageStats: stats.coverageStats,
      providersByCategory,
      recommendations,
      lastUpdated: new Date().toISOString()
    },
    message: 'Provider dashboard data retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/dashboard/providers/:category
// Get providers by specific category
router.get('/providers/:category', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  
  const dashboard = new APIProviderDashboard(new Map());
  const providersByCategory = dashboard.getProvidersByCategory();
  
  const validCategories = Object.keys(providersByCategory);
  const categoryKey = validCategories.find(key => 
    key.toLowerCase().replace(/[^a-z]/g, '') === category.toLowerCase().replace(/[^a-z]/g, '')
  );
  
  if (!categoryKey) {
    return res.status(404).json({
      success: false,
      error: `Category '${category}' not found`,
      availableCategories: validCategories,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
  
  res.json({
    success: true,
    data: {
      category: categoryKey,
      providers: providersByCategory[categoryKey],
      count: providersByCategory[categoryKey].length
    },
    message: `Providers for category '${categoryKey}' retrieved successfully`,
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/dashboard/stats
// Get high-level statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = new APIProviderDashboard(new Map());
  const stats = dashboard.getDashboardStats();
  const providerHealth = trackingService.getProviderHealth();
  
  res.json({
    success: true,
    data: {
      providers: {
        total: stats.totalProviders,
        active: stats.activeProviders,
        inactive: stats.totalProviders - stats.activeProviders,
        averageReliability: Math.round(stats.averageReliability * 100) / 100
      },
      performance: {
        overallHealth: providerHealth.overallHealth,
        successRateToday: Math.round(stats.successRateToday * 100 * 100) / 100, // percentage
        totalRequestsToday: stats.totalRequestsToday
      },
      coverage: {
        costBreakdown: stats.costBreakdown,
        geographic: stats.coverageStats
      },
      timestamp: new Date().toISOString()
    },
    message: 'Dashboard statistics retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/dashboard/recommendations
// Get recommendations for improving the API ecosystem
router.get('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = new APIProviderDashboard(new Map());
  const recommendations = dashboard.getRecommendations();
  
  res.json({
    success: true,
    data: {
      recommendations,
      count: recommendations.length,
      priority: recommendations.length > 0 ? 'high' : 'low'
    },
    message: 'Recommendations retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/dashboard/coverage
// Get detailed coverage analysis
router.get('/coverage', asyncHandler(async (req: Request, res: Response) => {
  const dashboard = new APIProviderDashboard(new Map());
  const providersByCategory = dashboard.getProvidersByCategory();
  
  // Analyze coverage by tracking type
  const coverageAnalysis = {
    trackingTypes: {
      container: 0,
      booking: 0,
      bol: 0,
      tracking: 0,
      express: 0,
      vessel: 0
    },
    geographic: {
      global: 0,
      'asia-pacific': 0,
      europe: 0,
      americas: 0,
      mediterranean: 0,
      usa: 0,
      canada: 0,
      uk: 0
    },
    costTiers: {
      free: { count: 0, providers: [] as string[] },
      freemium: { count: 0, providers: [] as string[] },
      paid: { count: 0, providers: [] as string[] }
    }
  };
  
  // Calculate coverage statistics
  Object.values(providersByCategory).flat().forEach(provider => {
    // Count tracking types
    provider.supportedTypes.forEach(type => {
      if (type in coverageAnalysis.trackingTypes) {
        coverageAnalysis.trackingTypes[type as keyof typeof coverageAnalysis.trackingTypes]++;
      }
    });
    
    // Count geographic coverage
    provider.coverage.forEach(region => {
      if (region in coverageAnalysis.geographic) {
        coverageAnalysis.geographic[region as keyof typeof coverageAnalysis.geographic]++;
      }
    });
    
    // Count cost tiers
    if (provider.cost in coverageAnalysis.costTiers) {
      coverageAnalysis.costTiers[provider.cost].count++;
      coverageAnalysis.costTiers[provider.cost].providers.push(provider.name);
    }
  });
  
  res.json({
    success: true,
    data: {
      summary: {
        totalProviders: Object.values(providersByCategory).flat().length,
        categoriesCount: Object.keys(providersByCategory).length
      },
      trackingTypeCoverage: coverageAnalysis.trackingTypes,
      geographicCoverage: coverageAnalysis.geographic,
      costTierBreakdown: coverageAnalysis.costTiers,
      providersByCategory: Object.keys(providersByCategory).map(category => ({
        category,
        count: providersByCategory[category].length,
        activeCount: providersByCategory[category].filter(p => p.status === 'active').length
      }))
    },
    message: 'Coverage analysis retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

export { router as dashboardRoutes };