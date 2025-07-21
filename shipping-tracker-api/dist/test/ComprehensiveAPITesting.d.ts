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
/**
 * Comprehensive Container API Testing Framework
 * Tests all 15 container APIs with real container numbers and performance scenarios
 * Implements Requirements 9.4 for comprehensive testing
 */
export declare class ComprehensiveAPITesting {
    private aggregator;
    private optimizer;
    private smartRouter;
    private readonly testContainers;
    constructor();
    /**
     * Test all 15 container APIs with integration tests
     */
    testAllAPIs(): Promise<APITestResult[]>;
    /**
     * Performance testing with high-volume scenarios
     */
    performanceTest(requestCount?: number): Promise<PerformanceTestResult>;
    /**
     * Reliability and uptime monitoring test
     */
    reliabilityTest(duration?: number): Promise<ReliabilityTestResult[]>;
    /**
     * End-to-end testing with real container numbers
     */
    endToEndTest(): Promise<{
        totalTests: number;
        passedTests: number;
        failedTests: number;
        testResults: Array<{
            testName: string;
            success: boolean;
            duration: number;
            error?: string;
        }>;
    }>;
    /**
     * Generate comprehensive test report
     */
    generateTestReport(): Promise<{
        summary: {
            totalAPIs: number;
            workingAPIs: number;
            averageReliability: number;
            totalFeatures: number;
        };
        apiResults: APITestResult[];
        performanceResults: PerformanceTestResult;
        reliabilityResults: ReliabilityTestResult[];
        endToEndResults: any;
    }>;
    private runTest;
    private getProviderFeatures;
    private categorizeError;
}
//# sourceMappingURL=ComprehensiveAPITesting.d.ts.map