import { loggingService } from './LoggingService';
import { alertingService } from './AlertingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface APMMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ServiceHealthMetric {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  lastCheck: string;
  dependencies: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  }>;
}

export interface SLAMetric {
  name: string;
  target: number;
  current: number;
  period: string;
  status: 'meeting' | 'at_risk' | 'breached';
  history: Array<{
    timestamp: string;
    value: number;
  }>;
}

export interface BusinessMetric {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
  target?: number;
  status?: 'good' | 'warning' | 'critical';
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // notification channels
  tags: Record<string, string>;
}

class APMService {
  private metrics: Map<string, APMMetric[]> = new Map();
  private serviceHealth: Map<string, ServiceHealthMetric> = new Map();
  private slaMetrics: Map<string, SLAMetric> = new Map();
  private businessMetrics: Map<string, BusinessMetric> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private readonly METRIC_RETENTION_HOURS = 24;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultSLAs();
    this.initializeDefaultAlertRules();
    this.startHealthChecks();
    
    loggingService.info('APM Service initialized');
  }

  /**
   * Record a metric
   */
  public recordMetric(metric: APMMetric): void {
    try {
      const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
      
      if (!this.metrics.has(key)) {
        this.metrics.set(key, []);
      }
      
      const metricArray = this.metrics.get(key)!;
      metricArray.push(metric);
      
      // Keep only recent metrics
      const cutoffTime = Date.now() - (this.METRIC_RETENTION_HOURS * 60 * 60 * 1000);
      const filteredMetrics = metricArray.filter(m => 
        new Date(m.timestamp).getTime() > cutoffTime
      );
      
      this.metrics.set(key, filteredMetrics);
      
      // Check alert rules
      this.checkAlertRules(metric);
      
      loggingService.debug('Metric recorded', {
        name: metric.name,
        value: metric.value,
        tags: metric.tags,
      });
    } catch (error: any) {
      loggingService.error('Failed to record metric', error);
    }
  }

  /**
   * Get metrics by name and tags
   */
  public getMetrics(
    name: string,
    tags: Record<string, string> = {},
    timeRange: number = 3600000 // 1 hour default
  ): APMMetric[] {
    try {
      const key = `${name}:${JSON.stringify(tags)}`;
      const metrics = this.metrics.get(key) || [];
      
      const cutoffTime = Date.now() - timeRange;
      return metrics.filter(m => 
        new Date(m.timestamp).getTime() > cutoffTime
      );
    } catch (error: any) {
      loggingService.error('Failed to get metrics', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics
   */
  public getAggregatedMetrics(
    name: string,
    tags: Record<string, string> = {},
    timeRange: number = 3600000,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' = 'avg'
  ): number {
    try {
      const metrics = this.getMetrics(name, tags, timeRange);
      
      if (metrics.length === 0) return 0;
      
      const values = metrics.map(m => m.value);
      
      switch (aggregation) {
        case 'avg':
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        case 'sum':
          return values.reduce((sum, val) => sum + val, 0);
        case 'min':
          return Math.min(...values);
        case 'max':
          return Math.max(...values);
        case 'count':
          return values.length;
        default:
          return 0;
      }
    } catch (error: any) {
      loggingService.error('Failed to get aggregated metrics', error);
      return 0;
    }
  }

  /**
   * Update service health
   */
  public updateServiceHealth(health: ServiceHealthMetric): void {
    try {
      this.serviceHealth.set(health.service, health);
      
      // Record as metrics for historical tracking
      this.recordMetric({
        name: 'service.response_time',
        value: health.responseTime,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: { service: health.service },
      });
      
      this.recordMetric({
        name: 'service.error_rate',
        value: health.errorRate,
        unit: 'percent',
        timestamp: new Date().toISOString(),
        tags: { service: health.service },
      });
      
      this.recordMetric({
        name: 'service.throughput',
        value: health.throughput,
        unit: 'requests_per_second',
        timestamp: new Date().toISOString(),
        tags: { service: health.service },
      });
      
      // Check for service health alerts
      if (health.status === 'unhealthy') {
        alertingService.createAlert({
          type: 'service_health',
          severity: 'high',
          title: `Service ${health.service} is unhealthy`,
          description: `Service ${health.service} has status: ${health.status}, error rate: ${health.errorRate}%`,
          source: 'apm',
          metadata: { service: health.service, health },
        });
      }
      
      loggingService.debug('Service health updated', {
        service: health.service,
        status: health.status,
        responseTime: health.responseTime,
        errorRate: health.errorRate,
      });
    } catch (error: any) {
      loggingService.error('Failed to update service health', error);
    }
  }

  /**
   * Get service health
   */
  public getServiceHealth(service?: string): ServiceHealthMetric[] {
    try {
      if (service) {
        const health = this.serviceHealth.get(service);
        return health ? [health] : [];
      }
      
      return Array.from(this.serviceHealth.values());
    } catch (error: any) {
      loggingService.error('Failed to get service health', error);
      return [];
    }
  }

  /**
   * Update SLA metric
   */
  public updateSLAMetric(sla: SLAMetric): void {
    try {
      // Add current value to history
      sla.history.push({
        timestamp: new Date().toISOString(),
        value: sla.current,
      });
      
      // Keep only recent history (last 24 hours)
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
      sla.history = sla.history.filter(h => 
        new Date(h.timestamp).getTime() > cutoffTime
      );
      
      this.slaMetrics.set(sla.name, sla);
      
      // Check for SLA breaches
      if (sla.status === 'breached') {
        alertingService.createAlert({
          type: 'sla_breach',
          severity: 'critical',
          title: `SLA breach: ${sla.name}`,
          description: `SLA ${sla.name} is breached. Current: ${sla.current}, Target: ${sla.target}`,
          source: 'apm',
          metadata: { sla },
        });
      } else if (sla.status === 'at_risk') {
        alertingService.createAlert({
          type: 'sla_at_risk',
          severity: 'medium',
          title: `SLA at risk: ${sla.name}`,
          description: `SLA ${sla.name} is at risk. Current: ${sla.current}, Target: ${sla.target}`,
          source: 'apm',
          metadata: { sla },
        });
      }
      
      loggingService.debug('SLA metric updated', {
        name: sla.name,
        current: sla.current,
        target: sla.target,
        status: sla.status,
      });
    } catch (error: any) {
      loggingService.error('Failed to update SLA metric', error);
    }
  }

  /**
   * Get SLA metrics
   */
  public getSLAMetrics(): SLAMetric[] {
    try {
      return Array.from(this.slaMetrics.values());
    } catch (error: any) {
      loggingService.error('Failed to get SLA metrics', error);
      return [];
    }
  }

  /**
   * Update business metric
   */
  public updateBusinessMetric(metric: BusinessMetric): void {
    try {
      this.businessMetrics.set(metric.name, metric);
      
      // Record as APM metric for historical tracking
      this.recordMetric({
        name: `business.${metric.name}`,
        value: metric.value,
        unit: 'count',
        timestamp: new Date().toISOString(),
        tags: { type: 'business_metric' },
        metadata: { change: metric.change, trend: metric.trend },
      });
      
      loggingService.debug('Business metric updated', {
        name: metric.name,
        value: metric.value,
        change: metric.change,
        trend: metric.trend,
      });
    } catch (error: any) {
      loggingService.error('Failed to update business metric', error);
    }
  }

  /**
   * Get business metrics
   */
  public getBusinessMetrics(): BusinessMetric[] {
    try {
      return Array.from(this.businessMetrics.values());
    } catch (error: any) {
      loggingService.error('Failed to get business metrics', error);
      return [];
    }
  }

  /**
   * Create alert rule
   */
  public createAlertRule(rule: AlertRule): void {
    try {
      this.alertRules.set(rule.id, rule);
      
      loggingService.info('Alert rule created', {
        id: rule.id,
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
      });
    } catch (error: any) {
      loggingService.error('Failed to create alert rule', error);
    }
  }

  /**
   * Get alert rules
   */
  public getAlertRules(): AlertRule[] {
    try {
      return Array.from(this.alertRules.values());
    } catch (error: any) {
      loggingService.error('Failed to get alert rules', error);
      return [];
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  public async getDashboardData(): Promise<{
    overview: {
      totalRequests: number;
      errorRate: number;
      averageResponseTime: number;
      uptime: number;
    };
    services: ServiceHealthMetric[];
    slas: SLAMetric[];
    businessMetrics: BusinessMetric[];
    recentAlerts: any[];
    topMetrics: Array<{
      name: string;
      value: number;
      unit: string;
      trend: 'up' | 'down' | 'stable';
    }>;
  }> {
    try {
      // Calculate overview metrics
      const totalRequests = this.getAggregatedMetrics('http.requests', {}, 3600000, 'sum');
      const errorRate = this.getAggregatedMetrics('http.errors', {}, 3600000, 'avg');
      const averageResponseTime = this.getAggregatedMetrics('http.response_time', {}, 3600000, 'avg');
      
      // Calculate uptime based on service health
      const services = this.getServiceHealth();
      const uptime = services.length > 0 
        ? services.reduce((sum, s) => sum + s.uptime, 0) / services.length 
        : 100;

      // Get recent alerts
      const recentAlerts = alertingService.getAlerts(false).slice(0, 10);

      // Get top metrics
      const topMetrics = [
        {
          name: 'API Calls',
          value: totalRequests,
          unit: 'requests/hour',
          trend: 'up' as const,
        },
        {
          name: 'Error Rate',
          value: errorRate,
          unit: '%',
          trend: errorRate > 5 ? 'up' as const : 'stable' as const,
        },
        {
          name: 'Response Time',
          value: averageResponseTime,
          unit: 'ms',
          trend: averageResponseTime > 1000 ? 'up' as const : 'stable' as const,
        },
        {
          name: 'Uptime',
          value: uptime,
          unit: '%',
          trend: uptime > 99 ? 'stable' as const : 'down' as const,
        },
      ];

      return {
        overview: {
          totalRequests,
          errorRate,
          averageResponseTime,
          uptime,
        },
        services,
        slas: this.getSLAMetrics(),
        businessMetrics: this.getBusinessMetrics(),
        recentAlerts,
        topMetrics,
      };
    } catch (error: any) {
      loggingService.error('Failed to get dashboard data', error);
      return {
        overview: { totalRequests: 0, errorRate: 0, averageResponseTime: 0, uptime: 0 },
        services: [],
        slas: [],
        businessMetrics: [],
        recentAlerts: [],
        topMetrics: [],
      };
    }
  }

  /**
   * Initialize default SLA metrics
   */
  private initializeDefaultSLAs(): void {
    const defaultSLAs: SLAMetric[] = [
      {
        name: 'API Response Time',
        target: 2000, // 2 seconds
        current: 0,
        period: '24h',
        status: 'meeting',
        history: [],
      },
      {
        name: 'API Availability',
        target: 99.9, // 99.9%
        current: 100,
        period: '24h',
        status: 'meeting',
        history: [],
      },
      {
        name: 'Error Rate',
        target: 1, // 1%
        current: 0,
        period: '24h',
        status: 'meeting',
        history: [],
      },
    ];

    defaultSLAs.forEach(sla => {
      this.slaMetrics.set(sla.name, sla);
    });
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'http.errors',
        condition: 'greater_than',
        threshold: 5, // 5%
        duration: 300, // 5 minutes
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        tags: { type: 'error_rate' },
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        metric: 'http.response_time',
        condition: 'greater_than',
        threshold: 5000, // 5 seconds
        duration: 600, // 10 minutes
        severity: 'medium',
        enabled: true,
        channels: ['email'],
        tags: { type: 'performance' },
      },
      {
        id: 'low_uptime',
        name: 'Low Service Uptime',
        metric: 'service.uptime',
        condition: 'less_than',
        threshold: 95, // 95%
        duration: 300, // 5 minutes
        severity: 'critical',
        enabled: true,
        channels: ['email', 'slack', 'pagerduty'],
        tags: { type: 'availability' },
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Check alert rules against metric
   */
  private checkAlertRules(metric: APMMetric): void {
    try {
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled || rule.metric !== metric.name) continue;
        
        let triggered = false;
        
        switch (rule.condition) {
          case 'greater_than':
            triggered = metric.value > rule.threshold;
            break;
          case 'less_than':
            triggered = metric.value < rule.threshold;
            break;
          case 'equals':
            triggered = metric.value === rule.threshold;
            break;
          case 'not_equals':
            triggered = metric.value !== rule.threshold;
            break;
        }
        
        if (triggered) {
          alertingService.createAlert({
            type: 'metric_threshold',
            severity: rule.severity,
            title: rule.name,
            description: `Metric ${rule.metric} ${rule.condition} ${rule.threshold}. Current value: ${metric.value}`,
            source: 'apm',
            metadata: { rule, metric },
          });
        }
      }
    } catch (error: any) {
      loggingService.error('Failed to check alert rules', error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    try {
      // Check database health
      await this.checkDatabaseHealth();
      
      // Check cache health
      await this.checkCacheHealth();
      
      // Check external API health
      await this.checkExternalAPIHealth();
      
      // Update SLA metrics based on current health
      await this.updateSLAMetricsFromHealth();
    } catch (error: any) {
      loggingService.error('Health check failed', error);
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<void> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let responseTime = 0;
    
    try {
      // Simple database ping - would be replaced with actual database check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        status = 'degraded';
      }
    } catch (error) {
      status = 'unhealthy';
      responseTime = Date.now() - startTime;
    }
    
    this.updateServiceHealth({
      service: 'database',
      status,
      responseTime,
      errorRate: status === 'unhealthy' ? 100 : 0,
      throughput: 100, // Mock value
      uptime: status === 'unhealthy' ? 95 : 99.9,
      lastCheck: new Date().toISOString(),
      dependencies: [],
    });
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<void> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let responseTime = 0;
    
    try {
      // Test cache with a simple operation
      await advancedCachingService.set('health_check', 'ok', 60);
      await advancedCachingService.get('health_check');
      responseTime = Date.now() - startTime;
      
      if (responseTime > 500) {
        status = 'degraded';
      }
    } catch (error) {
      status = 'unhealthy';
      responseTime = Date.now() - startTime;
    }
    
    this.updateServiceHealth({
      service: 'cache',
      status,
      responseTime,
      errorRate: status === 'unhealthy' ? 100 : 0,
      throughput: 200, // Mock value
      uptime: status === 'unhealthy' ? 98 : 99.9,
      lastCheck: new Date().toISOString(),
      dependencies: [],
    });
  }

  /**
   * Check external API health
   */
  private async checkExternalAPIHealth(): Promise<void> {
    const apis = ['maersk', 'msc', 'track-trace'];
    
    for (const api of apis) {
      const startTime = Date.now();
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let responseTime = 0;
      
      try {
        // Mock API health check - would be replaced with actual API ping
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        responseTime = Date.now() - startTime;
        
        if (responseTime > 3000) {
          status = 'degraded';
        }
      } catch (error) {
        status = 'unhealthy';
        responseTime = Date.now() - startTime;
      }
      
      this.updateServiceHealth({
        service: `api_${api}`,
        status,
        responseTime,
        errorRate: status === 'unhealthy' ? 100 : Math.random() * 5,
        throughput: Math.random() * 50,
        uptime: status === 'unhealthy' ? 90 + Math.random() * 5 : 95 + Math.random() * 5,
        lastCheck: new Date().toISOString(),
        dependencies: [],
      });
    }
  }

  /**
   * Update SLA metrics based on current health
   */
  private async updateSLAMetricsFromHealth(): Promise<void> {
    const services = this.getServiceHealth();
    
    // Calculate overall response time
    const avgResponseTime = services.length > 0 
      ? services.reduce((sum, s) => sum + s.responseTime, 0) / services.length 
      : 0;
    
    // Calculate overall error rate
    const avgErrorRate = services.length > 0 
      ? services.reduce((sum, s) => sum + s.errorRate, 0) / services.length 
      : 0;
    
    // Calculate overall availability
    const availability = services.length > 0 
      ? services.reduce((sum, s) => sum + s.uptime, 0) / services.length 
      : 100;
    
    // Update SLA metrics
    const responseTimeSLA = this.slaMetrics.get('API Response Time');
    if (responseTimeSLA) {
      responseTimeSLA.current = avgResponseTime;
      responseTimeSLA.status = avgResponseTime <= responseTimeSLA.target ? 'meeting' : 
                              avgResponseTime <= responseTimeSLA.target * 1.2 ? 'at_risk' : 'breached';
      this.updateSLAMetric(responseTimeSLA);
    }
    
    const availabilitySLA = this.slaMetrics.get('API Availability');
    if (availabilitySLA) {
      availabilitySLA.current = availability;
      availabilitySLA.status = availability >= availabilitySLA.target ? 'meeting' : 
                              availability >= availabilitySLA.target * 0.95 ? 'at_risk' : 'breached';
      this.updateSLAMetric(availabilitySLA);
    }
    
    const errorRateSLA = this.slaMetrics.get('Error Rate');
    if (errorRateSLA) {
      errorRateSLA.current = avgErrorRate;
      errorRateSLA.status = avgErrorRate <= errorRateSLA.target ? 'meeting' : 
                           avgErrorRate <= errorRateSLA.target * 2 ? 'at_risk' : 'breached';
      this.updateSLAMetric(errorRateSLA);
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.metrics.clear();
    this.serviceHealth.clear();
    this.slaMetrics.clear();
    this.businessMetrics.clear();
    this.alertRules.clear();
    
    loggingService.info('APM Service cleaned up');
  }
}

export const apmService = new APMService();