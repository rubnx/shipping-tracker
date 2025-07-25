/**
 * Production monitoring and alerting utilities
 * Implements comprehensive monitoring, logging, and alerting systems
 */

// Monitoring service
export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, any[]> = new Map();
  private alerts: Array<{ type: string; message: string; timestamp: Date }> = [];
  
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  // Track application metrics
  trackMetric(name: string, value: number, tags: Record<string, string> = {}) {
    const metric = {
      name,
      value,
      tags,
      timestamp: new Date(),
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
    
    // Keep only last 1000 metrics per type
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    // Check for alerts
    this.checkAlerts(name, value, tags);
  }
  
  // Track API response times
  trackApiCall(endpoint: string, duration: number, status: number) {
    this.trackMetric('api_response_time', duration, {
      endpoint,
      status: status.toString(),
    });
    
    this.trackMetric('api_call_count', 1, {
      endpoint,
      status: status.toString(),
    });
  }
  
  // Track user interactions
  trackUserAction(action: string, details: Record<string, any> = {}) {
    this.trackMetric('user_action', 1, {
      action,
      ...details,
    });
  }
  
  // Track errors
  trackError(error: Error, context: Record<string, any> = {}) {
    this.trackMetric('error_count', 1, {
      error_type: error.name,
      error_message: error.message,
      ...context,
    });
    
    // Send to external error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context });
    }
  }
  
  // Check for alert conditions
  private checkAlerts(metricName: string, value: number, tags: Record<string, string>) {
    const alertRules = {
      api_response_time: { threshold: 5000, message: 'API response time exceeded 5 seconds' },
      error_count: { threshold: 10, message: 'Error rate is high' },
      memory_usage: { threshold: 80, message: 'Memory usage is high' },
    };
    
    const rule = alertRules[metricName as keyof typeof alertRules];
    if (rule && value > rule.threshold) {
      this.createAlert('warning', rule.message, { metricName, value, tags });
    }
  }
  
  // Create alert
  private createAlert(type: string, message: string, details: any = {}) {
    const alert = {
      type,
      message,
      timestamp: new Date(),
      details,
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }
    
    // Send alert to external service
    console.warn(`[ALERT] ${type.toUpperCase()}: ${message}`, details);
  }
  
  // Get metrics summary
  getMetricsSummary() {
    const summary: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      const values = metrics.map(m => m.value);
      summary[name] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1],
      };
    }
    
    return summary;
  }
  
  // Get recent alerts
  getRecentAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }
}

// Uptime monitoring
export class UptimeMonitor {
  private checks: Array<{ url: string; interval: number; timeout: number }> = [];
  private results: Map<string, any[]> = new Map();
  
  addCheck(url: string, interval = 60000, timeout = 5000) {
    this.checks.push({ url, interval, timeout });
    this.startMonitoring(url, interval, timeout);
  }
  
  private async startMonitoring(url: string, interval: number, timeout: number) {
    const monitor = async () => {
      const start = Date.now();
      let status = 'down';
      let responseTime = 0;
      let error = null;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        responseTime = Date.now() - start;
        status = response.ok ? 'up' : 'down';
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
        responseTime = Date.now() - start;
      }
      
      const result = {
        url,
        status,
        responseTime,
        error,
        timestamp: new Date(),
      };
      
      if (!this.results.has(url)) {
        this.results.set(url, []);
      }
      
      this.results.get(url)!.push(result);
      
      // Keep only last 100 results per URL
      const results = this.results.get(url)!;
      if (results.length > 100) {
        results.splice(0, results.length - 100);
      }
      
      // Track metrics
      MonitoringService.getInstance().trackMetric('uptime_check', status === 'up' ? 1 : 0, { url });
      MonitoringService.getInstance().trackMetric('uptime_response_time', responseTime, { url });
    };
    
    // Run initial check
    await monitor();
    
    // Schedule recurring checks
    setInterval(monitor, interval);
  }
  
  getUptimeStats(url: string) {
    const results = this.results.get(url) || [];
    const upCount = results.filter(r => r.status === 'up').length;
    const totalCount = results.length;
    
    return {
      uptime: totalCount > 0 ? (upCount / totalCount) * 100 : 0,
      totalChecks: totalCount,
      successfulChecks: upCount,
      averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount || 0,
      lastCheck: results[results.length - 1],
    };
  }
}

// Initialize monitoring
export const monitoring = MonitoringService.getInstance();
export const uptimeMonitor = new UptimeMonitor();