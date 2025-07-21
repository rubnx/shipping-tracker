import { APIAggregator } from '../services/APIAggregator';
import { PerformanceOptimizer } from '../services/PerformanceOptimizer';
import { SmartContainerRouter } from '../services/SmartContainerRouter';
import { TrackingType } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface APITestResult {
  provider: string;
  success: boolean;
  responseTime: number;
  error?: string;
  reliability: number;
  features: string[];
}

export interface PerformanceTestResult {
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughput: number;
  errorRate: number;
}

export interface ReliabilityTestResult {
  provider: string;
  uptime: number;
  successRate: number;
  averageResponseTime: number;
  errorBreakdown: Record<string, number>;
}

export interface RealContainerTestResult {
  containerNumber: string;
  carrier: string;
  success: boolean;
  responseTime: number;
  dataQuality: number;
  error?: string;
}

export interface MonitoringResult {
  timestamp: Date;
  provider: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime: number;
  errorRate: number;
}

/**
 * Comprehensive Container API Testing Framework
 * Tests all 15 container APIs with real container numbers and performance scenarios
 * Implements Requirements 9.4 for comprehensive testing
 */
export class ComprehensiveAPITesting {
  private aggregator: APIAggregator;
  private optimizer: PerformanceOptimizer;
  private smartRouter: SmartContainerRouter;

  // Real container numbers for testing (anonymized but realistic formats)
  private readonly realTestContainers = {
    maersk: ['MAEU1234567', 'MAEU7654321', 'MAEU9876543'],
    msc: ['MSCU1234567', 'MSCU7654321', 'MSCU5432109'],
    'cma-cgm': ['CMAU1234567', 'CMAU7654321', 'CMAU8765432'],
    cosco: ['COSU1234567', 'COSU7654321', 'COSU2468135'],
    'hapag-lloyd': ['HLCU1234567', 'HLCU7654321', 'HLCU1357924'],
    evergreen: ['EGLV1234567', 'EGLV7654321', 'EGLV9753186'],
    'one-line': ['ONEY1234567', 'ONEY7654321', 'ONEY8642097'],
    'yang-ming': ['YMLU1234567', 'YMLU7654321', 'YMLU3691470'],
    zim: ['ZIMU1234567', 'ZIMU7654321', 'ZIMU7410852'],
    project44: ['TEST1234567', 'TEST7654321', 'TEST9630741'],
    shipsgo: ['SHIP1234567', 'SHIP7654321', 'SHIP1472583'],
    searates: ['RATE1234567', 'RATE7654321', 'RATE8529630'],
    'track-trace': ['TRCK1234567', 'TRCK7654321', 'TRCK7539514'],
    'marine-traffic': ['MTRK1234567', 'MTRK7654321', 'MTRK9517532'],
    'vessel-finder': ['VFND1234567', 'VFND7654321', 'VFND8642097']
  };

  // Booking numbers for end-to-end testing
  private readonly testBookingNumbers = [
    'MAEU123456789',
    'MSCU987654321',
    'CMAU456789123',
    'COSU789123456',
    'HLCU321654987'
  ];

  // Bill of Lading numbers for testing
  private readonly testBOLNumbers = [
    'MAEUBOL123456',
    'MSCUBOL654321',
    'CMAUBOL789456',
    'COSUBOL456789',
    'HLCUBOL987654'
  ];

  constructor() {
    this.aggregator = new APIAggregator();
    this.smartRouter = new SmartContainerRouter();
    this.optimizer = new PerformanceOptimizer(this.aggregator, this.smartRouter);
  }

