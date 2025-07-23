import { loadBalancerService } from './LoadBalancerService';
import { performanceMonitor } from './PerformanceMonitoringService';
import { loggingService } from './LoggingService';

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
}

export interface ScalingRule {
  id: string;
  name: string;
  metric: keyof ScalingMetrics;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number; // milliseconds
  action: 'scale_up' | 'scale_down';
  cooldown: number; // milliseconds
  enabled: boolean;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  targetResponseTime: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  enabled: boolean;
}

export interface ScalingEvent {
  id: string;
  timestamp: Date;
  action: 'scale_up' | 'scale_down';
  reason: string;
  instancesBefore: number;
  instancesAfter: number;
  metrics: ScalingMetrics;
  success: boolean;
  error?: string;
}

class AutoScalingService {
  private config: ScalingConfig;
  private rules: Map<string, ScalingRule> = new Map();
  private events: ScalingEvent[] = [];
  private lastScaleAction: Date | null = null;
  private metricsHistory: Array<{ timestamp: Date; metrics: ScalingMetrics }> = [];
  private scalingInterval?: NodeJS.Timeout;

  constructor() {
    this.config = {
      minInstances: parseInt(process.env.MIN_INSTANCES || '1'),
      maxInstances: parseInt(process.env.MAX_INSTANCES || '10'),
      targetCpuUtilization: parseFloat(process.env.TARGET_CPU_UTILIZATION || '70'),
      targetMemoryUtilization: parseFloat(process.env.TARGET_MEMORY_UTILIZATION || '80'),
      targetResponseTime: parseInt(process.env.TARGET_RESPONSE_TIME || '1000'),
      scaleUpCooldown: parseInt(process.env.SCALE_UP_COOLDOWN || '300000'), // 5 minutes
      scaleDownCooldown: parseInt(process.env.SCALE_DOWN_COOLDOWN || '600000'), // 10 minutes
      enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    };

    this.initializeDefaultRules();
    this.startMetricsCollection();
    
    if (this.config.enabled) {
      this.startAutoScaling();
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<ScalingRule, 'id'>[] = [
      {
        name: 'High CPU Usage Scale Up',
        metric: 'cpuUsage',
        operator: 'greater_than',
        threshold: this.config.targetCpuUtilization,
        duration: 120000, // 2 minutes
        action: 'scale_up',
        cooldown: this.config.scaleUpCooldown,
        enabled: true,
      },
      {
        name: 'Low CPU Usage Scale Down',
        metric: 'cpuUsage',
        operator: 'less_than',
        threshold: this.config.targetCpuUtilization * 0.3, // 30% of target
        duration: 300000, // 5 minutes
        action: 'scale_down',
        cooldown: this.config.scaleDownCooldown,
        enabled: true,
      },
      {
        name: 'High Memory Usage Scale Up',
        metric: 'memoryUsage',
        operator: 'greater_than',
        threshold: this.config.targetMemoryUtilization,
        duration: 180000, // 3 minutes
        action: 'scale_up',
        cooldown: this.config.scaleUpCooldown,
        enabled: true,
      },
      {
        name: 'High Response Time Scale Up',
        metric: 'responseTime',
        operator: 'greater_than',
        threshold: this.config.targetResponseTime,
        duration: 60000, // 1 minute
        action: 'scale_up',
        cooldown: this.config.scaleUpCooldown,
        enabled: true,
      },
      {
        name: 'High Error Rate Scale Up',
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 5, // 5% error rate
        duration: 60000, // 1 minute
        action: 'scale_up',
        cooldown: this.config.scaleUpCooldown,
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      const id = this.generateRuleId();
      this.rules.set(id, { ...rule, id });
    });

    loggingService.info('Auto-scaling rules initialized', {
      ruleCount: this.rules.size,
      enabled: this.config.enabled,
    });
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect metrics every 30 seconds
  }

  private async collectMetrics(): Promise<void> {
    try {
      const performanceStats = performanceMonitor.getMetricsSummary();
      const instanceStats = loadBalancerService.getInstanceStats();

      // Calculate aggregate metrics
      const totalConnections = instanceStats.reduce((sum, instance) => 
        sum + instance.activeConnections, 0
      );

      const avgResponseTime = instanceStats.length > 0
        ? instanceStats.reduce((sum, instance) => sum + instance.responseTime, 0) / instanceStats.length
        : 0;

      const avgErrorRate = instanceStats.length > 0
        ? instanceStats.reduce((sum, instance) => sum + instance.errorRate, 0) / instanceStats.length
        : 0;

      const metrics: ScalingMetrics = {
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: await this.getMemoryUsage(),
        requestRate: performanceStats.totalRequests / 60, // requests per second (approximate)
        responseTime: avgResponseTime,
        errorRate: avgErrorRate,
        activeConnections: totalConnections,
        queueLength: 0, // Would be implemented based on actual queue system
      };

      this.metricsHistory.push({
        timestamp: new Date(),
        metrics,
      });

      // Keep only recent metrics (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > oneDayAgo);

    } catch (error) {
      loggingService.error('Failed to collect scaling metrics', error as Error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    // In a real implementation, this would get actual CPU usage
    // For now, simulate based on request load
    const recentMetrics = this.metricsHistory.slice(-5);
    if (recentMetrics.length === 0) return 20; // Default low usage

    const avgRequestRate = recentMetrics.reduce((sum, entry) => 
      sum + entry.metrics.requestRate, 0
    ) / recentMetrics.length;

    // Simulate CPU usage based on request rate
    return Math.min(95, Math.max(10, avgRequestRate * 2));
  }

  private async getMemoryUsage(): Promise<number> {
    // In a real implementation, this would get actual memory usage
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      const totalMemory = usage.heapTotal + usage.external;
      const usedMemory = usage.heapUsed;
      return (usedMemory / totalMemory) * 100;
    }
    return 50; // Default moderate usage
  }

  private startAutoScaling(): void {
    this.scalingInterval = setInterval(() => {
      this.evaluateScalingRules();
    }, 60000); // Evaluate every minute

    loggingService.info('Auto-scaling started');
  }

  private async evaluateScalingRules(): Promise<void> {
    if (!this.config.enabled || this.metricsHistory.length === 0) {
      return;
    }

    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1].metrics;
    const currentInstanceCount = loadBalancerService.getHealthyInstanceCount();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.shouldTriggerRule(rule, currentMetrics);
      
      if (shouldTrigger) {
        await this.executeScalingAction(rule, currentMetrics, currentInstanceCount);
      }
    }
  }

