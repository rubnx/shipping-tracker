import { loggingService } from './LoggingService';
import { apmService } from './APMService';
import { analyticsService } from './AnalyticsService';
import { advancedCachingService } from './AdvancedCachingService';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: {
    metric?: string;
    timeRange?: string;
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    chartType?: 'line' | 'bar' | 'pie' | 'gauge';
    thresholds?: Array<{
      value: number;
      color: string;
      label: string;
    }>;
    filters?: Record<string, string>;
    refreshInterval?: number; // seconds
  };
  data?: any;
  lastUpdated?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    rows: number;
  };
  permissions: {
    owner: string;
    viewers: string[];
    editors: string[];
  };
  settings: {
    autoRefresh: boolean;
    refreshInterval: number; // seconds
    theme: 'light' | 'dark';
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'business' | 'security' | 'custom';
  widgets: Omit<DashboardWidget, 'id' | 'data' | 'lastUpdated'>[];
  tags: string[];
}

class CustomDashboardService {
  private dashboards: Map<string, Dashboard> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();
  private widgetDataCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.initializeDefaultTemplates();
    this.loadDashboards();
    
    loggingService.info('Custom Dashboard Service initialized');
  }

  /**
   * Create a new dashboard
   */
  public async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const newDashboard: Dashboard = {
        ...dashboard,
        id,
        createdAt: now,
        updatedAt: now,
        widgets: dashboard.widgets.map(widget => ({
          ...widget,
          id: this.generateId(),
        })),
      };
      
      this.dashboards.set(id, newDashboard);
      await this.saveDashboards();
      
      loggingService.info('Dashboard created', {
        id,
        name: dashboard.name,
        widgetCount: dashboard.widgets.length,
      });
      
      return newDashboard;
    } catch (error: any) {
      loggingService.error('Failed to create dashboard', error);
      throw error;
    }
  }

  /**
   * Update an existing dashboard
   */
  public async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }
      
      const updatedDashboard: Dashboard = {
        ...dashboard,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };
      
      this.dashboards.set(id, updatedDashboard);
      await this.saveDashboards();
      
      loggingService.info('Dashboard updated', { id, name: updatedDashboard.name });
      
      return updatedDashboard;
    } catch (error: any) {
      loggingService.error('Failed to update dashboard', error);
      throw error;
    }
  }

  /**
   * Delete a dashboard
   */
  public async deleteDashboard(id: string): Promise<void> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }
      
      this.dashboards.delete(id);
      await this.saveDashboards();
      
      // Clear widget data cache for this dashboard
      dashboard.widgets.forEach(widget => {
        this.widgetDataCache.delete(widget.id);
      });
      
      loggingService.info('Dashboard deleted', { id, name: dashboard.name });
    } catch (error: any) {
      loggingService.error('Failed to delete dashboard', error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID
   */
  public getDashboard(id: string): Dashboard | null {
    return this.dashboards.get(id) || null;
  }

  /**
   * Get all dashboards
   */
  public getDashboards(userId?: string): Dashboard[] {
    const dashboards = Array.from(this.dashboards.values());
    
    if (userId) {
      return dashboards.filter(dashboard => 
        dashboard.permissions.owner === userId ||
        dashboard.permissions.viewers.includes(userId) ||
        dashboard.permissions.editors.includes(userId)
      );
    }
    
    return dashboards;
  }

  /**
   * Create dashboard from template
   */
  public async createDashboardFromTemplate(
    templateId: string,
    name: string,
    owner: string
  ): Promise<Dashboard> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      const dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description: `Dashboard created from ${template.name} template`,
        tags: [...template.tags],
        widgets: template.widgets.map(widget => ({
          ...widget,
          id: this.generateId(),
        })),
        layout: {
          columns: 12,
          rows: 8,
        },
        permissions: {
          owner,
          viewers: [],
          editors: [],
        },
        settings: {
          autoRefresh: true,
          refreshInterval: 30,
          theme: 'light',
          timezone: 'UTC',
        },
      };
      
      return await this.createDashboard(dashboard);
    } catch (error: any) {
      loggingService.error('Failed to create dashboard from template', error);
      throw error;
    }
  }

  /**
   * Get dashboard templates
   */
  public getTemplates(category?: string): DashboardTemplate[] {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(template => template.category === category);
    }
    
    return templates;
  }

  /**
   * Get widget data
   */
  public async getWidgetData(widgetId: string, widget: DashboardWidget): Promise<any> {
    try {
      // Check cache first
      const cached = this.widgetDataCache.get(widgetId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
      
      let data: any = null;
      
      switch (widget.type) {
        case 'metric':
          data = await this.getMetricWidgetData(widget);
          break;
        case 'chart':
          data = await this.getChartWidgetData(widget);
          break;
        case 'table':
          data = await this.getTableWidgetData(widget);
          break;
        case 'alert':
          data = await this.getAlertWidgetData(widget);
          break;
        case 'status':
          data = await this.getStatusWidgetData(widget);
          break;
        default:
          data = { error: 'Unknown widget type' };
      }
      
      // Cache the data
      this.widgetDataCache.set(widgetId, {
        data,
        timestamp: Date.now(),
      });
      
      return data;
    } catch (error: any) {
      loggingService.error('Failed to get widget data', error, { widgetId });
      return { error: error.message };
    }
  }

  /**
   * Get metric widget data
   */
  private async getMetricWidgetData(widget: DashboardWidget): Promise<any> {
    const { metric, timeRange = '1h', aggregation = 'avg', filters = {} } = widget.config;
    
    if (!metric) {
      return { error: 'No metric specified' };
    }
    
    const timeRangeMs = this.parseTimeRange(timeRange);
    const value = apmService.getAggregatedMetrics(metric, filters, timeRangeMs, aggregation);
    
    // Get threshold status
    let status = 'normal';
    let color = '#10B981'; // green
    
    if (widget.config.thresholds) {
      for (const threshold of widget.config.thresholds.sort((a, b) => b.value - a.value)) {
        if (value >= threshold.value) {
          status = threshold.label;
          color = threshold.color;
          break;
        }
      }
    }
    
    return {
      value,
      status,
      color,
      unit: this.getMetricUnit(metric),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get chart widget data
   */
  private async getChartWidgetData(widget: DashboardWidget): Promise<any> {
    const { metric, timeRange = '1h', chartType = 'line', filters = {} } = widget.config;
    
    if (!metric) {
      return { error: 'No metric specified' };
    }
    
    const timeRangeMs = this.parseTimeRange(timeRange);
    const metrics = apmService.getMetrics(metric, filters, timeRangeMs);
    
    // Group metrics by time intervals
    const intervals = this.groupMetricsByInterval(metrics, timeRangeMs);
    
    const chartData = {
      type: chartType,
      labels: intervals.map(interval => interval.timestamp),
      datasets: [{
        label: metric,
        data: intervals.map(interval => interval.value),
        borderColor: '#3B82F6',
        backgroundColor: chartType === 'bar' ? '#3B82F6' : 'rgba(59, 130, 246, 0.1)',
        fill: chartType === 'line',
      }],
    };
    
    return chartData;
  }

  /**
   * Get table widget data
   */
  private async getTableWidgetData(widget: DashboardWidget): Promise<any> {
    const { metric, timeRange = '1h', filters = {} } = widget.config;
    
    if (metric === 'service_health') {
      const services = apmService.getServiceHealth();
      return {
        headers: ['Service', 'Status', 'Response Time', 'Error Rate', 'Uptime'],
        rows: services.map(service => [
          service.service,
          service.status,
          `${service.responseTime}ms`,
          `${service.errorRate.toFixed(2)}%`,
          `${service.uptime.toFixed(2)}%`,
        ]),
      };
    }
    
    if (metric === 'sla_metrics') {
      const slas = apmService.getSLAMetrics();
      return {
        headers: ['SLA', 'Current', 'Target', 'Status'],
        rows: slas.map(sla => [
          sla.name,
          sla.current.toFixed(2),
          sla.target.toFixed(2),
          sla.status,
        ]),
      };
    }
    
    return { error: 'Unsupported table metric' };
  }

  /**
   * Get alert widget data
   */
  private async getAlertWidgetData(widget: DashboardWidget): Promise<any> {
    const businessIntelligence = await analyticsService.getBusinessIntelligence();
    const recommendations = businessIntelligence.apiOptimization.recommendations;
    
    return {
      alerts: recommendations.slice(0, 5).map(rec => ({
        id: Math.random().toString(36).substr(2, 9),
        title: rec.description,
        severity: rec.priority,
        timestamp: new Date().toISOString(),
        type: rec.type,
      })),
    };
  }

  /**
   * Get status widget data
   */
  private async getStatusWidgetData(widget: DashboardWidget): Promise<any> {
    const services = apmService.getServiceHealth();
    const totalServices = services.length;
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    
    let overallStatus = 'healthy';
    let color = '#10B981';
    
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
      color = '#EF4444';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
      color = '#F59E0B';
    }
    
    return {
      status: overallStatus,
      color,
      summary: `${healthyServices}/${totalServices} services healthy`,
      details: {
        healthy: healthyServices,
        degraded: degradedServices,
        unhealthy: unhealthyServices,
        total: totalServices,
      },
    };
  }

  /**
   * Initialize default dashboard templates
   */
  private initializeDefaultTemplates(): void {
    const templates: DashboardTemplate[] = [
      {
        id: 'operations_overview',
        name: 'Operations Overview',
        description: 'High-level operational metrics and service health',
        category: 'operations',
        tags: ['operations', 'monitoring', 'health'],
        widgets: [
          {
            type: 'status',
            title: 'System Status',
            position: { x: 0, y: 0, width: 3, height: 2 },
            config: {},
          },
          {
            type: 'metric',
            title: 'Response Time',
            position: { x: 3, y: 0, width: 3, height: 2 },
            config: {
              metric: 'http.response_time',
              aggregation: 'avg',
              thresholds: [
                { value: 1000, color: '#10B981', label: 'good' },
                { value: 3000, color: '#F59E0B', label: 'warning' },
                { value: 5000, color: '#EF4444', label: 'critical' },
              ],
            },
          },
          {
            type: 'metric',
            title: 'Error Rate',
            position: { x: 6, y: 0, width: 3, height: 2 },
            config: {
              metric: 'http.errors',
              aggregation: 'avg',
              thresholds: [
                { value: 1, color: '#10B981', label: 'good' },
                { value: 5, color: '#F59E0B', label: 'warning' },
                { value: 10, color: '#EF4444', label: 'critical' },
              ],
            },
          },
          {
            type: 'metric',
            title: 'Throughput',
            position: { x: 9, y: 0, width: 3, height: 2 },
            config: {
              metric: 'http.requests',
              aggregation: 'sum',
              timeRange: '1h',
            },
          },
          {
            type: 'chart',
            title: 'Response Time Trend',
            position: { x: 0, y: 2, width: 6, height: 3 },
            config: {
              metric: 'http.response_time',
              chartType: 'line',
              timeRange: '4h',
            },
          },
          {
            type: 'table',
            title: 'Service Health',
            position: { x: 6, y: 2, width: 6, height: 3 },
            config: {
              metric: 'service_health',
            },
          },
          {
            type: 'table',
            title: 'SLA Status',
            position: { x: 0, y: 5, width: 12, height: 3 },
            config: {
              metric: 'sla_metrics',
            },
          },
        ],
      },
      {
        id: 'business_metrics',
        name: 'Business Metrics',
        description: 'Key business metrics and analytics',
        category: 'business',
        tags: ['business', 'analytics', 'kpi'],
        widgets: [
          {
            type: 'metric',
            title: 'Total Searches',
            position: { x: 0, y: 0, width: 3, height: 2 },
            config: {
              metric: 'business.total_searches',
              aggregation: 'sum',
              timeRange: '24h',
            },
          },
          {
            type: 'metric',
            title: 'Unique Users',
            position: { x: 3, y: 0, width: 3, height: 2 },
            config: {
              metric: 'business.unique_users',
              aggregation: 'count',
              timeRange: '24h',
            },
          },
          {
            type: 'metric',
            title: 'Success Rate',
            position: { x: 6, y: 0, width: 3, height: 2 },
            config: {
              metric: 'business.success_rate',
              aggregation: 'avg',
              timeRange: '24h',
            },
          },
          {
            type: 'metric',
            title: 'API Cost',
            position: { x: 9, y: 0, width: 3, height: 2 },
            config: {
              metric: 'business.api_cost',
              aggregation: 'sum',
              timeRange: '24h',
            },
          },
          {
            type: 'chart',
            title: 'Search Volume Trend',
            position: { x: 0, y: 2, width: 6, height: 3 },
            config: {
              metric: 'business.total_searches',
              chartType: 'line',
              timeRange: '7d',
            },
          },
          {
            type: 'alert',
            title: 'Optimization Recommendations',
            position: { x: 6, y: 2, width: 6, height: 3 },
            config: {},
          },
        ],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Load dashboards from storage
   */
  private async loadDashboards(): Promise<void> {
    try {
      const dashboardsData = await advancedCachingService.get<Dashboard[]>('dashboards:all');
      if (dashboardsData) {
        dashboardsData.forEach(dashboard => {
          this.dashboards.set(dashboard.id, dashboard);
        });
      }
    } catch (error: any) {
      loggingService.error('Failed to load dashboards', error);
    }
  }

  /**
   * Save dashboards to storage
   */
  private async saveDashboards(): Promise<void> {
    try {
      const dashboardsArray = Array.from(this.dashboards.values());
      await advancedCachingService.set(
        'dashboards:all',
        dashboardsArray,
        86400, // 24 hours
        ['dashboards']
      );
    } catch (error: any) {
      loggingService.error('Failed to save dashboards', error);
    }
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metric: string): string {
    if (metric.includes('response_time')) return 'ms';
    if (metric.includes('error') || metric.includes('rate')) return '%';
    if (metric.includes('requests')) return 'req/s';
    if (metric.includes('bytes')) return 'bytes';
    if (metric.includes('cost')) return '$';
    return '';
  }

  /**
   * Group metrics by time intervals
   */
  private groupMetricsByInterval(metrics: any[], timeRangeMs: number): Array<{ timestamp: string; value: number }> {
    if (metrics.length === 0) return [];
    
    const intervalCount = 20; // Number of data points
    const intervalMs = timeRangeMs / intervalCount;
    const now = Date.now();
    const intervals: Array<{ timestamp: string; value: number }> = [];
    
    for (let i = 0; i < intervalCount; i++) {
      const intervalStart = now - timeRangeMs + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalMetrics = metrics.filter(m => {
        const timestamp = new Date(m.timestamp).getTime();
        return timestamp >= intervalStart && timestamp < intervalEnd;
      });
      
      const value = intervalMetrics.length > 0
        ? intervalMetrics.reduce((sum, m) => sum + m.value, 0) / intervalMetrics.length
        : 0;
      
      intervals.push({
        timestamp: new Date(intervalStart).toISOString(),
        value,
      });
    }
    
    return intervals;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.dashboards.clear();
    this.templates.clear();
    this.widgetDataCache.clear();
    
    loggingService.info('Custom Dashboard Service cleaned up');
  }
}

export const customDashboardService = new CustomDashboardService();