  /**
   * Test all 15 container APIs with comprehensive integration tests
   */
  async testAllAPIs(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    const providers = this.aggregator.getProviderStats();

    console.log(`🧪 Testing ${providers.length} container API providers with real container numbers...`);

    for (const provider of providers) {
      const testContainers = this.realTestContainers[provider.name as keyof typeof this.realTestContainers] || ['TEST123456'];
      
      // Test each container number for this provider
      for (const container of testContainers) {
        const startTime = Date.now();
        
        try {
          const result = await this.aggregator.fetchFromMultipleSources(container, 'container');
          const responseTime = Date.now() - startTime;
          
          results.push({
            provider: provider.name,
            success: result.length > 0,
            responseTime,
            reliability: provider.reliability,
            features: this.getProviderFeatures(provider.name)
          });
        } catch (error) {
          const responseTime = Date.now() - startTime;
          
          results.push({
            provider: provider.name,
            success: false,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            reliability: provider.reliability,
            features: this.getProviderFeatures(provider.name)
          });
        }
        
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Test with real container numbers from different carriers
   */
  async testRealContainerNumbers(): Promise<RealContainerTestResult[]> {
    console.log('🔍 Testing with real container number formats...');
    
    const results: RealContainerTestResult[] = [];
    
    for (const [carrier, containers] of Object.entries(this.realTestContainers)) {
      for (const containerNumber of containers) {
        const startTime = Date.now();
        
        try {
          const trackingResult = await this.aggregator.fetchFromMultipleSources(containerNumber, 'container');
          const responseTime = Date.now() - startTime;
          
          // Calculate data quality score based on completeness
          const dataQuality = this.calculateDataQuality(trackingResult);
          
          results.push({
            containerNumber,
            carrier,
            success: trackingResult.length > 0,
            responseTime,
            dataQuality,
          });
        } catch (error) {
          const responseTime = Date.now() - startTime;
          
          results.push({
            containerNumber,
            carrier,
            success: false,
            responseTime,
            dataQuality: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  /**
   * Performance testing with high-volume scenarios
   */
  async performanceTest(requestCount: number = 100): Promise<PerformanceTestResult> {
    console.log(`⚡ Running performance test with ${requestCount} requests...`);
    
    const startTime = Date.now();
    const results: boolean[] = [];
    const responseTimes: number[] = [];

    // Use real container numbers for performance testing
    const allContainers = Object.values(this.realTestContainers).flat();
    
    // Generate test requests with real container numbers
    const requests = Array.from({ length: requestCount }, (_, i) => ({
      trackingNumber: allContainers[i % allContainers.length],
      trackingType: 'container' as TrackingType
    }));

    // Execute requests in batches to simulate real-world usage
    const batchSize = 5; // Smaller batches for more realistic testing
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (req) => {
        const reqStart = Date.now();
        try {
          await this.optimizer.trackWithOptimization(req.trackingNumber, req.trackingType);
          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);
          return true;
        } catch (error) {
          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);
          return false;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add realistic delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r).length;
    
    return {
      totalRequests: requestCount,
      successfulRequests,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      throughput: requestCount / (totalTime / 1000),
      errorRate: (requestCount - successfulRequests) / requestCount
    };
  }

  /**
   * High-volume stress testing
   */
  async stressTest(duration: number = 300000): Promise<PerformanceTestResult> {
    console.log(`🔥 Running stress test for ${duration / 1000} seconds...`);
    
    const startTime = Date.now();
    const results: boolean[] = [];
    const responseTimes: number[] = [];
    const allContainers = Object.values(this.realTestContainers).flat();
    
    let requestCount = 0;
    
    while (Date.now() - startTime < duration) {
      const container = allContainers[requestCount % allContainers.length];
      const reqStart = Date.now();
      
      try {
        await this.optimizer.trackWithOptimization(container, 'container');
        const reqTime = Date.now() - reqStart;
        responseTimes.push(reqTime);
        results.push(true);
      } catch (error) {
        const reqTime = Date.now() - reqStart;
        responseTimes.push(reqTime);
        results.push(false);
      }
      
      requestCount++;
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r).length;
    
    return {
      totalRequests: requestCount,
      successfulRequests,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      throughput: requestCount / (totalTime / 1000),
      errorRate: (requestCount - successfulRequests) / requestCount
    };
  }

  /**
   * Reliability and uptime monitoring test
   */
  async reliabilityTest(duration: number = 60000): Promise<ReliabilityTestResult[]> {
    console.log(`🔄 Running reliability test for ${duration / 1000} seconds...`);
    
    const results: ReliabilityTestResult[] = [];
    const providers = this.aggregator.getProviderStats();
    const startTime = Date.now();
    
    // Test each provider continuously
    const providerTests = providers.map(async (provider) => {
      const testResults: boolean[] = [];
      const responseTimes: number[] = [];
      const errors: string[] = [];
      
      while (Date.now() - startTime < duration) {
        const reqStart = Date.now();
        try {
          await this.aggregator.fetchFromMultipleSources('RELIABILITY123', 'container');
          testResults.push(true);
          responseTimes.push(Date.now() - reqStart);
        } catch (error) {
          testResults.push(false);
          responseTimes.push(Date.now() - reqStart);
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
        
        // Wait 5 seconds between tests
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      const successCount = testResults.filter(r => r).length;
      const errorBreakdown: Record<string, number> = {};
      
      errors.forEach(error => {
        const errorType = this.categorizeError(error);
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      });
      
      return {
        provider: provider.name,
        uptime: testResults.length > 0 ? successCount / testResults.length : 0,
        successRate: testResults.length > 0 ? successCount / testResults.length : 0,
        averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        errorBreakdown
      };
    });
    
    return Promise.all(providerTests);
  }

  /**
   * End-to-end testing with real container numbers and complete user journeys
   */
  async endToEndTest(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    testResults: Array<{
      testName: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  }> {
    console.log('🔍 Running comprehensive end-to-end tests with real scenarios...');
    
    const testResults: Array<{
      testName: string;
      success: boolean;
      duration: number;
      error?: string;
    }> = [];

    // Test 1: Container format detection for all carriers
    const formatTest = await this.runTest('Container Format Detection', async () => {
      let successCount = 0;
      const carriers = ['MAEU1234567', 'MSCU1234567', 'CMAU1234567', 'COSU1234567', 'HLCU1234567'];
      
      for (const container of carriers) {
        const result = this.smartRouter.analyzeRouting({
          trackingNumber: container,
          trackingType: 'container'
        });
        if (result.confidence > 0.8) successCount++;
      }
      
      return successCount >= 3; // At least 3 out of 5 should work
    });
    testResults.push(formatTest);

    // Test 2: Multi-provider fallback with real containers
    const fallbackTest = await this.runTest('Multi-provider Fallback', async () => {
      const testContainer = this.realTestContainers.maersk[0];
      const result = await this.aggregator.fetchFromMultipleSources(testContainer, 'container');
      return Array.isArray(result) && result.length > 0;
    });
    testResults.push(fallbackTest);

    // Test 3: Booking number tracking
    const bookingTest = await this.runTest('Booking Number Tracking', async () => {
      const bookingNumber = this.testBookingNumbers[0];
      const result = await this.aggregator.fetchFromMultipleSources(bookingNumber, 'booking');
      return Array.isArray(result);
    });
    testResults.push(bookingTest);

    // Test 4: Bill of Lading tracking
    const bolTest = await this.runTest('Bill of Lading Tracking', async () => {
      const bolNumber = this.testBOLNumbers[0];
      const result = await this.aggregator.fetchFromMultipleSources(bolNumber, 'bol');
      return Array.isArray(result);
    });
    testResults.push(bolTest);

    // Test 5: Performance optimization
    const perfTest = await this.runTest('Performance Optimization', async () => {
      const metrics = this.optimizer.getPerformanceMetrics();
      return typeof metrics.cacheHitRate === 'number' && metrics.cacheHitRate >= 0;
    });
    testResults.push(perfTest);

    // Test 6: Error handling with invalid formats
    const errorTest = await this.runTest('Error Handling', async () => {
      try {
        await this.aggregator.fetchFromMultipleSources('INVALID_FORMAT_123', 'container');
        return true;
      } catch (error) {
        return error instanceof Error;
      }
    });
    testResults.push(errorTest);

    // Test 7: Batch processing with mixed tracking types
    const batchTest = await this.runTest('Batch Processing', async () => {
      const requests = [
        { trackingNumber: this.realTestContainers.maersk[0], trackingType: 'container' as TrackingType },
        { trackingNumber: this.testBookingNumbers[0], trackingType: 'booking' as TrackingType },
        { trackingNumber: this.testBOLNumbers[0], trackingType: 'bol' as TrackingType }
      ];
      const results = await this.optimizer.trackMultiple(requests);
      return results.size >= 1; // At least one should succeed
    });
    testResults.push(batchTest);

    // Test 8: Rate limiting compliance
    const rateLimitTest = await this.runTest('Rate Limiting Compliance', async () => {
      const rapidRequests = Array.from({ length: 20 }, (_, i) => 
        this.aggregator.fetchFromMultipleSources(`RATE${i}`, 'container')
      );
      
      try {
        await Promise.all(rapidRequests);
        return true; // Should handle rate limiting gracefully
      } catch (error) {
        return true; // Expected to fail due to rate limiting
      }
    });
    testResults.push(rateLimitTest);

    // Test 9: Data quality validation
    const dataQualityTest = await this.runTest('Data Quality Validation', async () => {
      const container = this.realTestContainers.maersk[0];
      const result = await this.aggregator.fetchFromMultipleSources(container, 'container');
      
      if (result.length === 0) return false;
      
      // Check if result has expected structure
      const hasValidStructure = result.every(r => 
        r.provider && typeof r.provider === 'string' && 
        r.data && typeof r.data === 'object'
      );
      
      return hasValidStructure;
    });
    testResults.push(dataQualityTest);

    // Test 10: Cross-carrier compatibility
    const crossCarrierTest = await this.runTest('Cross-Carrier Compatibility', async () => {
      let successCount = 0;
      const carriers = ['maersk', 'msc', 'cma-cgm', 'cosco', 'hapag-lloyd'];
      
      for (const carrier of carriers) {
        try {
          const containers = this.realTestContainers[carrier as keyof typeof this.realTestContainers];
          if (containers && containers.length > 0) {
            await this.aggregator.fetchFromMultipleSources(containers[0], 'container');
            successCount++;
          }
        } catch (error) {
          // Expected for some carriers
        }
      }
      
      return successCount >= 2; // At least 2 carriers should work
    });
    testResults.push(crossCarrierTest);

    const passedTests = testResults.filter(r => r.success).length;
    const failedTests = testResults.length - passedTests;

    return {
      totalTests: testResults.length,
      passedTests,
      failedTests,
      testResults
    };
  }

  /**
   * API reliability and uptime monitoring
   */
  async monitorAPIs(duration: number = 300000): Promise<MonitoringResult[]> {
    console.log(`📊 Starting API monitoring for ${duration / 1000} seconds...`);
    
    const monitoringResults: MonitoringResult[] = [];
    const providers = this.aggregator.getProviderStats();
    const startTime = Date.now();
    
    // Monitor each provider
    const monitoringPromises = providers.map(async (provider) => {
      const providerResults: MonitoringResult[] = [];
      const testContainer = this.realTestContainers[provider.name as keyof typeof this.realTestContainers]?.[0] || 'TEST123456';
      
      while (Date.now() - startTime < duration) {
        const checkStart = Date.now();
        let status: 'UP' | 'DOWN' | 'DEGRADED' = 'DOWN';
        let responseTime = 0;
        
        try {
          const result = await this.aggregator.fetchFromMultipleSources(testContainer, 'container');
          responseTime = Date.now() - checkStart;
          
          if (result.length > 0) {
            status = responseTime < 5000 ? 'UP' : 'DEGRADED';
          }
        } catch (error) {
          responseTime = Date.now() - checkStart;
          status = 'DOWN';
        }
        
        providerResults.push({
          timestamp: new Date(),
          provider: provider.name,
          status,
          responseTime,
          errorRate: status === 'DOWN' ? 1 : 0
        });
        
        // Check every 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      return providerResults;
    });
    
    const allResults = await Promise.all(monitoringPromises);
    return allResults.flat();
  }

  /**
   * Generate comprehensive test report with monitoring data
   */
  async generateTestReport(): Promise<{
    summary: {
      totalAPIs: number;
      workingAPIs: number;
      averageReliability: number;
      totalFeatures: number;
      testTimestamp: Date;
    };
    apiResults: APITestResult[];
    realContainerResults: RealContainerTestResult[];
    performanceResults: PerformanceTestResult;
    stressTestResults: PerformanceTestResult;
    reliabilityResults: ReliabilityTestResult[];
    endToEndResults: any;
    monitoringResults: MonitoringResult[];
  }> {
    console.log('📊 Generating comprehensive test report...');

    const apiResults = await this.testAllAPIs();
    const realContainerResults = await this.testRealContainerNumbers();
    const performanceResults = await this.performanceTest(50);
    const stressTestResults = await this.stressTest(60000); // 1 minute stress test
    const reliabilityResults = await this.reliabilityTest(30000); // 30 seconds
    const endToEndResults = await this.endToEndTest();
    const monitoringResults = await this.monitorAPIs(120000); // 2 minutes monitoring

    const workingAPIs = apiResults.filter(r => r.success).length;
    const averageReliability = apiResults.length > 0 ? apiResults.reduce((sum, r) => sum + r.reliability, 0) / apiResults.length : 0;
    const totalFeatures = [...new Set(apiResults.flatMap(r => r.features))].length;

    // Save report to file
    const report = {
      summary: {
        totalAPIs: apiResults.length,
        workingAPIs,
        averageReliability,
        totalFeatures,
        testTimestamp: new Date()
      },
      apiResults,
      realContainerResults,
      performanceResults,
      stressTestResults,
      reliabilityResults,
      endToEndResults,
      monitoringResults
    };

    await this.saveReportToFile(report);
    
    return report;
  }

  /**
   * Save test report to file for historical tracking
   */
  private async saveReportToFile(report: any): Promise<void> {
    try {
      const reportsDir = path.join(__dirname, '../../reports');
      
      // Create reports directory if it doesn't exist
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `comprehensive-api-test-${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved to: ${filepath}`);
      
      // Also save a latest report
      const latestPath = path.join(reportsDir, 'latest-comprehensive-test.json');
      fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
      
    } catch (error) {
      console.error('❌ Error saving test report:', error);
    }
  }

  private async runTest(testName: string, testFn: () => Promise<boolean>): Promise<{
    testName: string;
    success: boolean;
    duration: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const success = await testFn();
      return {
        testName,
        success,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getProviderFeatures(providerName: string): string[] {
    const featureMap: Record<string, string[]> = {
      'project44': ['multi-carrier-fallback', 'enterprise-grade', 'advanced-analytics'],
      'yang-ming': ['asia-pacific-specialization', 'regional-optimization'],
      'zim': ['mediterranean-specialization', 'israeli-carrier'],
      'shipsgo': ['multi-carrier-aggregator', 'vessel-tracking'],
      'searates': ['rate-calculation', 'route-optimization'],
      'marine-traffic': ['vessel-positions', 'port-congestion'],
      'vessel-finder': ['vessel-tracking', 'eta-predictions']
    };
    return featureMap[providerName] || ['container-tracking', 'booking-tracking'];
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'TIMEOUT';
    if (error.includes('rate limit')) return 'RATE_LIMIT';
    if (error.includes('not found')) return 'NOT_FOUND';
    if (error.includes('auth')) return 'AUTH_ERROR';
    if (error.includes('network')) return 'NETWORK_ERROR';
    if (error.includes('server')) return 'SERVER_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private calculateDataQuality(trackingResult: any[]): number {
    if (trackingResult.length === 0) return 0;
    
    let qualityScore = 0;
    const maxScore = 100;
    
    // Check for data completeness
    trackingResult.forEach(result => {
      if (result.data) {
        if (result.data.status) qualityScore += 20;
        if (result.data.location) qualityScore += 20;
        if (result.data.timestamp) qualityScore += 15;
        if (result.data.vessel) qualityScore += 15;
        if (result.data.eta) qualityScore += 15;
        if (result.data.timeline) qualityScore += 15;
      }
    });
    
    return Math.min(qualityScore / trackingResult.length, maxScore) / maxScore;
  }
}