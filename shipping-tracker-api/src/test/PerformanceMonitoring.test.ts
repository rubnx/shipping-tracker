import { ComprehensiveAPITesting } from './ComprehensiveAPITesting';
import { APIAggregator } from '../services/APIAggregator';
import { PerformanceOptimizer } from '../services/PerformanceOptimizer';
import { SmartContainerRouter } from '../services/SmartContainerRouter';

/**
 * Performance monitoring and high-volume testing for container APIs
 * Implements Requirements 9.4 for performance testing and monitoring
 */
describe('Container API Performance Monitoring', () => {
  let testFramework: ComprehensiveAPITesting;
  let aggregator: APIAggregator;
  let optimizer: PerformanceOptimizer;
  let smartRouter: SmartContainerRouter;

  beforeAll(() => {
    aggregator = new APIAggregator();
    smartRouter = new SmartContainerRouter();
    optimizer = new PerformanceOptimizer(aggregator, smartRouter);
    testFramework = new ComprehensiveAPITesting();
  });

  describe('High-Volume Performance Tests', () => {
    it('should handle 100 concurrent requests efficiently', async () => {
      console.log('🚀 Starting high-volume performance test...');
      
      const results = await testFramework.performanceTest(100);
      
      expect(results).toBeDefined();
      expect(results.totalRequests).toBe(100);
      expect(results.averageResponseTime).toBeLessThan(10000); // Under 10 seconds average
      expect(results.throughput).toBeGreaterThan(1); // At least 1 request per second
      expect(results.errorRate).toBeLessThan(0.5); // Less than 50% error rate
      
      console.log(`📊 Performance Results:
        - Total Requests: ${results.totalRequests}
        - Successful: ${results.successfulRequests}
        - Average Response Time: ${results.averageResponseTime.toFixed(0)}ms
        - Throughput: ${results.throughput.toFixed(2)} req/sec
        - Error Rate: ${(results.errorRate * 100).toFixed(1)}%`);
    }, 300000); // 5 minute timeout

    it('should maintain performance under sustained load', async () => {
      console.log('🔥 Starting sustained load test...');
      
      const results = await testFramework.stressTest(120000); // 2 minutes
      
      expect(results).toBeDefined();
      expect(results.totalRequests).toBeGreaterThan(50); // Should process at least 50 requests
      expect(results.averageResponseTime).toBeLessThan(15000); // Under 15 seconds average
      expect(results.errorRate).toBeLessThan(0.7); // Less than 70% error rate under stress
      
      console.log(`🔥 Stress Test Results:
        - Total Requests: ${results.totalRequests}
        - Successful: ${results.successfulRequests}
        - Average Response Time: ${results.averageResponseTime.toFixed(0)}ms
        - Max Response Time: ${results.maxResponseTime.toFixed(0)}ms
        - Throughput: ${results.throughput.toFixed(2)} req/sec
        - Error Rate: ${(results.errorRate * 100).toFixed(1)}%`);
    }, 180000); // 3 minute timeout

    it('should optimize performance with caching', async () => {
      console.log('⚡ Testing performance optimization...');
      
      const container = 'MAEU1234567';
      
      // First request (cold cache)
      const startTime1 = Date.now();
      try {
        await optimizer.trackWithOptimization(container, 'container');
      } catch (error) {
        console.warn('First request failed:', error);
      }
      const firstRequestTime = Date.now() - startTime1;
      
      // Second request (warm cache)
      const startTime2 = Date.now();
      try {
        await optimizer.trackWithOptimization(container, 'container');
      } catch (error) {
        console.warn('Second request failed:', error);
      }
      const secondRequestTime = Date.now() - startTime2;
      
      // Cache should improve performance
      console.log(`Cache Performance:
        - First Request: ${firstRequestTime}ms
        - Second Request: ${secondRequestTime}ms
        - Improvement: ${((firstRequestTime - secondRequestTime) / firstRequestTime * 100).toFixed(1)}%`);
      
      // Second request should be faster or at least not significantly slower
      expect(secondRequestTime).toBeLessThanOrEqual(firstRequestTime * 1.5);
    }, 60000);
  });

  describe('API Reliability Monitoring', () => {
    it('should monitor API uptime and reliability', async () => {
      console.log('📊 Starting API reliability monitoring...');
      
      const results = await testFramework.reliabilityTest(60000); // 1 minute
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
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
        expect(result.averageResponseTime).toBeGreaterThanOrEqual(0);
        
        console.log(`📈 ${result.provider}:
          - Uptime: ${(result.uptime * 100).toFixed(1)}%
          - Success Rate: ${(result.successRate * 100).toFixed(1)}%
          - Avg Response: ${result.averageResponseTime.toFixed(0)}ms`);
      });
    }, 120000); // 2 minute timeout

    it('should track API health over time', async () => {
      console.log('🏥 Starting API health monitoring...');
      
      const monitoringResults = await testFramework.monitorAPIs(90000); // 1.5 minutes
      
      expect(monitoringResults).toBeDefined();
      expect(Array.isArray(monitoringResults)).toBe(true);
      
      if (monitoringResults.length > 0) {
        monitoringResults.forEach(result => {
          expect(result).toHaveProperty('timestamp');
          expect(result).toHaveProperty('provider');
          expect(result).toHaveProperty('status');
          expect(result).toHaveProperty('responseTime');
          expect(result).toHaveProperty('errorRate');
          
          expect(['UP', 'DOWN', 'DEGRADED']).toContain(result.status);
          expect(result.responseTime).toBeGreaterThanOrEqual(0);
          expect(result.errorRate).toBeGreaterThanOrEqual(0);
          expect(result.errorRate).toBeLessThanOrEqual(1);
        });
        
        // Group by provider and show health summary
        const providerHealth = monitoringResults.reduce((acc, result) => {
          if (!acc[result.provider]) {
            acc[result.provider] = { up: 0, down: 0, degraded: 0, total: 0 };
          }
          acc[result.provider][result.status.toLowerCase()]++;
          acc[result.provider].total++;
          return acc;
        }, {} as Record<string, any>);
        
        Object.entries(providerHealth).forEach(([provider, health]) => {
          const uptime = (health.up / health.total * 100).toFixed(1);
          console.log(`🏥 ${provider}: ${uptime}% uptime (${health.up}/${health.total} checks)`);
        });
      }
    }, 150000); // 2.5 minute timeout
  });

  describe('Real Container Number Testing', () => {
    it('should test with realistic container number formats', async () => {
      console.log('🔍 Testing with real container number formats...');
      
      const results = await testFramework.testRealContainerNumbers();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      let totalDataQuality = 0;
      let successfulTests = 0;
      
      results.forEach(result => {
        expect(result).toHaveProperty('containerNumber');
        expect(result).toHaveProperty('carrier');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
        expect(result).toHaveProperty('dataQuality');
        
        expect(typeof result.success).toBe('boolean');
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
        expect(result.dataQuality).toBeGreaterThanOrEqual(0);
        expect(result.dataQuality).toBeLessThanOrEqual(1);
        
        if (result.success) {
          totalDataQuality += result.dataQuality;
          successfulTests++;
        }
        
        console.log(`📦 ${result.containerNumber} (${result.carrier}):
          - Success: ${result.success ? '✅' : '❌'}
          - Response Time: ${result.responseTime}ms
          - Data Quality: ${(result.dataQuality * 100).toFixed(1)}%
          ${result.error ? `- Error: ${result.error}` : ''}`);
      });
      
      const averageDataQuality = successfulTests > 0 ? totalDataQuality / successfulTests : 0;
      const successRate = results.filter(r => r.success).length / results.length;
      
      console.log(`📊 Real Container Test Summary:
        - Total Tests: ${results.length}
        - Success Rate: ${(successRate * 100).toFixed(1)}%
        - Average Data Quality: ${(averageDataQuality * 100).toFixed(1)}%`);
      
      // At least some tests should succeed
      expect(successRate).toBeGreaterThan(0);
    }, 300000); // 5 minute timeout
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during extended testing', async () => {
      const initialMemory = process.memoryUsage();
      console.log('💾 Initial memory usage:', {
        rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB'
      });
      
      // Run multiple test cycles
      for (let i = 0; i < 5; i++) {
        await testFramework.performanceTest(20);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      console.log('💾 Final memory usage:', {
        rss: Math.round(finalMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB'
      });
      
      // Memory usage shouldn't increase dramatically
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`💾 Memory increase: ${memoryIncrease.toFixed(1)}MB`);
      
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
    }, 300000);

    it('should handle resource cleanup properly', async () => {
      const testPromises = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        testPromises.push(
          testFramework.performanceTest(5).catch(error => {
            console.warn(`Resource test ${i} failed:`, error);
            return null;
          })
        );
      }
      
      const results = await Promise.all(testPromises);
      
      // Should complete without hanging or crashing
      expect(results).toHaveLength(10);
      
      // At least some should succeed
      const successfulResults = results.filter(r => r !== null);
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 180000);
  });

  describe('Error Rate Analysis', () => {
    it('should analyze and categorize API errors', async () => {
      console.log('🔍 Analyzing API error patterns...');
      
      const results = await testFramework.testAllAPIs();
      
      const errors = results.filter(r => !r.success && r.error);
      const errorCategories = errors.reduce((acc, result) => {
        const errorType = this.categorizeError(result.error || '');
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 Error Analysis:');
      Object.entries(errorCategories).forEach(([category, count]) => {
        console.log(`  - ${category}: ${count} occurrences`);
      });
      
      const totalErrors = errors.length;
      const totalTests = results.length;
      const errorRate = totalErrors / totalTests;
      
      console.log(`📊 Overall Error Rate: ${(errorRate * 100).toFixed(1)}%`);
      
      // Error rate should be reasonable for external APIs
      expect(errorRate).toBeLessThan(0.8); // Less than 80% error rate
    }, 180000);

    categorizeError(error: string): string {
      if (error.includes('timeout')) return 'TIMEOUT';
      if (error.includes('rate limit')) return 'RATE_LIMIT';
      if (error.includes('not found')) return 'NOT_FOUND';
      if (error.includes('auth')) return 'AUTH_ERROR';
      if (error.includes('network')) return 'NETWORK_ERROR';
      if (error.includes('server')) return 'SERVER_ERROR';
      return 'UNKNOWN_ERROR';
    }
  });
});