"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIAggregator = void 0;
const environment_1 = require("../config/environment");
const MaerskAPIService_1 = require("./carriers/MaerskAPIService");
const MSCAPIService_1 = require("./carriers/MSCAPIService");
const TrackTraceAPIService_1 = require("./carriers/TrackTraceAPIService");
const ShipsGoAPIService_1 = require("./carriers/ShipsGoAPIService");
const SeaRatesAPIService_1 = require("./carriers/SeaRatesAPIService");
const CMACGMAPIService_1 = require("./carriers/CMACGMAPIService");
const COSCOAPIService_1 = require("./carriers/COSCOAPIService");
const HapagLloydAPIService_1 = require("./carriers/HapagLloydAPIService");
const EvergreenAPIService_1 = require("./carriers/EvergreenAPIService");
const ONELineAPIService_1 = require("./carriers/ONELineAPIService");
const YangMingAPIService_1 = require("./carriers/YangMingAPIService");
const Project44APIService_1 = require("./carriers/Project44APIService");
const ZIMAPIService_1 = require("./carriers/ZIMAPIService");
const SmartContainerRouter_1 = require("./SmartContainerRouter");
const MarineTrafficAPIService_1 = require("./carriers/MarineTrafficAPIService");
const VesselFinderAPIService_1 = require("./carriers/VesselFinderAPIService");
class APIAggregator {
    constructor() {
        this.providers = new Map();
        this.rateLimitTracker = new Map();
        this.cache = new Map();
        this.maerskService = new MaerskAPIService_1.MaerskAPIService();
        this.mscService = new MSCAPIService_1.MSCAPIService();
        this.trackTraceService = new TrackTraceAPIService_1.TrackTraceAPIService();
        this.shipsGoService = new ShipsGoAPIService_1.ShipsGoAPIService();
        this.searatesService = new SeaRatesAPIService_1.SeaRatesAPIService();
        this.cmaCgmService = new CMACGMAPIService_1.CMACGMAPIService();
        this.coscoService = new COSCOAPIService_1.COSCOAPIService();
        this.hapagLloydService = new HapagLloydAPIService_1.HapagLloydAPIService();
        this.evergreenService = new EvergreenAPIService_1.EvergreenAPIService();
        this.oneLineService = new ONELineAPIService_1.ONELineAPIService();
        this.yangMingService = new YangMingAPIService_1.YangMingAPIService();
        this.project44Service = new Project44APIService_1.Project44APIService();
        this.zimService = new ZIMAPIService_1.ZIMAPIService();
        this.marineTrafficService = new MarineTrafficAPIService_1.MarineTrafficAPIService();
        this.vesselFinderService = new VesselFinderAPIService_1.VesselFinderAPIService();
        this.smartRouter = new SmartContainerRouter_1.SmartContainerRouter();
        this.initializeProviders();
    }
    initializeProviders() {
        // Initialize container-focused API provider configurations for world-class container tracking
        const providers = [
            // === MAJOR OCEAN CARRIERS (9 PROVIDERS) ===
            {
                name: 'maersk',
                baseUrl: 'https://api.maersk.com/track',
                apiKey: environment_1.config.apiKeys.maersk,
                rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
                reliability: 0.95,
                timeout: 10000,
                retryAttempts: 3,
                supportedTypes: ['booking', 'container', 'bol'],
                coverage: ['global'],
                cost: 'paid'
            },
            {
                name: 'msc',
                baseUrl: 'https://api.msc.com/track',
                apiKey: environment_1.config.apiKeys.msc,
                rateLimit: { requestsPerMinute: 40, requestsPerHour: 800 },
                reliability: 0.88,
                timeout: 12000,
                retryAttempts: 3,
                supportedTypes: ['booking', 'container', 'bol'],
                coverage: ['global'],
                cost: 'paid'
            },
            {
                name: 'cma-cgm',
                baseUrl: 'https://api.cma-cgm.com/tracking',
                apiKey: environment_1.config.apiKeys.cmaCgm,
                rateLimit: { requestsPerMinute: 25, requestsPerHour: 400 },
                reliability: 0.85,
                timeout: 9000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['global'],
                cost: 'paid'
            },
            {
                name: 'cosco',
                baseUrl: 'https://api.cosco-shipping.com/tracking',
                apiKey: environment_1.config.apiKeys.cosco,
                rateLimit: { requestsPerMinute: 35, requestsPerHour: 600 },
                reliability: 0.87,
                timeout: 10000,
                retryAttempts: 3,
                supportedTypes: ['booking', 'container', 'bol'],
                coverage: ['asia-pacific', 'global'],
                cost: 'paid'
            },
            {
                name: 'hapag-lloyd',
                baseUrl: 'https://api.hapag-lloyd.com/tracking',
                apiKey: environment_1.config.apiKeys.hapagLloyd,
                rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
                reliability: 0.90,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['global'],
                cost: 'paid'
            },
            {
                name: 'evergreen',
                baseUrl: 'https://api.evergreen-line.com/tracking',
                apiKey: environment_1.config.apiKeys.evergreen,
                rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
                reliability: 0.84,
                timeout: 9000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['asia-pacific', 'global'],
                cost: 'paid'
            },
            {
                name: 'one-line',
                baseUrl: 'https://api.one-line.com/tracking',
                apiKey: environment_1.config.apiKeys.oneLine,
                rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
                reliability: 0.86,
                timeout: 9000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['asia-pacific', 'global'],
                cost: 'paid'
            },
            {
                name: 'yang-ming',
                baseUrl: 'https://api.yangming.com/tracking',
                apiKey: environment_1.config.apiKeys.yangMing,
                rateLimit: { requestsPerMinute: 25, requestsPerHour: 400 },
                reliability: 0.82,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['asia-pacific'],
                cost: 'paid'
            },
            {
                name: 'zim',
                baseUrl: 'https://api.zim.com/tracking',
                apiKey: environment_1.config.apiKeys.zim,
                rateLimit: { requestsPerMinute: 20, requestsPerHour: 300 },
                reliability: 0.80,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['booking', 'container'],
                coverage: ['mediterranean', 'global'],
                cost: 'paid'
            },
            // === CONTAINER-FOCUSED AGGREGATORS (3 PROVIDERS) ===
            {
                name: 'shipsgo',
                baseUrl: 'https://api.shipsgo.com/v2/tracking',
                apiKey: environment_1.config.apiKeys.shipsgo,
                rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
                reliability: 0.88,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['container', 'booking'],
                coverage: ['global'],
                cost: 'freemium',
                aggregator: true
            },
            {
                name: 'searates',
                baseUrl: 'https://api.searates.com/tracking',
                apiKey: environment_1.config.apiKeys.searates,
                rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
                reliability: 0.85,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['container', 'booking'],
                coverage: ['global'],
                cost: 'freemium',
                aggregator: true
            },
            {
                name: 'project44',
                baseUrl: 'https://api.project44.com/v4/tracking',
                apiKey: environment_1.config.apiKeys.project44,
                rateLimit: { requestsPerMinute: 200, requestsPerHour: 5000 },
                reliability: 0.93,
                timeout: 10000,
                retryAttempts: 3,
                supportedTypes: ['booking', 'container', 'bol'],
                coverage: ['global'],
                cost: 'paid',
                aggregator: true
            },
            // === VESSEL TRACKING SERVICES (2 PROVIDERS) ===
            {
                name: 'marine-traffic',
                baseUrl: 'https://api.marinetraffic.com/v1/tracking',
                apiKey: environment_1.config.apiKeys.marineTraffic,
                rateLimit: { requestsPerMinute: 10, requestsPerHour: 100 },
                reliability: 0.70,
                timeout: 10000,
                retryAttempts: 2,
                supportedTypes: ['vessel', 'container'],
                coverage: ['global'],
                cost: 'freemium'
            },
            {
                name: 'vessel-finder',
                baseUrl: 'https://api.vesselfinder.com/tracking',
                apiKey: environment_1.config.apiKeys.vesselFinder,
                rateLimit: { requestsPerMinute: 15, requestsPerHour: 200 },
                reliability: 0.72,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['vessel', 'container'],
                coverage: ['global'],
                cost: 'freemium'
            },
            // === FREE CONTAINER TRACKING (1 PROVIDER) ===
            {
                name: 'track-trace',
                baseUrl: 'https://api.track-trace.com/v1/tracking',
                apiKey: environment_1.config.apiKeys.trackTrace,
                rateLimit: { requestsPerMinute: 50, requestsPerHour: 500 },
                reliability: 0.68,
                timeout: 8000,
                retryAttempts: 2,
                supportedTypes: ['container'],
                coverage: ['global'],
                cost: 'free'
            }
        ];
        providers.forEach(provider => {
            if (provider.apiKey) {
                this.providers.set(provider.name, provider);
            }
        });
        console.log(`🔌 Initialized ${this.providers.size} API providers`);
    }
    /**
     * Fetch tracking data from multiple sources with smart routing
     * Requirement 7.1: Attempt to retrieve data from alternative APIs
     * Requirement 7.2: Prioritize the most reliable source
     * Requirement 7.4: Gracefully degrade when all APIs are unavailable
     */
    async fetchFromMultipleSources(trackingNumber, trackingType, userTier, costOptimization) {
        const cacheKey = `${trackingNumber}-${trackingType || 'auto'}`;
        // Check cache first (Requirement 7.3: Implement caching to reduce redundant requests)
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            console.log(`📦 Cache hit for ${trackingNumber}`);
            return [cached];
        }
        // Use smart router to determine optimal provider order
        const routingContext = {
            trackingNumber,
            trackingType: trackingType || 'container',
            userTier,
            costOptimization,
            previousFailures: this.getRecentFailures()
        };
        const routingDecision = this.smartRouter.analyzeRouting(routingContext);
        console.log(`🧠 Smart routing decision: ${routingDecision.reasoning}`);
        const results = [];
        const errors = [];
        // Try providers in smart-prioritized order
        for (const providerName of routingDecision.prioritizedProviders) {
            const provider = this.providers.get(providerName);
            if (!provider)
                continue;
            try {
                // Check rate limits before making request
                if (!this.checkRateLimit(provider.name)) {
                    const rateLimitError = {
                        provider: provider.name,
                        errorType: 'RATE_LIMIT',
                        message: 'Rate limit exceeded',
                        retryAfter: 60
                    };
                    errors.push(rateLimitError);
                    this.smartRouter.recordFailure(provider.name, rateLimitError);
                    continue;
                }
                console.log(`🔍 Smart Router: Trying ${provider.name} for ${trackingNumber}`);
                const result = await this.fetchFromProvider(provider, trackingNumber, trackingType);
                if (result.status === 'success') {
                    results.push(result);
                    this.smartRouter.recordSuccess(provider.name);
                    // Cache successful results
                    this.setCachedData(cacheKey, result);
                    // If we got a good result from a high-reliability provider, we can stop
                    if (provider.reliability > 0.9) {
                        console.log(`✅ High-reliability result from ${provider.name}, stopping search`);
                        break;
                    }
                }
                else if (result.status === 'partial') {
                    results.push(result);
                    this.smartRouter.recordSuccess(provider.name);
                }
                else if (result.status === 'error' && result.error) {
                    errors.push(result.error);
                    this.smartRouter.recordFailure(provider.name, result.error);
                }
                this.updateRateLimit(provider.name);
                // If we have a good result, consider stopping based on strategy
                if (results.length > 0 && this.shouldStopSearch(routingDecision, results, provider)) {
                    break;
                }
            }
            catch (error) {
                const apiError = {
                    provider: provider.name,
                    errorType: this.categorizeError(error),
                    message: error instanceof Error ? error.message : 'Unknown error',
                    statusCode: error?.response?.status
                };
                errors.push(apiError);
                this.smartRouter.recordFailure(provider.name, apiError);
                console.error(`❌ Error from ${provider.name}:`, apiError);
            }
        }
        // Handle case where all APIs failed (Requirement 7.4)
        if (results.length === 0) {
            this.handleAPIFailures(errors);
        }
        return results;
    }
    /**
     * Prioritize data sources and resolve conflicts
     * Requirement 7.2: Prioritize the most reliable source
     */
    prioritizeDataSources(data) {
        if (data.length === 0) {
            throw new Error('No tracking data available');
        }
        // Sort by reliability score (highest first)
        const sortedData = data
            .filter(d => d.status === 'success' || d.status === 'partial')
            .sort((a, b) => b.reliability - a.reliability);
        if (sortedData.length === 0) {
            throw new Error('No successful tracking data available');
        }
        const primaryData = sortedData[0];
        // Merge data from multiple sources if available
        const mergedData = this.mergeTrackingData(sortedData);
        return {
            ...mergedData,
            dataSource: primaryData.provider,
            reliability: primaryData.reliability,
            lastUpdated: new Date()
        };
    }
    /**
     * Handle API failures gracefully
     * Requirement 7.4: Gracefully degrade when all APIs are unavailable
     */
    handleAPIFailures(errors) {
        console.error('🚨 All API providers failed:', errors);
        // Log different types of failures for monitoring
        const errorTypes = errors.reduce((acc, error) => {
            acc[error.errorType] = (acc[error.errorType] || 0) + 1;
            return acc;
        }, {});
        console.error('📊 Error breakdown:', errorTypes);
        // Determine if this is a temporary or permanent failure
        const hasRateLimitErrors = errors.some(e => e.errorType === 'RATE_LIMIT');
        const hasNetworkErrors = errors.some(e => e.errorType === 'NETWORK_ERROR');
        if (hasRateLimitErrors || hasNetworkErrors) {
            throw new Error('Tracking services are temporarily unavailable. Please try again in a few minutes.');
        }
        else {
            throw new Error('Unable to find tracking information. Please verify the tracking number and try again.');
        }
    }
    async fetchFromProvider(provider, trackingNumber, trackingType) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), provider.timeout);
        try {
            let response;
            // Use actual API services for implemented providers
            if (provider.name === 'maersk' && this.maerskService.isAvailable()) {
                response = await this.maerskService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'msc' && this.mscService.isAvailable()) {
                response = await this.mscService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'track-trace' && this.trackTraceService.isAvailable()) {
                response = await this.trackTraceService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'shipsgo' && this.shipsGoService.isAvailable()) {
                response = await this.shipsGoService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'searates' && this.searatesService.isAvailable()) {
                response = await this.searatesService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'cma-cgm' && this.cmaCgmService.isAvailable()) {
                response = await this.cmaCgmService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'cosco' && this.coscoService.isAvailable()) {
                response = await this.coscoService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'hapag-lloyd' && this.hapagLloydService.isAvailable()) {
                response = await this.hapagLloydService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'evergreen' && this.evergreenService.isAvailable()) {
                response = await this.evergreenService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'one-line' && this.oneLineService.isAvailable()) {
                response = await this.oneLineService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'yang-ming' && this.yangMingService.isAvailable()) {
                response = await this.yangMingService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'project44' && this.project44Service.isAvailable()) {
                response = await this.project44Service.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'zim' && this.zimService.isAvailable()) {
                response = await this.zimService.trackShipment(trackingNumber, trackingType || 'container');
            }
            else if (provider.name === 'marine-traffic' && this.marineTrafficService.isAvailable()) {
                // For Marine Traffic, we need to handle vessel tracking differently
                response = await this.handleMarineTrafficTracking(trackingNumber, trackingType);
            }
            else if (provider.name === 'vessel-finder' && this.vesselFinderService.isAvailable()) {
                // For Vessel Finder, handle vessel tracking with ETA predictions
                response = await this.handleVesselFinderTracking(trackingNumber, trackingType);
            }
            else {
                // Fall back to mock for other providers not yet implemented
                const mockResponse = await this.mockAPICall(provider, trackingNumber, trackingType);
                response = {
                    provider: provider.name,
                    trackingNumber,
                    data: mockResponse,
                    timestamp: new Date(),
                    reliability: provider.reliability,
                    status: 'success'
                };
            }
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            return {
                provider: provider.name,
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: provider.name,
                    errorType: this.categorizeError(error),
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
    async mockAPICall(provider, trackingNumber, trackingType) {
        // Mock implementation for demonstration
        // In real implementation, this would make actual HTTP requests to carrier APIs
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        // Simulate different response scenarios
        const scenarios = ['success', 'not_found', 'error'];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        if (scenario === 'error') {
            throw new Error(`API error from ${provider.name}`);
        }
        if (scenario === 'not_found') {
            throw new Error('Tracking number not found');
        }
        // Return mock successful data
        return {
            trackingNumber,
            carrier: provider.name.toUpperCase(),
            status: 'In Transit',
            timeline: [
                {
                    id: '1',
                    timestamp: new Date(Date.now() - 86400000),
                    status: 'Departed',
                    location: 'Shanghai, China',
                    description: 'Container departed from origin port',
                    isCompleted: true
                },
                {
                    id: '2',
                    timestamp: new Date(),
                    status: 'In Transit',
                    location: 'Pacific Ocean',
                    description: 'Container in transit',
                    isCompleted: false
                }
            ]
        };
    }
    getAvailableProviders(trackingType) {
        let providers = Array.from(this.providers.values());
        // Filter by supported tracking types
        if (trackingType) {
            providers = providers.filter(p => p.supportedTypes.includes(trackingType));
        }
        // Smart routing: prioritize by cost efficiency and reliability
        return this.prioritizeProviders(providers);
    }
    /**
     * Smart provider prioritization for world-class coverage
     * Strategy: Free APIs first, then high-reliability paid, then aggregators as fallback
     */
    prioritizeProviders(providers) {
        // 1. Free APIs first (cost optimization)
        const freeProviders = providers
            .filter(p => p.cost === 'free')
            .sort((a, b) => b.reliability - a.reliability);
        // 2. High-reliability paid APIs (success optimization)
        const highReliabilityPaid = providers
            .filter(p => p.cost === 'paid' && p.reliability >= 0.90)
            .sort((a, b) => b.reliability - a.reliability);
        // 3. Medium-reliability paid APIs
        const mediumReliabilityPaid = providers
            .filter(p => p.cost === 'paid' && p.reliability >= 0.80 && p.reliability < 0.90)
            .sort((a, b) => b.reliability - a.reliability);
        // 4. Freemium services
        const freemiumProviders = providers
            .filter(p => p.cost === 'freemium')
            .sort((a, b) => b.reliability - a.reliability);
        // 5. Third-party aggregators as comprehensive fallback
        const aggregators = providers
            .filter(p => p.aggregator === true)
            .sort((a, b) => b.reliability - a.reliability);
        // 6. Lower reliability providers as last resort
        const lowReliabilityProviders = providers
            .filter(p => p.reliability < 0.80 && !p.aggregator)
            .sort((a, b) => b.reliability - a.reliability);
        console.log(`📊 Provider prioritization: Free(${freeProviders.length}), HighPaid(${highReliabilityPaid.length}), MedPaid(${mediumReliabilityPaid.length}), Freemium(${freemiumProviders.length}), Aggregators(${aggregators.length}), LowRel(${lowReliabilityProviders.length})`);
        return [
            ...freeProviders,
            ...highReliabilityPaid,
            ...mediumReliabilityPaid,
            ...freemiumProviders,
            ...aggregators,
            ...lowReliabilityProviders
        ];
    }
    /**
     * Detect likely carriers based on tracking number format
     */
    detectLikelyCarriers(trackingNumber) {
        const patterns = {
            // Container number patterns
            maersk: /^[A-Z]{4}\d{7}$/, // Standard container format
            msc: /^MSC[A-Z]\d{7}$/,
            cma: /^CMA[A-Z]\d{7}$/,
            cosco: /^COS[A-Z]\d{7}$/,
            // Express patterns
            fedex: /^\d{12}$|^\d{14}$/,
            ups: /^1Z[A-Z0-9]{16}$/,
            dhl: /^\d{10}$|^\d{11}$/,
            // Postal patterns
            usps: /^(94|93|92|91|90)\d{20}$/,
            canadaPost: /^\d{16}$/,
            royalMail: /^[A-Z]{2}\d{9}GB$/
        };
        const likelyCarriers = [];
        for (const [carrier, pattern] of Object.entries(patterns)) {
            if (pattern.test(trackingNumber.toUpperCase())) {
                likelyCarriers.push(carrier);
            }
        }
        return likelyCarriers;
    }
    checkRateLimit(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider)
            return false;
        const now = new Date();
        const tracker = this.rateLimitTracker.get(providerName);
        if (!tracker) {
            this.rateLimitTracker.set(providerName, { count: 0, windowStart: now });
            return true;
        }
        // Reset window if it's been more than a minute
        const windowAge = now.getTime() - tracker.windowStart.getTime();
        if (windowAge > 60000) {
            this.rateLimitTracker.set(providerName, { count: 0, windowStart: now });
            return true;
        }
        return tracker.count < provider.rateLimit.requestsPerMinute;
    }
    updateRateLimit(providerName) {
        const tracker = this.rateLimitTracker.get(providerName);
        if (tracker) {
            tracker.count++;
        }
    }
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > new Date()) {
            return cached.data;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }
    setCachedData(key, data) {
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15); // Cache for 15 minutes
        this.cache.set(key, { data, expires });
    }
    categorizeError(error) {
        if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
            return 'TIMEOUT';
        }
        if (error?.response?.status === 429) {
            return 'RATE_LIMIT';
        }
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            return 'AUTH_ERROR';
        }
        if (error?.response?.status === 404) {
            return 'NOT_FOUND';
        }
        if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
            return 'NETWORK_ERROR';
        }
        return 'INVALID_RESPONSE';
    }
    mergeTrackingData(dataArray) {
        const primary = dataArray[0];
        // Start with primary data
        const merged = {
            trackingNumber: primary.trackingNumber,
            trackingType: 'container', // Default, should be detected
            carrier: primary.data.carrier || 'Unknown',
            service: 'FCL',
            status: primary.data.status || 'Unknown',
            timeline: primary.data.timeline || []
        };
        // Merge timeline events from all sources
        const allEvents = dataArray.flatMap(d => d.data.timeline || []);
        const uniqueEvents = this.deduplicateTimelineEvents(allEvents);
        merged.timeline = uniqueEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return merged;
    }
    deduplicateTimelineEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.timestamp}-${event.status}-${event.location}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    // Public method to get provider statistics
    getProviderStats() {
        return Array.from(this.providers.values()).map(provider => ({
            name: provider.name,
            reliability: provider.reliability,
            available: !!provider.apiKey
        }));
    }
    // Public method to clear cache
    clearCache() {
        this.cache.clear();
        console.log('🧹 API cache cleared');
    }
    /**
     * Get recent failures for smart routing
     */
    getRecentFailures() {
        const stats = this.smartRouter.getProviderStats();
        const recentFailureThreshold = 2; // Consider providers with 2+ recent failures
        return stats
            .filter(stat => stat.recentFailures >= recentFailureThreshold)
            .map(stat => stat.provider);
    }
    /**
     * Determine if we should stop searching based on routing strategy
     */
    shouldStopSearch(routingDecision, results, currentProvider) {
        if (results.length === 0)
            return false;
        const latestResult = results[results.length - 1];
        // Always continue if we only have partial results
        if (latestResult.status === 'partial')
            return false;
        // Stop strategies based on routing decision
        switch (routingDecision.fallbackStrategy) {
            case 'free_first':
                // For cost optimization, stop after first successful result
                return true;
            case 'reliability_first':
                // For reliability, only stop if we got a high-reliability result
                return currentProvider.reliability > 0.85;
            case 'paid_first':
            default:
                // Balanced approach: stop if we have a decent result from a decent provider
                return currentProvider.reliability > 0.75;
        }
    }
    /**
     * Handle Marine Traffic API tracking for vessel information
     */
    async handleMarineTrafficTracking(trackingNumber, trackingType) {
        try {
            // For Marine Traffic, we need to determine if this is a vessel IMO or container tracking
            let vesselData = null;
            let portCongestion = null;
            // Try to get vessel position if trackingNumber looks like an IMO
            if (this.isIMONumber(trackingNumber)) {
                vesselData = await this.marineTrafficService.getVesselPosition(trackingNumber);
            }
            // Get port congestion data for enhanced tracking information
            portCongestion = await this.marineTrafficService.getPortCongestion();
            // Transform Marine Traffic data to our standard format
            const transformedData = this.transformMarineTrafficData(trackingNumber, vesselData, portCongestion);
            return {
                provider: 'marine-traffic',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.70, // Marine Traffic reliability score
                status: vesselData || portCongestion ? 'success' : 'error',
                error: !vesselData && !portCongestion ? {
                    provider: 'marine-traffic',
                    errorType: 'NOT_FOUND',
                    message: 'No vessel or port information found'
                } : undefined
            };
        }
        catch (error) {
            return {
                provider: 'marine-traffic',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'marine-traffic',
                    errorType: this.categorizeError(error),
                    message: error instanceof Error ? error.message : 'Marine Traffic API error'
                }
            };
        }
    }
    /**
     * Check if a tracking number looks like an IMO number
     */
    isIMONumber(trackingNumber) {
        // IMO numbers are 7 digits, sometimes prefixed with "IMO"
        return /^(IMO)?[0-9]{7}$/.test(trackingNumber.replace(/\s/g, ''));
    }
    /**
     * Transform Marine Traffic data to our standard shipment format
     */
    transformMarineTrafficData(trackingNumber, vesselData, portCongestion) {
        const timeline = [];
        let status = 'Unknown';
        let vessel = null;
        if (vesselData) {
            // Create timeline from vessel data
            timeline.push({
                id: `vessel-${Date.now()}`,
                timestamp: vesselData.timestamp,
                status: vesselData.status || 'At Sea',
                location: vesselData.destination || 'Unknown Location',
                description: `Vessel ${vesselData.name} - ${vesselData.status}`,
                isCompleted: false,
                coordinates: vesselData.position
            });
            status = vesselData.status || 'At Sea';
            vessel = {
                name: vesselData.name,
                imo: vesselData.imo,
                voyage: 'N/A',
                currentPosition: vesselData.position,
                eta: vesselData.eta,
                speed: vesselData.speed,
                heading: vesselData.heading,
                destination: vesselData.destination,
                status: vesselData.status
            };
        }
        // Add port congestion information to timeline if available
        if (portCongestion && portCongestion.length > 0) {
            portCongestion.forEach((port, index) => {
                timeline.push({
                    id: `port-${port.portCode}-${index}`,
                    timestamp: port.lastUpdated,
                    status: `Port Congestion: ${port.congestionLevel}`,
                    location: port.portName,
                    description: `${port.portName} - Congestion Level: ${port.congestionLevel}, Waiting: ${port.vesselsWaiting} vessels`,
                    isCompleted: true,
                    coordinates: null // Port coordinates would need to be added
                });
            });
        }
        return {
            trackingNumber,
            carrier: 'Marine Traffic',
            service: 'Vessel Tracking',
            status,
            timeline: timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            vessel,
            portCongestion,
            lastUpdated: new Date()
        };
    }
    /**
     * Handle Vessel Finder API tracking for vessel information with ETA predictions
     */
    async handleVesselFinderTracking(trackingNumber, trackingType) {
        try {
            // For Vessel Finder, we need to determine if this is a vessel IMO or container tracking
            let vesselData = null;
            let routeData = null;
            let etaData = null;
            let portNotifications = null;
            // Try to get vessel position if trackingNumber looks like an IMO
            if (this.isIMONumber(trackingNumber)) {
                const [position, route, eta, notifications] = await Promise.allSettled([
                    this.vesselFinderService.getVesselPosition(trackingNumber),
                    this.vesselFinderService.getVesselRoute(trackingNumber),
                    this.vesselFinderService.getVesselETA(trackingNumber),
                    this.vesselFinderService.getPortNotifications(undefined, trackingNumber)
                ]);
                vesselData = position.status === 'fulfilled' ? position.value : null;
                routeData = route.status === 'fulfilled' ? route.value : null;
                etaData = eta.status === 'fulfilled' ? eta.value : null;
                portNotifications = notifications.status === 'fulfilled' ? notifications.value : null;
            }
            // Transform Vessel Finder data to our standard format
            const transformedData = this.transformVesselFinderData(trackingNumber, vesselData, routeData, etaData, portNotifications);
            return {
                provider: 'vessel-finder',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.72, // Vessel Finder reliability score
                status: vesselData || routeData ? 'success' : 'error',
                error: !vesselData && !routeData ? {
                    provider: 'vessel-finder',
                    errorType: 'NOT_FOUND',
                    message: 'No vessel information found'
                } : undefined
            };
        }
        catch (error) {
            return {
                provider: 'vessel-finder',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'vessel-finder',
                    errorType: this.categorizeError(error),
                    message: error instanceof Error ? error.message : 'Vessel Finder API error'
                }
            };
        }
    }
    /**
     * Transform Vessel Finder data to our standard shipment format
     */
    transformVesselFinderData(trackingNumber, vesselData, routeData, etaData, portNotifications) {
        const timeline = [];
        let status = 'Unknown';
        let vessel = null;
        if (vesselData) {
            // Create timeline from vessel data
            timeline.push({
                id: `vessel-${Date.now()}`,
                timestamp: vesselData.timestamp,
                status: vesselData.status || 'At Sea',
                location: vesselData.destination || 'Unknown Location',
                description: `Vessel ${vesselData.name} - ${vesselData.status}`,
                isCompleted: false,
                coordinates: vesselData.position
            });
            status = vesselData.status || 'At Sea';
            vessel = {
                name: vesselData.name,
                imo: vesselData.imo,
                voyage: 'N/A',
                currentPosition: vesselData.position,
                eta: vesselData.eta || etaData?.estimatedArrival,
                speed: vesselData.speed,
                heading: vesselData.heading,
                destination: vesselData.destination,
                status: vesselData.status
            };
        }
        // Add route waypoints to timeline if available
        if (routeData && routeData.waypoints) {
            routeData.waypoints.forEach((waypoint, index) => {
                timeline.push({
                    id: `waypoint-${index}`,
                    timestamp: waypoint.timestamp,
                    status: waypoint.event || 'Waypoint',
                    location: waypoint.port?.name || 'At Sea',
                    description: `${waypoint.event || 'Waypoint'} - ${waypoint.port?.name || 'Position update'}`,
                    isCompleted: true,
                    coordinates: waypoint.position
                });
            });
        }
        // Add port notifications to timeline if available
        if (portNotifications) {
            // Add arrivals
            portNotifications.arrivals.forEach((arrival, index) => {
                timeline.push({
                    id: `arrival-${index}`,
                    timestamp: arrival.estimatedArrival,
                    status: 'Expected Arrival',
                    location: arrival.berth || 'Port',
                    description: `Expected arrival at ${arrival.berth || 'port'}`,
                    isCompleted: false,
                    coordinates: null
                });
                if (arrival.actualArrival) {
                    timeline.push({
                        id: `actual-arrival-${index}`,
                        timestamp: arrival.actualArrival,
                        status: 'Arrived',
                        location: arrival.berth || 'Port',
                        description: `Arrived at ${arrival.berth || 'port'}`,
                        isCompleted: true,
                        coordinates: null
                    });
                }
            });
            // Add departures
            portNotifications.departures.forEach((departure, index) => {
                timeline.push({
                    id: `departure-${index}`,
                    timestamp: departure.estimatedDeparture,
                    status: 'Expected Departure',
                    location: 'Port',
                    description: `Expected departure to ${departure.destination || 'next port'}`,
                    isCompleted: false,
                    coordinates: null
                });
                if (departure.actualDeparture) {
                    timeline.push({
                        id: `actual-departure-${index}`,
                        timestamp: departure.actualDeparture,
                        status: 'Departed',
                        location: 'Port',
                        description: `Departed to ${departure.destination || 'next port'}`,
                        isCompleted: true,
                        coordinates: null
                    });
                }
            });
        }
        return {
            trackingNumber,
            carrier: 'Vessel Finder',
            service: 'Vessel Tracking',
            status,
            timeline: timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            vessel,
            route: routeData,
            etaPredictions: etaData,
            portNotifications,
            lastUpdated: new Date()
        };
    }
    /**
     * Get vessel tracking information for enhanced shipment data
     */
    async getVesselTrackingInfo(imo) {
        const results = {};
        // Try Marine Traffic first
        if (this.marineTrafficService.isAvailable()) {
            try {
                const [position, route, congestion] = await Promise.allSettled([
                    this.marineTrafficService.getVesselPosition(imo),
                    this.marineTrafficService.getVesselRoute(imo),
                    this.marineTrafficService.getPortCongestion()
                ]);
                results.position = position.status === 'fulfilled' ? position.value : null;
                results.route = route.status === 'fulfilled' ? route.value : null;
                results.congestion = congestion.status === 'fulfilled' ? congestion.value : [];
            }
            catch (error) {
                console.error('Error getting Marine Traffic vessel info:', error);
            }
        }
        // Try Vessel Finder for enhanced data
        if (this.vesselFinderService.isAvailable()) {
            try {
                const [position, route, eta, notifications] = await Promise.allSettled([
                    this.vesselFinderService.getVesselPosition(imo),
                    this.vesselFinderService.getVesselRoute(imo),
                    this.vesselFinderService.getVesselETA(imo),
                    this.vesselFinderService.getPortNotifications(undefined, imo)
                ]);
                // Use Vessel Finder data if Marine Traffic didn't provide it
                if (!results.position && position.status === 'fulfilled') {
                    results.position = position.value;
                }
                if (!results.route && route.status === 'fulfilled') {
                    results.route = route.value;
                }
                // Add Vessel Finder specific data
                results.etaPredictions = eta.status === 'fulfilled' ? eta.value : null;
                results.portNotifications = notifications.status === 'fulfilled' ? notifications.value : null;
            }
            catch (error) {
                console.error('Error getting Vessel Finder vessel info:', error);
            }
        }
        return results;
    }
    /**
     * Get smart routing statistics for monitoring
     */
    getSmartRoutingStats() {
        return {
            providerStats: this.smartRouter.getProviderStats(),
            routingDecisions: 0 // Could track this if needed
        };
    }
}
exports.APIAggregator = APIAggregator;
//# sourceMappingURL=APIAggregator.js.map