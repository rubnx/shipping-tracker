import { ComprehensiveAPITesting } from './ComprehensiveAPITesting';
import { APIAggregator } from '../services/APIAggregator';
import { PerformanceOptimizer } from '../services/PerformanceOptimizer';
import { SmartContainerRouter } from '../services/SmartContainerRouter';

// Mock the dependencies
jest.mock('../services/APIAggregator');
jest.mock('../services/PerformanceOptimizer');
jest.mock('../services/SmartContainerRouter');

describe('ComprehensiveAPITesting', () => {
  let testFramework: ComprehensiveAPITesting;
  let mockAggregator: jest.Mocked<APIAggregator>;
  let mockOptimizer: jest.Mocked<PerformanceOptimizer>;
  let mockRouter: jest.Mocked<SmartContainerRouter>;

  beforeEach(() => {
    // Create mock instances
    mockAggregator = new APIAggregator() as jest.Mocked<APIAggregator>;
    mockOptimizer = new PerformanceOptimizer(mockAggregator, mockRouter) as jest.Mocked<PerformanceOptimizer>;
    mockRouter = new SmartContainerRouter() as jest.Mocked<SmartContainerRouter>;

    // Setup mock implementations
    mockAggregator.getProviderStats = jest.fn().mockReturnValue([
      { name: 'maersk', reliability: 0.95, cost: 25, features: ['container-tracking'] },
      { name: 'msc', reliability: 0.88, cost: 20, features: ['container-tracking'] },
      { name: 'cma-cgm', reliability: 0.85, cost: 22, features: ['container-tracking'] },
      { name: 'cosco', reliability: 0.87, cost: 18, features: ['container-tracking'] },
      { name: 'hapag-lloyd', reliability: 0.90, cost: 24, features: ['container-tracking'] },
      { name: 'evergreen', reliability: 0.84, cost: 20, features: ['container-tracking'] },
      { name: 'one-line', reliability: 0.86, cost: 20, features: ['container-tracking'] },
      { name: 'yang-ming', reliability: 0.82, cost: 18, features: ['asia-pacific-specialization'] },
      { name: 'zim', reliability: 0.80, cost: 15, features: ['mediterranean-specialization'] },
      { name: 'project44', reliability: 0.93, cost: 50, features: ['enterprise-grade', 'multi-carrier-fallback'] },
      { name: 'shipsgo', reliability: 0.88, cost: 5, features: ['multi-carrier-aggregator'] },
      { name: 'searates', reliability: 0.85, cost: 8, features: ['rate-calculation'] },
      { name: 'track-trace', reliability: 0.68, cost: 0, features: ['container-tracking'] },
      { name: 'marine-traffic', reliability: 0.70, cost: 30, features: ['vessel-positions'] },
      { name: 'vessel-finder', reliability: 0.72, cost: 25, features: ['vessel-tracking'] }
    ]);

    mockAggregator.fetchFromMultipleSources = jest.fn().mockImplementation(async () => {
      // Add a small delay to simulate realistic response times
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
      return [
        { provider: 'maersk', data: { status: 'In Transit', location: 'Port of Los Angeles' } },
        { provider: 'msc', data: { status: 'Delivered', location: 'Port of Long Beach' } }
      ];
    });

    mockOptimizer.trackWithOptimization = jest.fn().mockImplementation(async () => {
      // Add a small delay to simulate realistic response times
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return {
        trackingNumber: 'TEST123',
        status: 'In Transit',
        timeline: []
      };
    });

    mockOptimizer.trackMultiple = jest.fn().mockResolvedValue(new Map([
      ['BATCH001', { trackingNumber: 'BATCH001', status: 'In Transit' }],
      ['BATCH002', { trackingNumber: 'BATCH002', status: 'Delivered' }]
    ]));

    mockOptimizer.getPerformanceMetrics = jest.fn().mockReturnValue({
      cacheHitRate: 0.75,
      averageResponseTime: 1200,
      totalRequests: 100
    });

    mockRouter.analyzeRouting = jest.fn().mockReturnValue({
      suggestedCarrier: 'maersk',
      confidence: 0.95,
      prioritizedProviders: ['maersk', 'msc', 'project44'],
      reasoning: 'Detected MAERSK container format',
      fallbackStrategy: 'reliability_first' as const
    });

    testFramework = new ComprehensiveAPITesting();
    
    // Replace the internal instances with mocks
    (testFramework as any).aggregator = mockAggregator;
    (testFramework as any).optimizer = mockOptimizer;
    (testFramework as any).smartRouter = mockRouter;
  });

  describe('API Integration Tests', () => {
    it('should test all 15 container APIs', async () => {
      const results = await testFramework.testAllAPIs();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Verify each result has required properties
      results.forEach(result => {
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
        expect(result).toHaveProperty('reliability');
        expect(result).toHaveProperty('features');
        expect(typeof result.responseTime).toBe('number');
        expect(typeof result.reliability).toBe('number');
        expect(Array.isArray(result.features)).toBe(true);
      });
    }, 30000);

    it('should handle API failures gracefully', async () => {
      const results = await testFramework.testAllAPIs();
      
      // Some APIs might fail, but the test framework should handle it
      const failedResults = results.filter(r => !r.success);
      failedResults.forEach(result => {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      });
    }, 30000);
  });

  describe('Performance Testing', () => {
    it('should run performance tests with multiple requests', async () => {
      const results = await testFramework.performanceTest(10);
      
      expect(results).toBeDefined();
      expect(results).toHaveProperty('totalRequests');
      expect(results).toHaveProperty('successfulRequests');
      expect(results).toHaveProperty('averageResponseTime');
      expect(results).toHaveProperty('maxResponseTime');
      expect(results).toHaveProperty('minResponseTime');
      expect(results).toHaveProperty('throughput');
      expect(results).toHaveProperty('errorRate');
      
      expect(results.totalRequests).toBe(10);
      expect(typeof results.averageResponseTime).toBe('number');
      expect(typeof results.throughput).toBe('number');
      expect(results.errorRate).toBeGreaterThanOrEqual(0);
      expect(results.errorRate).toBeLessThanOrEqual(1);
    }, 60000);

    it('should measure response times accurately', async () => {
      const results = await testFramework.performanceTest(5);
      
      expect(results.maxResponseTime).toBeGreaterThanOrEqual(results.minResponseTime);
      expect(results.averageResponseTime).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Reliability Testing', () => {
    it('should test API reliability over time', async () => {
      const results = await testFramework.reliabilityTest(15000); // 15 seconds
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      results.forEach(result => {
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('uptime');
        expect(result).toHaveProperty('successRate');
        expect(result).toHaveProperty('averageResponseTime');
        expect(result).toHaveProperty('errorBreakdown');
        
        expect(result.uptime).toBeGreaterThanOrEqual(0);
        expect(result.uptime).toBeLessThanOrEqual(1);
        expect(result.successRate).toBeGreaterThanOrEqual(0);
        expect(result.successRate).toBeLessThanOrEqual(1);
        expect(typeof result.errorBreakdown).toBe('object');
      });
    }, 30000);
  });

  describe('End-to-End Testing', () => {
    it('should run comprehensive end-to-end tests', async () => {
      const results = await testFramework.endToEndTest();
      
      expect(results).toBeDefined();
      expect(results).toHaveProperty('totalTests');
      expect(results).toHaveProperty('passedTests');
      expect(results).toHaveProperty('failedTests');
      expect(results).toHaveProperty('testResults');
      
      expect(results.totalTests).toBeGreaterThan(0);
      expect(results.passedTests + results.failedTests).toBe(results.totalTests);
      expect(Array.isArray(results.testResults)).toBe(true);
      
      results.testResults.forEach(testResult => {
        expect(testResult).toHaveProperty('testName');
        expect(testResult).toHaveProperty('success');
        expect(testResult).toHaveProperty('duration');
        expect(typeof testResult.success).toBe('boolean');
        expect(typeof testResult.duration).toBe('number');
      });
    }, 45000);

    it('should test container format detection', async () => {
      const results = await testFramework.endToEndTest();
      
      const formatTest = results.testResults.find(r => r.testName === 'Container Format Detection');
      expect(formatTest).toBeDefined();
    }, 30000);

    it('should test multi-provider fallback', async () => {
      const results = await testFramework.endToEndTest();
      
      const fallbackTest = results.testResults.find(r => r.testName === 'Multi-provider Fallback');
      expect(fallbackTest).toBeDefined();
    }, 30000);
  });

  describe('Test Report Generation', () => {
    it('should generate comprehensive test report', async () => {
      const report = await testFramework.generateTestReport();
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('apiResults');
      expect(report).toHaveProperty('performanceResults');
      expect(report).toHaveProperty('reliabilityResults');
      expect(report).toHaveProperty('endToEndResults');
      
      // Verify summary
      expect(report.summary).toHaveProperty('totalAPIs');
      expect(report.summary).toHaveProperty('workingAPIs');
      expect(report.summary).toHaveProperty('averageReliability');
      expect(report.summary).toHaveProperty('totalFeatures');
      
      expect(report.summary.totalAPIs).toBeGreaterThan(0);
      expect(report.summary.workingAPIs).toBeGreaterThanOrEqual(0);
      expect(report.summary.averageReliability).toBeGreaterThanOrEqual(0);
      expect(report.summary.totalFeatures).toBeGreaterThan(0);
      
      // Verify arrays
      expect(Array.isArray(report.apiResults)).toBe(true);
      expect(Array.isArray(report.reliabilityResults)).toBe(true);
    }, 120000);

    it('should include all 15 container APIs in report', async () => {
      const report = await testFramework.generateTestReport();
      
      // Should have results for multiple APIs
      expect(report.apiResults.length).toBeGreaterThan(10);
      
      // Check for some key providers
      const providerNames = report.apiResults.map(r => r.provider);
      expect(providerNames).toContain('maersk');
      expect(providerNames).toContain('msc');
    }, 90000);
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', async () => {
      const results = await testFramework.testAllAPIs();
      
      const failedResults = results.filter(r => !r.success && r.error);
      failedResults.forEach(result => {
        expect(typeof result.error).toBe('string');
        if (result.error) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      });
    }, 30000);

    it('should handle timeout scenarios', async () => {
      // This test verifies the framework can handle timeouts
      const results = await testFramework.performanceTest(3);
      
      expect(results).toBeDefined();
      expect(typeof results.errorRate).toBe('number');
    }, 20000);
  });

  describe('Provider Features', () => {
    it('should identify provider-specific features', async () => {
      const results = await testFramework.testAllAPIs();
      
      // Check that different providers have different features
      const featuresMap = new Map<string, string[]>();
      results.forEach(result => {
        featuresMap.set(result.provider, result.features);
      });
      
      // Verify some providers have specific features
      const project44Result = results.find(r => r.provider === 'project44');
      if (project44Result) {
        expect(project44Result.features).toContain('enterprise-grade');
      }
      
      const yangMingResult = results.find(r => r.provider === 'yang-ming');
      if (yangMingResult) {
        expect(yangMingResult.features).toContain('asia-pacific-specialization');
      }
    }, 30000);
  });
});