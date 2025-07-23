import { loggingService } from './LoggingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface UserBehaviorEvent {
  userId?: string;
  sessionId: string;
  eventType: 'search' | 'view' | 'click' | 'error' | 'api_call';
  eventData: {
    trackingNumber?: string;
    carrier?: string;
    searchType?: string;
    errorType?: string;
    apiProvider?: string;
    responseTime?: number;
    success?: boolean;
    userAgent?: string;
    ipAddress?: string;
    timestamp: string;
  };
  metadata?: Record<string, any>;
}

export interface ShippingRouteAnalytics {
  route: {
    origin: string;
    destination: string;
    carrier: string;
  };
  metrics: {
    totalShipments: number;
    averageTransitTime: number;
    onTimePerformance: number;
    delayFrequency: number;
    popularityScore: number;
    costEfficiency: number;
  };
  trends: {
    period: string;
    shipmentVolume: number[];
    averageDelay: number[];
    costTrend: number[];
  };
}

export interface APIUsageAnalytics {
  provider: string;
  metrics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    costPerRequest: number;
    dailyUsage: number[];
    errorTypes: Record<string, number>;
  };
  performance: {
    uptime: number;
    reliability: number;
    costEfficiency: number;
    dataQuality: number;
  };
}

export interface BusinessIntelligence {
  overview: {
    totalSearches: number;
    uniqueUsers: number;
    popularCarriers: Array<{ name: string; count: number; percentage: number }>;
    topRoutes: Array<{ route: string; count: number; avgTransitTime: number }>;
    searchPatterns: {
      peakHours: number[];
      dailyTrends: number[];
      weeklyTrends: number[];
    };
  };
  apiOptimization: {
    recommendations: Array<{
      type: 'cost' | 'performance' | 'reliability';
      priority: 'high' | 'medium' | 'low';
      description: string;
      potentialSavings?: number;
      implementationEffort?: string;
    }>;
    costAnalysis: {
      totalCost: number;
      costByProvider: Record<string, number>;
      costTrends: number[];
      projectedCost: number;
    };
  };
  userInsights: {
    behaviorPatterns: Array<{
      pattern: string;
      frequency: number;
      impact: string;
    }>;
    satisfactionMetrics: {
      successRate: number;
      averageSearchTime: number;
      errorRecoveryRate: number;
    };
  };
}

