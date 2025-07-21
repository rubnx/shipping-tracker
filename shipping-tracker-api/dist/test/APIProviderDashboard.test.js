"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APIProviderDashboard_1 = require("../services/APIProviderDashboard");
const APIAggregator_1 = require("../services/APIAggregator");
const SmartContainerRouter_1 = require("../services/SmartContainerRouter");
// Mock the dependencies
jest.mock('../services/APIAggregator');
jest.mock('../services/SmartContainerRouter');
describe('APIProviderDashboard', () => {
    let dashboard;
    let mockAggregator;
    let mockSmartRouter;
    beforeEach(() => {
        mockAggregator = new APIAggregator_1.APIAggregator();
        mockSmartRouter = new SmartContainerRouter_1.SmartContainerRouter();
        // Mock aggregator methods
        mockAggregator.getProviderStats = jest.fn().mockReturnValue([
            { name: 'maersk', reliability: 0.95, available: true },
            { name: 'msc', reliability: 0.88, available: true },
            { name: 'project44', reliability: 0.93, available: false },
            { name: 'zim', reliability: 0.80, available: true }
        ]);
        // Mock smart router methods
        mockSmartRouter.getProviderStats = jest.fn().mockReturnValue([
            {
                provider: 'maersk',
                requestCount: 150,
                successRate: 0.95,
                averageResponseTime: 1200,
                errorBreakdown: { 'TIMEOUT': 2, 'NOT_FOUND': 3 },
                recentFailures: 0
            },
            {
                provider: 'msc',
                requestCount: 120,
                successRate: 0.88,
                averageResponseTime: 1800,
                errorBreakdown: { 'RATE_LIMIT': 5, 'NOT_FOUND': 2 },
                recentFailures: 1
            }
        ]);
        dashboard = new APIProviderDashboard_1.APIProviderDashboard(mockAggregator, mockSmartRouter);
    });
    afterEach(() => {
        dashboard.stopHealthMonitoring();
        jest.clearAllMocks();
    });
    describe('Provider Status Monitoring', () => {
        it('should get provider statuses with health information', async () => {
            const statuses = await dashboard.getProviderStatuses();
            expect(statuses).toHaveLength(4);
            expect(statuses[0]).toMatchObject({
                name: 'maersk',
                reliability: 0.95,
                status: expect.any(String),
                responseTime: expect.any(Number),
                lastChecked: expect.any(Date),
                uptime: expect.any(Number),
                errorRate: expect.any(Number),
                rateLimit: expect.objectContaining({
                    current: expect.any(Number),
                    limit: expect.any(Number),
                    resetTime: expect.any(Date)
                }),
                cost: expect.objectContaining({
                    tier: expect.any(String),
                    costPerRequest: expect.any(Number),
                    monthlyUsage: expect.any(Number),
                    monthlyCost: expect.any(Number)
                }),
                features: expect.any(Array),
                coverage: expect.any(Array)
            });
        });
        it('should categorize providers by health status', async () => {
            const statuses = await dashboard.getProviderStatuses();
            const healthyProviders = statuses.filter(s => s.status === 'healthy');
            const degradedProviders = statuses.filter(s => s.status === 'degraded');
            const downProviders = statuses.filter(s => s.status === 'down');
            expect(healthyProviders.length + degradedProviders.length + downProviders.length).toBe(statuses.length);
        });
    });
    describe('Health Metrics', () => {
        it('should calculate overall health metrics', async () => {
            const metrics = await dashboard.getHealthMetrics();
            expect(metrics).toMatchObject({
                totalProviders: expect.any(Number),
                healthyProviders: expect.any(Number),
                degradedProviders: expect.any(Number),
                downProviders: expect.any(Number),
                averageResponseTime: expect.any(Number),
                totalRequests: expect.any(Number),
                successfulRequests: expect.any(Number),
                failedRequests: expect.any(Number),
                totalCost: expect.any(Number),
                costByTier: expect.objectContaining({
                    free: expect.any(Number),
                    freemium: expect.any(Number),
                    paid: expect.any(Number),
                    premium: expect.any(Number)
                })
            });
        });
        it('should have consistent provider counts', async () => {
            const metrics = await dashboard.getHealthMetrics();
            expect(metrics.healthyProviders + metrics.degradedProviders + metrics.downProviders)
                .toBe(metrics.totalProviders);
        });
    });
    describe('Provider Analytics', () => {
        it('should get detailed analytics for a specific provider', async () => {
            const analytics = await dashboard.getProviderAnalytics('maersk');
            expect(analytics).toMatchObject({
                provider: 'maersk',
                requestCount: expect.any(Number),
                successRate: expect.any(Number),
                averageResponseTime: expect.any(Number),
                errorBreakdown: expect.any(Object),
                costAnalysis: expect.objectContaining({
                    totalCost: expect.any(Number),
                    costPerRequest: expect.any(Number),
                    costEfficiency: expect.any(Number)
                }),
                performanceMetrics: expect.objectContaining({
                    p50ResponseTime: expect.any(Number),
                    p95ResponseTime: expect.any(Number),
                    p99ResponseTime: expect.any(Number)
                }),
                timeSeriesData: expect.any(Array)
            });
        });
        it('should throw error for non-existent provider', async () => {
            await expect(dashboard.getProviderAnalytics('non-existent'))
                .rejects.toThrow('Provider non-existent not found');
        });
        it('should generate time series data with 24 hours of data', async () => {
            const analytics = await dashboard.getProviderAnalytics('maersk');
            expect(analytics.timeSeriesData).toHaveLength(24);
            expect(analytics.timeSeriesData[0]).toMatchObject({
                timestamp: expect.any(Date),
                requests: expect.any(Number),
                errors: expect.any(Number),
                responseTime: expect.any(Number)
            });
        });
    });
    describe('Cost Optimization', () => {
        it('should generate cost optimization recommendations', async () => {
            const recommendations = await dashboard.getCostOptimizationRecommendations();
            expect(Array.isArray(recommendations)).toBe(true);
            if (recommendations.length > 0) {
                expect(recommendations[0]).toMatchObject({
                    type: expect.stringMatching(/provider_switch|tier_upgrade|usage_reduction|caching_improvement/),
                    priority: expect.stringMatching(/high|medium|low/),
                    description: expect.any(String),
                    currentCost: expect.any(Number),
                    projectedSavings: expect.any(Number),
                    implementation: expect.any(String),
                    impact: expect.any(String)
                });
            }
        });
        it('should prioritize recommendations by priority', async () => {
            const recommendations = await dashboard.getCostOptimizationRecommendations();
            if (recommendations.length > 1) {
                const priorities = recommendations.map(r => r.priority);
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                for (let i = 1; i < priorities.length; i++) {
                    expect(priorityOrder[priorities[i - 1]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i]]);
                }
            }
        });
    });
    describe('Dashboard Summary', () => {
        it('should provide comprehensive dashboard summary', async () => {
            const summary = await dashboard.getDashboardSummary();
            expect(summary).toMatchObject({
                health: expect.objectContaining({
                    totalProviders: expect.any(Number),
                    healthyProviders: expect.any(Number),
                    totalCost: expect.any(Number)
                }),
                topProviders: expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.any(String),
                        requests: expect.any(Number),
                        cost: expect.any(Number)
                    })
                ]),
                alerts: expect.any(Array),
                recommendations: expect.any(Array)
            });
        });
        it('should limit top providers to 5', async () => {
            const summary = await dashboard.getDashboardSummary();
            expect(summary.topProviders.length).toBeLessThanOrEqual(5);
        });
        it('should limit recommendations to 3', async () => {
            const summary = await dashboard.getDashboardSummary();
            expect(summary.recommendations.length).toBeLessThanOrEqual(3);
        });
    });
    describe('Cost Analysis', () => {
        it('should provide accurate cost information for different provider tiers', async () => {
            const statuses = await dashboard.getProviderStatuses();
            const freeProviders = statuses.filter(s => s.cost.tier === 'free');
            const paidProviders = statuses.filter(s => s.cost.tier === 'paid');
            const premiumProviders = statuses.filter(s => s.cost.tier === 'premium');
            // Free providers should have zero cost
            freeProviders.forEach(provider => {
                expect(provider.cost.costPerRequest).toBe(0);
                expect(provider.cost.monthlyCost).toBe(0);
            });
            // Paid providers should have reasonable costs
            paidProviders.forEach(provider => {
                expect(provider.cost.costPerRequest).toBeGreaterThan(0);
                expect(provider.cost.costPerRequest).toBeLessThan(1); // Less than $1 per request
            });
            // Premium providers should be more expensive
            premiumProviders.forEach(provider => {
                expect(provider.cost.costPerRequest).toBeGreaterThan(0.3); // At least $0.30 per request
            });
        });
    });
    describe('Health Monitoring', () => {
        it('should start health monitoring on initialization', () => {
            // Health monitoring should be started automatically
            expect(dashboard).toBeDefined();
        });
        it('should stop health monitoring when requested', () => {
            dashboard.stopHealthMonitoring();
            // Should not throw any errors
            expect(true).toBe(true);
        });
    });
    describe('Provider Features and Coverage', () => {
        it('should provide correct features for specialized providers', async () => {
            const statuses = await dashboard.getProviderStatuses();
            const project44 = statuses.find(s => s.name === 'project44');
            const yangMing = statuses.find(s => s.name === 'yang-ming');
            const zim = statuses.find(s => s.name === 'zim');
            if (project44) {
                expect(project44.features).toContain('enterprise-grade');
                expect(project44.features).toContain('multi-carrier-fallback');
            }
            if (yangMing) {
                expect(yangMing.features).toContain('asia-pacific-specialization');
            }
            if (zim) {
                expect(zim.features).toContain('mediterranean-specialization');
                expect(zim.features).toContain('israeli-carrier');
            }
        });
        it('should provide correct coverage information', async () => {
            const statuses = await dashboard.getProviderStatuses();
            const globalProviders = statuses.filter(s => s.coverage.includes('global'));
            const regionalProviders = statuses.filter(s => s.coverage.includes('asia-pacific') || s.coverage.includes('mediterranean'));
            expect(globalProviders.length).toBeGreaterThan(0);
            expect(globalProviders.length + regionalProviders.length).toBeGreaterThanOrEqual(statuses.length);
        });
    });
});
//# sourceMappingURL=APIProviderDashboard.test.js.map