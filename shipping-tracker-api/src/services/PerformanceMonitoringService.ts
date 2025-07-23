import { Request, Response, NextFunction } from 'express';
import { measurePerformance, addBreadcrumb, captureException, captureMessage } from '../config/sentry';

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  success: boolean;
}

export interface ErrorMetrics {
  endpoint: string;
  method: string;
  error: string;
  statusCode: number;
  timestamp: number;
  stack?: string;
}

class PerformanceMonitoringService {
  private apiMetrics: APIMetrics[] = [];
  private errorMetrics: ErrorMetrics[] = [];
  private readonly maxMetricsSize = 1000; // Keep last 1000 entries

  // Express middleware for performance monitoring
  public performanceMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Override res.send to capture response time
      res.send = function(body) {
        const responseTime = Date.now() - startTime;
        const metrics: APIMetrics = {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          timestamp: Date.now(),
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          success: res.statusCode < 400,
        };

        // Add to metrics collection
        performanceMonitor.addAPIMetric(metrics);

        // Add breadcrumb for tracking
        addBreadcrumb(
          `${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`,
          'http',
          res.statusCode >= 400 ? 'warning' : 'info',
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
          }
        );

        // Log slow requests
        if (responseTime > 5000) {
          captureMessage(
            `Slow API request: ${req.method} ${req.path} took ${responseTime}ms`,
            'warning',
            {
              endpoint: req.path,
              method: req.method,
              responseTime,
              statusCode: res.statusCode,
            }
          );
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  // Error monitoring middleware
  public errorMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const errorMetric: ErrorMetrics = {
        endpoint: req.path,
        method: req.method,
        error: error.message,
        statusCode: res.statusCode || 500,
        timestamp: Date.now(),
        stack: error.stack,
      };

      this.addErrorMetric(errorMetric);

      // Capture exception with context
      captureException(error, {
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next(error);
    };
  }

  public addAPIMetric(metric: APIMetrics) {
    this.apiMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxMetricsSize) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsSize);
    }
  }

  public addErrorMetric(metric: ErrorMetrics) {
    this.errorMetrics.push(metric);
    
    // Keep only recent errors
    if (this.errorMetrics.length > this.maxMetricsSize) {
      this.errorMetrics = this.errorMetrics.slice(-this.maxMetricsSize);
    }
  }

  public async trackAPICall<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return measurePerformance(name, operation, context);
  }

  public getMetricsSummary(timeWindow: number = 300000) { // Default 5 minutes
    const now = Date.now();
    const recentMetrics = this.apiMetrics.filter(
      m => now - m.timestamp < timeWindow
    );
    const recentErrors = this.errorMetrics.filter(
      e => now - e.timestamp < timeWindow
    );

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const avgResponseTime = totalRequests > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;

    const slowRequests = recentMetrics.filter(m => m.responseTime > 5000).length;

    // Group by endpoint
    const endpointStats = recentMetrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalTime: 0,
          errors: 0,
          avgTime: 0,
        };
      }
      acc[key].count++;
      acc[key].totalTime += metric.responseTime;
      if (!metric.success) acc[key].errors++;
      acc[key].avgTime = acc[key].totalTime / acc[key].count;
      return acc;
    }, {} as Record<string, any>);

    // Group errors by type
    const errorStats = recentErrors.reduce((acc, error) => {
      const key = error.error;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      timeWindow: timeWindow / 1000, // Convert to seconds
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      slowRequests,
      slowRequestRate: totalRequests > 0 ? (slowRequests / totalRequests) * 100 : 0,
      endpointStats,
      errorStats,
      totalErrors: recentErrors.length,
    };
  }

  public getHealthStatus() {
    const summary = this.getMetricsSummary();
    
    let status = 'healthy';
    const issues = [];

    if (summary.errorRate > 10) {
      status = 'unhealthy';
      issues.push(`High error rate: ${summary.errorRate.toFixed(1)}%`);
    } else if (summary.errorRate > 5) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${summary.errorRate.toFixed(1)}%`);
    }

    if (summary.avgResponseTime > 10000) {
      status = 'unhealthy';
      issues.push(`Very slow response time: ${summary.avgResponseTime}ms`);
    } else if (summary.avgResponseTime > 5000) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Slow response time: ${summary.avgResponseTime}ms`);
    }

    if (summary.slowRequestRate > 20) {
      status = 'unhealthy';
      issues.push(`High slow request rate: ${summary.slowRequestRate.toFixed(1)}%`);
    } else if (summary.slowRequestRate > 10) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Elevated slow request rate: ${summary.slowRequestRate.toFixed(1)}%`);
    }

    return {
      status,
      issues,
      summary,
      timestamp: new Date().toISOString(),
    };
  }

  public clearMetrics() {
    this.apiMetrics = [];
    this.errorMetrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitoringService();