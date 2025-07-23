import { Request } from 'express';
import { loggingService } from './LoggingService';
import { captureMessage } from '../config/sentry';

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limit' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topIPs: Array<{ ip: string; count: number }>;
  recentEvents: SecurityEvent[];
  trends: {
    hourly: number[];
    daily: number[];
  };
}

class SecurityAuditService {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 10000;
  private readonly alertThresholds = {
    suspiciousActivity: 5, // per hour
    authenticationFailures: 10, // per hour
    rateLimitExceeded: 20, // per hour
  };

  public recordSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    req: Request,
    details: Record<string, any>
  ): string {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details,
      resolved: false,
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log the event
    loggingService.warn(`Security event: ${type}`, {
      eventId: event.id,
      severity,
      ip: event.ip,
      path: event.path,
      method: event.method,
      details,
    });

    // Send to Sentry for critical events
    if (severity === 'critical' || severity === 'high') {
      captureMessage(`Security event: ${type}`, severity === 'critical' ? 'fatal' : 'error', {
        eventId: event.id,
        type,
        severity,
        ip: event.ip,
        path: event.path,
        method: event.method,
        details: JSON.stringify(details),
      });
    }

    // Check for alert conditions
    this.checkAlertConditions(type, event.ip);

    return event.id;
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkAlertConditions(type: SecurityEvent['type'], ip: string): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);

    // Check for suspicious activity from same IP
    const ipEvents = recentEvents.filter(e => e.ip === ip);
    if (ipEvents.length >= this.alertThresholds.suspiciousActivity) {
      this.triggerAlert('high_frequency_events', {
        ip,
        eventCount: ipEvents.length,
        timeWindow: '1 hour',
        events: ipEvents.map(e => ({ type: e.type, timestamp: e.timestamp })),
      });
    }

    // Check for authentication failures
    if (type === 'authentication') {
      const authFailures = recentEvents.filter(e => 
        e.type === 'authentication' && e.ip === ip
      );
      if (authFailures.length >= this.alertThresholds.authenticationFailures) {
        this.triggerAlert('authentication_brute_force', {
          ip,
          failureCount: authFailures.length,
          timeWindow: '1 hour',
        });
      }
    }

    // Check for rate limit abuse
    if (type === 'rate_limit') {
      const rateLimitEvents = recentEvents.filter(e => 
        e.type === 'rate_limit' && e.ip === ip
      );
      if (rateLimitEvents.length >= this.alertThresholds.rateLimitExceeded) {
        this.triggerAlert('rate_limit_abuse', {
          ip,
          violationCount: rateLimitEvents.length,
          timeWindow: '1 hour',
        });
      }
    }
  }

  private triggerAlert(alertType: string, details: Record<string, any>): void {
    loggingService.error(`Security alert: ${alertType}`, undefined, details);
    
    captureMessage(`Security alert: ${alertType}`, 'error', {
      alertType,
      details: JSON.stringify(details),
    });

    // In a production environment, you might:
    // - Send notifications to security team
    // - Automatically block IPs
    // - Trigger incident response procedures
  }

  public getSecurityMetrics(timeWindow?: number): SecurityMetrics {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    const relevantEvents = this.events.filter(e => e.timestamp.getTime() >= windowStart);

    // Count events by type
    const eventsByType = relevantEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count events by severity
    const eventsBySeverity = relevantEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top IPs by event count
    const ipCounts = relevantEvents.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Recent events (last 10)
    const recentEvents = relevantEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Trends (simplified)
    const hourlyTrends = this.calculateHourlyTrends();
    const dailyTrends = this.calculateDailyTrends();

    return {
      totalEvents: relevantEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      recentEvents,
      trends: {
        hourly: hourlyTrends,
        daily: dailyTrends,
      },
    };
  }

  private calculateHourlyTrends(): number[] {
    const now = new Date();
    const trends: number[] = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = this.events.filter(e => 
        e.timestamp >= hourStart && e.timestamp < hourEnd
      ).length;
      
      trends.push(count);
    }

    return trends;
  }

  private calculateDailyTrends(): number[] {
    const now = new Date();
    const trends: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const count = this.events.filter(e => 
        e.timestamp >= dayStart && e.timestamp < dayEnd
      ).length;
      
      trends.push(count);
    }

    return trends;
  }

  public getEventById(eventId: string): SecurityEvent | null {
    return this.events.find(e => e.id === eventId) || null;
  }

  public resolveEvent(eventId: string, resolvedBy: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;

    loggingService.info('Security event resolved', {
      eventId,
      resolvedBy,
      type: event.type,
      severity: event.severity,
    });

    return true;
  }

  public getUnresolvedEvents(): SecurityEvent[] {
    return this.events.filter(e => !e.resolved);
  }

  public searchEvents(criteria: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    ip?: string;
    timeRange?: { start: Date; end: Date };
    resolved?: boolean;
  }): SecurityEvent[] {
    return this.events.filter(event => {
      if (criteria.type && event.type !== criteria.type) return false;
      if (criteria.severity && event.severity !== criteria.severity) return false;
      if (criteria.ip && event.ip !== criteria.ip) return false;
      if (criteria.resolved !== undefined && event.resolved !== criteria.resolved) return false;
      
      if (criteria.timeRange) {
        if (event.timestamp < criteria.timeRange.start || 
            event.timestamp > criteria.timeRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  public generateSecurityReport(timeWindow: number = 24 * 60 * 60 * 1000): {
    summary: SecurityMetrics;
    recommendations: string[];
    criticalEvents: SecurityEvent[];
  } {
    const metrics = this.getSecurityMetrics(timeWindow);
    const criticalEvents = this.events.filter(e => 
      e.severity === 'critical' && 
      e.timestamp.getTime() > Date.now() - timeWindow
    );

    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.eventsByType.authentication > 50) {
      recommendations.push('High number of authentication failures detected. Consider implementing account lockout policies.');
    }

    if (metrics.eventsByType.rate_limit > 100) {
      recommendations.push('Frequent rate limit violations. Consider adjusting rate limits or implementing IP blocking.');
    }

    if (metrics.eventsByType.suspicious_activity > 20) {
      recommendations.push('Multiple suspicious activities detected. Review and strengthen input validation.');
    }

    if (metrics.topIPs.length > 0 && metrics.topIPs[0].count > 100) {
      recommendations.push(`IP ${metrics.topIPs[0].ip} has generated ${metrics.topIPs[0].count} security events. Consider investigation.`);
    }

    return {
      summary: metrics,
      recommendations,
      criticalEvents,
    };
  }

  public exportEvents(format: 'json' | 'csv' = 'json', timeWindow?: number): string {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    const events = this.events.filter(e => e.timestamp.getTime() >= windowStart);

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      // CSV format
      const headers = ['id', 'type', 'severity', 'timestamp', 'ip', 'userAgent', 'path', 'method', 'resolved'];
      const csvRows = [headers.join(',')];
      
      events.forEach(event => {
        const row = [
          event.id,
          event.type,
          event.severity,
          event.timestamp.toISOString(),
          event.ip,
          event.userAgent || '',
          event.path,
          event.method,
          event.resolved.toString(),
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  public clearOldEvents(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    
    this.events = this.events.filter(e => e.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.events.length;
    
    if (removedCount > 0) {
      loggingService.info(`Cleared ${removedCount} old security events`);
    }
    
    return removedCount;
  }
}

export const securityAuditService = new SecurityAuditService();