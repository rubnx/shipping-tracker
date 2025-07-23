import { loggingService } from './LoggingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, any>;
  }>;
  metadata: {
    service: string;
    version: string;
    environment: string;
    userId?: string;
    sessionId?: string;
  };
}

export interface Trace {
  traceId: string;
  spans: TraceSpan[];
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'timeout';
  services: string[];
  rootSpan?: TraceSpan;
  errorSpans: TraceSpan[];
  criticalPath: TraceSpan[];
}

export interface PerformanceProfile {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  samples: Array<{
    timestamp: number;
    stackTrace: string[];
    cpuUsage: number;
    memoryUsage: number;
    activeHandles: number;
  }>;
  hotspots: Array<{
    function: string;
    file: string;
    line: number;
    selfTime: number;
    totalTime: number;
    callCount: number;
  }>;
  memoryProfile: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  };
}

export interface BottleneckAnalysis {
  type: 'cpu' | 'memory' | 'io' | 'network' | 'database' | 'external_api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    service: string;
    function?: string;
    file?: string;
    line?: number;
  };
  metrics: {
    duration: number;
    frequency: number;
    impact: number; // 0-100 scale
  };
  recommendations: string[];
  relatedTraces: string[];
}

class DistributedTracingService {
  private traces: Map<string, Trace> = new Map();
  private activeSpans: Map<string, TraceSpan> = new Map();
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private bottlenecks: BottleneckAnalysis[] = [];
  private readonly TRACE_RETENTION_HOURS = 24;
  private readonly SAMPLING_RATE = 0.1; // 10% sampling
  private profilingActive = false;
  private currentProfile?: PerformanceProfile;

  constructor() {
    this.startPeriodicCleanup();
    loggingService.info('Distributed Tracing Service initialized');
  }

  /**
   * Start a new trace
   */
  public startTrace(operationName: string, metadata: TraceSpan['metadata']): TraceSpan {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: {},
      logs: [],
      metadata,
    };
    
    this.activeSpans.set(spanId, span);
    
