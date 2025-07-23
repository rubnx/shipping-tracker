// Mock Sentry to avoid dependency issues in tests
jest.mock('../config/sentry', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  measurePerformance: jest.fn((name, operation) => operation()),
}));

import { loggingService } from '../services/LoggingService';
import { performanceMonitor } from '../services/PerformanceMonitoringService';
import { alertingService } from '../services/AlertingService';
import { logRotationService } from '../services/LogRotationService';

describe('Monitoring and Logging Services', () => {
  beforeEach(() => {
    // Clear any existing data
    loggingService.clearLogs();
    performanceMonitor.clearMetrics();
  });

  afterAll(() => {
    // Cleanup to prevent Jest warnings
    alertingService.cleanup();
    logRotationService.cleanup();
  });

  describe('LoggingService', () => {
    it('should log messages with different levels', () => {
      loggingService.info('Test info message', { test: true });
      loggingService.warn('Test warning message');
      loggingService.error('Test error message', new Error('Test error'));

      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);
      
      // Check that all levels are present
      const levels = logs.map(log => log.level);
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
      
      // Check that error log has stack trace
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog).toBeDefined();
      expect(errorLog?.stack).toBeDefined();
    });

    it('should filter logs by level', () => {
      loggingService.debug('Debug message');
      loggingService.info('Info message');
      loggingService.warn('Warning message');
      loggingService.error('Error message');

      const errorLogs = loggingService.getLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');

      const warnAndAbove = loggingService.getLogs({ level: 'warn' });
      expect(warnAndAbove).toHaveLength(2);
    });

    it('should sanitize sensitive data', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'sk-1234567890',
        normalField: 'normal value'
      };

      loggingService.info('Test with sensitive data', sensitiveData);
      
      const logs = loggingService.getLogs();
      const logEntry = logs[0];
      
      expect(logEntry.metadata?.username).toBe('testuser');
      expect(logEntry.metadata?.password).toBe('[REDACTED]');
      expect(logEntry.metadata?.apiKey).toBe('[REDACTED]');
      expect(logEntry.metadata?.normalField).toBe('normal value');
    });

    it('should export logs in JSON format', () => {
      loggingService.info('Test message 1');
      loggingService.warn('Test message 2');

      const exported = loggingService.exportLogs('json');
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      
      // Check that both messages are present (order may vary)
      const messages = parsed.map((log: any) => log.message);
      expect(messages).toContain('Test message 1');
      expect(messages).toContain('Test message 2');
      
      // Check that levels are correct
      const levels = parsed.map((log: any) => log.level);
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
    });

    it('should export logs in CSV format', () => {
      loggingService.info('Test message');
      
      const exported = loggingService.exportLogs('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toContain('timestamp,level,service,requestId,message,metadata');
      expect(lines[1]).toContain('info');
      expect(lines[1]).toContain('Test message');
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track API calls with middleware', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await performanceMonitor.trackAPICall('test-operation', mockOperation);
      
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should track failed API calls', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('API failed'));
      
      await expect(
        performanceMonitor.trackAPICall('test-operation', mockOperation)
      ).rejects.toThrow('API failed');
    });

    it('should generate metrics summary', () => {
      const summary = performanceMonitor.getMetricsSummary();
      expect(summary).toHaveProperty('totalRequests');
      expect(summary).toHaveProperty('successfulRequests');
      expect(summary).toHaveProperty('failedRequests');
      expect(summary).toHaveProperty('errorRate');
      expect(summary).toHaveProperty('avgResponseTime');
    });

    it('should get health status', () => {
      const health = performanceMonitor.getHealthStatus();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('summary');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('AlertingService', () => {
    it('should have default alert rules', () => {
      const rules = alertingService.getRules();
      expect(rules.length).toBeGreaterThan(0);
      
      const highErrorRule = rules.find(r => r.id === 'high-error-rate');
      expect(highErrorRule).toBeDefined();
      expect(highErrorRule?.enabled).toBe(true);
    });

    it('should get alert summary', () => {
      const summary = alertingService.getAlertSummary();
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('active');
      expect(summary).toHaveProperty('resolved');
      expect(summary).toHaveProperty('rules');
    });

    it('should allow adding custom rules', () => {
      const customRule = {
        id: 'test-rule',
        name: 'Test Rule',
        condition: () => true,
        severity: 'low' as const,
        cooldown: 5,
        enabled: true,
      };

      alertingService.addCustomRule(customRule);
      
      const rules = alertingService.getRules();
      const addedRule = rules.find(r => r.id === 'test-rule');
      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Test Rule');
    });
  });

  describe('LogRotationService', () => {
    it('should get configuration', () => {
      const config = logRotationService.getConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('directory');
      expect(config).toHaveProperty('maxFileSize');
      expect(config).toHaveProperty('maxFiles');
    });

    it('should get status', () => {
      const status = logRotationService.getStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('config');
    });

    it('should allow config updates', () => {
      const originalConfig = logRotationService.getConfig();
      
      logRotationService.updateConfig({ maxFiles: 20 });
      
      const updatedConfig = logRotationService.getConfig();
      expect(updatedConfig.maxFiles).toBe(20);
      expect(updatedConfig.directory).toBe(originalConfig.directory); // Other values unchanged
    });
  });
});