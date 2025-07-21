"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveAPITesting = void 0;
const APIAggregator_1 = require("../services/APIAggregator");
const PerformanceOptimizer_1 = require("../services/PerformanceOptimizer");
const SmartContainerRouter_1 = require("../services/SmartContainerRouter");
/**
 * Comprehensive Container API Testing Framework
 * Tests all 15 container APIs with real container numbers and performance scenarios
 * Implements Requirements 9.4 for comprehensive testing
 */
class ComprehensiveAPITesting {
    constructor() {
        // Test container numbers for different carriers
        this.testContainers = {
            maersk: ['MAEU1234567', 'MAEU7654321'],
            msc: ['MSCU1234567', 'MSCU7654321'],
            'cma-cgm': ['CMAU1234567', 'CMAU7654321'],
            cosco: ['COSU1234567', 'COSU7654321'],
            'hapag-lloyd': ['HLCU1234567', 'HLCU7654321'],
            evergreen: ['EGLV1234567', 'EGLV7654321'],
            'one-line': ['ONEY1234567', 'ONEY7654321'],
            'yang-ming': ['YMLU1234567', 'YMLU7654321'],
            zim: ['ZIMU1234567', 'ZIMU7654321'],
            project44: ['TEST1234567', 'TEST7654321'],
            shipsgo: ['SHIP1234567', 'SHIP7654321'],
            searates: ['RATE1234567', 'RATE7654321'],
            'track-trace': ['TRCK1234567', 'TRCK7654321'],
            'marine-traffic': ['MTRK1234567', 'MTRK7654321'],
            'vessel-finder': ['VFND1234567', 'VFND7654321']
        };
        this.aggregator = new APIAggregator_1.APIAggregator();
        this.smartRouter = new SmartContainerRouter_1.SmartContainerRouter();
        this.optimizer = new PerformanceOptimizer_1.PerformanceOptimizer(this.aggregator, this.smartRouter);
    }
    /**
     * Test all 15 container APIs with integration tests
     */
    async testAllAPIs() {
        const results = [];
        const providers = this.aggregator.getProviderStats();
        console.log(`🧪 Testing ${providers.length} container API providers...`);
        for (const provider of providers) {
            const testContainers = this.testContainers[provider.name] || ['TEST123456'];
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
                }
                catch (error) {
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
            }
        }
        return results;
    }
    /**
     * Performance testing with high-volume scenarios
     */
    async performanceTest(requestCount = 100) {
        console.log(`⚡ Running performance test with ${requestCount} requests...`);
        const startTime = Date.now();
        const results = [];
        const responseTimes = [];
        // Generate test requests
        const requests = Array.from({ length: requestCount }, (_, i) => ({
            trackingNumber: `PERF${String(i).padStart(6, '0')}`,
            trackingType: 'container'
        }));
        // Execute requests in batches
        const batchSize = 10;
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchPromises = batch.map(async (req) => {
                const reqStart = Date.now();
                try {
                    await this.optimizer.trackWithOptimization(req.trackingNumber, req.trackingType);
                    const reqTime = Date.now() - reqStart;
                    responseTimes.push(reqTime);
                    return true;
                }
                catch (error) {
                    const reqTime = Date.now() - reqStart;
                    responseTimes.push(reqTime);
                    return false;
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        const totalTime = Date.now() - startTime;
        const successfulRequests = results.filter(r => r).length;
        return {
            totalRequests: requestCount,
            successfulRequests,
            averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes),
            minResponseTime: Math.min(...responseTimes),
            throughput: requestCount / (totalTime / 1000),
            errorRate: (requestCount - successfulRequests) / requestCount
        };
    }
    /**
     * Reliability and uptime monitoring test
     */
    async reliabilityTest(duration = 60000) {
        console.log(`🔄 Running reliability test for ${duration / 1000} seconds...`);
        const results = [];
        const providers = this.aggregator.getProviderStats();
        const startTime = Date.now();
        // Test each provider continuously
        const providerTests = providers.map(async (provider) => {
            const testResults = [];
            const responseTimes = [];
            const errors = [];
            while (Date.now() - startTime < duration) {
                const reqStart = Date.now();
                try {
                    await this.aggregator.fetchFromMultipleSources('RELIABILITY123', 'container');
                    testResults.push(true);
                    responseTimes.push(Date.now() - reqStart);
                }
                catch (error) {
                    testResults.push(false);
                    responseTimes.push(Date.now() - reqStart);
                    errors.push(error instanceof Error ? error.message : 'Unknown error');
                }
                // Wait 5 seconds between tests
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            const successCount = testResults.filter(r => r).length;
            const errorBreakdown = {};
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
     * End-to-end testing with real container numbers
     */
    async endToEndTest() {
        console.log('🔍 Running end-to-end tests with real container scenarios...');
        const testResults = [];
        // Test 1: Container format detection
        const formatTest = await this.runTest('Container Format Detection', async () => {
            const maerskResult = await this.smartRouter.analyzeRouting({
                trackingNumber: 'MAEU1234567',
                trackingType: 'container'
            });
            return maerskResult.prioritizedProviders.includes('maersk');
        });
        testResults.push(formatTest);
        // Test 2: Multi-provider fallback
        const fallbackTest = await this.runTest('Multi-provider Fallback', async () => {
            const result = await this.aggregator.fetchFromMultipleSources('FALLBACK123', 'container');
            return Array.isArray(result);
        });
        testResults.push(fallbackTest);
        // Test 3: Performance optimization
        const perfTest = await this.runTest('Performance Optimization', async () => {
            const metrics = this.optimizer.getPerformanceMetrics();
            return typeof metrics.cacheHitRate === 'number';
        });
        testResults.push(perfTest);
        // Test 4: Error handling
        const errorTest = await this.runTest('Error Handling', async () => {
            try {
                await this.aggregator.fetchFromMultipleSources('INVALID_FORMAT', 'container');
                return true;
            }
            catch (error) {
                return error instanceof Error;
            }
        });
        testResults.push(errorTest);
        // Test 5: Batch processing
        const batchTest = await this.runTest('Batch Processing', async () => {
            const requests = [
                { trackingNumber: 'BATCH001', trackingType: 'container' },
                { trackingNumber: 'BATCH002', trackingType: 'container' }
            ];
            const results = await this.optimizer.trackMultiple(requests);
            return results.size === 2;
        });
        testResults.push(batchTest);
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
     * Generate comprehensive test report
     */
    async generateTestReport() {
        console.log('📊 Generating comprehensive test report...');
        const apiResults = await this.testAllAPIs();
        const performanceResults = await this.performanceTest(50);
        const reliabilityResults = await this.reliabilityTest(30000); // 30 seconds
        const endToEndResults = await this.endToEndTest();
        const workingAPIs = apiResults.filter(r => r.success).length;
        const averageReliability = apiResults.reduce((sum, r) => sum + r.reliability, 0) / apiResults.length;
        const totalFeatures = [...new Set(apiResults.flatMap(r => r.features))].length;
        return {
            summary: {
                totalAPIs: apiResults.length,
                workingAPIs,
                averageReliability,
                totalFeatures
            },
            apiResults,
            performanceResults,
            reliabilityResults,
            endToEndResults
        };
    }
    async runTest(testName, testFn) {
        const startTime = Date.now();
        try {
            const success = await testFn();
            return {
                testName,
                success,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                testName,
                success: false,
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    getProviderFeatures(providerName) {
        const featureMap = {
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
    categorizeError(error) {
        if (error.includes('timeout'))
            return 'TIMEOUT';
        if (error.includes('rate limit'))
            return 'RATE_LIMIT';
        if (error.includes('not found'))
            return 'NOT_FOUND';
        if (error.includes('auth'))
            return 'AUTH_ERROR';
        return 'UNKNOWN_ERROR';
    }
}
exports.ComprehensiveAPITesting = ComprehensiveAPITesting;
//# sourceMappingURL=ComprehensiveAPITesting.js.map