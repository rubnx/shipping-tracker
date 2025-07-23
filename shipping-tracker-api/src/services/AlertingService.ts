import { captureMessage, addBreadcrumb } from '../config/sentry';
import { performanceMonitor } from './PerformanceMonitoringService';

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // Minutes between alerts
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  data?: any;
}

class AlertingService {
  private alerts: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private alertRules: AlertRule[] = [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorRate > 10,
      severity: 'high',
      cooldown: 15,
      enabled: true,
    },
    {
      id: 'critical-error-rate',
      name: 'Critical Error Rate',
      condition: (metrics) => metrics.errorRate > 25,
      severity: 'critical',
      cooldown: 5,
      enabled: true,
    },
    {
      id: 'slow-response-time',
      name: 'Slow Response Time',
      condition: (metrics) => metrics.avgResponseTime > 10000,
      severity: 'medium',
      cooldown: 10,
      enabled: true,
    },
    {
      id: 'very-slow-response-time',
      name: 'Very Slow Response Time',
      condition: (metrics) => metrics.avgResponseTime > 30000,
      severity: 'high',
      cooldown: 5,
      enabled: true,
    },
    {
      id: 'high-slow-request-rate',
      name: 'High Slow Request Rate',
      condition: (metrics) => metrics.slowRequestRate > 20,
      severity: 'medium',
      cooldown: 15,
      enabled: true,
    },
    {
      id: 'no-requests',
      name: 'No Requests Received',
      condition: (metrics) => metrics.totalRequests === 0,
      severity: 'low',
      cooldown: 30,
      enabled: true,
    },
  ];

  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Check alerts every minute
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, 60000);
  }

  private checkAlerts() {
    const metrics = performanceMonitor.getMetricsSummary();
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldAlert = rule.condition(metrics);
      const lastAlert = this.lastAlertTime.get(rule.id) || 0;
      const cooldownExpired = Date.now() - lastAlert > rule.cooldown * 60000;

      if (shouldAlert && cooldownExpired) {
        this.triggerAlert(rule, metrics);
      }
    }

    // Auto-resolve alerts if conditions are no longer met
    this.checkAutoResolve(metrics);
  }

  private triggerAlert(rule: AlertRule, metrics: any) {
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      message: this.generateAlertMessage(rule, metrics),
      severity: rule.severity,
      timestamp: Date.now(),
      resolved: false,
      data: metrics,
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(rule.id, Date.now());

    // Send to Sentry
    captureMessage(alert.message, this.getSentryLevel(rule.severity), {
      alertId: alert.id,
      ruleId: rule.id,
      severity: rule.severity,
      metrics: JSON.stringify(metrics),
    });

    // Add breadcrumb
    addBreadcrumb(
      `Alert triggered: ${rule.name}`,
      'alert',
      this.getSentryLevel(rule.severity),
      { alertId: alert.id, metrics }
    );

    console.warn(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${alert.message}`);

    // In a real implementation, you might send to:
    // - Slack webhook
    // - Email service
    // - PagerDuty
    // - Discord webhook
    this.sendNotification(alert);
  }

  private generateAlertMessage(rule: AlertRule, metrics: any): string {
    switch (rule.id) {
      case 'high-error-rate':
      case 'critical-error-rate':
        return `Error rate is ${metrics.errorRate.toFixed(1)}% (${metrics.failedRequests}/${metrics.totalRequests} requests failed)`;
      
      case 'slow-response-time':
      case 'very-slow-response-time':
        return `Average response time is ${metrics.avgResponseTime}ms`;
      
      case 'high-slow-request-rate':
        return `${metrics.slowRequestRate.toFixed(1)}% of requests are slow (>${5000}ms)`;
      
      case 'no-requests':
        return `No requests received in the last ${metrics.timeWindow} seconds`;
      
      default:
        return `Alert condition met for ${rule.name}`;
    }
  }

  private getSentryLevel(severity: string): 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'fatal';
      default: return 'warning';
    }
  }

  private checkAutoResolve(metrics: any) {
    const unresolvedAlerts = this.alerts.filter(a => !a.resolved);
    
    for (const alert of unresolvedAlerts) {
      const rule = this.alertRules.find(r => r.id === alert.ruleId);
      if (!rule) continue;

      const shouldResolve = !rule.condition(metrics);
      
      if (shouldResolve) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();

        addBreadcrumb(
          `Alert resolved: ${rule.name}`,
          'alert',
          'info',
          { alertId: alert.id }
        );

        console.info(`✅ RESOLVED: Alert ${alert.id} - ${rule.name}`);
      }
    }
  }

  private async sendNotification(alert: Alert) {
    // This is where you would integrate with external notification services
    // For now, we'll just log and send to Sentry
    
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.message}`,
            alert,
            timestamp: new Date(alert.timestamp).toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send alert notification:', error);
      }
    }
  }

  public getAlerts(resolved?: boolean): Alert[] {
    if (resolved === undefined) {
      return [...this.alerts];
    }
    return this.alerts.filter(a => a.resolved === resolved);
  }

  public getActiveAlerts(): Alert[] {
    return this.getAlerts(false);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  public addCustomRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  public removeRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  public getRules(): AlertRule[] {
    return [...this.alertRules];
  }

  public getAlertSummary() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    const recentAlerts = this.alerts.filter(a => a.timestamp > last24h);
    const activeAlerts = this.getActiveAlerts();
    
    const severityCounts = recentAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.alerts.length,
      active: activeAlerts.length,
      resolved: this.alerts.filter(a => a.resolved).length,
      last24h: recentAlerts.length,
      severityCounts,
      rules: {
        total: this.alertRules.length,
        enabled: this.alertRules.filter(r => r.enabled).length,
      },
    };
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const alertingService = new AlertingService();