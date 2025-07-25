import { 
  RawTrackingData, 
  ShipmentData, 
  APIError, 
  TrackingType, 
  APIProviderConfig,
  ApiUsageRecord
} from '../types';
import { config } from '../config/environment';
import { MaerskAPIService } from './carriers/MaerskAPIService';
import { MSCAPIService } from './carriers/MSCAPIService';
import { TrackTraceAPIService } from './carriers/TrackTraceAPIService';
import { ShipsGoAPIService } from './carriers/ShipsGoAPIService';
import { SeaRatesAPIService } from './carriers/SeaRatesAPIService';
import { CMACGMAPIService } from './carriers/CMACGMAPIService';
import { COSCOAPIService } from './carriers/COSCOAPIService';
import { HapagLloydAPIService } from './carriers/HapagLloydAPIService';
import { EvergreenAPIService } from './carriers/EvergreenAPIService';
import { ONELineAPIService } from './carriers/ONELineAPIService';
import { YangMingAPIService } from './carriers/YangMingAPIService';
import { Project44APIService } from './carriers/Project44APIService';
import { ZIMAPIService } from './carriers/ZIMAPIService';
import { SmartContainerRouter, RoutingContext } from './SmartContainerRouter';
import { MarineTrafficAPIService } from './carriers/MarineTrafficAPIService';
import { VesselFinderAPIService } from './carriers/VesselFinderAPIService';

export class APIAggregator {
  private providers: Map<string, APIProviderConfig>;
  private rateLimitTracker: Map<string, { count: number; windowStart: Date }>;
  private cache: Map<string, { data: RawTrackingData; expires: Date }>;
  private maerskService: MaerskAPIService;
  private mscService: MSCAPIService;
  private trackTraceService: TrackTraceAPIService;
  private shipsGoService: ShipsGoAPIService;
  private searatesService: SeaRatesAPIService;
  private cmaCgmService: CMACGMAPIService;
  private coscoService: COSCOAPIService;
  private hapagLloydService: HapagLloydAPIService;
  private evergreenService: EvergreenAPIService;
  private oneLineService: ONELineAPIService;
  private yangMingService: YangMingAPIService;
  private project44Service: Project44APIService;
  private zimService: ZIMAPIService;
  private marineTrafficService: MarineTrafficAPIService;
  private vesselFinderService: VesselFinderAPIService;
  private smartRouter: SmartContainerRouter;