  private async shouldTriggerRule(rule: ScalingRule, currentMetrics: ScalingMetrics): Promise<boolean> {
    // Check if cooldown period has passed
    if (this.lastScaleAction) {
      const timeSinceLastAction = Date.now() - this.lastScaleAction.getTime();
      if (timeSinceLastAction < rule.cooldown) {
        return false;
      }
    }

    // Check if metric condition is met for the required duration
    const durationStart = new Date(Date.now() - rule.duration);
    const relevantMetrics = this.metricsHistory.filter(entry => entry.timestamp >= durationStart);

    if (relevantMetrics.length === 0) {
      return false;
    }

    // Check if condition is consistently met
    const conditionMet = relevantMetrics.every(entry => {
      const metricValue = entry.metrics[rule.metric];
      
      switch (rule.operator) {
        case 'greater_than':
          return metricValue > rule.threshold;
        case 'less_than':
          return metricValue < rule.threshold;
        case 'equals':
          return Math.abs(metricValue - rule.threshold) < 0.01;
        default:
          return false;
      }
    });

    return conditionMet;
  }

  private async executeScalingAction(
    rule: ScalingRule,
    metrics: ScalingMetrics,
    currentInstanceCount: number
  ): Promise<void> {
    const eventId = this.generateEventId();
    let success = false;
    let error: string | undefined;
    let newInstanceCount = currentInstanceCount;

    try {
      if (rule.action === 'scale_up') {
        if (currentInstanceCount < this.config.maxInstances) {
          newInstanceCount = await this.scaleUp();
          success = newInstanceCount > currentInstanceCount;
        } else {
          error = 'Already at maximum instance count';
        }
      } else if (rule.action === 'scale_down') {
        if (currentInstanceCount > this.config.minInstances) {
          newInstanceCount = await this.scaleDown();
          success = newInstanceCount < currentInstanceCount;
        } else {
          error = 'Already at minimum instance count';
        }
      }

      if (success) {
        this.lastScaleAction = new Date();
      }

    } catch (err) {
      error = (err as Error).message;
      success = false;
    }

    // Record scaling event
    const event: ScalingEvent = {
      id: eventId,
      timestamp: new Date(),
      action: rule.action,
      reason: `Rule triggered: ${rule.name}`,
      instancesBefore: currentInstanceCount,
      instancesAfter: newInstanceCount,
      metrics,
      success,
      error,
    };

    this.events.push(event);

    // Keep only recent events (last 100)
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    loggingService.info('Scaling action executed', {
      eventId,
      action: rule.action,
      rule: rule.name,
      success,
      instancesBefore: currentInstanceCount,
      instancesAfter: newInstanceCount,
      error,
    });
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async scaleUp(): Promise<number> {
    // In a real implementation, this would:
    // 1. Launch new instance (Docker container, VM, etc.)
    // 2. Wait for instance to be healthy
    // 3. Add instance to load balancer
    
    loggingService.info('Scaling up - would launch new instance');
    
    // Simulate adding a new instance
    const newInstanceId = `auto-${Date.now()}`;
    loadBalancerService.addInstance({
      id: newInstanceId,
      host: 'auto-scaled-host',
      port: 3001,
      weight: 1,
      region: 'auto',
      version: '1.0.0',
    });

    return loadBalancerService.getHealthyInstanceCount();
  }

  private async scaleDown(): Promise<number> {
    // In a real implementation, this would:
    // 1. Select instance to remove (least loaded)
    // 2. Drain connections from instance
    // 3. Remove instance from load balancer
    // 4. Terminate instance
    
    loggingService.info('Scaling down - would remove instance');
    
    // Simulate removing an auto-scaled instance
    const instanceStats = loadBalancerService.getInstanceStats();
    const autoInstances = instanceStats.filter(i => i.id.startsWith('auto-'));
    
    if (autoInstances.length > 0) {
      const instanceToRemove = autoInstances.reduce((min, instance) => 
        instance.activeConnections < min.activeConnections ? instance : min
      );
      
      await loadBalancerService.drainInstance(instanceToRemove.id, 30000);
      loadBalancerService.removeInstance(instanceToRemove.id);
    }

    return loadBalancerService.getHealthyInstanceCount();
  }

  public addScalingRule(rule: Omit<ScalingRule, 'id'>): string {
    const id = this.generateRuleId();
    this.rules.set(id, { ...rule, id });
    
    loggingService.info('Scaling rule added', { id, name: rule.name });
    return id;
  }

  public removeScalingRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      loggingService.info('Scaling rule removed', { id: ruleId });
    }
    return removed;
  }

  public updateScalingRule(ruleId: string, updates: Partial<ScalingRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    loggingService.info('Scaling rule updated', { id: ruleId, updates });
    return true;
  }

  public getScalingRules(): ScalingRule[] {
    return Array.from(this.rules.values());
  }

  public getScalingEvents(limit: number = 50): ScalingEvent[] {
    return this.events.slice(-limit).reverse(); // Most recent first
  }

  public getCurrentMetrics(): ScalingMetrics | null {
    if (this.metricsHistory.length === 0) return null;
    return this.metricsHistory[this.metricsHistory.length - 1].metrics;
  }

  public getMetricsHistory(hours: number = 24): Array<{ timestamp: Date; metrics: ScalingMetrics }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(entry => entry.timestamp >= cutoff);
  }

  public updateConfig(newConfig: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !this.scalingInterval) {
        this.startAutoScaling();
      } else if (!newConfig.enabled && this.scalingInterval) {
        clearInterval(this.scalingInterval);
        this.scalingInterval = undefined;
      }
    }

    loggingService.info('Auto-scaling configuration updated', newConfig);
  }

  public getConfig(): ScalingConfig {
    return { ...this.config };
  }

  public async manualScale(action: 'up' | 'down', reason: string): Promise<boolean> {
    const currentInstanceCount = loadBalancerService.getHealthyInstanceCount();
    const currentMetrics = this.getCurrentMetrics();

    if (!currentMetrics) {
      throw new Error('No metrics available for manual scaling');
    }

    let newInstanceCount = currentInstanceCount;
    let success = false;

    if (action === 'up' && currentInstanceCount < this.config.maxInstances) {
      newInstanceCount = await this.scaleUp();
      success = newInstanceCount > currentInstanceCount;
    } else if (action === 'down' && currentInstanceCount > this.config.minInstances) {
      newInstanceCount = await this.scaleDown();
      success = newInstanceCount < currentInstanceCount;
    }

    // Record manual scaling event
    const event: ScalingEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      action: action === 'up' ? 'scale_up' : 'scale_down',
      reason: `Manual scaling: ${reason}`,
      instancesBefore: currentInstanceCount,
      instancesAfter: newInstanceCount,
      metrics: currentMetrics,
      success,
    };

    this.events.push(event);

    return success;
  }

  public getScalingRecommendations(): Array<{
    action: 'scale_up' | 'scale_down' | 'no_action';
    reason: string;
    confidence: number;
    metrics: ScalingMetrics;
  }> {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return [];

    const recommendations: Array<{
      action: 'scale_up' | 'scale_down' | 'no_action';
      reason: string;
      confidence: number;
      metrics: ScalingMetrics;
    }> = [];

    // Analyze current metrics
    if (currentMetrics.cpuUsage > this.config.targetCpuUtilization * 1.2) {
      recommendations.push({
        action: 'scale_up',
        reason: `High CPU usage: ${currentMetrics.cpuUsage.toFixed(1)}%`,
        confidence: 0.8,
        metrics: currentMetrics,
      });
    }

    if (currentMetrics.responseTime > this.config.targetResponseTime * 1.5) {
      recommendations.push({
        action: 'scale_up',
        reason: `High response time: ${currentMetrics.responseTime}ms`,
        confidence: 0.9,
        metrics: currentMetrics,
      });
    }

    if (currentMetrics.cpuUsage < this.config.targetCpuUtilization * 0.3 &&
        currentMetrics.responseTime < this.config.targetResponseTime * 0.5) {
      recommendations.push({
        action: 'scale_down',
        reason: 'Low resource utilization',
        confidence: 0.6,
        metrics: currentMetrics,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        action: 'no_action',
        reason: 'Metrics within target ranges',
        confidence: 0.7,
        metrics: currentMetrics,
      });
    }

    return recommendations;
  }

  public async healthCheck(): Promise<{
    enabled: boolean;
    currentInstances: number;
    minInstances: number;
    maxInstances: number;
    recentEvents: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    const currentInstances = loadBalancerService.getHealthyInstanceCount();
    const recentEvents = this.events.filter(e => 
      Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    ).length;

    if (!this.config.enabled) {
      issues.push('Auto-scaling is disabled');
    }

    if (currentInstances <= this.config.minInstances) {
      issues.push('Running at minimum instance count');
    }

    if (currentInstances >= this.config.maxInstances) {
      issues.push('Running at maximum instance count');
    }

    const failedEvents = this.events.filter(e => !e.success).length;
    if (failedEvents > this.events.length * 0.2) {
      issues.push('High scaling failure rate');
    }

    return {
      enabled: this.config.enabled,
      currentInstances,
      minInstances: this.config.minInstances,
      maxInstances: this.config.maxInstances,
      recentEvents,
      issues,
    };
  }

  public cleanup(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    this.rules.clear();
    this.events = [];
    this.metricsHistory = [];
  }
}

export const autoScalingService = new AutoScalingService();