import { Request, Response, NextFunction } from 'express';
import { addBreadcrumb } from '../config/sentry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

export interface APILogEntry extends LogEntry {
  method: string;
  path: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  requestBody?: any;
  responseBody?: any;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private readonly maxLogsSize = 10000; // Keep last 10,000 logs
  private readonly sensitiveFields = [
    'password', 'token', 'apiKey', 'api_key', 'authorization', 'cookie',
    'secret', 'key', 'credentials', 'auth', 'bearer'
  ];

  // Request logging middleware
  public requestLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Add request ID to request object for tracking
      (req as any).requestId = requestId;

      // Log incoming request
      this.logAPIRequest({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Incoming ${req.method} request to ${req.path}`,
        service: 'api',
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        requestBody: this.sanitizeData(req.body),
        metadata: {
          query: req.query,
          params: req.params,
          headers: this.sanitizeHeaders(req.headers),
        },
      });

      // Override res.send to log response
      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - startTime;
        
        // Log response
        loggingService.logAPIResponse({
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 400 ? 'error' : 'info',
          message: `${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`,
          service: 'api',
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          responseBody: loggingService.sanitizeData(body),
        });

        return originalSend.call(this, body);
      };

      next();
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return '[Non-JSON String]';
      }
    }

    if (typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  public log(level: LogLevel, message: string, metadata?: Record<string, any>, requestId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'api',
      requestId,
      metadata: metadata ? this.sanitizeData(metadata) : undefined,
    };

    this.addLogEntry(entry);
    this.outputLog(entry);
    
    // Add to Sentry breadcrumbs
    addBreadcrumb(message, 'log', level, metadata);
  }

  public logAPIRequest(entry: APILogEntry) {
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  public logAPIResponse(entry: APILogEntry) {
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  public debug(message: string, metadata?: Record<string, any>, requestId?: string) {
    this.log('debug', message, metadata, requestId);
  }

  public info(message: string, metadata?: Record<string, any>, requestId?: string) {
    this.log('info', message, metadata, requestId);
  }

  public warn(message: string, metadata?: Record<string, any>, requestId?: string) {
    this.log('warn', message, metadata, requestId);
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>, requestId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'api',
      requestId,
      metadata: metadata ? this.sanitizeData(metadata) : undefined,
      stack: error?.stack,
    };

    this.addLogEntry(entry);
    this.outputLog(entry);
    
    // Add to Sentry breadcrumbs
    addBreadcrumb(message, 'error', 'error', { ...metadata, stack: error?.stack });
  }

  public fatal(message: string, error?: Error, metadata?: Record<string, any>, requestId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message,
      service: 'api',
      requestId,
      metadata: metadata ? this.sanitizeData(metadata) : undefined,
      stack: error?.stack,
    };

    this.addLogEntry(entry);
    this.outputLog(entry);
    
    // Add to Sentry breadcrumbs
    addBreadcrumb(message, 'error', 'fatal', { ...metadata, stack: error?.stack });
  }

  private addLogEntry(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogsSize) {
      this.logs = this.logs.slice(-this.maxLogsSize);
    }
  }

  private outputLog(entry: LogEntry) {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const service = entry.service.toUpperCase();
    const requestId = entry.requestId ? `[${entry.requestId}]` : '';
    
    let output = `${timestamp} ${level} ${service} ${requestId} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` | ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.stack) {
      output += `\n${entry.stack}`;
    }

    // Output to appropriate console method based on level
    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  public getLogs(options?: {
    level?: LogLevel;
    service?: string;
    requestId?: string;
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (options?.level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
      const minPriority = levelPriority[options.level];
      filteredLogs = filteredLogs.filter(log => levelPriority[log.level] >= minPriority);
    }

    if (options?.service) {
      filteredLogs = filteredLogs.filter(log => log.service === options.service);
    }

    if (options?.requestId) {
      filteredLogs = filteredLogs.filter(log => log.requestId === options.requestId);
    }

    if (options?.since) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= options.since!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    return filteredLogs;
  }

  public getLogSummary(timeWindow: number = 300000) { // 5 minutes default
    const now = Date.now();
    const recentLogs = this.logs.filter(
      log => now - new Date(log.timestamp).getTime() < timeWindow
    );

    const levelCounts = recentLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const serviceCounts = recentLogs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      timeWindow: timeWindow / 1000, // Convert to seconds
      totalLogs: this.logs.length,
      recentLogs: recentLogs.length,
      levelCounts,
      serviceCounts,
      errorRate: recentLogs.length > 0 
        ? ((levelCounts.error || 0) + (levelCounts.fatal || 0)) / recentLogs.length * 100 
        : 0,
    };
  }

  public clearLogs() {
    this.logs = [];
  }

  // Export logs for external analysis
  public exportLogs(format: 'json' | 'csv' = 'json', options?: {
    since?: Date;
    level?: LogLevel;
    limit?: number;
  }): string {
    const logs = this.getLogs(options);
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'service', 'requestId', 'message', 'metadata'];
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          log.service,
          log.requestId || '',
          `"${log.message.replace(/"/g, '""')}"`,
          log.metadata ? `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}

export const loggingService = new LoggingService();