  constructor() {
    this.providers = new Map();
    this.rateLimitTracker = new Map();
    this.cache = new Map();
    this.maerskService = new MaerskAPIService();
    this.mscService = new MSCAPIService();
    this.trackTraceService = new TrackTraceAPIService();
    this.shipsGoService = new ShipsGoAPIService();
    this.searatesService = new SeaRatesAPIService();
    this.cmaCgmService = new CMACGMAPIService();
    this.coscoService = new COSCOAPIService();
    this.hapagLloydService = new HapagLloydAPIService();
    this.evergreenService = new EvergreenAPIService();
    this.oneLineService = new ONELineAPIService();
    this.yangMingService = new YangMingAPIService();
    this.project44Service = new Project44APIService();
    this.zimService = new ZIMAPIService();
    this.marineTrafficService = new MarineTrafficAPIService();
    this.vesselFinderService = new VesselFinderAPIService();
    this.smartRouter = new SmartContainerRouter();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize container-focused API provider configurations for world-class container tracking
    const providers: APIProviderConfig[] = [
      // === MAJOR OCEAN CARRIERS (9 PROVIDERS) ===
      {
        name: 'maersk',
        baseUrl: 'https://api.maersk.com/track',
        apiKey: config.apiProviders.maersk?.apiKey || '',
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
        apiKey: config.apiProviders.msc?.apiKey || '',
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
        apiKey: config.apiProviders.cmaCgm?.apiKey || '',
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
        apiKey: config.apiProviders.cosco?.apiKey || '',
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
        apiKey: config.apiProviders.hapagLloyd?.apiKey || '',
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
        apiKey: config.apiProviders.evergreen?.apiKey || '',
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
        apiKey: config.apiProviders.oneLine?.apiKey || '',
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
        apiKey: config.apiProviders.yangMing?.apiKey || '',
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
        apiKey: config.apiProviders.zim?.apiKey || '',
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
        apiKey: config.apiProviders.shipsGo?.apiKey || '',
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
        apiKey: config.apiProviders.seaRates?.apiKey || '',
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
        apiKey: config.apiProviders.project44?.apiKey || '',
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
        apiKey: config.apiProviders.marineTraffic?.apiKey || '',
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
        apiKey: config.apiProviders.vesselFinder?.apiKey || '',
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
        apiKey: config.apiProviders.trackTrace?.apiKey || '',
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
   * Retry mechanism with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    operationName: string = 'API call'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
          const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
          const totalDelay = delay + jitter;
          
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for ${operationName} in ${Math.round(totalDelay)}ms`);
          await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
        
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          console.error(`❌ All retry attempts failed for ${operationName}:`, lastError.message);
          throw lastError;
        }
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          console.log(`🚫 Non-retryable error for ${operationName}, skipping retries:`, lastError.message);
          throw lastError;
        }
        
        console.warn(`⚠️ Attempt ${attempt + 1} failed for ${operationName}:`, lastError.message);
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    // Don't retry on authentication errors, bad requests, etc.
    const statusCode = error?.response?.status || error?.statusCode;
    if (statusCode) {
      return statusCode >= 400 && statusCode < 500 && statusCode !== 429; // Don't retry 4xx except rate limits
    }
    
    // Don't retry on specific error types
    const errorMessage = error?.message?.toLowerCase() || '';
    return errorMessage.includes('invalid api key') || 
           errorMessage.includes('unauthorized') ||
           errorMessage.includes('forbidden') ||
           errorMessage.includes('bad request');
  }

  /**
   * Circuit breaker state management
   */
  private circuitBreakers = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
    nextAttemptTime: number;
  }>();

  private readonly CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,      // Open circuit after 5 failures
    recoveryTimeout: 60000,   // Try to recover after 1 minute
    successThreshold: 3,      // Close circuit after 3 successes in half-open state
  };

  /**
   * Check if circuit breaker allows the request
   */
  private canMakeRequest(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) {
      // Initialize circuit breaker for new provider
      this.circuitBreakers.set(providerName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        nextAttemptTime: 0,
      });
      return true;
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (now >= breaker.nextAttemptTime) {
          breaker.state = 'HALF_OPEN';
          breaker.successCount = 0;
          console.log(`🔄 Circuit breaker for ${providerName} moving to HALF_OPEN state`);
          return true;
        }
        console.log(`🚫 Circuit breaker for ${providerName} is OPEN, blocking request`);
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Record success for circuit breaker
   */
  private recordCircuitBreakerSuccess(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    switch (breaker.state) {
      case 'HALF_OPEN':
        breaker.successCount++;
        if (breaker.successCount >= this.CIRCUIT_BREAKER_CONFIG.successThreshold) {
          breaker.state = 'CLOSED';
          breaker.failureCount = 0;
          console.log(`✅ Circuit breaker for ${providerName} CLOSED after successful recovery`);
        }
        break;
      
      case 'CLOSED':
        breaker.failureCount = Math.max(0, breaker.failureCount - 1); // Gradually reduce failure count
        break;
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private recordCircuitBreakerFailure(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    const now = Date.now();
    breaker.failureCount++;
    breaker.lastFailureTime = now;

    if (breaker.state === 'CLOSED' && breaker.failureCount >= this.CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = now + this.CIRCUIT_BREAKER_CONFIG.recoveryTimeout;
      console.log(`🔴 Circuit breaker for ${providerName} OPENED after ${breaker.failureCount} failures`);
    } else if (breaker.state === 'HALF_OPEN') {
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = now + this.CIRCUIT_BREAKER_CONFIG.recoveryTimeout;
      console.log(`🔴 Circuit breaker for ${providerName} back to OPEN state after failure during recovery`);
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  public getCircuitBreakerStatus(): Record<string, {
    state: string;
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime?: number;
  }> {
    const status: Record<string, any> = {};
    
    this.circuitBreakers.forEach((breaker, providerName) => {
      status[providerName] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime,
        ...(breaker.state === 'OPEN' && { nextAttemptTime: breaker.nextAttemptTime })
      };
    });
    
    return status;
  }

  /**
   * Reset circuit breaker for a specific provider (for manual recovery)
   */
  public resetCircuitBreaker(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.nextAttemptTime = 0;
      console.log(`🔄 Circuit breaker for ${providerName} manually reset`);
      return true;
    }
    return false;
  }

  /**
   * API Key Management and Rotation
   */
  private apiKeyRotation = new Map<string, {
    keys: string[];
    currentIndex: number;
    lastRotation: number;
    rotationInterval: number; // in milliseconds
  }>();

  /**
   * Initialize API key rotation for a provider
   */
  public initializeAPIKeyRotation(
    providerName: string, 
    apiKeys: string[], 
    rotationIntervalHours: number = 24
  ): void {
    if (apiKeys.length === 0) return;
    
    this.apiKeyRotation.set(providerName, {
      keys: apiKeys,
      currentIndex: 0,
      lastRotation: Date.now(),
      rotationInterval: rotationIntervalHours * 60 * 60 * 1000,
    });
    
    console.log(`🔑 API key rotation initialized for ${providerName} with ${apiKeys.length} keys`);
  }

  /**
   * Get current API key for a provider (with automatic rotation)
   */
  public getCurrentAPIKey(providerName: string): string | undefined {
    const rotation = this.apiKeyRotation.get(providerName);
    if (!rotation || rotation.keys.length === 0) {
      return config.apiProviders[providerName]?.apiKey;
    }

    const now = Date.now();
    
    // Check if rotation is needed
    if (now - rotation.lastRotation >= rotation.rotationInterval) {
      rotation.currentIndex = (rotation.currentIndex + 1) % rotation.keys.length;
      rotation.lastRotation = now;
      console.log(`🔄 API key rotated for ${providerName} to index ${rotation.currentIndex}`);
    }

    return rotation.keys[rotation.currentIndex];
  }

  /**
   * Force API key rotation for a provider (useful when current key fails)
   */
  public rotateAPIKey(providerName: string): string | undefined {
    const rotation = this.apiKeyRotation.get(providerName);
    if (!rotation || rotation.keys.length <= 1) {
      return this.getCurrentAPIKey(providerName);
    }

    rotation.currentIndex = (rotation.currentIndex + 1) % rotation.keys.length;
    rotation.lastRotation = Date.now();
    
    console.log(`🔄 API key manually rotated for ${providerName} to index ${rotation.currentIndex}`);
    return rotation.keys[rotation.currentIndex];
  }

  /**
   * Get API key rotation status
   */
  public getAPIKeyRotationStatus(): Record<string, {
    totalKeys: number;
    currentIndex: number;
    lastRotation: Date;
    nextRotation: Date;
  }> {
    const status: Record<string, any> = {};
    
    this.apiKeyRotation.forEach((rotation, providerName) => {
      status[providerName] = {
        totalKeys: rotation.keys.length,
        currentIndex: rotation.currentIndex,
        lastRotation: new Date(rotation.lastRotation),
        nextRotation: new Date(rotation.lastRotation + rotation.rotationInterval),
      };
    });
    
    return status;
  }

  /**
   * Provider-specific data normalization
   */
  public normalizeProviderData(rawData: RawTrackingData): RawTrackingData {
    if (!rawData.data) return rawData;

    const normalizedData = { ...rawData };
    
    // Provider-specific normalization rules
    switch (rawData.provider) {
      case 'track-trace':
        normalizedData.data = this.normalizeTrackTraceData(rawData.data);
        break;
      case 'shipsgo':
        normalizedData.data = this.normalizeShipsGoData(rawData.data);
        break;
      case 'searates':
        normalizedData.data = this.normalizeSeaRatesData(rawData.data);
        break;
      case 'maersk':
        normalizedData.data = this.normalizeMaerskData(rawData.data);
        break;
      case 'msc':
        normalizedData.data = this.normalizeMSCData(rawData.data);
        break;
      default:
        // Generic normalization for unknown providers
        normalizedData.data = this.normalizeGenericData(rawData.data);
    }

    return normalizedData;
  }

  /**
   * Normalize Track-Trace specific data
   */
  private normalizeTrackTraceData(data: any): any {
    return {
      ...data,
      // Standardize status values
      status: this.normalizeStatus(data.status, 'track-trace'),
      // Ensure timeline events have consistent format
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `tt-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      // Standardize carrier names
      carrier: this.normalizeCarrierName(data.carrier),
    };
  }

  /**
   * Normalize ShipsGo specific data
   */
  private normalizeShipsGoData(data: any): any {
    return {
      ...data,
      status: this.normalizeStatus(data.status, 'shipsgo'),
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `sg-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      carrier: this.normalizeCarrierName(data.carrier),
    };
  }

  /**
   * Normalize SeaRates specific data
   */
  private normalizeSeaRatesData(data: any): any {
    return {
      ...data,
      status: this.normalizeStatus(data.status, 'searates'),
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `sr-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      carrier: this.normalizeCarrierName(data.carrier),
    };
  }

  /**
   * Normalize Maersk specific data
   */
  private normalizeMaerskData(data: any): any {
    return {
      ...data,
      status: this.normalizeStatus(data.status, 'maersk'),
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `mk-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      carrier: 'Maersk Line', // Standardize Maersk naming
    };
  }

  /**
   * Normalize MSC specific data
   */
  private normalizeMSCData(data: any): any {
    return {
      ...data,
      status: this.normalizeStatus(data.status, 'msc'),
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `msc-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      carrier: 'MSC Mediterranean Shipping Company', // Standardize MSC naming
    };
  }

  /**
   * Generic data normalization for unknown providers
   */
  private normalizeGenericData(data: any): any {
    return {
      ...data,
      status: this.normalizeStatus(data.status, 'generic'),
      timeline: data.timeline?.map((event: any, index: number) => ({
        ...event,
        id: event.id || `gen-${index}`,
        status: this.normalizeEventStatus(event.status),
      })) || [],
      carrier: this.normalizeCarrierName(data.carrier),
    };
  }

  /**
   * Normalize status values across providers
   */
  private normalizeStatus(status: string, provider: string): string {
    if (!status) return 'Unknown';
    
    const statusLower = status.toLowerCase();
    
    // Common status mappings
    const statusMap: Record<string, string> = {
      'in_transit': 'In Transit',
      'in-transit': 'In Transit',
      'intransit': 'In Transit',
      'on_water': 'In Transit',
      'at_sea': 'In Transit',
      'delivered': 'Delivered',
      'completed': 'Delivered',
      'arrived': 'Arrived',
      'departed': 'Departed',
      'loaded': 'Loaded',
      'discharged': 'Discharged',
      'gate_in': 'Gate In',
      'gate_out': 'Gate Out',
      'booked': 'Booked',
      'confirmed': 'Booked',
    };

    return statusMap[statusLower] || status;
  }

  /**
   * Normalize event status values
   */
  private normalizeEventStatus(status: string): string {
    return this.normalizeStatus(status, 'event');
  }

  /**
   * Normalize carrier names
   */
  private normalizeCarrierName(carrier: string): string {
    if (!carrier) return 'Unknown Carrier';
    
    const carrierMap: Record<string, string> = {
      'maersk': 'Maersk Line',
      'msc': 'MSC Mediterranean Shipping Company',
      'cosco': 'COSCO Shipping',
      'cma cgm': 'CMA CGM',
      'hapag-lloyd': 'Hapag-Lloyd',
      'evergreen': 'Evergreen Line',
      'one': 'Ocean Network Express',
      'yang ming': 'Yang Ming Marine Transport',
      'zim': 'ZIM Integrated Shipping Services',
    };

    const carrierLower = carrier.toLowerCase();
    return carrierMap[carrierLower] || carrier;
  }

  /**
   * Generate fallback demo data when all APIs fail
   */
  private generateFallbackData(trackingNumber: string, trackingType: TrackingType = 'container'): RawTrackingData {
    console.log(`🎭 Generating fallback demo data for ${trackingNumber}`);
    
    const demoData: ShipmentData = {
      trackingNumber,
      trackingType,
      carrier: 'Demo Carrier (Fallback)',
      service: 'FCL',
      status: 'In Transit',
      lastUpdated: new Date(),
      dataSource: 'fallback-demo',
      reliability: 0.5,
      timeline: [
        {
          id: 'demo-1',
          status: 'Booked',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          location: 'Shanghai, China',
          description: 'Shipment booked and confirmed (demo)',
          isCompleted: true,
        },
        {
          id: 'demo-2',
          status: 'Departed',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          location: 'Shanghai Port, China',
          description: 'Container departed from origin port (demo)',
          isCompleted: true,
        },
        {
          id: 'demo-3',
          status: 'In Transit',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          location: 'Pacific Ocean',
          description: 'Vessel en route to destination (demo)',
          isCompleted: true,
        },
        {
          id: 'demo-4',
          status: 'Arriving',
          timestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          location: 'Los Angeles, CA',
          description: 'Expected arrival at destination port (demo)',
          isCompleted: false,
        },
      ],
      route: {
        origin: {
          name: 'Shanghai Port',
          code: 'CNSHA',
          city: 'Shanghai',
          country: 'China',
          timezone: 'Asia/Shanghai',
          coordinates: { lat: 31.2304, lng: 121.4737 },
        },
        destination: {
          name: 'Los Angeles Port',
          code: 'USLAX',
          city: 'Los Angeles',
          country: 'United States',
          timezone: 'America/Los_Angeles',
          coordinates: { lat: 33.7361, lng: -118.2922 },
        },
        intermediateStops: [],
        estimatedTransitTime: 14,
      },
      containers: [{
        number: trackingNumber,
        size: '40ft',
        type: 'HC',
        sealNumber: 'DEMO' + Math.random().toString().substr(2, 6),
      }],
      vessel: {
        name: 'Demo Vessel',
        imo: 'IMO1234567',
        flag: 'Panama',
        voyage: 'DEMO001',
        currentPosition: { lat: 35.0, lng: -140.0 },
        eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    };

    return {
      provider: 'fallback-demo',
      trackingNumber,
      data: demoData,
      timestamp: new Date(),
      reliability: 0.5, // Lower reliability for demo data
      status: 'success',
    };
  }

  /**
   * Enhanced fetch from provider with retry and circuit breaker
   */
  private async fetchFromProviderWithResilience(
    provider: APIProviderConfig,
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<RawTrackingData> {
    // Check circuit breaker
    if (!this.canMakeRequest(provider.name)) {
      throw new Error(`Circuit breaker is OPEN for ${provider.name}`);
    }

    try {
      const result = await this.retryWithBackoff(
        () => this.fetchFromProvider(provider, trackingNumber, trackingType),
        3, // max retries
        1000, // base delay
        5000, // max delay
        `${provider.name} API`
      );

      this.recordCircuitBreakerSuccess(provider.name);
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure(provider.name);
      throw error;
    }
  }

  /**
   * Fetch tracking data from multiple sources concurrently
   * Requirement 7.1: Attempt to retrieve data from alternative APIs
   * Requirement 7.2: Prioritize the most reliable source
   * Requirement 7.4: Gracefully degrade when all APIs are unavailable
   */
  async fetchFromMultipleSourcesConcurrent(
    trackingNumber: string, 
    trackingType?: TrackingType,
    userTier?: 'free' | 'premium' | 'enterprise',
    costOptimization?: boolean,
    maxConcurrent: number = 3
  ): Promise<RawTrackingData[]> {
    const cacheKey = `${trackingNumber}-${trackingType || 'auto'}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${trackingNumber}`);
      return [cached];
    }

    // Use smart router to determine optimal provider order
    const routingContext: RoutingContext = {
      trackingNumber,
      trackingType: trackingType || 'container',
      userTier,
      costOptimization,
      previousFailures: this.getRecentFailures()
    };

    const routingDecision = this.smartRouter.analyzeRouting(routingContext);
    console.log(`🧠 Smart routing decision (concurrent): ${routingDecision.reasoning}`);

    // Get providers that pass rate limit checks
    const availableProviders = routingDecision.prioritizedProviders
      .map(name => this.providers.get(name))
      .filter((provider): provider is APIProviderConfig => provider !== undefined && this.checkRateLimit(provider.name))
      .slice(0, maxConcurrent); // Limit concurrent requests

    if (availableProviders.length === 0) {
      throw new Error('No available API providers after rate limit checks');
    }

    console.log(`🚀 Starting concurrent requests to ${availableProviders.length} providers`);

    // Create promises for concurrent execution
    const providerPromises = availableProviders.map(async (provider) => {
      try {
        console.log(`🔍 Concurrent: Trying ${provider.name} for ${trackingNumber}`);
        const result = await this.fetchFromProviderWithResilience(provider, trackingNumber, trackingType);
        this.updateRateLimit(provider.name);
        
        if (result.status === 'success' || result.status === 'partial') {
          this.smartRouter.recordSuccess(provider.name);
          // Normalize data before processing
          const normalizedResult = this.normalizeProviderData(result);
          if (result.status === 'success') {
            this.setCachedData(cacheKey, normalizedResult);
          }
          return normalizedResult;
        } else if (result.error) {
          this.smartRouter.recordFailure(provider.name, result.error);
        }
        
        return result;
      } catch (error) {
        const apiError: APIError = {
          provider: provider.name,
          errorType: this.categorizeError(error),
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: (error as any)?.response?.status
        };
        this.smartRouter.recordFailure(provider.name, apiError);
        console.error(`❌ Concurrent error from ${provider.name}:`, apiError);
        
        return {
          provider: provider.name,
          trackingNumber,
          data: null,
          timestamp: new Date(),
          reliability: 0,
          status: 'error' as const,
          error: apiError
        };
      }
    });

    // Execute all promises concurrently with timeout
    const timeoutMs = 15000; // 15 second timeout for concurrent requests
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Concurrent request timeout')), timeoutMs);
    });

