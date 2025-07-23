import { loggingService } from './LoggingService';
import { alertingService } from './AlertingService';
import { apmService } from './APMService';
import { distributedTracingService } from './DistributedTracingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface IssuePattern {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'error' | 'availability' | 'security' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Array<{
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'regex';
    value: any;
    timeWindow: number; // milliseconds
    threshold: number; // number of occurrences
  }>;
  actions: Array<{
    type: 'alert' | 'auto_scale' | 'restart_service' | 'clear_cache' | 'notify';
    config: Record<string, any>;
  }>;
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export interface DetectedIssue {
  id: string;
  patternId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'error' | 'availability' | 'security' | 'resource';
  detectedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
  evidence: Array<{
    type: 'metric' | 'log' | 'trace' | 'alert';
    data: any;
    timestamp: string;
  }>;
  affectedServices: string[];
  rootCause?: {
    category: string;
    description: string;
    confidence: number; // 0-100
    recommendations: string[];
  };
  resolution?: {
    action: string;
    timestamp: string;
    success: boolean;
    notes?: string;
  };
  metadata: Record<string, any>;
}

export interface CapacityPrediction {
  resource: 'cpu' | 'memory' | 'disk' | 'network' | 'database_connections';
  currentUsage: number;
  predictedUsage: number;
  timeToCapacity: number; // milliseconds
  confidence: number; // 0-100
  recommendations: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

class AutomatedIssueDetectionService {
  private issuePatterns: Map<string, IssuePattern> = new Map();
  private detectedIssues: Map<string, DetectedIssue> = new Map();
  private capacityPredictions: Map<string, CapacityPrediction> = new Map();
  private detectionInterval?: NodeJS.Timeout;
  private readonly DETECTION_INTERVAL = 30000; // 30 seconds
  private readonly ISSUE_RETENTION_DAYS = 30;

  constructor() {
    this.initializeDefaultPatterns();
    this.startDetection();
    
    loggingService.info('Automated Issue Detection Service initialized');
  }

  /**
   * Add issue pattern
   */
  public addIssuePattern(pattern: Omit<IssuePattern, 'id' | 'triggerCount'>): IssuePattern {
    const id = this.generateId();
    const fullPattern: IssuePattern = {
      ...pattern,
      id,
      triggerCount: 0,
    };
    
    this.issuePatterns.set(id, fullPattern);
    
    loggingService.info('Issue pattern added', {
      id,
      name: pattern.name,
      type: pattern.type,
      severity: pattern.severity,
    });
    
    return fullPattern;
  }

  /**
   * Update issue pattern
   */
  public updateIssuePattern(id: string, updates: Partial<IssuePattern>): IssuePattern | null {
    const pattern = this.issuePatterns.get(id);
    if (!pattern) return null;
    
    const updatedPattern = { ...pattern, ...updates, id }; // Ensure ID doesn't change
    this.issuePatterns.set(id, updatedPattern);
    
    loggingService.info('Issue pattern updated', { id, name: updatedPattern.name });
    
    return updatedPattern;
  }

  /**
   * Delete issue pattern
   */
  public deleteIssuePattern(id: string): boolean {
    const deleted = this.issuePatterns.delete(id);
    
    if (deleted) {
      loggingService.info('Issue pattern deleted', { id });
    }
    
    return deleted;
  }

  /**
   * Get issue patterns
   */
  public getIssuePatterns(): IssuePattern[] {
    return Array.from(this.issuePatterns.values());
  }

  /**
   * Get detected issues
   */
  public getDetectedIssues(filters?: {
    status?: 'open' | 'investigating' | 'resolved' | 'ignored';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: 'performance' | 'error' | 'availability' | 'security' | 'resource';
    service?: string;
    limit?: number;
  }): DetectedIssue[] {
    let issues = Array.from(this.detectedIssues.values());
    
    if (filters?.status) {
      issues = issues.filter(issue => issue.status === filters.status);
    }
    
    if (filters?.severity) {
      issues = issues.filter(issue => issue.severity === filters.severity);
    }
    
    if (filters?.type) {
      issues = issues.filter(issue => issue.type === filters.type);
    }
    
    if (filters?.service) {
      issues = issues.filter(issue => issue.affectedServices.includes(filters.service!));
    }
    
    // Sort by detection time (newest first)
    issues.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    
    if (filters?.limit) {
      issues = issues.slice(0, filters.limit);
    }
    
    return issues;
  }

