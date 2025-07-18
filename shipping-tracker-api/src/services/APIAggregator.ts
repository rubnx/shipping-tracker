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
    // Initialize API provider configurations
    const providers: APIProviderConfig[] = [
      {
        name: 'maersk',
        baseUrl: 'https://api.maersk.com/track',
        apiKey: config.apiKeys.maersk,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        reliability: 0.95,
        timeout: 10000,
        retryAttempts: 3,
        supportedTypes: ['booking', 'container', 'bol']
      },
      {
        name: 'hapag-lloyd',
        baseUrl: 'https://api.hapag-lloyd.com/tracking',
        apiKey: config.apiKeys.hapagLloyd,
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerHour: 500
        },
        reliability: 0.90,
        timeout: 8000,
        retryAttempts: 2,
        supportedTypes: ['booking', 'container']
      },
      {
        name: 'msc',
        baseUrl: 'https://api.msc.com/track',
        apiKey: config.apiKeys.msc,
        rateLimit: {
          requestsPerMinute: 40,
          requestsPerHour: 800
        },
        reliability: 0.88,
        timeout: 12000,
        retryAttempts: 3,
        supportedTypes: ['booking', 'container', 'bol']
      },
      {
        name: 'cma-cgm',
        baseUrl: 'https://api.cma-cgm.com/tracking',
        apiKey: config.apiKeys.cmaCgm,
        rateLimit: {
          requestsPerMinute: 25,
          requestsPerHour: 400
        },
        reliability: 0.85,
        timeout: 9000,
        retryAttempts: 2,
        supportedTypes: ['booking', 'container']
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
    const providers = Array.from(this.providers.values());
    
    if (!trackingType) {
      return providers.sort((a, b) => b.reliability - a.reliability);
    }
    
    return providers
      .filter(p => p.supportedTypes.includes(trackingType))
      .sort((a, b) => b.reliability - a.reliability);
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