    try {
      const settledResults = await Promise.race([
        Promise.allSettled(providerPromises),
        timeoutPromise
      ]);

      // Process results
      const results: RawTrackingData[] = [];
      const errors: APIError[] = [];

      settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.status === 'success' || data.status === 'partial') {
            results.push(data);
          } else if (data.error) {
            errors.push(data.error);
          }
        } else {
          // Promise was rejected
          const provider = availableProviders[index];
          if (provider) {
            const apiError: APIError = {
              provider: provider.name,
              errorType: 'NETWORK_ERROR',
              message: result.reason?.message || 'Request failed',
            };
            errors.push(apiError);
            this.smartRouter.recordFailure(provider.name, apiError);
          }
        }
      });

      console.log(`✅ Concurrent requests completed: ${results.length} successful, ${errors.length} failed`);

      // Sort results by reliability (highest first)
      results.sort((a, b) => b.reliability - a.reliability);

      // Handle case where all APIs failed - provide fallback data
      if (results.length === 0) {
        console.warn(`⚠️ All concurrent API calls failed, providing fallback data`);
        const fallbackData = this.generateFallbackData(trackingNumber, trackingType || 'container');
        results.push(fallbackData);
        
        // Still log the failures for monitoring
        this.handleAPIFailures(errors);
      }

      return results;

    } catch (error) {
      console.error('❌ Concurrent request timeout or error:', error);
      throw new Error('All concurrent API requests failed or timed out');
    }
  }

  /**
   * Fetch tracking data from multiple sources with smart routing (sequential)
   * Requirement 7.1: Attempt to retrieve data from alternative APIs
   * Requirement 7.2: Prioritize the most reliable source
   * Requirement 7.4: Gracefully degrade when all APIs are unavailable
   */
  async fetchFromMultipleSources(
    trackingNumber: string, 
    trackingType?: TrackingType,
    userTier?: 'free' | 'premium' | 'enterprise',
    costOptimization?: boolean
  ): Promise<RawTrackingData[]> {
    const cacheKey = `${trackingNumber}-${trackingType || 'auto'}`;
    
    // Check cache first (Requirement 7.3: Implement caching to reduce redundant requests)
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${trackingNumber}`);
      return [cached];
    }

    // Use smart router to determine optimal provider order
    const routingContext: RoutingContext = {
      trackingNumber,
      trackingType: trackingType || 'container',
      userTier,
      costOptimization,
      previousFailures: this.getRecentFailures()
    };

    const routingDecision = this.smartRouter.analyzeRouting(routingContext);
    console.log(`🧠 Smart routing decision: ${routingDecision.reasoning}`);

    const results: RawTrackingData[] = [];
    const errors: APIError[] = [];

    // Try providers in smart-prioritized order
    for (const providerName of routingDecision.prioritizedProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // Check rate limits before making request
        if (!this.checkRateLimit(provider.name)) {
          const rateLimitError: APIError = {
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
        const result = await this.fetchFromProviderWithResilience(provider, trackingNumber, trackingType);
        
        if (result.status === 'success') {
          // Normalize data before processing
          const normalizedResult = this.normalizeProviderData(result);
          results.push(normalizedResult);
          this.smartRouter.recordSuccess(provider.name);
          
          // Cache successful results
          this.setCachedData(cacheKey, normalizedResult);
          
          // If we got a good result from a high-reliability provider, we can stop
          if (provider.reliability > 0.9) {
            console.log(`✅ High-reliability result from ${provider.name}, stopping search`);
            break;
          }
        } else if (result.status === 'partial') {
          results.push(result);
          this.smartRouter.recordSuccess(provider.name);
        } else if (result.status === 'error' && result.error) {
          errors.push(result.error);
          this.smartRouter.recordFailure(provider.name, result.error);
        }

        this.updateRateLimit(provider.name);
        
        // If we have a good result, consider stopping based on strategy
        if (results.length > 0 && this.shouldStopSearch(routingDecision, results, provider)) {
          break;
        }

      } catch (error) {
        const apiError: APIError = {
          provider: provider.name,
          errorType: this.categorizeError(error),
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: (error as any)?.response?.status
        };
        errors.push(apiError);
        this.smartRouter.recordFailure(provider.name, apiError);
        console.error(`❌ Error from ${provider.name}:`, apiError);
      }
    }

    // Handle case where all APIs failed - provide fallback data (Requirement 7.4)
    if (results.length === 0) {
      console.warn(`⚠️ All sequential API calls failed, providing fallback data`);
      const fallbackData = this.generateFallbackData(trackingNumber, trackingType || 'container');
      results.push(fallbackData);
      
      // Still log the failures for monitoring
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
      let response: RawTrackingData;

      // Use actual API services for implemented providers
      if (provider.name === 'maersk' && this.maerskService.isAvailable()) {
        response = await this.maerskService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'msc' && this.mscService.isAvailable()) {
        response = await this.mscService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'track-trace' && this.trackTraceService.isAvailable()) {
        response = await this.trackTraceService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'shipsgo' && this.shipsGoService.isAvailable()) {
        response = await this.shipsGoService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'searates' && this.searatesService.isAvailable()) {
        response = await this.searatesService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'cma-cgm' && this.cmaCgmService.isAvailable()) {
        response = await this.cmaCgmService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'cosco' && this.coscoService.isAvailable()) {
        response = await this.coscoService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'hapag-lloyd' && this.hapagLloydService.isAvailable()) {
        response = await this.hapagLloydService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'evergreen' && this.evergreenService.isAvailable()) {
        response = await this.evergreenService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'one-line' && this.oneLineService.isAvailable()) {
        response = await this.oneLineService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'yang-ming' && this.yangMingService.isAvailable()) {
        response = await this.yangMingService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'project44' && this.project44Service.isAvailable()) {
        response = await this.project44Service.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'zim' && this.zimService.isAvailable()) {
        response = await this.zimService.trackShipment(
          trackingNumber, 
          trackingType || 'container'
        );
      } else if (provider.name === 'marine-traffic' && this.marineTrafficService.isAvailable()) {
        // For Marine Traffic, we need to handle vessel tracking differently
        response = await this.handleMarineTrafficTracking(trackingNumber, trackingType);
      } else if (provider.name === 'vessel-finder' && this.vesselFinderService.isAvailable()) {
        // For Vessel Finder, handle vessel tracking with ETA predictions
        response = await this.handleVesselFinderTracking(trackingNumber, trackingType);
      } else {
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

  /**
   * Get recent failures for smart routing
   */
  private getRecentFailures(): string[] {
    const stats = this.smartRouter.getProviderStats();
    const recentFailureThreshold = 2; // Consider providers with 2+ recent failures
    
    return stats
      .filter(stat => stat.recentFailures >= recentFailureThreshold)
      .map(stat => stat.provider);
  }

  /**
   * Determine if we should stop searching based on routing strategy
   */
  private shouldStopSearch(
    routingDecision: any,
    results: RawTrackingData[],
    currentProvider: APIProviderConfig
  ): boolean {
    if (results.length === 0) return false;

    const latestResult = results[results.length - 1];
    
    // Always continue if we only have partial results
    if (latestResult.status === 'partial') return false;

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
  private async handleMarineTrafficTracking(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<RawTrackingData> {
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
      const transformedData = this.transformMarineTrafficData(
        trackingNumber,
        vesselData,
        portCongestion
      );

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

    } catch (error) {
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
  private isIMONumber(trackingNumber: string): boolean {
    // IMO numbers are 7 digits, sometimes prefixed with "IMO"
    return /^(IMO)?[0-9]{7}$/.test(trackingNumber.replace(/\s/g, ''));
  }

  /**
   * Transform Marine Traffic data to our standard shipment format
   */
  private transformMarineTrafficData(
    trackingNumber: string,
    vesselData: any,
    portCongestion: any[]
  ): any {
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
  private async handleVesselFinderTracking(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<RawTrackingData> {
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
      const transformedData = this.transformVesselFinderData(
        trackingNumber,
        vesselData,
        routeData,
        etaData,
        portNotifications
      );

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

    } catch (error) {
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
  private transformVesselFinderData(
    trackingNumber: string,
    vesselData: any,
    routeData: any,
    etaData: any,
    portNotifications: any
  ): any {
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
      routeData.waypoints.forEach((waypoint: any, index: number) => {
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
      portNotifications.arrivals.forEach((arrival: any, index: number) => {
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
      portNotifications.departures.forEach((departure: any, index: number) => {
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
  async getVesselTrackingInfo(imo: string): Promise<{
    position?: any;
    route?: any;
    congestion?: any[];
    etaPredictions?: any;
    portNotifications?: any;
  }> {
    const results: any = {};

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
      } catch (error) {
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
      } catch (error) {
        console.error('Error getting Vessel Finder vessel info:', error);
      }
    }

    return results;
  }

  /**
   * Get smart routing statistics for monitoring
   */
  getSmartRoutingStats(): {
    providerStats: Array<{
      provider: string;
      cost: number;
      reliability: number;
      recentFailures: number;
      lastFailure?: Date;
    }>;
    routingDecisions: number;
  } {
    return {
      providerStats: this.smartRouter.getProviderStats(),
      routingDecisions: 0 // Could track this if needed
    };
  }
}