    // Create trace if it doesn't exist
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, {
        traceId,
        spans: [span],
        startTime: span.startTime,
        status: 'ok',
        services: [metadata.service],
        errorSpans: [],
        criticalPath: [],
      });
    }
    
    loggingService.debug('Trace started', {
      traceId,
      spanId,
      operationName,
      service: metadata.service,
    });
    
    return span;
  }

  /**
   * Start a child span
   */
  public startChildSpan(
    parentSpan: TraceSpan,
    operationName: string,
    metadata: TraceSpan['metadata']
  ): TraceSpan {
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      traceId: parentSpan.traceId,
      spanId,
      parentSpanId: parentSpan.spanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: {},
      logs: [],
      metadata,
    };
    
    this.activeSpans.set(spanId, span);
    
    // Add to trace
    const trace = this.traces.get(parentSpan.traceId);
    if (trace) {
      trace.spans.push(span);
      if (!trace.services.includes(metadata.service)) {
        trace.services.push(metadata.service);
      }
    }
    
    loggingService.debug('Child span started', {
      traceId: parentSpan.traceId,
      spanId,
      parentSpanId: parentSpan.spanId,
      operationName,
      service: metadata.service,
    });
    
    return span;
  }

  /**
   * Finish a span
   */
  public finishSpan(span: TraceSpan, status: 'ok' | 'error' | 'timeout' = 'ok'): void {
    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;
    
    this.activeSpans.delete(span.spanId);
    
    // Update trace
    const trace = this.traces.get(span.traceId);
    if (trace) {
      if (status === 'error') {
        trace.errorSpans.push(span);
        trace.status = 'error';
      }
      
      // Check if this is the last span
      const activeSpansInTrace = Array.from(this.activeSpans.values())
        .filter(s => s.traceId === span.traceId);
      
      if (activeSpansInTrace.length === 0) {
        this.finalizeTrace(trace);
      }
    }
    
    loggingService.debug('Span finished', {
      traceId: span.traceId,
      spanId: span.spanId,
      operationName: span.operationName,
      duration: span.duration,
      status,
    });
  }

  /**
   * Add tag to span
   */
  public addSpanTag(span: TraceSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  /**
   * Add log to span
   */
  public addSpanLog(
    span: TraceSpan,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, any>
  ): void {
    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields,
    });
  }

  /**
   * Get trace by ID
   */
  public getTrace(traceId: string): Trace | null {
    return this.traces.get(traceId) || null;
  }

  /**
   * Search traces
   */
  public searchTraces(filters: {
    service?: string;
    operationName?: string;
    status?: 'ok' | 'error' | 'timeout';
    minDuration?: number;
    maxDuration?: number;
    startTime?: number;
    endTime?: number;
    userId?: string;
    sessionId?: string;
    limit?: number;
  }): Trace[] {
    let traces = Array.from(this.traces.values());
    
    if (filters.service) {
      traces = traces.filter(trace => trace.services.includes(filters.service!));
    }
    
    if (filters.operationName) {
      traces = traces.filter(trace =>
        trace.spans.some(span => span.operationName.includes(filters.operationName!))
      );
    }
    
    if (filters.status) {
      traces = traces.filter(trace => trace.status === filters.status);
    }
    
    if (filters.minDuration) {
      traces = traces.filter(trace => (trace.duration || 0) >= filters.minDuration!);
    }
    
    if (filters.maxDuration) {
      traces = traces.filter(trace => (trace.duration || 0) <= filters.maxDuration!);
    }
    
    if (filters.startTime) {
      traces = traces.filter(trace => trace.startTime >= filters.startTime!);
    }
    
    if (filters.endTime) {
      traces = traces.filter(trace => trace.startTime <= filters.endTime!);
    }
    
    if (filters.userId) {
      traces = traces.filter(trace =>
        trace.spans.some(span => span.metadata.userId === filters.userId)
      );
    }
    
    if (filters.sessionId) {
      traces = traces.filter(trace =>
        trace.spans.some(span => span.metadata.sessionId === filters.sessionId)
      );
    }
    
    // Sort by start time (newest first)
    traces.sort((a, b) => b.startTime - a.startTime);
    
    // Apply limit
    if (filters.limit) {
      traces = traces.slice(0, filters.limit);
    }
    
    return traces;
  }

  /**
   * Start performance profiling
   */
  public startProfiling(name: string): PerformanceProfile {
    if (this.profilingActive) {
      throw new Error('Profiling already active');
    }
    
    const profile: PerformanceProfile = {
      id: this.generateTraceId(),
      name,
      startTime: Date.now(),
      samples: [],
      hotspots: [],
      memoryProfile: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0,
      },
    };
    
    this.currentProfile = profile;
    this.profilingActive = true;
    
    // Start sampling
    this.startSampling();
    
    loggingService.info('Performance profiling started', { name, profileId: profile.id });
    
    return profile;
  }

  /**
   * Stop performance profiling
   */
  public stopProfiling(): PerformanceProfile | null {
    if (!this.profilingActive || !this.currentProfile) {
      return null;
    }
    
    this.profilingActive = false;
    const profile = this.currentProfile;
    profile.endTime = Date.now();
    profile.duration = profile.endTime - profile.startTime;
    
    // Analyze hotspots
    this.analyzeHotspots(profile);
    
    // Store profile
    this.performanceProfiles.set(profile.id, profile);
    this.currentProfile = undefined;
    
    loggingService.info('Performance profiling stopped', {
      name: profile.name,
      profileId: profile.id,
      duration: profile.duration,
      sampleCount: profile.samples.length,
    });
    
    return profile;
  }

  /**
   * Get performance profile
   */
  public getPerformanceProfile(id: string): PerformanceProfile | null {
    return this.performanceProfiles.get(id) || null;
  }

  /**
   * Get all performance profiles
   */
  public getPerformanceProfiles(): PerformanceProfile[] {
    return Array.from(this.performanceProfiles.values());
  }

  /**
   * Analyze bottlenecks
   */
  public async analyzeBottlenecks(): Promise<BottleneckAnalysis[]> {
    try {
      const traces = Array.from(this.traces.values());
      const bottlenecks: BottleneckAnalysis[] = [];
      
      // Analyze slow operations
      const slowOperations = this.findSlowOperations(traces);
      bottlenecks.push(...slowOperations);
      
      // Analyze high error rates
      const errorBottlenecks = this.findErrorBottlenecks(traces);
      bottlenecks.push(...errorBottlenecks);
      
      // Analyze resource usage
      const resourceBottlenecks = await this.findResourceBottlenecks();
      bottlenecks.push(...resourceBottlenecks);
      
      // Sort by severity and impact
      bottlenecks.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.metrics.impact - a.metrics.impact;
      });
      
      this.bottlenecks = bottlenecks;
      
      loggingService.info('Bottleneck analysis completed', {
        bottleneckCount: bottlenecks.length,
        criticalCount: bottlenecks.filter(b => b.severity === 'critical').length,
      });
      
      return bottlenecks;
    } catch (error: any) {
      loggingService.error('Failed to analyze bottlenecks', error);
      return [];
    }
  }

  /**
   * Get bottleneck analysis
   */
  public getBottlenecks(): BottleneckAnalysis[] {
    return this.bottlenecks;
  }

  /**
   * Get trace analytics
   */
  public getTraceAnalytics(timeRange: number = 3600000): {
    totalTraces: number;
    errorRate: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
    serviceBreakdown: Record<string, number>;
    operationBreakdown: Record<string, number>;
    errorBreakdown: Record<string, number>;
  } {
    const cutoffTime = Date.now() - timeRange;
    const traces = Array.from(this.traces.values())
      .filter(trace => trace.startTime > cutoffTime);
    
    if (traces.length === 0) {
      return {
        totalTraces: 0,
        errorRate: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        serviceBreakdown: {},
        operationBreakdown: {},
        errorBreakdown: {},
      };
    }
    
    const durations = traces
      .filter(trace => trace.duration)
      .map(trace => trace.duration!)
      .sort((a, b) => a - b);
    
    const errorTraces = traces.filter(trace => trace.status === 'error');
    
    // Service breakdown
    const serviceBreakdown: Record<string, number> = {};
    traces.forEach(trace => {
      trace.services.forEach(service => {
        serviceBreakdown[service] = (serviceBreakdown[service] || 0) + 1;
      });
    });
    
    // Operation breakdown
    const operationBreakdown: Record<string, number> = {};
    traces.forEach(trace => {
      trace.spans.forEach(span => {
        operationBreakdown[span.operationName] = (operationBreakdown[span.operationName] || 0) + 1;
      });
    });
    
    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    errorTraces.forEach(trace => {
      trace.errorSpans.forEach(span => {
        const key = `${span.metadata.service}:${span.operationName}`;
        errorBreakdown[key] = (errorBreakdown[key] || 0) + 1;
      });
    });
    
    return {
      totalTraces: traces.length,
      errorRate: (errorTraces.length / traces.length) * 100,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
      serviceBreakdown,
      operationBreakdown,
      errorBreakdown,
    };
  }

  /**
   * Finalize trace
   */
  private finalizeTrace(trace: Trace): void {
    // Calculate total duration
    const endTimes = trace.spans
      .filter(span => span.endTime)
      .map(span => span.endTime!);
    
    if (endTimes.length > 0) {
      trace.endTime = Math.max(...endTimes);
      trace.duration = trace.endTime - trace.startTime;
    }
    
    // Find root span
    trace.rootSpan = trace.spans.find(span => !span.parentSpanId);
    
    // Calculate critical path
    trace.criticalPath = this.calculateCriticalPath(trace);
    
    // Store trace for analysis
    this.storeTrace(trace);
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(trace: Trace): TraceSpan[] {
    // Find the longest path through the trace
    const spans = trace.spans.filter(span => span.duration);
    spans.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    // For simplicity, return top 5 slowest spans
    return spans.slice(0, 5);
  }

  /**
   * Store trace
   */
  private async storeTrace(trace: Trace): Promise<void> {
    try {
      // Sample traces to avoid overwhelming storage
      if (Math.random() > this.SAMPLING_RATE) {
        return;
      }
      
      await advancedCachingService.set(
        `trace:${trace.traceId}`,
        trace,
        this.TRACE_RETENTION_HOURS * 3600,
        ['traces']
      );
    } catch (error: any) {
      loggingService.error('Failed to store trace', error);
    }
  }

  /**
   * Start sampling for performance profiling
   */
  private startSampling(): void {
    const sampleInterval = setInterval(() => {
      if (!this.profilingActive || !this.currentProfile) {
        clearInterval(sampleInterval);
        return;
      }
      
      const memUsage = process.memoryUsage();
      const sample = {
        timestamp: Date.now(),
        stackTrace: this.captureStackTrace(),
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        memoryUsage: memUsage.heapUsed,
        activeHandles: (process as any)._getActiveHandles().length,
      };
      
      this.currentProfile.samples.push(sample);
      
      // Update memory profile
      this.currentProfile.memoryProfile = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        arrayBuffers: memUsage.arrayBuffers,
      };
    }, 100); // Sample every 100ms
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): string[] {
    const stack = new Error().stack;
    if (!stack) return [];
    
    return stack
      .split('\n')
      .slice(2) // Remove Error and this function
      .map(line => line.trim())
      .filter(line => line.startsWith('at '))
      .slice(0, 10); // Limit to top 10 frames
  }

  /**
   * Analyze hotspots in performance profile
   */
  private analyzeHotspots(profile: PerformanceProfile): void {
    const functionCounts: Record<string, { count: number; totalTime: number }> = {};
    
    profile.samples.forEach((sample, index) => {
      const sampleTime = index < profile.samples.length - 1
        ? profile.samples[index + 1].timestamp - sample.timestamp
        : 100; // Default sample interval
      
      sample.stackTrace.forEach(frame => {
        const match = frame.match(/at (.+?) \((.+?):(\d+):\d+\)/);
        if (match) {
          const [, func, file, line] = match;
          const key = `${func}:${file}:${line}`;
          
          if (!functionCounts[key]) {
            functionCounts[key] = { count: 0, totalTime: 0 };
          }
          
          functionCounts[key].count++;
          functionCounts[key].totalTime += sampleTime;
        }
      });
    });
    
    // Convert to hotspots
    profile.hotspots = Object.entries(functionCounts)
      .map(([key, data]) => {
        const [func, file, line] = key.split(':');
        return {
          function: func,
          file,
          line: parseInt(line),
          selfTime: data.totalTime,
          totalTime: data.totalTime,
          callCount: data.count,
        };
      })
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 20); // Top 20 hotspots
  }

  /**
   * Find slow operations
   */
  private findSlowOperations(traces: Trace[]): BottleneckAnalysis[] {
    const operationStats: Record<string, {
      durations: number[];
      service: string;
      count: number;
    }> = {};
    
    traces.forEach(trace => {
      trace.spans.forEach(span => {
        if (span.duration) {
          const key = `${span.metadata.service}:${span.operationName}`;
          if (!operationStats[key]) {
            operationStats[key] = {
              durations: [],
              service: span.metadata.service,
              count: 0,
            };
          }
          operationStats[key].durations.push(span.duration);
          operationStats[key].count++;
        }
      });
    });
    
    const bottlenecks: BottleneckAnalysis[] = [];
    
    Object.entries(operationStats).forEach(([key, stats]) => {
      const [service, operation] = key.split(':');
      const avgDuration = stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length;
      const p95Duration = stats.durations.sort((a, b) => a - b)[Math.floor(stats.durations.length * 0.95)] || 0;
      
      if (avgDuration > 5000 || p95Duration > 10000) { // 5s avg or 10s p95
        bottlenecks.push({
          type: 'cpu',
          severity: p95Duration > 10000 ? 'critical' : avgDuration > 5000 ? 'high' : 'medium',
          description: `Slow operation: ${operation} in ${service} (avg: ${avgDuration.toFixed(0)}ms, p95: ${p95Duration.toFixed(0)}ms)`,
          location: { service },
          metrics: {
            duration: avgDuration,
            frequency: stats.count,
            impact: Math.min(100, (avgDuration / 1000) * 10), // Scale impact
          },
          recommendations: [
            'Profile the operation to identify CPU bottlenecks',
            'Consider caching frequently computed results',
            'Optimize database queries if applicable',
            'Consider breaking down the operation into smaller parts',
          ],
          relatedTraces: [], // Would be populated with actual trace IDs
        });
      }
    });
    
    return bottlenecks;
  }

  /**
   * Find error bottlenecks
   */
  private findErrorBottlenecks(traces: Trace[]): BottleneckAnalysis[] {
    const errorStats: Record<string, {
      count: number;
      total: number;
      service: string;
    }> = {};
    
    traces.forEach(trace => {
      trace.spans.forEach(span => {
        const key = `${span.metadata.service}:${span.operationName}`;
        if (!errorStats[key]) {
          errorStats[key] = { count: 0, total: 0, service: span.metadata.service };
        }
        errorStats[key].total++;
        if (span.status === 'error') {
          errorStats[key].count++;
        }
      });
    });
    
    const bottlenecks: BottleneckAnalysis[] = [];
    
    Object.entries(errorStats).forEach(([key, stats]) => {
      const [service, operation] = key.split(':');
      const errorRate = (stats.count / stats.total) * 100;
      
      if (errorRate > 5) { // 5% error rate threshold
        bottlenecks.push({
          type: 'external_api',
          severity: errorRate > 20 ? 'critical' : errorRate > 10 ? 'high' : 'medium',
          description: `High error rate: ${operation} in ${service} (${errorRate.toFixed(1)}%)`,
          location: { service },
          metrics: {
            duration: 0,
            frequency: stats.count,
            impact: Math.min(100, errorRate * 2), // Scale impact
          },
          recommendations: [
            'Investigate error logs for root cause',
            'Implement better error handling and retries',
            'Add circuit breaker pattern for external dependencies',
            'Monitor upstream service health',
          ],
          relatedTraces: [], // Would be populated with actual trace IDs
        });
      }
    });
    
    return bottlenecks;
  }

  /**
   * Find resource bottlenecks
   */
  private async findResourceBottlenecks(): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 80) {
      bottlenecks.push({
        type: 'memory',
        severity: memUsagePercent > 95 ? 'critical' : 'high',
        description: `High memory usage: ${memUsagePercent.toFixed(1)}% of heap used`,
        location: { service: 'application' },
        metrics: {
          duration: 0,
          frequency: 1,
          impact: memUsagePercent,
        },
        recommendations: [
          'Profile memory usage to identify leaks',
          'Optimize data structures and caching',
          'Consider increasing heap size',
          'Implement memory monitoring and alerts',
        ],
        relatedTraces: [],
      });
    }
    
    return bottlenecks;
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldTraces();
      this.cleanupOldProfiles();
    }, 3600000); // Every hour
  }

  /**
   * Cleanup old traces
   */
  private cleanupOldTraces(): void {
    const cutoffTime = Date.now() - (this.TRACE_RETENTION_HOURS * 60 * 60 * 1000);
    
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoffTime) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Cleanup old performance profiles
   */
  private cleanupOldProfiles(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [profileId, profile] of this.performanceProfiles.entries()) {
      if (profile.startTime < cutoffTime) {
        this.performanceProfiles.delete(profileId);
      }
    }
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 8);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.traces.clear();
    this.activeSpans.clear();
    this.performanceProfiles.clear();
    this.bottlenecks = [];
    this.profilingActive = false;
    this.currentProfile = undefined;
    
    loggingService.info('Distributed Tracing Service cleaned up');
  }
}

export const distributedTracingService = new DistributedTracingService();