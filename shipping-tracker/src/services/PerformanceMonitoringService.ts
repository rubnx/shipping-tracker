// Performance Monitoring Service for Core Web Vitals and API monitoring

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
  context?: Record<string, any>;
}

export interface CoreWebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
}

export interface APIPerformanceMetric {
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  size?: number;
  cached?: boolean;
  retries?: number;
}

export interface PerformanceBudget {
  metric: string;
  threshold: number;
  severity: 'warning' | 'error';
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private reportingInterval: number = 30000; // 30 seconds
  private reportingTimer?: NodeJS.Timeout;

  // Performance budgets
  private performanceBudgets: PerformanceBudget[] = [
    { metric: 'FCP', threshold: 1800, severity: 'warning' },
    { metric: 'LCP', threshold: 2500, severity: 'error' },
    { metric: 'FID', threshold: 100, severity: 'warning' },
    { metric: 'CLS', threshold: 0.1, severity: 'warning' },
    { metric: 'TTFB', threshold: 800, severity: 'warning' },
    { metric: 'API_RESPONSE', threshold: 5000, severity: 'error' },
  ];

  private constructor() {
    this.initializePerformanceMonitoring();
    this.startReporting();
  }

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    this.observeCoreWebVitals();
    
    // Monitor API performance
    this.interceptNetworkRequests();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor navigation timing
    this.observeNavigationTiming();

