// Error Tracking Service for comprehensive error monitoring and reporting

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'api' | 'user' | 'performance';
  tags?: string[];
  breadcrumbs?: Breadcrumb[];
}

export interface Breadcrumb {
  timestamp: number;
  message: string;
  category: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  id: string;
  title: string;
  description: string;
  action: () => void | Promise<void>;
}

export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private sessionId: string;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number = 50;
  private errorQueue: ErrorReport[] = [];
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorTracking();
    this.setupNetworkListeners();
  }

  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        category: 'javascript',
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        category: 'javascript',
        severity: 'high',
        context: {
          type: 'unhandledrejection',
          reason: event.reason,
        }
      });
    });

    // Network error handler
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.addBreadcrumb('Network went offline', 'network', 'warning');
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.addBreadcrumb('Network came back online', 'network', 'info');
      this.flushErrorQueue();
    });

    console.log('🔍 Error Tracking: Initialized successfully');
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    // Intercept fetch requests to track API errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0].toString();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          this.captureError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
            category: 'api',
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url,
              status: response.status,
              statusText: response.statusText,
              duration,
            }
          });
        } else {
          this.addBreadcrumb(`API call successful: ${url}`, 'api', 'info', {
            status: response.status,
            duration,
          });
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.captureError(error as Error, {
          category: 'network',
          severity: 'high',
          context: {
            url,
            duration,
          }
        });
        throw error;
      }
    };
  }

  /**
   * Capture an error
   */
  public captureError(error: Error, options?: {
    category?: ErrorReport['category'];
    severity?: ErrorReport['severity'];
    context?: Record<string, any>;
    tags?: string[];
    userId?: string;
  }): string {
    const errorId = this.generateErrorId();
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: options?.userId,
      sessionId: this.sessionId,
      context: options?.context,
      severity: options?.severity || 'medium',
      category: options?.category || 'javascript',
      tags: options?.tags,
      breadcrumbs: [...this.breadcrumbs],
    };

    this.addBreadcrumb(`Error captured: ${error.message}`, 'error', 'error', {
      errorId,
      category: errorReport.category,
    });

    if (this.isOnline) {
      this.sendErrorReport(errorReport);
    } else {
      this.errorQueue.push(errorReport);
    }

    console.error('🚨 Error captured:', errorReport);
    return errorId;
  }

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(message: string, category: string, level: Breadcrumb['level'] = 'info', data?: Record<string, any>): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      message,
      category,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Capture user action
   */
  public captureUserAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb(`User action: ${action}`, 'user', 'info', data);
  }

  /**
   * Capture performance issue
   */
  public capturePerformanceIssue(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.captureError(new Error(`Performance issue: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`), {
        category: 'performance',
        severity: value > threshold * 2 ? 'high' : 'medium',
        context: {
          metric,
          value,
          threshold,
          ratio: value / threshold,
        },
        tags: ['performance', metric],
      });
    }
  }

  /**
   * Send error report to server
   */
  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (response.ok) {
        console.log('✅ Error report sent successfully');
      } else {
        console.error('❌ Failed to send error report');
        this.errorQueue.push(errorReport);
      }
    } catch (error) {
      console.error('❌ Error sending error report:', error);
      this.errorQueue.push(errorReport);
    }
  }

  /**
   * Flush error queue when back online
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    console.log(`🔄 Flushing ${this.errorQueue.length} queued error reports`);
    
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const errorReport of errors) {
      await this.sendErrorReport(errorReport);
    }
  }

  /**
   * Get error recovery suggestions
   */
  public getErrorRecoveryActions(error: Error): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    // Network-related errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      actions.push({
        id: 'retry-request',
        title: 'Retry Request',
        description: 'Try the request again',
        action: () => window.location.reload(),
      });

      actions.push({
        id: 'check-connection',
        title: 'Check Connection',
        description: 'Verify your internet connection',
        action: () => {
          if (navigator.onLine) {
            alert('Your connection appears to be working. The issue might be temporary.');
          } else {
            alert('You appear to be offline. Please check your internet connection.');
          }
        },
      });
    }

    // API-related errors
    if (error.message.includes('HTTP') || error.message.includes('API')) {
      actions.push({
        id: 'use-cached-data',
        title: 'Use Cached Data',
        description: 'Try to use previously cached information',
        action: () => {
          // This would integrate with your caching system
          console.log('Attempting to use cached data...');
        },
      });
    }

    // JavaScript errors
    if (error.stack) {
      actions.push({
        id: 'refresh-page',
        title: 'Refresh Page',
        description: 'Reload the page to reset the application state',
        action: () => window.location.reload(),
      });

      actions.push({
        id: 'clear-cache',
        title: 'Clear Cache',
        description: 'Clear browser cache and reload',
        action: async () => {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        },
      });
    }

    // Generic actions
    actions.push({
      id: 'report-issue',
      title: 'Report Issue',
      description: 'Send feedback about this error',
      action: () => {
        const subject = encodeURIComponent(`Error Report: ${error.message}`);
        const body = encodeURIComponent(`
Error: ${error.message}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
        `);
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
      },
    });

    return actions;
  }

  /**
   * Get session information
   */
  public getSessionInfo(): {
    sessionId: string;
    breadcrumbs: Breadcrumb[];
    errorCount: number;
    isOnline: boolean;
  } {
    return {
      sessionId: this.sessionId,
      breadcrumbs: this.breadcrumbs,
      errorCount: this.errorQueue.length,
      isOnline: this.isOnline,
    };
  }

  /**
   * Clear session data
   */
  public clearSession(): void {
    this.breadcrumbs = [];
    this.errorQueue = [];
    this.sessionId = this.generateSessionId();
    console.log('🧹 Error tracking session cleared');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorTrackingService = ErrorTrackingService.getInstance();