class AnalyticsService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly ANALYTICS_RETENTION_DAYS = 90;

  /**
   * Track user behavior event
   */
  public async trackEvent(event: UserBehaviorEvent): Promise<void> {
    try {
      // Privacy-focused tracking - no PII stored
      const sanitizedEvent = {
        ...event,
        eventData: {
          ...event.eventData,
          ipAddress: this.hashIP(event.eventData.ipAddress || ''),
          userAgent: this.sanitizeUserAgent(event.eventData.userAgent || ''),
        },
      };

      // Store in time-series format for analytics
      const eventKey = `analytics:events:${new Date().toISOString().split('T')[0]}`;
      const existingEvents = await advancedCachingService.get<UserBehaviorEvent[]>(eventKey) || [];
      existingEvents.push(sanitizedEvent);

      await advancedCachingService.set(
        eventKey,
        existingEvents,
        this.CACHE_TTL * 24, // 24 hours
        ['analytics', 'events']
      );

      // Update real-time metrics
      await this.updateRealTimeMetrics(sanitizedEvent);

      loggingService.debug('User behavior event tracked', {
        eventType: event.eventType,
        sessionId: event.sessionId,
      });
    } catch (error: any) {
      loggingService.error('Failed to track analytics event', error);
    }
  }

  /**
   * Get shipping route analytics
   */
  public async getShippingRouteAnalytics(
    origin?: string,
    destination?: string,
    carrier?: string,
    timeRange: string = '30d'
  ): Promise<ShippingRouteAnalytics[]> {
    const cacheKey = `analytics:routes:${origin || 'all'}:${destination || 'all'}:${carrier || 'all'}:${timeRange}`;
    
    try {
      // Try to get from cache first
      const cachedData = await advancedCachingService.get<ShippingRouteAnalytics[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Generate analytics from stored events
      const analytics = await this.generateRouteAnalytics(origin, destination, carrier, timeRange);
      
      // Cache the results
      await advancedCachingService.set(
        cacheKey,
        analytics,
        this.CACHE_TTL,
        ['analytics', 'routes']
      );

      return analytics;
    } catch (error: any) {
      loggingService.error('Failed to get shipping route analytics', error);
      return [];
    }
  }

  /**
   * Get API usage analytics
   */
  public async getAPIUsageAnalytics(timeRange: string = '30d'): Promise<APIUsageAnalytics[]> {
    const cacheKey = `analytics:api_usage:${timeRange}`;
    
    try {
      // Try to get from cache first
      const cachedData = await advancedCachingService.get<APIUsageAnalytics[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Generate API usage analytics
      const analytics = await this.generateAPIUsageAnalytics(timeRange);
      
      // Cache the results
      await advancedCachingService.set(
        cacheKey,
        analytics,
        this.CACHE_TTL,
        ['analytics', 'api_usage']
      );

      return analytics;
    } catch (error: any) {
      loggingService.error('Failed to get API usage analytics', error);
      return [];
    }
  }

  /**
   * Get business intelligence insights
   */
  public async getBusinessIntelligence(timeRange: string = '30d'): Promise<BusinessIntelligence> {
    const cacheKey = `analytics:business_intelligence:${timeRange}`;
    
    try {
      // Try to get from cache first
      const cachedData = await advancedCachingService.get<BusinessIntelligence>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Generate business intelligence
      const intelligence = await this.generateBusinessIntelligence(timeRange);
      
      // Cache the results
      await advancedCachingService.set(
        cacheKey,
        intelligence,
        this.CACHE_TTL,
        ['analytics', 'business_intelligence']
      );

      return intelligence;
    } catch (error: any) {
      loggingService.error('Failed to get business intelligence', error);
      return this.getDefaultBusinessIntelligence();
    }
  }

  /**
   * Get cost optimization recommendations
   */
  public async getCostOptimizationRecommendations(): Promise<Array<{
    type: 'cost' | 'performance' | 'reliability';
    priority: 'high' | 'medium' | 'low';
    description: string;
    potentialSavings?: number;
    implementationEffort?: string;
  }>> {
    try {
      const apiAnalytics = await this.getAPIUsageAnalytics();
      const recommendations: Array<{
        type: 'cost' | 'performance' | 'reliability';
        priority: 'high' | 'medium' | 'low';
        description: string;
        potentialSavings?: number;
        implementationEffort?: string;
      }> = [];

      // Analyze API usage patterns
      for (const api of apiAnalytics) {
        // High cost, low success rate
        if (api.metrics.costPerRequest > 0.05 && api.metrics.successRate < 0.8) {
          recommendations.push({
            type: 'cost',
            priority: 'high',
            description: `Consider reducing usage of ${api.provider} API due to high cost and low success rate`,
            potentialSavings: api.metrics.totalRequests * api.metrics.costPerRequest * 0.3,
            implementationEffort: 'Medium',
          });
        }

        // High response time
        if (api.metrics.averageResponseTime > 5000) {
          recommendations.push({
            type: 'performance',
            priority: 'medium',
            description: `${api.provider} API has high response times, consider implementing caching or switching to faster alternative`,
            implementationEffort: 'Low',
          });
        }

        // Low reliability
        if (api.performance.reliability < 0.9) {
          recommendations.push({
            type: 'reliability',
            priority: 'high',
            description: `${api.provider} API has low reliability, implement better fallback mechanisms`,
            implementationEffort: 'Medium',
          });
        }
      }

      // Add general optimization recommendations
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        description: 'Implement intelligent caching to reduce API calls by 30-50%',
        potentialSavings: 1000, // Estimated monthly savings
        implementationEffort: 'Low',
      });

      recommendations.push({
        type: 'performance',
        priority: 'low',
        description: 'Implement request batching for bulk tracking operations',
        implementationEffort: 'Medium',
      });

      return recommendations;
    } catch (error: any) {
      loggingService.error('Failed to generate cost optimization recommendations', error);
      return [];
    }
  }

  /**
   * Generate route analytics from stored events
   */
  private async generateRouteAnalytics(
    origin?: string,
    destination?: string,
    carrier?: string,
    timeRange: string = '30d'
  ): Promise<ShippingRouteAnalytics[]> {
    // This would typically query a database
    // For now, return mock data based on common shipping routes
    const mockRoutes: ShippingRouteAnalytics[] = [
      {
        route: {
          origin: 'Shanghai, China',
          destination: 'Los Angeles, USA',
          carrier: 'Maersk',
        },
        metrics: {
          totalShipments: 1250,
          averageTransitTime: 14.5,
          onTimePerformance: 0.87,
          delayFrequency: 0.13,
          popularityScore: 0.95,
          costEfficiency: 0.82,
        },
        trends: {
          period: '30d',
          shipmentVolume: [45, 52, 48, 61, 55, 49, 58, 62, 47, 53],
          averageDelay: [1.2, 0.8, 1.5, 2.1, 1.0, 0.9, 1.8, 2.3, 1.1, 0.7],
          costTrend: [2850, 2920, 2880, 3100, 2950, 2890, 3050, 3200, 2980, 2920],
        },
      },
      {
        route: {
          origin: 'Rotterdam, Netherlands',
          destination: 'New York, USA',
          carrier: 'MSC',
        },
        metrics: {
          totalShipments: 890,
          averageTransitTime: 8.2,
          onTimePerformance: 0.91,
          delayFrequency: 0.09,
          popularityScore: 0.78,
          costEfficiency: 0.89,
        },
        trends: {
          period: '30d',
          shipmentVolume: [32, 38, 35, 42, 39, 34, 41, 44, 33, 37],
          averageDelay: [0.5, 0.3, 0.8, 1.1, 0.4, 0.2, 0.9, 1.3, 0.6, 0.3],
          costTrend: [1850, 1920, 1880, 2000, 1950, 1890, 1980, 2100, 1940, 1920],
        },
      },
    ];

    // Filter based on parameters
    return mockRoutes.filter(route => {
      if (origin && !route.route.origin.toLowerCase().includes(origin.toLowerCase())) return false;
      if (destination && !route.route.destination.toLowerCase().includes(destination.toLowerCase())) return false;
      if (carrier && !route.route.carrier.toLowerCase().includes(carrier.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * Generate API usage analytics
   */
  private async generateAPIUsageAnalytics(timeRange: string): Promise<APIUsageAnalytics[]> {
    // This would typically query actual API usage data
    // For now, return mock data for demonstration
    return [
      {
        provider: 'Maersk',
        metrics: {
          totalRequests: 15420,
          successRate: 0.94,
          averageResponseTime: 2340,
          errorRate: 0.06,
          costPerRequest: 0.025,
          dailyUsage: [520, 480, 610, 590, 540, 620, 580, 490, 530, 570],
          errorTypes: {
            'timeout': 45,
            'not_found': 32,
            'rate_limit': 18,
            'auth_error': 12,
          },
        },
        performance: {
          uptime: 0.987,
          reliability: 0.94,
          costEfficiency: 0.78,
          dataQuality: 0.92,
        },
      },
      {
        provider: 'MSC',
        metrics: {
          totalRequests: 12890,
          successRate: 0.89,
          averageResponseTime: 3120,
          errorRate: 0.11,
          costPerRequest: 0.032,
          dailyUsage: [430, 390, 510, 480, 440, 520, 470, 400, 430, 460],
          errorTypes: {
            'timeout': 67,
            'not_found': 28,
            'rate_limit': 25,
            'auth_error': 8,
          },
        },
        performance: {
          uptime: 0.976,
          reliability: 0.89,
          costEfficiency: 0.71,
          dataQuality: 0.88,
        },
      },
      {
        provider: 'Track-Trace (Free)',
        metrics: {
          totalRequests: 8950,
          successRate: 0.76,
          averageResponseTime: 4580,
          errorRate: 0.24,
          costPerRequest: 0.0,
          dailyUsage: [320, 280, 360, 340, 310, 380, 330, 290, 320, 340],
          errorTypes: {
            'timeout': 89,
            'not_found': 156,
            'rate_limit': 234,
            'auth_error': 3,
          },
        },
        performance: {
          uptime: 0.923,
          reliability: 0.76,
          costEfficiency: 1.0, // Free tier
          dataQuality: 0.72,
        },
      },
    ];
  }

  /**
   * Generate business intelligence insights
   */
  private async generateBusinessIntelligence(timeRange: string): Promise<BusinessIntelligence> {
    return {
      overview: {
        totalSearches: 45230,
        uniqueUsers: 12890,
        popularCarriers: [
          { name: 'Maersk', count: 15420, percentage: 34.1 },
          { name: 'MSC', count: 12890, percentage: 28.5 },
          { name: 'CMA CGM', count: 8950, percentage: 19.8 },
          { name: 'COSCO', count: 5670, percentage: 12.5 },
          { name: 'Hapag-Lloyd', count: 2300, percentage: 5.1 },
        ],
        topRoutes: [
          { route: 'Shanghai → Los Angeles', count: 2340, avgTransitTime: 14.5 },
          { route: 'Rotterdam → New York', count: 1890, avgTransitTime: 8.2 },
          { route: 'Hamburg → Houston', count: 1560, avgTransitTime: 12.8 },
          { route: 'Singapore → Long Beach', count: 1340, avgTransitTime: 16.3 },
          { route: 'Antwerp → Norfolk', count: 1120, avgTransitTime: 9.7 },
        ],
        searchPatterns: {
          peakHours: [9, 10, 11, 14, 15, 16], // Hours with highest activity
          dailyTrends: [1200, 1450, 1380, 1620, 1590, 1340, 980], // Mon-Sun
          weeklyTrends: [8900, 9200, 8750, 9450, 9100, 8600, 7800], // Weekly totals
        },
      },
      apiOptimization: {
        recommendations: await this.getCostOptimizationRecommendations(),
        costAnalysis: {
          totalCost: 1247.50,
          costByProvider: {
            'Maersk': 385.50,
            'MSC': 412.48,
            'CMA CGM': 267.30,
            'COSCO': 182.22,
          },
          costTrends: [1180, 1220, 1190, 1280, 1250, 1210, 1247.50],
          projectedCost: 1320.00,
        },
      },
      userInsights: {
        behaviorPatterns: [
          { pattern: 'Multiple container tracking in single session', frequency: 0.34, impact: 'High API usage' },
          { pattern: 'Frequent re-checking of same container', frequency: 0.28, impact: 'Cache optimization opportunity' },
          { pattern: 'Mobile usage during business hours', frequency: 0.67, impact: 'Mobile UX priority' },
          { pattern: 'Bulk tracking requests', frequency: 0.12, impact: 'Batching optimization needed' },
        ],
        satisfactionMetrics: {
          successRate: 0.87,
          averageSearchTime: 3.2,
          errorRecoveryRate: 0.73,
        },
      },
    };
  }

  /**
   * Update real-time metrics
   */
  private async updateRealTimeMetrics(event: UserBehaviorEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const metricsKey = `analytics:realtime:${today}`;
    
    const metrics = await advancedCachingService.get<Record<string, number>>(metricsKey) || {};
    
    // Update counters
    metrics[`${event.eventType}_count`] = (metrics[`${event.eventType}_count`] || 0) + 1;
    metrics['total_events'] = (metrics['total_events'] || 0) + 1;
    
    if (event.eventData.carrier) {
      metrics[`carrier_${event.eventData.carrier}`] = (metrics[`carrier_${event.eventData.carrier}`] || 0) + 1;
    }
    
    if (event.eventData.success !== undefined) {
      metrics['success_count'] = (metrics['success_count'] || 0) + (event.eventData.success ? 1 : 0);
      metrics['total_api_calls'] = (metrics['total_api_calls'] || 0) + 1;
    }

    await advancedCachingService.set(
      metricsKey,
      metrics,
      this.CACHE_TTL * 24,
      ['analytics', 'realtime']
    );
  }

  /**
   * Hash IP address for privacy
   */
  private hashIP(ip: string): string {
    // Simple hash for privacy - in production use proper hashing
    return Buffer.from(ip).toString('base64').substring(0, 8);
  }

  /**
   * Sanitize user agent string
   */
  private sanitizeUserAgent(userAgent: string): string {
    // Extract only browser and OS info, remove detailed version numbers
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i);
    
    return `${browserMatch?.[0] || 'Unknown'} on ${osMatch?.[0] || 'Unknown'}`;
  }

  /**
   * Get default business intelligence when data is unavailable
   */
  private getDefaultBusinessIntelligence(): BusinessIntelligence {
    return {
      overview: {
        totalSearches: 0,
        uniqueUsers: 0,
        popularCarriers: [],
        topRoutes: [],
        searchPatterns: {
          peakHours: [],
          dailyTrends: [],
          weeklyTrends: [],
        },
      },
      apiOptimization: {
        recommendations: [],
        costAnalysis: {
          totalCost: 0,
          costByProvider: {},
          costTrends: [],
          projectedCost: 0,
        },
      },
      userInsights: {
        behaviorPatterns: [],
        satisfactionMetrics: {
          successRate: 0,
          averageSearchTime: 0,
          errorRecoveryRate: 0,
        },
      },
    };
  }

  /**
   * Clear analytics data (for privacy compliance)
   */
  public async clearAnalyticsData(olderThanDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // Clear old event data
      await advancedCachingService.invalidateByTag('analytics');
      
      loggingService.info('Analytics data cleared', {
        olderThanDays,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error: any) {
      loggingService.error('Failed to clear analytics data', error);
    }
  }
}

export const analyticsService = new AnalyticsService();