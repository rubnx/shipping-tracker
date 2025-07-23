import { Request, Response } from 'express';
import { analyticsService, UserBehaviorEvent } from '../services/AnalyticsService';
import { loggingService } from '../services/LoggingService';

export class AnalyticsController {
  /**
   * Track user behavior event
   */
  public async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const event: UserBehaviorEvent = req.body;
      
      // Validate required fields
      if (!event.sessionId || !event.eventType) {
        res.status(400).json({
          error: 'Session ID and event type are required',
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Add request metadata
      event.eventData = {
        ...event.eventData,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
      };

      await analyticsService.trackEvent(event);
      
      res.json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error: any) {
      loggingService.error('Analytics tracking error', error, {
        path: req.path,
        body: req.body,
      });

      res.status(500).json({
        error: 'Failed to track event',
        code: 'TRACKING_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get shipping route analytics
   */
  public async getShippingRouteAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, carrier, timeRange = '30d' } = req.query;
      
      const analytics = await analyticsService.getShippingRouteAnalytics(
        origin as string,
        destination as string,
        carrier as string,
        timeRange as string
      );
      
      res.json({
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: analytics.length,
        },
      });
    } catch (error: any) {
      loggingService.error('Shipping route analytics error', error, {
        path: req.path,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get shipping route analytics',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get API usage analytics
   */
  public async getAPIUsageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      
      const analytics = await analyticsService.getAPIUsageAnalytics(timeRange as string);
      
      res.json({
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: analytics.length,
        },
      });
    } catch (error: any) {
      loggingService.error('API usage analytics error', error, {
        path: req.path,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get API usage analytics',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get business intelligence insights
   */
  public async getBusinessIntelligence(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      
      const intelligence = await analyticsService.getBusinessIntelligence(timeRange as string);
      
      res.json({
        data: intelligence,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Business intelligence error', error, {
        path: req.path,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get business intelligence',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get cost optimization recommendations
   */
  public async getCostOptimizationRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const recommendations = await analyticsService.getCostOptimizationRecommendations();
      
      res.json({
        data: recommendations,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: recommendations.length,
        },
      });
    } catch (error: any) {
      loggingService.error('Cost optimization recommendations error', error, {
        path: req.path,
      });

      res.status(500).json({
        error: 'Failed to get cost optimization recommendations',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get analytics dashboard data
   */
  public async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Get all analytics data for dashboard
      const [
        businessIntelligence,
        apiUsageAnalytics,
        shippingRouteAnalytics,
        costRecommendations,
      ] = await Promise.all([
        analyticsService.getBusinessIntelligence(timeRange as string),
        analyticsService.getAPIUsageAnalytics(timeRange as string),
        analyticsService.getShippingRouteAnalytics(undefined, undefined, undefined, timeRange as string),
        analyticsService.getCostOptimizationRecommendations(),
      ]);

      const dashboardData = {
        overview: businessIntelligence.overview,
        apiUsage: {
          providers: apiUsageAnalytics,
          totalRequests: apiUsageAnalytics.reduce((sum, api) => sum + api.metrics.totalRequests, 0),
          averageSuccessRate: apiUsageAnalytics.reduce((sum, api) => sum + api.metrics.successRate, 0) / apiUsageAnalytics.length,
          totalCost: businessIntelligence.apiOptimization.costAnalysis.totalCost,
        },
        routes: {
          analytics: shippingRouteAnalytics.slice(0, 10), // Top 10 routes
          totalRoutes: shippingRouteAnalytics.length,
        },
        optimization: {
          recommendations: costRecommendations.slice(0, 5), // Top 5 recommendations
          potentialSavings: costRecommendations.reduce((sum, rec) => sum + (rec.potentialSavings || 0), 0),
        },
        userInsights: businessIntelligence.userInsights,
      };
      
      res.json({
        data: dashboardData,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          timeRange,
        },
      });
    } catch (error: any) {
      loggingService.error('Dashboard data error', error, {
        path: req.path,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get dashboard data',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Clear analytics data (for privacy compliance)
   */
  public async clearAnalyticsData(req: Request, res: Response): Promise<void> {
    try {
      const { olderThanDays = 90 } = req.body;
      
      await analyticsService.clearAnalyticsData(Number(olderThanDays));
      
      res.json({
        success: true,
        message: `Analytics data older than ${olderThanDays} days cleared successfully`,
      });
    } catch (error: any) {
      loggingService.error('Clear analytics data error', error, {
        path: req.path,
        body: req.body,
      });

      res.status(500).json({
        error: 'Failed to clear analytics data',
        code: 'ANALYTICS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Export analytics data
   */
  public async exportAnalyticsData(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d', format = 'json' } = req.query;
      
      const [
        businessIntelligence,
        apiUsageAnalytics,
        shippingRouteAnalytics,
      ] = await Promise.all([
        analyticsService.getBusinessIntelligence(timeRange as string),
        analyticsService.getAPIUsageAnalytics(timeRange as string),
        analyticsService.getShippingRouteAnalytics(undefined, undefined, undefined, timeRange as string),
      ]);

      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          timeRange,
          format,
        },
        businessIntelligence,
        apiUsageAnalytics,
        shippingRouteAnalytics,
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${Date.now()}.csv`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${Date.now()}.json`);
        res.json(exportData);
      }
    } catch (error: any) {
      loggingService.error('Export analytics data error', error, {
        path: req.path,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to export analytics data',
        code: 'EXPORT_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion for demonstration
    // In production, use a proper CSV library
    const lines: string[] = [];
    
    // Add headers
    lines.push('Type,Metric,Value,Timestamp');
    
    // Add overview data
    lines.push(`Overview,Total Searches,${data.businessIntelligence.overview.totalSearches},${data.exportInfo.timestamp}`);
    lines.push(`Overview,Unique Users,${data.businessIntelligence.overview.uniqueUsers},${data.exportInfo.timestamp}`);
    
    // Add API usage data
    data.apiUsageAnalytics.forEach((api: any) => {
      lines.push(`API Usage,${api.provider} Total Requests,${api.metrics.totalRequests},${data.exportInfo.timestamp}`);
      lines.push(`API Usage,${api.provider} Success Rate,${api.metrics.successRate},${data.exportInfo.timestamp}`);
      lines.push(`API Usage,${api.provider} Average Response Time,${api.metrics.averageResponseTime},${data.exportInfo.timestamp}`);
    });
    
    return lines.join('\n');
  }
}