  /**
   * Update issue status
   */
  public updateIssueStatus(
    issueId: string,
    status: 'open' | 'investigating' | 'resolved' | 'ignored',
    notes?: string
  ): DetectedIssue | null {
    const issue = this.detectedIssues.get(issueId);
    if (!issue) return null;
    
    issue.status = status;
    
    if (status === 'resolved' && !issue.resolution) {
      issue.resolution = {
        action: 'manual_resolution',
        timestamp: new Date().toISOString(),
        success: true,
        notes,
      };
    }
    
    loggingService.info('Issue status updated', {
      issueId,
      status,
      title: issue.title,
    });
    
    return issue;
  }

  /**
   * Get capacity predictions
   */
  public getCapacityPredictions(): CapacityPrediction[] {
    return Array.from(this.capacityPredictions.values());
  }

  /**
   * Manually trigger issue detection
   */
  public async triggerDetection(): Promise<DetectedIssue[]> {
    return await this.detectIssues();
  }

  /**
   * Get issue detection statistics
   */
  public getDetectionStatistics(): {
    totalPatterns: number;
    enabledPatterns: number;
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    averageResolutionTime: number;
  } {
    const issues = Array.from(this.detectedIssues.values());
    const patterns = Array.from(this.issuePatterns.values());
    
    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      
      if (issue.status === 'resolved' && issue.resolution) {
        const detectedTime = new Date(issue.detectedAt).getTime();
        const resolvedTime = new Date(issue.resolution.timestamp).getTime();
        totalResolutionTime += resolvedTime - detectedTime;
        resolvedCount++;
      }
    });
    
