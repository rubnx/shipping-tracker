import { APIAggregator } from './APIAggregator';
import { SmartContainerRouter } from './SmartContainerRouter';
export interface APIProviderStatus {
    name: string;
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    reliability: number;
    responseTime: number;
    lastChecked: Date;
    uptime: number;
    errorRate: number;
    rateLimit: {
        current: number;
        limit: number;
        resetTime: Date;
    };
    cost: {
        tier: 'free' | 'freemium' | 'paid' | 'premium';
        costPerRequest: number;
        monthlyUsage: number;
        monthlyCost: number;
    };
    features: string[];
    coverage: string[];
}
export interface APIHealthMetrics {
    totalProviders: number;
    healthyProviders: number;
    degradedProviders: number;
    downProviders: number;
    averageResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalCost: number;
    costByTier: {
        free: number;
        freemium: number;
        paid: number;
        premium: number;
    };
}
export interface APIUsageAnalytics {
    provider: string;
    requestCount: number;
    successRate: number;
    averageResponseTime: number;
    errorBreakdown: Record<string, number>;
    costAnalysis: {
        totalCost: number;
        costPerRequest: number;
        costEfficiency: number;
    };
    performanceMetrics: {
        p50ResponseTime: number;
        p95ResponseTime: number;
        p99ResponseTime: number;
    };
    timeSeriesData: Array<{
        timestamp: Date;
        requests: number;
        errors: number;
        responseTime: number;
    }>;
}
export interface CostOptimizationRecommendation {
    type: 'provider_switch' | 'tier_upgrade' | 'usage_reduction' | 'caching_improvement';
    priority: 'high' | 'medium' | 'low';
    description: string;
    currentCost: number;
    projectedSavings: number;
    implementation: string;
    impact: string;
}
/**
 * Container API Dashboard and Monitoring Service
 * Provides real-time monitoring, analytics, and cost optimization for all container APIs
 * Implements Requirements 7.3, 9.1, 9.4 for comprehensive API management
 */
export declare class APIProviderDashboard {
    private aggregator;
    private smartRouter;
    private healthCheckInterval;
    private metricsHistory;
    private alertThresholds;
    constructor(aggregator: APIAggregator, smartRouter: SmartContainerRouter);
    /**
     * Get real-time status of all API providers
     */
    getProviderStatuses(): Promise<APIProviderStatus[]>;
    /**
     * Get overall API health metrics
     */
    getHealthMetrics(): Promise<APIHealthMetrics>;
    /**
     * Get detailed usage analytics for a specific provider
     */
    getProviderAnalytics(providerName: string): Promise<APIUsageAnalytics>;
    /**
     * Get cost optimization recommendations
     */
    getCostOptimizationRecommendations(): Promise<CostOptimizationRecommendation[]>;
    /**
     * Start automated health monitoring
     */
    private startHealthMonitoring;
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring(): void;
    /**
     * Perform health checks on all providers
     */
    private performHealthChecks;
    /**
     * Check health of a specific provider
     */
    private checkProviderHealth;
    /**
     * Get provider metrics
     */
    private getProviderMetrics;
    /**
     * Get provider cost information
     */
    private getProviderCostInfo;
    /**
     * Get provider features
     */
    private getProviderFeatures;
    /**
     * Get provider coverage
     */
    private getProviderCoverage;
    /**
     * Find cheaper alternatives for a provider
     */
    private findCheaperAlternatives;
    /**
     * Calculate caching potential for a provider
     */
    private calculateCachingPotential;
    /**
     * Generate time series data for analytics
     */
    private generateTimeSeriesData;
    /**
     * Calculate performance metrics from time series data
     */
    private calculatePerformanceMetrics;
    /**
     * Calculate cost analysis for a provider
     */
    private calculateCostAnalysis;
    /**
     * Send alert for monitoring issues
     */
    private sendAlert;
    /**
     * Get dashboard summary for quick overview
     */
    getDashboardSummary(): Promise<{
        health: APIHealthMetrics;
        topProviders: Array<{
            name: string;
            requests: number;
            cost: number;
        }>;
        alerts: Array<{
            type: string;
            provider: string;
            severity: string;
        }>;
        recommendations: CostOptimizationRecommendation[];
    }>;
}
//# sourceMappingURL=APIProviderDashboard.d.ts.map