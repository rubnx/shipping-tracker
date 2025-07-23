import { advancedCachingService } from './AdvancedCachingService';
import { edgeCachingService } from './EdgeCachingService';
import { loggingService } from './LoggingService';

export interface CacheAnalytics {
  performance: {
    hitRate: number;
    missRate: number;
    avgResponseTime: number;
    throughput: number;
  };
  usage: {
    memoryUsage: number;
    keyCount: number;
    topKeys: Array<{ key: string; hits: number; size: number }>;
    tagDistribution: Record<string, number>;
  };
  trends: {
    hourlyHitRates: number[];
    dailyHitRates: number[];
    popularPatterns: Array<{ pattern: string; frequency: number }>;
  };
  recommendations: CacheRecommendation[];
}

export interface CacheRecommendation {
  type: 'ttl_optimization' | 'memory_optimization' | 'pattern_optimization' | 'warming_strategy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number; // percentage
}

export interface CachePattern {
  pattern: string;
  frequency: number;
  avgSize: number;
  hitRate: number;
  ttl: number;
  lastSeen: Date;
}

class CacheAnalyticsService {
  private patterns: Map<string, CachePattern> = new Map();
  private performanceHistory: Array<{
    timestamp: Date;
    hitRate: number;
    responseTime: number;
    throughput: number;
  }> = [];

  private readonly maxHistorySize = 1440; // 24 hours of minute-by-minute data

  constructor() {
    this.startAnalyticsCollection();
  }

  private startAnalyticsCollection(): void {
    // Collect analytics every minute
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000);

