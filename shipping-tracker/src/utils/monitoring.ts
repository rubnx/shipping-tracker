/**
 * Monitoring and analytics utilities
 */

import { getConfig, isDevelopment } from './config';

/**
 * Analytics event types
 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

/**
 * Error tracking interface
 */
export interface ErrorEvent {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
}

/**
 * Analytics service
 */
class AnalyticsService {
  private config = getConfig();
  private sessionId: string;
  private userId?: string;
  private queue: AnalyticsEvent[] = [];
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = this.config.enableAnalytics && !isDevelopment();
    
    if (this.isEnabled) {
      this.initializeAnalytics();
    }
  }

  /**
   * Initialize analytics tracking
   */
  private initializeAnalytics(): void {
    // Track page views
    this.trackPageView();
    
    // Track performance metrics
    this.trackPerformanceMetrics();
    
    // Set up periodic queue flush
    setInterval(() => this.flushQueue(), 30000); // Flush every 30 seconds
    
    // Flush queue before page unload
    window.addEventListener('beforeunload', () => this.flushQueue());
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Track custom event
   */
  track(name: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) {
      if (isDevelopment()) {
        console.log('[Analytics]', name, properties);
      }
      return;
    }

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.queue.push(event);

    // Flush immediately for important events
    const immediateEvents = ['error', 'conversion', 'purchase'];
    if (immediateEvents.includes(name)) {
      this.flushQueue();
    }
  }

  /**
   * Track page view
   */
  trackPageView(path?: string): void {
    this.track('page_view', {
      path: path || window.location.pathname,
      referrer: document.referrer,
      title: document.title,
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, action: string, properties?: Record<string, any>): void {
    this.track('interaction', {
      element,
      action,
      ...properties,
    });
  }

  /**
   * Track search event
   */
  trackSearch(query: string, results?: number): void {
    this.track('search', {
      query: query.substring(0, 50), // Limit query length for privacy
      results,
      timestamp: new Date(),
    });
  }

  /**
   * Track performance metrics
   */
  private trackPerformanceMetrics(): void {
    if (!('performance' in window)) return;

    // Wait for page load to complete
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = this.collectPerformanceMetrics();
        if (Object.keys(metrics).length > 0) {
          this.track('performance', metrics);
        }
      }, 1000);
    });
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      }

      // Paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      }

      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      }

    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
    }

    return metrics;
  }

  /**
   * Flush event queue
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // In a real implementation, you would send to your analytics service
      // Example: Google Analytics, Mixpanel, Amplitude, etc.
      
      if (isDevelopment()) {
        console.log('[Analytics] Flushing events:', events);
      } else {
        // Send to analytics service
        await this.sendToAnalyticsService(events);
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events on failure
      this.queue.unshift(...events);
    }
  }

  /**
   * Send events to analytics service
   */
  private async sendToAnalyticsService(events: AnalyticsEvent[]): Promise<void> {
    // Example implementation - replace with your analytics service
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
  }
}

/**
 * Error tracking service
 */
class ErrorTrackingService {
  private config = getConfig();
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = this.config.enableErrorTracking;
    
    if (this.isEnabled) {
      this.initializeErrorTracking();
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date(),
        userId: this.userId,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: new Date(),
        userId: this.userId,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalData: {
          type: 'unhandledrejection',
          reason: event.reason,
        },
      });
    });
  }

  /**
   * Set user ID for error tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Manually capture an error
   */
  captureError(error: ErrorEvent): void {
    if (!this.isEnabled) {
      if (isDevelopment()) {
        console.error('[Error Tracking]', error);
      }
      return;
    }

    try {
      this.sendErrorToService(error);
    } catch (sendError) {
      console.error('Failed to send error to tracking service:', sendError);
    }
  }

  /**
   * Capture exception with additional context
   */
  captureException(error: Error, additionalData?: Record<string, any>): void {
    this.captureError({
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData,
    });
  }

  /**
   * Send error to tracking service
   */
  private async sendErrorToService(error: ErrorEvent): Promise<void> {
    if (isDevelopment()) {
      console.error('[Error Tracking] Would send error:', error);
      return;
    }

    // Example implementation - replace with your error tracking service
    // (Sentry, Bugsnag, LogRocket, etc.)
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (fetchError) {
      console.error('Failed to send error to tracking service:', fetchError);
    }
  }
}

// Export singleton instances
export const analytics = new AnalyticsService();
export const errorTracking = new ErrorTrackingService();

/**
 * Initialize monitoring services
 */
export function initializeMonitoring(): void {
  // Services are initialized in their constructors
  console.log('Monitoring services initialized');
}

/**
 * Set user ID for all monitoring services
 */
export function setUserId(userId: string): void {
  analytics.setUserId(userId);
  errorTracking.setUserId(userId);
}