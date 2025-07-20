import { 
  RawTrackingData, 
  ShipmentData, 
  APIError, 
  TrackingType, 
  APIProviderConfig,
  ApiUsageRecord
} from '../types';
import { config } from '../config/environment';

export class APIAggregator {
  private providers: Map<string, APIProviderConfig>;
  private rateLimitTracker: Map<string, { count: number; windowStart: Date }>;
  private cache: Map<string, { data: RawTrackingData; expires: Date }>;

  constructor() {
    this.providers = new Map();
    this.rateLimitTracker = new Map();
    this.cache = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize container-focused API provider configurations for world-class container tracking
    const providers: APIProviderConfig[] = [
      // === MAJOR OCEAN CARRIERS (9 PROVIDERS) ===
      {
        name: 'maersk',
        baseUrl: 'https://api.maersk.com/track',
        apiKey: config.apiKeys.maersk,
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
        apiKey: config.apiKeys.msc,
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
        apiKey: config.apiKeys.cmaCgm,
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
        apiKey: config.apiKeys.cosco,
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
        apiKey: config.apiKeys.hapagLloyd,
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
        apiKey: config.apiKeys.evergreen,
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
        apiKey: config.apiKeys.oneLine,
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
        apiKey: config.apiKeys.yangMing,
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
        apiKey: config.apiKeys.zim,
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
        apiKey: config.apiKeys.shipsgo,
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
        apiKey: config.apiKeys.searates,
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
        apiKey: config.apiKeys.project44,
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
        apiKey: config.apiKeys.marineTraffic,
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
        apiKey: config.apiKeys.vesselFinder,
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
        apiKey: config.apiKeys.trackTrace,
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
   * Fetch tracking data from multiple sources
   * Requirement 7.1: Attempt to retrieve data from alternative APIs
   */
  async fetchFromMultipleSources(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<RawTrackingData[]> {
    const cacheKey = `${trackingNumber}-${trackingType || 'auto'}`;
    
    // Check cache first (Requirement 7.3: Implement caching to reduce redundant requests)
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${trackingNumber}`);
      return [cached];
    }

    const availableProviders = this.getAvailableProviders(trackingType);
    const results: RawTrackingData[] = [];
    const errors: APIError[] = [];

    // Try providers in order of reliability
    for (const provider of availableProviders) {
      try {
        // Check rate limits before making request
        if (!this.checkRateLimit(provider.name)) {
          errors.push({
            provider: provider.name,
            errorType: 'RATE_LIMIT',
            message: 'Rate limit exceeded',
            retryAfter: 60
          });
          continue;
        }

        console.log(`🔍 Fetching from ${provider.name} for ${trackingNumber}`);
        const result = await this.fetchFromProvider(provider, trackingNumber, trackingType);
        
        if (result.status === 'success') {
          results.push(result);
          // Cache successful results
          this.setCachedData(cacheKey, result);
          
          // If we got a good result from a high-reliability provider, we can stop
          if (provider.reliability > 0.9) {
            break;
          }
        } else if (result.status === 'partial') {
          results.push(result);
        }

        this.updateRateLimit(provider.name);
      } catch (error) {
        const apiError: APIError = {
          provider: provider.name,
          errorType: this.categorizeError(error),
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: (error as any)?.response?.status
        };
        errors.push(apiError);
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
  prioritizeDataSources(data: RawTrackingData[]): ShipmentData {
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
  handleAPIFailures(errors: APIError[]): void {
    console.error('🚨 All API providers failed:', errors);
    
    // Log different types of failures for monitoring
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.error('📊 Error breakdown:', errorTypes);

    // Determine if this is a temporary or permanent failure
    const hasRateLimitErrors = errors.some(e => e.errorType === 'RATE_LIMIT');
    const hasNetworkErrors = errors.some(e => e.errorType === 'NETWORK_ERROR');
    
    if (hasRateLimitErrors || hasNetworkErrors) {
      throw new Error('Tracking services are temporarily unavailable. Please try again in a few minutes.');
    } else {
      throw new Error('Unable to find tracking information. Please verify the tracking number and try again.');
    }
  }

  private async fetchFromProvider(
    provider: APIProviderConfig,
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<RawTrackingData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

    try {
      // This is a mock implementation - in real world, you'd call actual APIs
      const response = await this.mockAPICall(provider, trackingNumber, trackingType);
      
      clearTimeout(timeoutId);
      
      return {
        provider: provider.name,
        trackingNumber,
        data: response,
        timestamp: new Date(),
        reliability: provider.reliability,
        status: 'success'
      };
    } catch (error) {
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

  private async mockAPICall(
    provider: APIProviderConfig,
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<any> {
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

  private getAvailableProviders(trackingType?: TrackingType): APIProviderConfig[] {
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
  private prioritizeProviders(providers: APIProviderConfig[]): APIProviderConfig[] {
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
  private detectLikelyCarriers(trackingNumber: string): string[] {
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

    const likelyCarriers: string[] = [];
    
    for (const [carrier, pattern] of Object.entries(patterns)) {
      if (pattern.test(trackingNumber.toUpperCase())) {
        likelyCarriers.push(carrier);
      }
    }
    
    return likelyCarriers;
  }

  private checkRateLimit(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

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

  private updateRateLimit(providerName: string): void {
    const tracker = this.rateLimitTracker.get(providerName);
    if (tracker) {
      tracker.count++;
    }
  }

  private getCachedData(key: string): RawTrackingData | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCachedData(key: string, data: RawTrackingData): void {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Cache for 15 minutes
    
    this.cache.set(key, { data, expires });
  }

  private categorizeError(error: any): APIError['errorType'] {
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

  private mergeTrackingData(dataArray: RawTrackingData[]): Omit<ShipmentData, 'dataSource' | 'reliability' | 'lastUpdated'> {
    const primary = dataArray[0];
    
    // Start with primary data
    const merged: any = {
      trackingNumber: primary.trackingNumber,
      trackingType: 'container' as TrackingType, // Default, should be detected
      carrier: primary.data.carrier || 'Unknown',
      service: 'FCL' as const,
      status: primary.data.status || 'Unknown',
      timeline: primary.data.timeline || []
    };

    // Merge timeline events from all sources
    const allEvents = dataArray.flatMap(d => d.data.timeline || []);
    const uniqueEvents = this.deduplicateTimelineEvents(allEvents);
    merged.timeline = uniqueEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return merged;
  }

  private deduplicateTimelineEvents(events: any[]): any[] {
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
  getProviderStats(): { name: string; reliability: number; available: boolean }[] {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      reliability: provider.reliability,
      available: !!provider.apiKey
    }));
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }
}