    // Analyze patterns every 10 minutes
    setInterval(() => {
      this.analyzePatterns();
    }, 600000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const stats = await advancedCachingService.getStats();
      const edgeStats = await edgeCachingService.getEdgeStats();

      const metrics = {
        timestamp: new Date(),
        hitRate: stats.hitRate,
        responseTime: 0, // Would be calculated from actual response times
        throughput: stats.totalHits + stats.totalMisses,
      };

      this.performanceHistory.push(metrics);

      // Keep only recent history
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
      }
    } catch (error) {
      loggingService.error('Failed to collect cache performance metrics', error as Error);
    }
  }

  private async analyzePatterns(): Promise<void> {
    try {
      const stats = await advancedCachingService.getStats();
      
      // Analyze key patterns
      for (const keyInfo of stats.topKeys) {
        const pattern = this.extractPattern(keyInfo.key);
        
        const existing = this.patterns.get(pattern);
        if (existing) {
          existing.frequency++;
          existing.avgSize = (existing.avgSize + keyInfo.size) / 2;
          existing.lastSeen = new Date();
        } else {
          this.patterns.set(pattern, {
            pattern,
            frequency: 1,
            avgSize: keyInfo.size,
            hitRate: 0, // Would be calculated from actual hit rates
            ttl: 300, // Default TTL
            lastSeen: new Date(),
          });
        }
      }

      // Clean up old patterns
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      for (const [pattern, info] of this.patterns.entries()) {
        if (info.lastSeen < oneWeekAgo) {
          this.patterns.delete(pattern);
        }
      }
    } catch (error) {
      loggingService.error('Failed to analyze cache patterns', error as Error);
    }
  }

  private extractPattern(key: string): string {
    // Extract patterns from cache keys
    // tracking:ABC123 -> tracking:*
    // user:123:preferences -> user:*:preferences
    return key.replace(/:[a-zA-Z0-9]+/g, ':*');
  }

  public async generateAnalytics(): Promise<CacheAnalytics> {
    const stats = await advancedCachingService.getStats();
    const edgeStats = await edgeCachingService.getEdgeStats();

    // Performance metrics
    const recentMetrics = this.performanceHistory.slice(-60); // Last hour
    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    const throughput = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length
      : 0;

    // Trends
    const hourlyHitRates = this.calculateHourlyTrends();
    const dailyHitRates = this.calculateDailyTrends();
    const popularPatterns = Array.from(this.patterns.entries())
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .slice(0, 10)
      .map(([pattern, info]) => ({ pattern, frequency: info.frequency }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, edgeStats);

    return {
      performance: {
        hitRate: stats.hitRate,
        missRate: stats.missRate,
        avgResponseTime,
        throughput,
      },
      usage: {
        memoryUsage: stats.memoryUsage,
        keyCount: stats.totalKeys,
        topKeys: stats.topKeys,
        tagDistribution: stats.tagStats,
      },
      trends: {
        hourlyHitRates,
        dailyHitRates,
        popularPatterns,
      },
      recommendations,
    };
  }

  private calculateHourlyTrends(): number[] {
    const trends: number[] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourMetrics = this.performanceHistory.filter(m =>
        m.timestamp >= hourStart && m.timestamp < hourEnd
      );

      const avgHitRate = hourMetrics.length > 0
        ? hourMetrics.reduce((sum, m) => sum + m.hitRate, 0) / hourMetrics.length
        : 0;

      trends.push(avgHitRate);
    }

    return trends;
  }

  private calculateDailyTrends(): number[] {
    const trends: number[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayMetrics = this.performanceHistory.filter(m =>
        m.timestamp >= dayStart && m.timestamp < dayEnd
      );

      const avgHitRate = dayMetrics.length > 0
        ? dayMetrics.reduce((sum, m) => sum + m.hitRate, 0) / dayMetrics.length
        : 0;

      trends.push(avgHitRate);
    }

    return trends;
  }

  private generateRecommendations(
    stats: any,
    edgeStats: any
  ): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];

    // Hit rate recommendations
    if (stats.hitRate < 70) {
      recommendations.push({
        type: 'ttl_optimization',
        priority: 'high',
        title: 'Increase Cache TTL for Popular Keys',
        description: `Current hit rate is ${stats.hitRate.toFixed(1)}%, which is below optimal (>70%)`,
        impact: 'Improved hit rate will reduce API calls and improve response times',
        implementation: 'Analyze popular keys and increase their TTL values',
        estimatedImprovement: 15,
      });
    }

    // Memory usage recommendations
    if (stats.memoryUsage > 80 * 1024 * 1024) { // 80MB
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Memory usage is ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        impact: 'Reduced memory usage will improve cache performance',
        implementation: 'Enable compression for large values and review TTL settings',
        estimatedImprovement: 25,
      });
    }

    // Pattern-based recommendations
    const trackingPattern = this.patterns.get('tracking:*');
    if (trackingPattern && trackingPattern.frequency > 100) {
      recommendations.push({
        type: 'pattern_optimization',
        priority: 'medium',
        title: 'Optimize Tracking Data Caching',
        description: `Tracking pattern accessed ${trackingPattern.frequency} times`,
        impact: 'Specialized caching for tracking data will improve performance',
        implementation: 'Implement dedicated tracking cache with longer TTL',
        estimatedImprovement: 20,
      });
    }

    // Edge cache recommendations
    if (edgeStats.totalHitRate < 60) {
      recommendations.push({
        type: 'warming_strategy',
        priority: 'high',
        title: 'Improve Edge Cache Warming',
        description: `Edge cache hit rate is ${edgeStats.totalHitRate.toFixed(1)}%`,
        impact: 'Better edge cache warming will reduce latency globally',
        implementation: 'Implement predictive warming based on usage patterns',
        estimatedImprovement: 30,
      });
    }

    // Low usage keys recommendation
    const lowUsageKeys = stats.topKeys.filter((key: any) => key.hits < 5);
    if (lowUsageKeys.length > stats.topKeys.length * 0.3) {
      recommendations.push({
        type: 'ttl_optimization',
        priority: 'low',
        title: 'Reduce TTL for Low-Usage Keys',
        description: `${lowUsageKeys.length} keys have very low usage`,
        impact: 'Shorter TTL for unused keys will free up memory',
        implementation: 'Implement adaptive TTL based on access patterns',
        estimatedImprovement: 10,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  public async implementRecommendation(
    recommendationType: CacheRecommendation['type'],
    parameters?: Record<string, any>
  ): Promise<boolean> {
    try {
      switch (recommendationType) {
        case 'ttl_optimization':
          return await this.optimizeTTL(parameters);
        
        case 'memory_optimization':
          return await this.optimizeMemory(parameters);
        
        case 'pattern_optimization':
          return await this.optimizePatterns(parameters);
        
        case 'warming_strategy':
          return await this.optimizeWarming(parameters);
        
        default:
          loggingService.warn('Unknown recommendation type', { recommendationType });
          return false;
      }
    } catch (error) {
      loggingService.error('Failed to implement recommendation', error as Error, {
        recommendationType,
        parameters,
      });
      return false;
    }
  }

  private async optimizeTTL(parameters?: Record<string, any>): Promise<boolean> {
    const stats = await advancedCachingService.getStats();
    
    // Increase TTL for popular keys
    for (const keyInfo of stats.topKeys.slice(0, 10)) {
      if (keyInfo.hits > 50) {
        // This would require extending the cache service to support TTL updates
        loggingService.info('Would increase TTL for popular key', {
          key: keyInfo.key,
          hits: keyInfo.hits,
          recommendedTTL: 3600, // 1 hour
        });
      }
    }

    return true;
  }

  private async optimizeMemory(parameters?: Record<string, any>): Promise<boolean> {
    // Enable compression if not already enabled
    advancedCachingService.updateConfig({
      enableCompression: true,
      compressionThreshold: 512, // Compress anything over 512 bytes
    });

    loggingService.info('Memory optimization applied', {
      compressionEnabled: true,
      threshold: 512,
    });

    return true;
  }

  private async optimizePatterns(parameters?: Record<string, any>): Promise<boolean> {
    // Implement pattern-specific optimizations
    const popularPatterns = Array.from(this.patterns.entries())
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .slice(0, 5);

    for (const [pattern, info] of popularPatterns) {
      loggingService.info('Pattern optimization opportunity', {
        pattern,
        frequency: info.frequency,
        avgSize: info.avgSize,
        recommendedTTL: Math.max(600, info.ttl * 2), // At least 10 minutes
      });
    }

    return true;
  }

  private async optimizeWarming(parameters?: Record<string, any>): Promise<boolean> {
    // Implement better warming strategy
    await edgeCachingService.warmupEdgeCache({
      popular: true,
      predictive: true,
      scheduled: true,
      userBased: true,
    });

    loggingService.info('Cache warming optimization applied');
    return true;
  }

  public getPatternAnalysis(): Array<{
    pattern: string;
    frequency: number;
    avgSize: number;
    recommendation: string;
  }> {
    return Array.from(this.patterns.entries())
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .map(([pattern, info]) => ({
        pattern,
        frequency: info.frequency,
        avgSize: info.avgSize,
        recommendation: this.getPatternRecommendation(info),
      }));
  }

  private getPatternRecommendation(pattern: CachePattern): string {
    if (pattern.frequency > 100) {
      return 'Consider dedicated caching strategy with longer TTL';
    } else if (pattern.frequency < 10) {
      return 'Consider shorter TTL or removal from cache';
    } else if (pattern.avgSize > 10240) { // 10KB
      return 'Consider compression or data structure optimization';
    } else {
      return 'Current caching strategy appears optimal';
    }
  }

  public async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const analytics = await this.generateAnalytics();

    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    } else {
      // CSV format for performance data
      const csvRows = ['timestamp,hitRate,responseTime,throughput'];
      
      this.performanceHistory.forEach(metric => {
        csvRows.push([
          metric.timestamp.toISOString(),
          metric.hitRate.toString(),
          metric.responseTime.toString(),
          metric.throughput.toString(),
        ].join(','));
      });

      return csvRows.join('\n');
    }
  }

  public cleanup(): void {
    this.patterns.clear();
    this.performanceHistory = [];
  }
}

export const cacheAnalyticsService = new CacheAnalyticsService();