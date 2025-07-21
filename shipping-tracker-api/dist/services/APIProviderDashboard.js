"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIProviderDashboard = void 0;
/**
 * Container API Dashboard and Monitoring Service
 * Provides real-time monitoring, analytics, and cost optimization for all container APIs
 * Implements Requirements 7.3, 9.1, 9.4 for comprehensive API management
 */
class APIProviderDashboard {
    constructor(aggregator, smartRouter) {
        this.healthCheckInterval = null;
        this.metricsHistory = new Map();
        this.alertThresholds = {
            responseTime: 10000, // 10 seconds
            errorRate: 0.1, // 10%
            uptime: 0.95 // 95%
        };
        this.aggregator = aggregator;
        this.smartRouter = smartRouter;
        this.startHealthMonitoring();
    }
    /**
     * Get real-time status of all API providers
     */
    async getProviderStatuses() {
        const providers = this.aggregator.getProviderStats();
        const statuses = [];
        for (const provider of providers) {
            const status = await this.checkProviderHealth(provider.name);
            const metrics = await this.getProviderMetrics(provider.name);
            const costInfo = this.getProviderCostInfo(provider.name);
            statuses.push({
                name: provider.name,
                status: status.status,
                reliability: provider.reliability,
                responseTime: status.responseTime,
                lastChecked: status.lastChecked,
                uptime: status.uptime,
                errorRate: status.errorRate,
                rateLimit: status.rateLimit,
                cost: costInfo,
                features: this.getProviderFeatures(provider.name),
                coverage: this.getProviderCoverage(provider.name)
            });
        }
        return statuses;
    }
    /**
     * Get overall API health metrics
     */
    async getHealthMetrics() {
        const statuses = await this.getProviderStatuses();
        const healthyCount = statuses.filter(s => s.status === 'healthy').length;
        const degradedCount = statuses.filter(s => s.status === 'degraded').length;
        const downCount = statuses.filter(s => s.status === 'down').length;
        const totalRequests = statuses.reduce((sum, s) => sum + s.cost.monthlyUsage, 0);
        const totalCost = statuses.reduce((sum, s) => sum + s.cost.monthlyCost, 0);
        const avgResponseTime = statuses.length > 0
            ? statuses.reduce((sum, s) => sum + s.responseTime, 0) / statuses.length
            : 0;
        const costByTier = statuses.reduce((acc, s) => {
            acc[s.cost.tier] += s.cost.monthlyCost;
            return acc;
        }, { free: 0, freemium: 0, paid: 0, premium: 0 });
        return {
            totalProviders: statuses.length,
            healthyProviders: healthyCount,
            degradedProviders: degradedCount,
            downProviders: downCount,
            averageResponseTime: avgResponseTime,
            totalRequests,
            successfulRequests: Math.round(totalRequests * 0.9), // Estimated
            failedRequests: Math.round(totalRequests * 0.1), // Estimated
            totalCost,
            costByTier
        };
    }
    /**
     * Get detailed usage analytics for a specific provider
     */
    async getProviderAnalytics(providerName) {
        const routerStats = this.smartRouter.getProviderStats();
        const providerStat = routerStats.find(s => s.provider === providerName);
        if (!providerStat) {
            throw new Error(`Provider ${providerName} not found`);
        }
        const timeSeriesData = this.generateTimeSeriesData(providerName);
        const performanceMetrics = this.calculatePerformanceMetrics(timeSeriesData);
        // Generate mock analytics data based on available router stats
        const requestCount = Math.floor(Math.random() * 500 + 100);
        const successRate = Math.max(0.7, providerStat.reliability - 0.1 + Math.random() * 0.2);
        const averageResponseTime = Math.floor(Math.random() * 2000 + 500);
        const costAnalysis = this.calculateCostAnalysis(providerName, requestCount);
        // Generate error breakdown based on recent failures
        const errorBreakdown = {};
        if (providerStat.recentFailures > 0) {
            errorBreakdown['TIMEOUT'] = Math.floor(providerStat.recentFailures * 0.4);
            errorBreakdown['NOT_FOUND'] = Math.floor(providerStat.recentFailures * 0.3);
            errorBreakdown['RATE_LIMIT'] = Math.floor(providerStat.recentFailures * 0.2);
            errorBreakdown['AUTH_ERROR'] = Math.floor(providerStat.recentFailures * 0.1);
        }
        return {
            provider: providerName,
            requestCount,
            successRate,
            averageResponseTime,
            errorBreakdown,
            costAnalysis,
            performanceMetrics,
            timeSeriesData
        };
    }
    /**
     * Get cost optimization recommendations
     */
    async getCostOptimizationRecommendations() {
        const statuses = await this.getProviderStatuses();
        const recommendations = [];
        // Analyze provider switching opportunities
        const expensiveProviders = statuses
            .filter(s => s.cost.tier === 'premium' || s.cost.tier === 'paid')
            .sort((a, b) => b.cost.monthlyCost - a.cost.monthlyCost);
        for (const provider of expensiveProviders.slice(0, 3)) {
            const alternatives = this.findCheaperAlternatives(provider, statuses);
            if (alternatives.length > 0) {
                const bestAlternative = alternatives[0];
                const savings = provider.cost.monthlyCost - bestAlternative.cost.monthlyCost;
                if (savings > 50) { // Only recommend if savings > $50/month
                    recommendations.push({
                        type: 'provider_switch',
                        priority: savings > 200 ? 'high' : 'medium',
                        description: `Switch from ${provider.name} to ${bestAlternative.name} for similar reliability`,
                        currentCost: provider.cost.monthlyCost,
                        projectedSavings: savings,
                        implementation: `Update API priority in smart router configuration`,
                        impact: `Maintain ${Math.min(provider.reliability, bestAlternative.reliability) * 100}% reliability while reducing costs`
                    });
                }
            }
        }
        // Analyze caching improvements
        const highVolumeProviders = statuses
            .filter(s => s.cost.monthlyUsage > 1000)
            .sort((a, b) => b.cost.monthlyUsage - a.cost.monthlyUsage);
        for (const provider of highVolumeProviders.slice(0, 2)) {
            const cachingPotential = this.calculateCachingPotential(provider);
            if (cachingPotential.savings > 30) {
                recommendations.push({
                    type: 'caching_improvement',
                    priority: cachingPotential.savings > 100 ? 'high' : 'medium',
                    description: `Improve caching for ${provider.name} to reduce redundant requests`,
                    currentCost: provider.cost.monthlyCost,
                    projectedSavings: cachingPotential.savings,
                    implementation: `Extend cache TTL to ${cachingPotential.recommendedTTL} minutes`,
                    impact: `Reduce API calls by ${cachingPotential.reductionPercentage}% while maintaining data freshness`
                });
            }
        }
        // Analyze tier upgrades
        const freemiumProviders = statuses.filter(s => s.cost.tier === 'freemium');
        for (const provider of freemiumProviders) {
            if (provider.cost.monthlyUsage > 800) { // Near rate limits
                recommendations.push({
                    type: 'tier_upgrade',
                    priority: 'medium',
                    description: `Consider upgrading ${provider.name} to paid tier for better rate limits`,
                    currentCost: provider.cost.monthlyCost,
                    projectedSavings: -50, // Negative savings (cost increase)
                    implementation: `Upgrade to paid tier and adjust rate limiting`,
                    impact: `Improve reliability and reduce rate limit errors`
                });
            }
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    /**
     * Start automated health monitoring
     */
    startHealthMonitoring() {
        // Check health every 5 minutes
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            }
            catch (error) {
                console.error('❌ Health check failed:', error);
            }
        }, 5 * 60 * 1000);
        console.log('🏥 API health monitoring started');
    }
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            console.log('🏥 API health monitoring stopped');
        }
    }
    /**
     * Perform health checks on all providers
     */
    async performHealthChecks() {
        const providers = this.aggregator.getProviderStats();
        for (const provider of providers) {
            try {
                const health = await this.checkProviderHealth(provider.name);
                // Check for alerts
                if (health.responseTime > this.alertThresholds.responseTime) {
                    this.sendAlert('high_response_time', provider.name, {
                        responseTime: health.responseTime,
                        threshold: this.alertThresholds.responseTime
                    });
                }
                if (health.errorRate > this.alertThresholds.errorRate) {
                    this.sendAlert('high_error_rate', provider.name, {
                        errorRate: health.errorRate,
                        threshold: this.alertThresholds.errorRate
                    });
                }
                if (health.uptime < this.alertThresholds.uptime) {
                    this.sendAlert('low_uptime', provider.name, {
                        uptime: health.uptime,
                        threshold: this.alertThresholds.uptime
                    });
                }
            }
            catch (error) {
                console.error(`❌ Health check failed for ${provider.name}:`, error);
            }
        }
    }
    /**
     * Check health of a specific provider
     */
    async checkProviderHealth(providerName) {
        const startTime = Date.now();
        let status = 'unknown';
        let responseTime = 0;
        try {
            // Perform a lightweight health check (mock for now)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
            responseTime = Date.now() - startTime;
            if (responseTime < 2000) {
                status = 'healthy';
            }
            else if (responseTime < 5000) {
                status = 'degraded';
            }
            else {
                status = 'down';
            }
        }
        catch (error) {
            status = 'down';
            responseTime = Date.now() - startTime;
        }
        // Mock data for demonstration
        return {
            status,
            responseTime,
            lastChecked: new Date(),
            uptime: Math.random() * 0.1 + 0.9, // 90-100%
            errorRate: Math.random() * 0.05, // 0-5%
            rateLimit: {
                current: Math.floor(Math.random() * 50),
                limit: 100,
                resetTime: new Date(Date.now() + 60000) // 1 minute from now
            }
        };
    }
    /**
     * Get provider metrics
     */
    async getProviderMetrics(providerName) {
        const routerStats = this.smartRouter.getProviderStats();
        return routerStats.find(s => s.provider === providerName) || {
            requestCount: 0,
            successRate: 0,
            averageResponseTime: 0,
            errorBreakdown: {}
        };
    }
    /**
     * Get provider cost information
     */
    getProviderCostInfo(providerName) {
        const costMap = {
            'track-trace': { tier: 'free', costPerRequest: 0, monthlyUsage: 450, monthlyCost: 0 },
            'shipsgo': { tier: 'freemium', costPerRequest: 0.05, monthlyUsage: 320, monthlyCost: 16 },
            'searates': { tier: 'freemium', costPerRequest: 0.08, monthlyUsage: 280, monthlyCost: 22.40 },
            'maersk': { tier: 'paid', costPerRequest: 0.25, monthlyUsage: 150, monthlyCost: 37.50 },
            'msc': { tier: 'paid', costPerRequest: 0.22, monthlyUsage: 120, monthlyCost: 26.40 },
            'cma-cgm': { tier: 'paid', costPerRequest: 0.20, monthlyUsage: 90, monthlyCost: 18 },
            'cosco': { tier: 'paid', costPerRequest: 0.18, monthlyUsage: 85, monthlyCost: 15.30 },
            'hapag-lloyd': { tier: 'paid', costPerRequest: 0.24, monthlyUsage: 75, monthlyCost: 18 },
            'evergreen': { tier: 'paid', costPerRequest: 0.19, monthlyUsage: 70, monthlyCost: 13.30 },
            'one-line': { tier: 'paid', costPerRequest: 0.21, monthlyUsage: 65, monthlyCost: 13.65 },
            'yang-ming': { tier: 'paid', costPerRequest: 0.15, monthlyUsage: 60, monthlyCost: 9 },
            'zim': { tier: 'paid', costPerRequest: 0.15, monthlyUsage: 55, monthlyCost: 8.25 },
            'project44': { tier: 'premium', costPerRequest: 0.45, monthlyUsage: 200, monthlyCost: 90 },
            'marine-traffic': { tier: 'freemium', costPerRequest: 0.10, monthlyUsage: 100, monthlyCost: 10 },
            'vessel-finder': { tier: 'freemium', costPerRequest: 0.12, monthlyUsage: 80, monthlyCost: 9.60 }
        };
        return costMap[providerName] || {
            tier: 'paid',
            costPerRequest: 0.20,
            monthlyUsage: 50,
            monthlyCost: 10
        };
    }
    /**
     * Get provider features
     */
    getProviderFeatures(providerName) {
        const featureMap = {
            'project44': ['multi-carrier-fallback', 'enterprise-grade', 'high-volume-support', 'advanced-analytics'],
            'yang-ming': ['asia-pacific-specialization', 'regional-optimization'],
            'zim': ['mediterranean-specialization', 'israeli-carrier', 'feeder-services'],
            'shipsgo': ['multi-carrier-aggregator', 'vessel-tracking'],
            'searates': ['rate-calculation', 'route-optimization'],
            'marine-traffic': ['vessel-positions', 'port-congestion'],
            'vessel-finder': ['vessel-tracking', 'eta-predictions']
        };
        return featureMap[providerName] || ['container-tracking', 'booking-tracking'];
    }
    /**
     * Get provider coverage
     */
    getProviderCoverage(providerName) {
        const coverageMap = {
            'maersk': ['global'],
            'msc': ['global'],
            'project44': ['global'],
            'yang-ming': ['asia-pacific'],
            'zim': ['mediterranean', 'global'],
            'evergreen': ['asia-pacific', 'global'],
            'one-line': ['asia-pacific', 'global'],
            'cosco': ['asia-pacific', 'global'],
            'cma-cgm': ['global'],
            'hapag-lloyd': ['global']
        };
        return coverageMap[providerName] || ['global'];
    }
    /**
     * Find cheaper alternatives for a provider
     */
    findCheaperAlternatives(provider, allProviders) {
        return allProviders
            .filter(p => p.name !== provider.name &&
            p.cost.monthlyCost < provider.cost.monthlyCost &&
            p.reliability >= provider.reliability - 0.1 && // Allow 10% reliability difference
            p.status === 'healthy')
            .sort((a, b) => a.cost.monthlyCost - b.cost.monthlyCost);
    }
    /**
     * Calculate caching potential for a provider
     */
    calculateCachingPotential(provider) {
        // Estimate that 30-50% of requests could be cached longer
        const reductionPercentage = Math.floor(Math.random() * 20 + 30); // 30-50%
        const savings = (provider.cost.monthlyCost * reductionPercentage) / 100;
        const recommendedTTL = Math.floor(Math.random() * 10 + 15); // 15-25 minutes
        return {
            savings,
            reductionPercentage,
            recommendedTTL
        };
    }
    /**
     * Generate time series data for analytics
     */
    generateTimeSeriesData(providerName) {
        const data = [];
        const now = new Date();
        // Generate last 24 hours of data
        for (let i = 23; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            data.push({
                timestamp,
                requests: Math.floor(Math.random() * 50 + 10),
                errors: Math.floor(Math.random() * 5),
                responseTime: Math.floor(Math.random() * 2000 + 500)
            });
        }
        return data;
    }
    /**
     * Calculate performance metrics from time series data
     */
    calculatePerformanceMetrics(timeSeriesData) {
        const responseTimes = timeSeriesData.map(d => d.responseTime).sort((a, b) => a - b);
        return {
            p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
            p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
            p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)]
        };
    }
    /**
     * Calculate cost analysis for a provider
     */
    calculateCostAnalysis(providerName, requestCount) {
        const costInfo = this.getProviderCostInfo(providerName);
        const totalCost = costInfo.monthlyCost;
        const costPerRequest = requestCount > 0 ? totalCost / requestCount : 0;
        const costEfficiency = requestCount > 0 ? (1 / costPerRequest) * 100 : 0;
        return {
            totalCost,
            costPerRequest,
            costEfficiency
        };
    }
    /**
     * Send alert for monitoring issues
     */
    sendAlert(type, providerName, data) {
        console.log(`🚨 ALERT [${type.toUpperCase()}]: ${providerName}`, data);
        // In a real implementation, this would send alerts via:
        // - Email notifications
        // - Slack/Discord webhooks
        // - PagerDuty integration
        // - SMS alerts for critical issues
    }
    /**
     * Get dashboard summary for quick overview
     */
    async getDashboardSummary() {
        const health = await this.getHealthMetrics();
        const statuses = await this.getProviderStatuses();
        const recommendations = await this.getCostOptimizationRecommendations();
        const topProviders = statuses
            .sort((a, b) => b.cost.monthlyUsage - a.cost.monthlyUsage)
            .slice(0, 5)
            .map(p => ({
            name: p.name,
            requests: p.cost.monthlyUsage,
            cost: p.cost.monthlyCost
        }));
        const alerts = statuses
            .filter(p => p.status !== 'healthy')
            .map(p => ({
            type: p.status === 'down' ? 'outage' : 'performance',
            provider: p.name,
            severity: p.status === 'down' ? 'critical' : 'warning'
        }));
        return {
            health,
            topProviders,
            alerts,
            recommendations: recommendations.slice(0, 3) // Top 3 recommendations
        };
    }
}
exports.APIProviderDashboard = APIProviderDashboard;
//# sourceMappingURL=APIProviderDashboard.js.map