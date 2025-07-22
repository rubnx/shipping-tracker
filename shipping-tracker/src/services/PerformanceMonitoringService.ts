import { measurePerformance, addBreadcrumb, captureException } from '../utils/sentry';

export interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
  timestamp: number;
}

export interface UserSessionMetrics {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  searchCount: number;
  errorCount: number;
  lastActivity: number;
}

class PerformanceMonitoringService {
  private apiMetrics: APIPerformanceMetrics[] = [];
  private sessionMetrics: UserSessionMetrics;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.sessionMetrics = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: 0,
      searchCount: 0,
      errorCount: 0,
      lastActivity: Date.now(),
    };

    this.initializePerformanceObserver();
    this.trackPageView();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.trackNavigationTiming(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'resource') {
            this.trackResourceTiming(entry as PerformanceResourceTiming);
          }
        });
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  private trackNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.navigationStart,
    };

    addBreadcrumb(
      `Page load completed in ${metrics.total}ms`,
      'performance',
      'info'
    );

    // Track Core Web Vitals
    this.trackWebVitals();
  }

  private trackResourceTiming(entry: PerformanceResourceTiming) {
    // Track API calls specifically
    if (entry.name.includes('/api/') || entry.name.includes('track')) {
      const duration = entry.responseEnd - entry.requestStart;
      
      addBreadcrumb(
        `API call to ${entry.name} took ${duration}ms`,
        'api',
        duration > 5000 ? 'warning' : 'info'
      );
    }
  }

  private trackWebVitals() {
    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      addBreadcrumb(
        `LCP: ${lastEntry.startTime}ms`,
        'web-vitals',
        lastEntry.startTime > 2500 ? 'warning' : 'info'
      );
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        addBreadcrumb(
          `FID: ${entry.processingStart - entry.startTime}ms`,
          'web-vitals',
          entry.processingStart - entry.startTime > 100 ? 'warning' : 'info'
        );
      });
    }).observe({ entryTypes: ['first-input'] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      addBreadcrumb(
        `CLS: ${clsValue}`,
        'web-vitals',
        clsValue > 0.1 ? 'warning' : 'info'
      );
    }).observe({ entryTypes: ['layout-shift'] });
  }

  public async trackAPICall<T>(
    endpoint: string,
    method: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let status = 0;
    let success = false;

    try {
      const result = await measurePerformance(
        `API ${method} ${endpoint}`,
        operation,
        { endpoint, method }
      );
      
      status = 200; // Assume success if no error
      success = true;
      return result;
    } catch (error) {
      success = false;
      status = error instanceof Error && 'status' in error ? (error as any).status : 500;
      
      captureException(error as Error, {
        endpoint,
        method,
        duration: performance.now() - startTime,
      });
      
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      const metrics: APIPerformanceMetrics = {
        endpoint,
        method,
        duration,
        status,
        success,
        timestamp: Date.now(),
      };

      this.apiMetrics.push(metrics);
      this.updateSessionMetrics();

      // Log slow API calls
      if (duration > 5000) {
        addBreadcrumb(
          `Slow API call: ${method} ${endpoint} took ${duration}ms`,
          'performance',
          'warning'
        );
      }
    }
  }

  public trackPageView(page?: string) {
    this.sessionMetrics.pageViews++;
    this.sessionMetrics.lastActivity = Date.now();
    
    addBreadcrumb(
      `Page view: ${page || window.location.pathname}`,
      'navigation',
      'info'
    );
  }

  public trackSearch(query: string, type: string) {
    this.sessionMetrics.searchCount++;
    this.sessionMetrics.lastActivity = Date.now();
    
    addBreadcrumb(
      `Search performed: ${type} - ${query.substring(0, 10)}...`,
      'user-action',
      'info'
    );
  }

  public trackError(error: Error, context?: Record<string, any>) {
    this.sessionMetrics.errorCount++;
    this.sessionMetrics.lastActivity = Date.now();
    
    captureException(error, {
      ...context,
      sessionId: this.sessionMetrics.sessionId,
      sessionDuration: Date.now() - this.sessionMetrics.startTime,
    });
  }

  private updateSessionMetrics() {
    this.sessionMetrics.lastActivity = Date.now();
  }

  public getSessionMetrics(): UserSessionMetrics {
    return { ...this.sessionMetrics };
  }

  public getAPIMetrics(): APIPerformanceMetrics[] {
    return [...this.apiMetrics];
  }

  public getPerformanceSummary() {
    const recentMetrics = this.apiMetrics.filter(
      m => Date.now() - m.timestamp < 300000 // Last 5 minutes
    );

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length
      : 0;

    return {
      sessionDuration: Date.now() - this.sessionMetrics.startTime,
      totalAPIRequests: this.apiMetrics.length,
      recentAPIRequests: recentMetrics.length,
      averageResponseTime: avgResponseTime,
      errorRate: errorRate * 100,
      sessionMetrics: this.sessionMetrics,
    };
  }

  public cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

export const performanceMonitor = new PerformanceMonitoringService();