    return {
      totalPatterns: patterns.length,
      enabledPatterns: patterns.filter(p => p.enabled).length,
      totalIssues: issues.length,
      openIssues: issues.filter(i => i.status === 'open').length,
      resolvedIssues: issues.filter(i => i.status === 'resolved').length,
      issuesByType,
      issuesBySeverity,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    };
  }

  /**
   * Initialize default issue patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: Omit<IssuePattern, 'id' | 'triggerCount'>[] = [
      {
        name: 'High Error Rate',
        description: 'Detects when error rate exceeds 5% over 5 minutes',
        type: 'error',
        severity: 'high',
        conditions: [
          {
            metric: 'http.errors',
            operator: 'gt',
            value: 5,
            timeWindow: 300000, // 5 minutes
            threshold: 3, // 3 occurrences
          },
        ],
        actions: [
          {
            type: 'alert',
            config: {
              channels: ['email', 'slack'],
              message: 'High error rate detected',
            },
          },
        ],
        enabled: true,
      },
      {
        name: 'Slow Response Time',
        description: 'Detects when average response time exceeds 5 seconds',
        type: 'performance',
        severity: 'medium',
        conditions: [
          {
            metric: 'http.response_time',
            operator: 'gt',
            value: 5000,
            timeWindow: 600000, // 10 minutes
            threshold: 5,
          },
        ],
        actions: [
          {
            type: 'alert',
            config: {
              channels: ['email'],
              message: 'Slow response time detected',
            },
          },
        ],
        enabled: true,
      },
      {
        name: 'Memory Usage Critical',
        description: 'Detects when memory usage exceeds 90%',
        type: 'resource',
        severity: 'critical',
        conditions: [
          {
            metric: 'system.memory_usage',
            operator: 'gt',
            value: 90,
            timeWindow: 300000, // 5 minutes
            threshold: 2,
          },
        ],
        actions: [
          {
            type: 'alert',
            config: {
              channels: ['email', 'slack', 'pagerduty'],
              message: 'Critical memory usage detected',
            },
          },
          {
            type: 'clear_cache',
            config: {},
          },
        ],
        enabled: true,
      },
      {
        name: 'Service Unavailable',
        description: 'Detects when service health check fails',
        type: 'availability',
        severity: 'critical',
        conditions: [
          {
            metric: 'service.health',
            operator: 'eq',
            value: 'unhealthy',
            timeWindow: 60000, // 1 minute
            threshold: 1,
          },
        ],
        actions: [
          {
            type: 'alert',
            config: {
              channels: ['email', 'slack', 'pagerduty'],
              message: 'Service unavailable',
            },
          },
          {
            type: 'restart_service',
            config: {
              service: 'auto_detect',
            },
          },
        ],
        enabled: true,
      },
    ];

    defaultPatterns.forEach(pattern => {
      this.addIssuePattern(pattern);
    });
  }

  /**
   * Start automated detection
   */
  private startDetection(): void {
    this.detectionInterval = setInterval(async () => {
      try {
        await this.detectIssues();
        await this.updateCapacityPredictions();
        this.cleanupOldIssues();
      } catch (error: any) {
        loggingService.error('Issue detection failed', error);
      }
    }, this.DETECTION_INTERVAL);
  }

  /**
   * Detect issues based on patterns
   */
  private async detectIssues(): Promise<DetectedIssue[]> {
    const newIssues: DetectedIssue[] = [];
    
    for (const pattern of this.issuePatterns.values()) {
      if (!pattern.enabled) continue;
      
      try {
        const isTriggered = await this.evaluatePattern(pattern);
        
        if (isTriggered) {
          const issue = await this.createIssue(pattern);
          newIssues.push(issue);
          
          // Execute actions
          await this.executeActions(pattern, issue);
          
          // Update pattern trigger count
          pattern.triggerCount++;
          pattern.lastTriggered = new Date().toISOString();
        }
      } catch (error: any) {
        loggingService.error('Failed to evaluate pattern', error, {
          patternId: pattern.id,
          patternName: pattern.name,
        });
      }
    }
    
    if (newIssues.length > 0) {
      loggingService.info('Issues detected', {
        count: newIssues.length,
        issues: newIssues.map(i => ({ id: i.id, title: i.title, severity: i.severity })),
      });
    }
    
    return newIssues;
  }

  /**
   * Evaluate pattern conditions
   */
  private async evaluatePattern(pattern: IssuePattern): Promise<boolean> {
    for (const condition of pattern.conditions) {
      const isConditionMet = await this.evaluateCondition(condition);
      if (!isConditionMet) {
        return false; // All conditions must be met
      }
    }
    
    return true;
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'regex';
    value: any;
    timeWindow: number;
    threshold: number;
  }): Promise<boolean> {
    try {
      // Get metric values for the time window
      const metricValues = apmService.getMetrics(condition.metric, {}, condition.timeWindow);
      
      if (metricValues.length < condition.threshold) {
        return false;
      }
      
      // Count how many values meet the condition
      let matchCount = 0;
      
      for (const metric of metricValues) {
        let matches = false;
        
        switch (condition.operator) {
          case 'gt':
            matches = metric.value > condition.value;
            break;
          case 'lt':
            matches = metric.value < condition.value;
            break;
          case 'eq':
            matches = metric.value === condition.value;
            break;
          case 'ne':
            matches = metric.value !== condition.value;
            break;
          case 'contains':
            matches = String(metric.value).includes(String(condition.value));
            break;
          case 'regex':
            matches = new RegExp(condition.value).test(String(metric.value));
            break;
        }
        
        if (matches) {
          matchCount++;
        }
      }
      
      return matchCount >= condition.threshold;
    } catch (error: any) {
      loggingService.error('Failed to evaluate condition', error, { condition });
      return false;
    }
  }

  /**
   * Create issue from pattern
   */
  private async createIssue(pattern: IssuePattern): Promise<DetectedIssue> {
    const issueId = this.generateId();
    
    // Gather evidence
    const evidence = await this.gatherEvidence(pattern);
    
    // Determine affected services
    const affectedServices = this.determineAffectedServices(evidence);
    
    // Analyze root cause
    const rootCause = await this.analyzeRootCause(pattern, evidence);
    
    const issue: DetectedIssue = {
      id: issueId,
      patternId: pattern.id,
      title: pattern.name,
      description: pattern.description,
      severity: pattern.severity,
      type: pattern.type,
      detectedAt: new Date().toISOString(),
      status: 'open',
      evidence,
      affectedServices,
      rootCause,
      metadata: {
        patternTriggerCount: pattern.triggerCount,
      },
    };
    
    this.detectedIssues.set(issueId, issue);
    
    return issue;
  }

  /**
   * Gather evidence for issue
   */
  private async gatherEvidence(pattern: IssuePattern): Promise<DetectedIssue['evidence']> {
    const evidence: DetectedIssue['evidence'] = [];
    
    // Gather metric evidence
    for (const condition of pattern.conditions) {
      const metrics = apmService.getMetrics(condition.metric, {}, condition.timeWindow);
      if (metrics.length > 0) {
        evidence.push({
          type: 'metric',
          data: {
            metric: condition.metric,
            values: metrics.slice(-10), // Last 10 values
            condition,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Gather trace evidence
    const recentTraces = distributedTracingService.searchTraces({
      status: 'error',
      limit: 5,
      startTime: Date.now() - 300000, // Last 5 minutes
    });
    
    if (recentTraces.length > 0) {
      evidence.push({
        type: 'trace',
        data: {
          traces: recentTraces.map(trace => ({
            traceId: trace.traceId,
            duration: trace.duration,
            errorSpans: trace.errorSpans.length,
            services: trace.services,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    return evidence;
  }

  /**
   * Determine affected services from evidence
   */
  private determineAffectedServices(evidence: DetectedIssue['evidence']): string[] {
    const services = new Set<string>();
    
    evidence.forEach(item => {
      if (item.type === 'trace' && item.data.traces) {
        item.data.traces.forEach((trace: any) => {
          trace.services?.forEach((service: string) => services.add(service));
        });
      }
      
      if (item.type === 'metric' && item.data.metric) {
        // Extract service from metric tags if available
        const metricData = item.data.values || [];
        metricData.forEach((metric: any) => {
          if (metric.tags?.service) {
            services.add(metric.tags.service);
          }
        });
      }
    });
    
    return Array.from(services);
  }

  /**
   * Analyze root cause
   */
  private async analyzeRootCause(
    pattern: IssuePattern,
    evidence: DetectedIssue['evidence']
  ): Promise<DetectedIssue['rootCause']> {
    // Simple root cause analysis based on pattern type and evidence
    let category = 'unknown';
    let description = 'Root cause analysis in progress';
    let confidence = 50;
    let recommendations: string[] = [];
    
    switch (pattern.type) {
      case 'performance':
        category = 'performance_degradation';
        description = 'System performance has degraded beyond acceptable thresholds';
        confidence = 70;
        recommendations = [
          'Check for resource bottlenecks (CPU, memory, I/O)',
          'Review recent deployments or configuration changes',
          'Analyze slow queries or operations',
          'Consider scaling resources if needed',
        ];
        break;
        
      case 'error':
        category = 'error_spike';
        description = 'Error rate has increased significantly';
        confidence = 80;
        recommendations = [
          'Review error logs for common patterns',
          'Check external service dependencies',
          'Verify recent code deployments',
          'Implement circuit breakers for failing services',
        ];
        break;
        
      case 'resource':
        category = 'resource_exhaustion';
        description = 'System resources are approaching or have exceeded capacity';
        confidence = 90;
        recommendations = [
          'Scale resources immediately if possible',
          'Identify and optimize resource-intensive operations',
          'Implement resource monitoring and alerting',
          'Consider load balancing or horizontal scaling',
        ];
        break;
        
      case 'availability':
        category = 'service_outage';
        description = 'Service availability has been compromised';
        confidence = 85;
        recommendations = [
          'Check service health and restart if necessary',
          'Verify network connectivity and dependencies',
          'Review infrastructure status',
          'Implement health checks and auto-recovery',
        ];
        break;
    }
    
    return {
      category,
      description,
      confidence,
      recommendations,
    };
  }

  /**
   * Execute pattern actions
   */
  private async executeActions(pattern: IssuePattern, issue: DetectedIssue): Promise<void> {
    for (const action of pattern.actions) {
      try {
        await this.executeAction(action, issue);
      } catch (error: any) {
        loggingService.error('Failed to execute action', error, {
          actionType: action.type,
          issueId: issue.id,
        });
      }
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(
    action: { type: string; config: Record<string, any> },
    issue: DetectedIssue
  ): Promise<void> {
    switch (action.type) {
      case 'alert':
        await alertingService.createAlert({
          type: 'automated_detection',
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          source: 'issue_detection',
          metadata: { issueId: issue.id, action },
        });
        break;
        
      case 'clear_cache':
        await advancedCachingService.invalidateAll();
        loggingService.info('Cache cleared due to automated action', { issueId: issue.id });
        break;
        
      case 'notify':
        // Would integrate with notification service
        loggingService.info('Notification sent', {
          issueId: issue.id,
          config: action.config,
        });
        break;
        
      default:
        loggingService.warn('Unknown action type', {
          actionType: action.type,
          issueId: issue.id,
        });
    }
  }

  /**
   * Update capacity predictions
   */
  private async updateCapacityPredictions(): Promise<void> {
    try {
      const resources = ['cpu', 'memory', 'disk', 'network', 'database_connections'] as const;
      
      for (const resource of resources) {
        const prediction = await this.predictCapacity(resource);
        if (prediction) {
          this.capacityPredictions.set(resource, prediction);
        }
      }
    } catch (error: any) {
      loggingService.error('Failed to update capacity predictions', error);
    }
  }

  /**
   * Predict capacity for resource
   */
  private async predictCapacity(
    resource: 'cpu' | 'memory' | 'disk' | 'network' | 'database_connections'
  ): Promise<CapacityPrediction | null> {
    try {
      // Get historical usage data
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
      const metrics = apmService.getMetrics(`system.${resource}_usage`, {}, timeWindow);
      
      if (metrics.length < 10) {
        return null; // Not enough data
      }
      
      // Simple linear regression for trend analysis
      const values = metrics.map(m => m.value);
      const currentUsage = values[values.length - 1];
      
      // Calculate trend
      const trend = this.calculateTrend(values);
      const predictedUsage = Math.max(0, Math.min(100, currentUsage + trend * 24)); // 24 hours ahead
      
      // Calculate time to capacity (assuming 95% is capacity)
      const timeToCapacity = trend > 0 ? ((95 - currentUsage) / trend) * 60 * 60 * 1000 : Infinity;
      
      // Calculate confidence based on data consistency
      const confidence = this.calculatePredictionConfidence(values);
      
      const recommendations: string[] = [];
      if (predictedUsage > 80) {
        recommendations.push(`Scale ${resource} resources within 24 hours`);
        recommendations.push(`Monitor ${resource} usage closely`);
      }
      if (trend === 'increasing' && timeToCapacity < 24 * 60 * 60 * 1000) {
        recommendations.push(`Immediate action required for ${resource}`);
      }
      
      return {
        resource,
        currentUsage,
        predictedUsage,
        timeToCapacity: isFinite(timeToCapacity) ? timeToCapacity : -1,
        confidence,
        recommendations,
        trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
      };
    } catch (error: any) {
      loggingService.error('Failed to predict capacity', error, { resource });
      return null;
    }
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope || 0;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(values: number[]): number {
    if (values.length < 3) return 30;
    
    // Calculate variance
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    const confidence = Math.max(30, Math.min(95, 100 - (stdDev * 2)));
    
    return Math.round(confidence);
  }

  /**
   * Cleanup old issues
   */
  private cleanupOldIssues(): void {
    const cutoffTime = Date.now() - (this.ISSUE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    for (const [issueId, issue] of this.detectedIssues.entries()) {
      const issueTime = new Date(issue.detectedAt).getTime();
      if (issueTime < cutoffTime && issue.status === 'resolved') {
        this.detectedIssues.delete(issueId);
      }
    }
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
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    
    this.issuePatterns.clear();
    this.detectedIssues.clear();
    this.capacityPredictions.clear();
    
    loggingService.info('Automated Issue Detection Service cleaned up');
  }
}

export const automatedIssueDetectionService = new AutomatedIssueDetectionService();