    console.log('📊 Performance Monitoring: Initialized successfully');
  }

  /**
   * Observe Core Web Vitals
   */
  private observeCoreWebVitals(): void {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.recordMetric('FCP', entry.startTime);
      }
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime);
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry) => {
      this.recordMetric('FID', entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!(entry as any).hadRecentInput) {
        this.recordMetric('CLS', (entry as any).value, { cumulative: true });
      }
    });

    // Interaction to Next Paint (INP) - if supported
    if ('PerformanceEventTiming' in window) {
      this.observePerformanceEntry('event', (entry) => {
        const eventEntry = entry as any;
        if (eventEntry.processingEnd && eventEntry.startTime) {
          const inp = eventEntry.processingEnd - eventEntry.startTime;
          this.recordMetric('INP', inp);
        }
      });
    }
  }

  /**
   * Observe performance entries
   */
  private observePerformanceEntry(type: string, callback: (entry: PerformanceEntry) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  /**
   * Intercept network requests for API performance monitoring
   */
  private interceptNetworkRequests(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0].toString();
      const method = (args[1]?.method || 'GET').toUpperCase();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Record API performance metric
        this.recordAPIMetric({
          url,
          method,
          status: response.status,
          duration,
          timestamp: Date.now(),
          size: parseInt(response.headers.get('content-length') || '0'),
          cached: response.headers.get('cache-control') !== null,
        });

        // Check performance budget
        this.checkPerformanceBudget('API_RESPONSE', duration, { url, method, status: response.status });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordAPIMetric({
          url,
          method,
          status: 0,
          duration,
          timestamp: Date.now(),
        });
        
        throw error;
      }
    };
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    this.observePerformanceEntry('resource', (entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;
      
      // Record resource loading time
      this.recordMetric('RESOURCE_LOAD', resourceEntry.duration, {
        name: resourceEntry.name,
        type: resourceEntry.initiatorType,
        size: resourceEntry.transferSize,
        cached: resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0,
      });
    });
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    this.observePerformanceEntry('navigation', (entry) => {
      const navEntry = entry as PerformanceNavigationTiming;
      
      // Time to First Byte (TTFB)
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      this.recordMetric('TTFB', ttfb);
      
      // DOM Content Loaded
      const dcl = navEntry.domContentLoadedEventEnd - navEntry.navigationStart;
      this.recordMetric('DCL', dcl);
      
      // Page Load Complete
      const loadComplete = navEntry.loadEventEnd - navEntry.navigationStart;
      this.recordMetric('LOAD_COMPLETE', loadComplete);
    });
  }

  /**
   * Record a performance metric
   */
  public recordMetric(name: string, value: number, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory,
      context,
    };

    this.metrics.push(metric);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check performance budget
    this.checkPerformanceBudget(name, value, context);

    console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`, context);
  }

  /**
   * Record API performance metric
   */
  public recordAPIMetric(metric: APIPerformanceMetric): void {
    this.apiMetrics.push(metric);
    
    // Keep only the last N metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Check performance budget
   */
  private checkPerformanceBudget(metricName: string, value: number, context?: Record<string, any>): void {
    const budget = this.performanceBudgets.find(b => b.metric === metricName);
    if (!budget) return;

    if (value > budget.threshold) {
      const message = `Performance budget exceeded: ${metricName} (${value.toFixed(2)}ms) > ${budget.threshold}ms`;
      
      if (budget.severity === 'error') {
        console.error(`🚨 ${message}`, context);
        
        // Report to error tracking service if available
        if (window.errorTrackingService) {
          window.errorTrackingService.capturePerformanceIssue(metricName, value, budget.threshold);
        }
      } else {
        console.warn(`⚠️ ${message}`, context);
      }
    }
  }

  /**
   * Get Core Web Vitals summary
   */
  public getCoreWebVitals(): CoreWebVitals {
    const getLatestMetric = (name: string) => {
      const metric = this.metrics.filter(m => m.name === name).pop();
      return metric?.value;
    };

    return {
      FCP: getLatestMetric('FCP'),
      LCP: getLatestMetric('LCP'),
      FID: getLatestMetric('FID'),
      CLS: this.getCumulativeLayoutShift(),
      TTFB: getLatestMetric('TTFB'),
      INP: getLatestMetric('INP'),
    };
  }

  /**
   * Calculate cumulative layout shift
   */
  private getCumulativeLayoutShift(): number {
    return this.metrics
      .filter(m => m.name === 'CLS')
      .reduce((sum, metric) => sum + metric.value, 0);
  }

  /**
   * Get API performance summary
   */
  public getAPIPerformanceSummary(): {
    averageResponseTime: number;
    slowestEndpoints: Array<{ url: string; averageTime: number; count: number }>;
    errorRate: number;
    totalRequests: number;
  } {
    if (this.apiMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowestEndpoints: [],
        errorRate: 0,
        totalRequests: 0,
      };
    }

    const totalRequests = this.apiMetrics.length;
    const averageResponseTime = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = this.apiMetrics.filter(m => m.status >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // Group by URL and calculate averages
    const urlGroups = this.apiMetrics.reduce((groups, metric) => {
      const key = `${metric.method} ${metric.url}`;
      if (!groups[key]) {
        groups[key] = { url: key, times: [], count: 0 };
      }
      groups[key].times.push(metric.duration);
      groups[key].count++;
      return groups;
    }, {} as Record<string, { url: string; times: number[]; count: number }>);

    const slowestEndpoints = Object.values(urlGroups)
      .map(group => ({
        url: group.url,
        averageTime: group.times.reduce((sum, time) => sum + time, 0) / group.times.length,
        count: group.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      averageResponseTime,
      slowestEndpoints,
      errorRate,
      totalRequests,
    };
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    coreWebVitals: CoreWebVitals;
    apiPerformance: ReturnType<typeof this.getAPIPerformanceSummary>;
    resourceMetrics: Array<{ name: string; value: number; count: number }>;
    budgetViolations: Array<{ metric: string; violations: number; averageExcess: number }>;
  } {
    const coreWebVitals = this.getCoreWebVitals();
    const apiPerformance = this.getAPIPerformanceSummary();

    // Resource metrics summary
    const resourceGroups = this.metrics
      .filter(m => m.name === 'RESOURCE_LOAD')
      .reduce((groups, metric) => {
        const type = metric.context?.type || 'unknown';
        if (!groups[type]) {
          groups[type] = { name: type, values: [], count: 0 };
        }
        groups[type].values.push(metric.value);
        groups[type].count++;
        return groups;
      }, {} as Record<string, { name: string; values: number[]; count: number }>);

    const resourceMetrics = Object.values(resourceGroups).map(group => ({
      name: group.name,
      value: group.values.reduce((sum, val) => sum + val, 0) / group.values.length,
      count: group.count,
    }));

    // Budget violations
    const budgetViolations = this.performanceBudgets.map(budget => {
      const violations = this.metrics.filter(m => 
        m.name === budget.metric && m.value > budget.threshold
      );
      
      const averageExcess = violations.length > 0
        ? violations.reduce((sum, m) => sum + (m.value - budget.threshold), 0) / violations.length
        : 0;

      return {
        metric: budget.metric,
        violations: violations.length,
        averageExcess,
      };
    }).filter(v => v.violations > 0);

    return {
      coreWebVitals,
      apiPerformance,
      resourceMetrics,
      budgetViolations,
    };
  }

  /**
   * Start automatic reporting
   */
  private startReporting(): void {
    this.reportingTimer = setInterval(() => {
      this.sendPerformanceReport();
    }, this.reportingInterval);
  }

  /**
   * Send performance report to server
   */
  private async sendPerformanceReport(): Promise<void> {
    if (this.metrics.length === 0 && this.apiMetrics.length === 0) return;

    try {
      const report = this.getPerformanceReport();
      
      const response = await fetch('/api/performance/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        console.log('📊 Performance report sent successfully');
      } else {
        console.warn('⚠️ Failed to send performance report');
      }
    } catch (error) {
      console.error('❌ Error sending performance report:', error);
    }
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = undefined;
    }
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Clear metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.apiMetrics = [];
    console.log('🧹 Performance metrics cleared');
  }
}

// Export singleton instance
export const performanceMonitoringService = PerformanceMonitoringService.getInstance();

// Make it available globally for error tracking integration
declare global {
  interface Window {
    performanceMonitoringService: PerformanceMonitoringService;
  }
}

window.performanceMonitoringService = performanceMonitoringService;